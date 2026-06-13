import { z } from 'zod';
import type { Env } from '../config.js';
import { loginWithGithubToken } from './github-token.js';
import {
  verifyRailwayToken,
  verifyUpstash,
  verifyVercelToken,
} from './provider-tokens.js';
import { upsertOAuthUser } from './service.js';

export const LocksLoginSchema = z
  .object({
    github: z.string().optional(),
    railway: z.string().optional(),
    vercel: z.string().optional(),
    upstashEmail: z.string().email().optional(),
    upstashApiKey: z.string().optional(),
  })
  .refine(
    (data) => Boolean(data.github || data.railway || data.vercel),
    { message: 'Provide at least one token: GitHub, Railway, or Vercel' }
  );

export type LocksLoginInput = z.infer<typeof LocksLoginSchema>;

export interface VerifiedLocks {
  github?: string;
  railway?: string;
  vercel?: string;
  upstashEmail?: string;
  upstashApiKey?: string;
}

async function identityFromRailway(token: string) {
  const res = await fetch('https://backboard.railway.app/graphql/v2', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `query { me { id email name } }`,
    }),
  });

  if (!res.ok) throw new Error('Invalid Railway token');

  const data = (await res.json()) as {
    data?: { me?: { id: string; email: string; name: string | null } };
    errors?: Array<{ message: string }>;
  };

  const me = data.data?.me;
  if (!me?.email) throw new Error('Invalid Railway token — could not read account');

  return {
    provider: 'railway' as const,
    id: me.id,
    name: me.name ?? me.email.split('@')[0]!,
    email: me.email,
    avatarUrl: undefined,
  };
}

async function identityFromVercel(token: string) {
  const res = await fetch('https://api.vercel.com/v2/user', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error('Invalid Vercel token');

  const user = (await res.json()) as {
    user?: { id: string; email: string; name?: string; username: string };
  };

  const u = user.user;
  if (!u?.email) throw new Error('Invalid Vercel token — could not read account');

  return {
    provider: 'vercel' as const,
    id: u.id,
    name: u.name ?? u.username,
    email: u.email,
    avatarUrl: undefined,
  };
}

export async function loginWithLocks(env: Env, input: LocksLoginInput) {
  const verified: VerifiedLocks = {};

  if (input.github) {
    const gh = await loginWithGithubToken(env, input.github);
    verified.github = input.github;

    if (input.railway) {
      if (!(await verifyRailwayToken(input.railway))) throw new Error('Invalid Railway token');
      verified.railway = input.railway;
    }
    if (input.vercel) {
      if (!(await verifyVercelToken(input.vercel))) throw new Error('Invalid Vercel token');
      verified.vercel = input.vercel;
    }
    if (input.upstashEmail && input.upstashApiKey) {
      if (!(await verifyUpstash(input.upstashEmail, input.upstashApiKey))) {
        throw new Error('Invalid Upstash credentials');
      }
      verified.upstashEmail = input.upstashEmail;
      verified.upstashApiKey = input.upstashApiKey;
    }

    return {
      token: gh.token,
      user: gh.user,
      locks: verified,
    };
  }

  let identity;
  if (input.railway) {
    if (!(await verifyRailwayToken(input.railway))) throw new Error('Invalid Railway token');
    verified.railway = input.railway;
    identity = await identityFromRailway(input.railway);
  } else if (input.vercel) {
    if (!(await verifyVercelToken(input.vercel))) throw new Error('Invalid Vercel token');
    verified.vercel = input.vercel;
    identity = await identityFromVercel(input.vercel);
  } else {
    throw new Error('Provide at least one token');
  }

  if (input.upstashEmail && input.upstashApiKey) {
    if (!(await verifyUpstash(input.upstashEmail, input.upstashApiKey))) {
      throw new Error('Invalid Upstash credentials');
    }
    verified.upstashEmail = input.upstashEmail;
    verified.upstashApiKey = input.upstashApiKey;
  }

  const session = await upsertOAuthUser(env, identity.provider, {
    id: identity.id,
    name: identity.name,
    email: identity.email,
    avatarUrl: identity.avatarUrl,
  });

  return {
    token: session.token,
    user: session.user,
    locks: verified,
  };
}

export function authMethods(env: Env) {
  return {
    emailPassword: true,
    githubToken: true,
    railwayToken: true,
    vercelToken: true,
    upstashCredentials: true,
    githubOAuth: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
    googleOAuth: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  };
}
