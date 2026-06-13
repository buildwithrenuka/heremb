import type { Env } from '../config.js';
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByProvider,
  hashPassword,
  publicUser,
  updateUser,
  verifyPassword,
} from '../store/users.js';
import { signToken } from './jwt.js';

export async function registerUser(
  env: Env,
  input: { name: string; email: string; password: string }
) {
  if (findUserByEmail(input.email)) {
    throw new Error('Email already registered');
  }

  const user = createUser({
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    passwordHash: hashPassword(input.password),
    provider: 'email',
  });

  const token = await signToken(user.id, env.JWT_SECRET);
  return { token, user: publicUser(user) };
}

export async function loginUser(env: Env, input: { email: string; password: string }) {
  const user = findUserByEmail(input.email);
  if (!user?.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
    throw new Error('Invalid email or password');
  }

  const token = await signToken(user.id, env.JWT_SECRET);
  return { token, user: publicUser(user) };
}

export async function upsertOAuthUser(
  env: Env,
  provider: 'github' | 'google' | 'railway' | 'vercel',
  profile: { id: string; name: string; email: string; avatarUrl?: string }
) {
  let user =
    findUserByProvider(provider, profile.id) ??
    findUserByEmail(profile.email);

  if (user) {
    user =
      updateUser(user.id, {
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        provider,
        providerId: profile.id,
      }) ?? user;
  } else {
    user = createUser({
      name: profile.name,
      email: profile.email.toLowerCase(),
      avatarUrl: profile.avatarUrl,
      provider,
      providerId: profile.id,
    });
  }

  const token = await signToken(user.id, env.JWT_SECRET);
  return { token, user: publicUser(user) };
}

export function getMe(userId: string) {
  const user = findUserById(userId);
  if (!user) throw new Error('User not found');
  return publicUser(user);
}

export function buildOAuthRedirect(env: Env, token: string): string {
  const url = new URL('/auth/callback', env.WEB_URL);
  url.searchParams.set('token', token);
  return url.toString();
}
