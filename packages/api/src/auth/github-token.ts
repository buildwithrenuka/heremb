import type { Env } from '../config.js';
import { upsertOAuthUser } from './service.js';

export interface GitHubProfile {
  id: string;
  login: string;
  name: string;
  email: string;
  avatarUrl: string;
}

export async function verifyGithubToken(token: string): Promise<GitHubProfile> {
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'heramb-app',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!userRes.ok) {
    if (userRes.status === 401) throw new Error('Invalid GitHub token — check it has not expired');
    throw new Error(`GitHub API error (${userRes.status})`);
  }

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
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'heramb-app',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      email = emails.find((e) => e.primary && e.verified)?.email ?? emails[0]?.email;
    }
  }

  if (!email) {
    throw new Error(
      'GitHub token needs user:email scope — create one at github.com/settings/tokens'
    );
  }

  return {
    id: String(ghUser.id),
    login: ghUser.login,
    name: ghUser.name ?? ghUser.login,
    email,
    avatarUrl: ghUser.avatar_url,
  };
}

export async function loginWithGithubToken(env: Env, token: string) {
  const profile = await verifyGithubToken(token);
  const session = await upsertOAuthUser(env, 'github', {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    avatarUrl: profile.avatarUrl,
  });

  return {
    ...session,
    providerToken: token,
    provider: 'github' as const,
  };
}
