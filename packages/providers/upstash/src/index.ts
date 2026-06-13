import type { CacheLock, DestroyResult } from '@heramb/core';

const UPSTASH_API = 'https://api.upstash.com/v2/redis/database';

export interface UpstashLockOptions {
  email: string;
  apiKey: string;
}

export class UpstashLock implements CacheLock {
  readonly name = 'upstash';
  private email: string;
  private apiKey: string;

  constructor(options: UpstashLockOptions) {
    this.email = options.email;
    this.apiKey = options.apiKey;
  }

  private headers(): Record<string, string> {
    const encoded = Buffer.from(`${this.email}:${this.apiKey}`).toString('base64');
    return {
      Authorization: `Basic ${encoded}`,
      'Content-Type': 'application/json',
    };
  }

  async provision(options?: { name?: string; region?: string }): Promise<{ url: string; serviceId: string }> {
    const name = options?.name ?? `heramb-redis-${Date.now()}`;
    const region = options?.region ?? 'us-east-1';

    const res = await fetch(UPSTASH_API, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        name,
        region,
        primary_region: region,
        tls: true,
      }),
    });

    if (!res.ok) {
      throw new Error(`Upstash provision failed: ${await res.text()}`);
    }

    const data = (await res.json()) as {
      database_id: string;
      endpoint: string;
      password: string;
      port: number;
    };

    const url = `rediss://default:${data.password}@${data.endpoint}:${data.port}`;

    return {
      url,
      serviceId: data.database_id,
    };
  }

  async destroy(serviceId: string): Promise<DestroyResult> {
    try {
      const res = await fetch(`${UPSTASH_API}/${serviceId}`, {
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
}

export function createUpstashLock(email: string, apiKey: string): UpstashLock {
  return new UpstashLock({ email, apiKey });
}
