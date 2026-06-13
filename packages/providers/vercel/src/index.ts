import type {
  DeployOptions,
  DeployResult,
  DestroyResult,
  EnvVarResult,
  ProviderLock,
  StatusResult,
} from '@heramb/core';

const VERCEL_API = 'https://api.vercel.com';

export interface VercelLockOptions {
  token: string;
  teamId?: string;
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
    const { projectId, serviceId, envVars } = options;
    const projectName = projectId ?? serviceId ?? options.name;

    if (!projectName) {
      throw new Error('Vercel deploy requires projectId or name in heramb.config.json');
    }

    if (envVars) {
      await this.setEnvVars(projectName, envVars);
    }

    const deployment = await this.createDeployment(projectName);
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
              type: key.startsWith('NEXT_PUBLIC_') ? 'plain' : 'encrypted',
              target: ['production', 'preview', 'development'],
            }),
          }
        );

        if (!res.ok) {
          const err = await res.text();
          // Upsert: try PATCH if env var exists
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

  private async createDeployment(projectName: string): Promise<{ id: string }> {
    const res = await fetch(`${VERCEL_API}/v13/deployments${this.teamQuery()}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        name: projectName,
        project: projectName,
        target: 'production',
        gitSource: undefined,
      }),
    });

    if (!res.ok) {
      // Fallback: trigger redeploy via project hook
      const projectRes = await fetch(
        `${VERCEL_API}/v9/projects/${projectName}${this.teamQuery()}`,
        { headers: this.headers() }
      );
      if (projectRes.ok) {
        const project = (await projectRes.json()) as { id: string };
        return { id: project.id };
      }
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

      const data = (await res.json()) as { readyState: string; url: string };
      if (data.readyState === 'READY') return data.url;
      if (data.readyState === 'ERROR' || data.readyState === 'CANCELED') {
        throw new Error(`Vercel deployment ${data.readyState}`);
      }

      await sleep(5000);
    }
    throw new Error('Vercel deployment timed out');
  }
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
