import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import type {
  DeployOptions,
  DeployResult,
  DestroyResult,
  EnvVarResult,
  ProviderLock,
  StatusResult,
} from '@heramb1/core';

const NETLIFY_API = 'https://api.netlify.com/api/v1';

export interface NetlifyLockOptions {
  token: string;
}

interface NetlifySite {
  id: string;
  name: string;
  url: string;
  ssl_url: string;
  default_domain: string;
}

interface NetlifyDeploy {
  id: string;
  state: string;
  ssl_url?: string;
  deploy_ssl_url?: string;
  error_message?: string;
}

export class NetlifyLock implements ProviderLock {
  readonly name = 'netlify';
  private token: string;

  constructor(options: NetlifyLockOptions) {
    this.token = options.token;
  }

  private headers(contentType = 'application/json'): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      ...(contentType ? { 'Content-Type': contentType } : {}),
    };
  }

  async deploy(options: DeployOptions): Promise<DeployResult> {
    const siteName = options.projectId ?? options.serviceId ?? options.name;
    if (!siteName) {
      throw new Error('Netlify deploy requires projectId or name in heramb.config.json');
    }

    const site = await this.ensureSite(siteName);

    if (options.envVars) {
      await this.setEnvVars(site.id, options.envVars);
    }

    const distDir = this.buildLocal(options.path ?? '.', options.envVars);
    const deploy = await this.uploadDeploy(site.id, distDir);
    const url = await this.waitForDeploy(deploy.id, site);

    return {
      url,
      serviceId: site.id,
    };
  }

  async getStatus(siteId: string): Promise<StatusResult> {
    try {
      const res = await fetch(`${NETLIFY_API}/sites/${siteId}`, {
        headers: this.headers(),
      });

      if (!res.ok) return { status: 'unknown' };

      const site = (await res.json()) as NetlifySite;
      const url = site.ssl_url || site.url;

      const deployRes = await fetch(`${NETLIFY_API}/sites/${siteId}/deploys?per_page=1`, {
        headers: this.headers(),
      });

      let status: StatusResult['status'] = url ? 'live' : 'unknown';
      if (deployRes.ok) {
        const deploys = (await deployRes.json()) as NetlifyDeploy[];
        const latest = deploys[0];
        if (latest) status = mapNetlifyDeployState(latest.state);
      }

      return {
        status,
        url: url ? normalizeUrl(url) : undefined,
      };
    } catch {
      return { status: 'unknown' };
    }
  }

  async setEnvVars(siteId: string, vars: Record<string, string>): Promise<EnvVarResult> {
    try {
      const siteRes = await fetch(`${NETLIFY_API}/sites/${siteId}`, {
        headers: this.headers(),
      });

      if (!siteRes.ok) {
        throw new Error(`Netlify site not found: ${await siteRes.text()}`);
      }

      const site = (await siteRes.json()) as {
        build_settings?: { env?: Record<string, string> };
      };

      const env = { ...(site.build_settings?.env ?? {}), ...vars };

      const res = await fetch(`${NETLIFY_API}/sites/${siteId}`, {
        method: 'PATCH',
        headers: this.headers(),
        body: JSON.stringify({
          build_settings: { env },
        }),
      });

      if (!res.ok) {
        throw new Error(`Netlify env error: ${await res.text()}`);
      }

      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async *getLogs(siteId: string): AsyncIterable<string> {
    const status = await this.getStatus(siteId);
    yield `[netlify] Site ${siteId} — status: ${status.status}${status.url ? ` (${status.url})` : ''}`;
    yield `[netlify] Use Netlify dashboard for deploy logs`;
  }

  async destroy(siteId: string): Promise<DestroyResult> {
    try {
      const res = await fetch(`${NETLIFY_API}/sites/${siteId}`, {
        method: 'DELETE',
        headers: this.headers(),
      });
      return { ok: res.ok };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async ensureSite(name: string): Promise<NetlifySite> {
    const listRes = await fetch(`${NETLIFY_API}/sites?filter=all&name=${encodeURIComponent(name)}`, {
      headers: this.headers(),
    });

    if (listRes.ok) {
      const sites = (await listRes.json()) as NetlifySite[];
      const match = sites.find((s) => s.name === name);
      if (match) return match;
    }

    const createRes = await fetch(`${NETLIFY_API}/sites`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ name }),
    });

    if (!createRes.ok) {
      throw new Error(`Netlify site create failed: ${await createRes.text()}`);
    }

    return createRes.json() as Promise<NetlifySite>;
  }

  private buildLocal(appPath: string, envVars?: Record<string, string>): string {
    const absPath = resolve(process.cwd(), appPath);
    const distDir = join(absPath, 'dist');
    const env = {
      ...process.env,
      ...envVars,
      NODE_ENV: 'development',
      npm_config_production: 'false',
    };

    execSync('npm install', { cwd: absPath, env, stdio: 'pipe' });
    execSync('npm run build', { cwd: absPath, env, stdio: 'pipe' });

    if (!existsSync(distDir)) {
      throw new Error(`Build did not produce dist/ at ${distDir}`);
    }

    return distDir;
  }

  private collectFiles(distDir: string): Array<{ path: string; content: Buffer }> {
    const files: Array<{ path: string; content: Buffer }> = [];

    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
          continue;
        }

        const relPath = relative(distDir, fullPath).replace(/\\/g, '/');
        files.push({ path: relPath, content: readFileSync(fullPath) });
      }
    };

    walk(distDir);
    return files;
  }

  private async uploadDeploy(siteId: string, distDir: string): Promise<NetlifyDeploy> {
    const files = this.collectFiles(distDir);
    if (files.length === 0) {
      throw new Error(`No build output found in ${distDir}`);
    }

    const createRes = await fetch(`${NETLIFY_API}/sites/${siteId}/deploys`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({}),
    });

    if (!createRes.ok) {
      throw new Error(`Netlify deploy create failed: ${await createRes.text()}`);
    }

    const deploy = (await createRes.json()) as NetlifyDeploy;

    for (const file of files) {
      const uploadRes = await fetch(
        `${NETLIFY_API}/deploys/${deploy.id}/files/${encodeURIComponent(file.path)}`,
        {
          method: 'PUT',
          headers: this.headers(''),
          body: file.content,
        }
      );

      if (!uploadRes.ok) {
        throw new Error(`Netlify file upload failed (${file.path}): ${await uploadRes.text()}`);
      }
    }

    return deploy;
  }

  private async waitForDeploy(deployId: string, site: NetlifySite, maxAttempts = 60): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      const res = await fetch(`${NETLIFY_API}/deploys/${deployId}`, {
        headers: this.headers(),
      });

      if (!res.ok) {
        await sleep(3000);
        continue;
      }

      const deploy = (await res.json()) as NetlifyDeploy;
      if (deploy.state === 'ready') {
        return normalizeUrl(deploy.ssl_url ?? deploy.deploy_ssl_url ?? site.ssl_url ?? site.url);
      }
      if (deploy.state === 'error') {
        throw new Error(deploy.error_message ?? 'Netlify deployment failed');
      }

      await sleep(3000);
    }

    throw new Error('Netlify deployment timed out');
  }
}

function normalizeUrl(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`;
}

function mapNetlifyDeployState(state?: string): StatusResult['status'] {
  switch (state) {
    case 'ready':
      return 'live';
    case 'building':
    case 'processing':
    case 'uploading':
      return 'building';
    case 'preparing':
    case 'enqueued':
      return 'pending';
    case 'error':
      return 'failed';
    default:
      return 'unknown';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createNetlifyLock(token: string): NetlifyLock {
  return new NetlifyLock({ token });
}
