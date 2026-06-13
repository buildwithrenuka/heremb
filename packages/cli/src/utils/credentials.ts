import Conf from 'conf';
import type { Credentials } from '@heramb/core';

const store = new Conf<{ keys: Credentials }>({
  projectName: 'heramb',
  cwd: `${process.env.HOME ?? process.env.USERPROFILE}/.heramb`,
  configName: 'keys',
  defaults: { keys: {} },
});

export function loadCredentials(): Credentials {
  return store.get('keys');
}

export function saveCredential(provider: string, data: Record<string, string>): void {
  const keys = loadCredentials();
  keys[provider] = { ...keys[provider], ...data };
  store.set('keys', keys);
}

export function getProviderToken(provider: string): string | undefined {
  const fromStore = loadCredentials()[provider]?.token;
  if (fromStore) return fromStore;

  const envKeys: Record<string, string[]> = {
    railway: ['RAILWAY_TOKEN'],
    vercel: ['VERCEL_TOKEN'],
    upstash: ['UPSTASH_API_KEY', 'UPSTASH_TOKEN'],
    render: ['RENDER_API_KEY'],
    netlify: ['NETLIFY_TOKEN'],
    heroku: ['HEROKU_API_KEY'],
  };

  for (const key of envKeys[provider] ?? []) {
    if (process.env[key]) return process.env[key];
  }

  return undefined;
}

export function getProviderCredential(provider: string, field: string): string | undefined {
  const fromStore = loadCredentials()[provider]?.[field];
  if (fromStore) return fromStore;

  if (provider === 'upstash' && field === 'email') {
    return process.env.UPSTASH_EMAIL;
  }
  if (provider === 'vercel' && field === 'teamId') {
    return process.env.VERCEL_TEAM_ID;
  }

  return undefined;
}

export function requireProviderToken(provider: string): string {
  const token = getProviderToken(provider);
  if (!token) {
    throw new Error(`Key not found — run \`heramb init\` to add your ${provider} token`);
  }
  return token;
}

export function getCredentialsPath(): string {
  return store.path;
}
