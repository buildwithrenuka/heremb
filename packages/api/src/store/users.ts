import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  avatarUrl?: string;
  provider?: 'email' | 'github' | 'google' | 'railway' | 'vercel';
  providerId?: string;
  createdAt: string;
}

const DATA_DIR = join(homedir(), '.heramb');
const USERS_FILE = join(DATA_DIR, 'users.json');

function ensureStore(): User[] {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(USERS_FILE)) {
    writeFileSync(USERS_FILE, '[]\n');
    return [];
  }
  return JSON.parse(readFileSync(USERS_FILE, 'utf-8')) as User[];
}

function saveUsers(users: User[]): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2) + '\n');
}

export function listUsers(): User[] {
  return ensureStore();
}

export function findUserByEmail(email: string): User | undefined {
  const normalized = email.trim().toLowerCase();
  return ensureStore().find((u) => u.email.toLowerCase() === normalized);
}

export function findUserById(id: string): User | undefined {
  return ensureStore().find((u) => u.id === id);
}

export function findUserByProvider(provider: string, providerId: string): User | undefined {
  return ensureStore().find((u) => u.provider === provider && u.providerId === providerId);
}

export function createUser(input: Omit<User, 'id' | 'createdAt'>): User {
  const users = ensureStore();
  const user: User = {
    ...input,
    id: randomBytes(12).toString('hex'),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);
  return user;
}

export function updateUser(id: string, patch: Partial<User>): User | undefined {
  const users = ensureStore();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return undefined;
  users[idx] = { ...users[idx]!, ...patch };
  saveUsers(users);
  return users[idx];
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, saltHex, hashHex] = stored.split('$');
  if (algo !== 'scrypt' || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, salt, 32);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    provider: user.provider ?? 'email',
  };
}
