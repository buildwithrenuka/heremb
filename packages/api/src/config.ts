import { z } from 'zod';

export const RegisterSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type Env = {
  JWT_SECRET: string;
  WEB_URL: string;
  API_URL: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
};

export function loadEnv(): Env {
  const JWT_SECRET = process.env.JWT_SECRET ?? 'heramb-dev-secret-change-in-production';
  const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173';
  const API_URL = process.env.API_URL ?? 'http://localhost:3001';

  return {
    JWT_SECRET,
    WEB_URL,
    API_URL,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  };
}

const oauthStates = new Map<string, { provider: 'github' | 'google'; expires: number }>();

export function createOAuthState(provider: 'github' | 'google'): string {
  const state = randomState();
  oauthStates.set(state, { provider, expires: Date.now() + 10 * 60 * 1000 });
  return state;
}

export function consumeOAuthState(state: string, provider: 'github' | 'google'): boolean {
  const entry = oauthStates.get(state);
  oauthStates.delete(state);
  if (!entry || entry.provider !== provider || entry.expires < Date.now()) return false;
  return true;
}

function randomState(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('base64url');
}
