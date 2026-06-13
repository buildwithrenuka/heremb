import { getToken } from './session';
import type { SessionUser } from './session';
import { saveProviderKeys } from './session';
import { ApiConnectionError, getApiBase, getOAuthBase } from './config';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  let res: Response;

  try {
    res = await fetch(`${getApiBase()}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiConnectionError();
  }

  let data: { error?: string };
  try {
    data = await res.json();
  } catch {
    throw new Error('Invalid response from API');
  }

  if (!res.ok) {
    throw new Error(data.error ?? 'Request failed');
  }
  return data as T;
}

export interface AuthMethods {
  emailPassword: boolean;
  githubToken: boolean;
  railwayToken: boolean;
  vercelToken: boolean;
  upstashCredentials: boolean;
  githubOAuth: boolean;
  googleOAuth: boolean;
}

export interface LocksLoginInput {
  github?: string;
  railway?: string;
  vercel?: string;
  upstashEmail?: string;
  upstashApiKey?: string;
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBase()}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchAuthMethods() {
  return api<AuthMethods>('/auth/methods');
}

export async function login(email: string, password: string) {
  return api<{ token: string; user: SessionUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(name: string, email: string, password: string) {
  return api<{ token: string; user: SessionUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function loginWithLocks(input: LocksLoginInput) {
  const result = await api<{
    token: string;
    user: SessionUser;
    locks: LocksLoginInput;
  }>('/auth/locks', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  persistLocks(result.locks);
  return result;
}

export function persistLocks(locks: LocksLoginInput) {
  const keys: Record<string, Record<string, string>> = {};

  if (locks.github) keys.github = { token: locks.github };
  if (locks.railway) keys.railway = { token: locks.railway };
  if (locks.vercel) keys.vercel = { token: locks.vercel };
  if (locks.upstashEmail && locks.upstashApiKey) {
    keys.upstash = { email: locks.upstashEmail, apiKey: locks.upstashApiKey, token: locks.upstashApiKey };
  }

  if (Object.keys(keys).length > 0) saveProviderKeys(keys);
}

export async function fetchMe() {
  return api<{ user: SessionUser }>('/auth/me');
}

export function oauthUrl(provider: 'github' | 'google'): string {
  return `${getOAuthBase()}/auth/oauth/${provider}`;
}
