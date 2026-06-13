import type { Env } from '../config.js';
import { buildOAuthRedirect, upsertOAuthUser } from './service.js';

export function githubAuthorizeUrl(env: Env, state: string): string {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID!,
    redirect_uri: `${env.API_URL}/auth/oauth/github/callback`,
    scope: 'read:user user:email',
    state,
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

export async function handleGithubCallback(env: Env, code: string): Promise<string> {
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenData.access_token) {
    throw new Error(tokenData.error ?? 'GitHub token exchange failed');
  }

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/json',
      'User-Agent': 'heramb-app',
    },
  });

  const ghUser = (await userRes.json()) as {
    id: number;
    login: string;
    name: string | null;
    avatar_url: string;
    email: string | null;
  };

  let email = ghUser.email;
  if (!email) {
    const emailsRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
        'User-Agent': 'heramb-app',
      },
    });
    const emails = (await emailsRes.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
    email = emails.find((e) => e.primary && e.verified)?.email ?? emails[0]?.email;
  }

  if (!email) throw new Error('GitHub account has no public email — add one in GitHub settings');

  const { token } = await upsertOAuthUser(env, 'github', {
    id: String(ghUser.id),
    name: ghUser.name ?? ghUser.login,
    email,
    avatarUrl: ghUser.avatar_url,
  });

  return buildOAuthRedirect(env, token);
}

export function googleAuthorizeUrl(env: Env, state: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${env.API_URL}/auth/oauth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function handleGoogleCallback(env: Env, code: string): Promise<string> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${env.API_URL}/auth/oauth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenData.access_token) {
    throw new Error(tokenData.error ?? 'Google token exchange failed');
  }

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const profile = (await profileRes.json()) as {
    sub: string;
    name?: string;
    email?: string;
    picture?: string;
  };

  if (!profile.email) throw new Error('Google account has no email');

  const { token } = await upsertOAuthUser(env, 'google', {
    id: profile.sub,
    name: profile.name ?? profile.email.split('@')[0]!,
    email: profile.email,
    avatarUrl: profile.picture,
  });

  return buildOAuthRedirect(env, token);
}
