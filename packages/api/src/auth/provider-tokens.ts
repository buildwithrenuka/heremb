import { z } from 'zod';

export const GithubTokenSchema = z.object({
  token: z.string().min(1, 'GitHub token is required'),
});

export const ProviderTokensSchema = z.object({
  github: z.string().optional(),
  railway: z.string().optional(),
  vercel: z.string().optional(),
  upstashEmail: z.string().email().optional(),
  upstashApiKey: z.string().optional(),
});

export async function verifyRailwayToken(token: string): Promise<boolean> {
  try {
    const res = await fetch('https://backboard.railway.app/graphql/v2', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: '{ me { id email } }' }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { data?: { me?: { id: string } } };
    return Boolean(data.data?.me?.id);
  } catch {
    return false;
  }
}

export async function verifyVercelToken(token: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.vercel.com/v2/user', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function verifyUpstash(email: string, apiKey: string): Promise<boolean> {
  try {
    const encoded = Buffer.from(`${email}:${apiKey}`).toString('base64');
    const res = await fetch('https://api.upstash.com/v2/redis/databases', {
      headers: { Authorization: `Basic ${encoded}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
