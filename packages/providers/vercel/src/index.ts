import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import type {
  DeployOptions,
  DeployResult,
  DestroyResult,
  EnvVarResult,
  ProviderLock,
  StatusResult,
} from '@heramb1/core';

const VERCEL_API = 'https://api.vercel.com';

const TEXT_EXTENSIONS = new Set(['.html', '.css', '.js', '.json', '.svg', '.txt', '.map', '.webmanifest']);

export interface VercelLockOptions {
  token: string;
  teamId?: string;
}

interface VercelFile {
  file: string;
  data: string;
  encoding?: 'base64' | 'utf-8';
}

interface VercelProject {
  id: string;
  name: string;
  link?: {
    type: string;
    repo?: string;
    repoId?: number;
    org?: string;
    productionBranch?: string;
  };
}

export class VercelLock implements ProviderLock {
  readonly name = 'vercel';
  private token: string;
  private teamId?: string;

  constructor(options: VercelLockOptions) {
    this.token = options.token;
    this.teamId = options.teamId;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private teamQuery(): string {
    return this.teamId ? `?teamId=${this.teamId}` : '';
  }

  async deploy(options: DeployOptions): Promise<DeployResult> {
    const projectName = options.projectId ?? options.serviceId ?? options.name;

    if (!projectName) {
      throw new Error('Vercel deploy requires projectId or name in heramb.config.json');
    }

    const rootDirectory = options.path?.replace(/^\.\//, '');

    await this.ensureProject(projectName, { framework: 'vite', rootDirectory });

    if (options.envVars) {
      await this.setEnvVars(projectName, options.envVars);
    }

    const deployment =
      (await this.tryDeployFromGit(projectName)) ??
      (await this.deployFromLocalBuild(projectName, options.path ?? '.', options.envVars));

    const url = await this.waitForDeployment(deployment.id);

    return {
      url: `https://${url}`,
      serviceId: projectName,
    };
  }

  async getStatus(projectId: string): Promise<StatusResult> {
    try {
      const res = await fetch(`${VERCEL_API}/v9/projects/${projectId}${this.teamQuery()}`, {
        headers: this.headers(),
      });

      if (!res.ok) return { status: 'unknown' };

      const data = (await res.json()) as {
        targets?: { production?: { url?: string } };
        latestDeployments?: Array<{ state: string; url: string }>;
      };

      const latest = data.latestDeployments?.[0];
      const url = latest?.url ?? data.targets?.production?.url;

      return {
        status: mapVercelStatus(latest?.state),
        url: url ? `https://${url}` : undefined,
      };
    } catch {
      return { status: 'unknown' };
    }
  }

  async setEnvVars(projectId: string, vars: Record<string, string>): Promise<EnvVarResult> {
    try {
      for (const [key, value] of Object.entries(vars)) {
        const res = await fetch(
          `${VERCEL_API}/v10/projects/${projectId}/env${this.teamQuery()}`,
          {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify({
              key,
              value,
              type: isPlainEnvVar(key) ? 'plain' : 'encrypted',
              target: ['production', 'preview', 'development'],
            }),
          }
        );

        if (!res.ok) {
          const err = await res.text();
          if (res.status === 409 || err.includes('already exists')) {
            await this.updateEnvVar(projectId, key, value);
          } else {
            throw new Error(`Vercel env error: ${err}`);
          }
        }
      }
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async updateEnvVar(projectId: string, key: string, value: string): Promise<void> {
    const listRes = await fetch(
      `${VERCEL_API}/v9/projects/${projectId}/env${this.teamQuery()}`,
      { headers: this.headers() }
    );
    const envs = (await listRes.json()) as { envs: Array<{ id: string; key: string }> };
    const existing = envs.envs?.find((e) => e.key === key);
    if (!existing) return;

    await fetch(`${VERCEL_API}/v9/projects/${projectId}/env/${existing.id}${this.teamQuery()}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ value }),
    });
  }

  async *getLogs(projectId: string): AsyncIterable<string> {
    const status = await this.getStatus(projectId);
    yield `[vercel] Project ${projectId} — status: ${status.status}${status.url ? ` (${status.url})` : ''}`;
    yield `[vercel] Use Vercel dashboard for build logs`;
  }

  async destroy(projectId: string): Promise<DestroyResult> {
    try {
      const res = await fetch(`${VERCEL_API}/v9/projects/${projectId}${this.teamQuery()}`, {
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

  /** Find an existing Vercel project by name or create one. */
  async ensureProject(
    name: string,
    options?: { framework?: string; rootDirectory?: string }
  ): Promise<string> {
    const existing = await fetch(`${VERCEL_API}/v9/projects/${name}${this.teamQuery()}`, {
      headers: this.headers(),
    });

    if (existing.ok) {
      const data = (await existing.json()) as { name: string };
      return data.name;
    }

    const res = await fetch(`${VERCEL_API}/v11/projects${this.teamQuery()}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        name,
        framework: options?.framework,
        rootDirectory: options?.rootDirectory,
      }),
    });

    if (!res.ok) {
      throw new Error(`Vercel project create failed: ${await res.text()}`);
    }

    const data = (await res.json()) as { name: string };
    return data.name;
  }

  private async getProject(projectName: string): Promise<VercelProject | null> {
    const res = await fetch(`${VERCEL_API}/v9/projects/${projectName}${this.teamQuery()}`, {
      headers: this.headers(),
    });
    if (!res.ok) return null;
    return res.json() as Promise<VercelProject>;
  }

  /** Redeploy from Git when the Vercel project is linked to a repo. */
  private async tryDeployFromGit(projectName: string): Promise<{ id: string } | null> {
    const project = await this.getProject(projectName);
    if (!project?.link || project.link.type !== 'github' || !project.link.repoId) {
      return null;
    }

    const res = await fetch(`${VERCEL_API}/v13/deployments${this.teamQuery()}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        name: projectName,
        project: project.id,
        target: 'production',
        gitSource: {
          type: 'github',
          ref: project.link.productionBranch ?? 'main',
          repoId: project.link.repoId,
        },
      }),
    });

    if (!res.ok) return null;
    return res.json() as Promise<{ id: string }>;
  }

  /** Build locally (Vite embeds VITE_* at build time) and upload dist/ to Vercel. */
  private async deployFromLocalBuild(
    projectName: string,
    appPath: string,
    envVars?: Record<string, string>
  ): Promise<{ id: string }> {
    await this.clearProjectBuildSettings(projectName);
    const distDir = this.buildLocal(appPath, envVars);
    const files = this.collectFiles(distDir);
    if (files.length === 0) {
      throw new Error(`No build output found in ${distDir}`);
    }
    return this.createDeploymentFromFiles(projectName, files);
  }

  /** Prebuilt uploads should not use monorepo rootDirectory — only uploaded files deploy. */
  private async clearProjectBuildSettings(projectName: string): Promise<void> {
    const project = await this.getProject(projectName);
    if (!project) return;

    await fetch(`${VERCEL_API}/v9/projects/${project.id}${this.teamQuery()}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({
        rootDirectory: null,
        framework: null,
        buildCommand: null,
        installCommand: null,
        outputDirectory: null,
      }),
    });
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

  private collectFiles(distDir: string): VercelFile[] {
    const files: VercelFile[] = [];

    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
          continue;
        }

        const relPath = relative(distDir, fullPath).replace(/\\/g, '/');
        const buf = readFileSync(fullPath);
        const ext = extname(entry.name).toLowerCase();

        if (TEXT_EXTENSIONS.has(ext)) {
          files.push({ file: relPath, data: buf.toString('utf-8'), encoding: 'utf-8' });
        } else {
          files.push({ file: relPath, data: buf.toString('base64'), encoding: 'base64' });
        }
      }
    };

    walk(distDir);
    return files;
  }

  private async createDeploymentFromFiles(
    projectName: string,
    files: VercelFile[]
  ): Promise<{ id: string }> {
    const project = await this.getProject(projectName);
    if (!project) {
      throw new Error(`Vercel project not found: ${projectName}`);
    }

    const res = await fetch(`${VERCEL_API}/v13/deployments${this.teamQuery()}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        name: projectName,
        project: project.id,
        target: 'production',
        files,
        projectSettings: {
          framework: null,
          buildCommand: null,
          installCommand: null,
          outputDirectory: null,
          rootDirectory: null,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Vercel deployment failed: ${await res.text()}`);
    }

    return res.json() as Promise<{ id: string }>;
  }

  private async waitForDeployment(deploymentId: string, maxAttempts = 60): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      const res = await fetch(
        `${VERCEL_API}/v13/deployments/${deploymentId}${this.teamQuery()}`,
        { headers: this.headers() }
      );

      if (!res.ok) {
        await sleep(5000);
        continue;
      }

      const data = (await res.json()) as {
        readyState: string;
        url: string;
        alias?: string[];
        errorMessage?: string;
      };
      if (data.readyState === 'READY') {
        return data.alias?.[0] ?? data.url;
      }
      if (data.readyState === 'ERROR' || data.readyState === 'CANCELED') {
        throw new Error(data.errorMessage ?? `Vercel deployment ${data.readyState}`);
      }

      await sleep(5000);
    }
    throw new Error('Vercel deployment timed out');
  }
}

function isPlainEnvVar(key: string): boolean {
  return key.startsWith('NEXT_PUBLIC_') || key.startsWith('VITE_') || key.startsWith('PUBLIC_');
}

function mapVercelStatus(state?: string): StatusResult['status'] {
  switch (state) {
    case 'READY':
      return 'live';
    case 'BUILDING':
    case 'INITIALIZING':
      return 'building';
    case 'QUEUED':
      return 'pending';
    case 'ERROR':
    case 'CANCELED':
      return 'failed';
    default:
      return 'unknown';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createVercelLock(token: string, teamId?: string): VercelLock {
  return new VercelLock({ token, teamId });
}
