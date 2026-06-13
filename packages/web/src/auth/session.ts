const SESSION_KEY = 'heramb_session';
const TOKEN_KEY = 'heramb_token';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  provider: string;
}

export function saveSession(user: SessionUser, token: string): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getSessionUser(): SessionUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const token = getToken();
    if (!raw || !token) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    clearSession();
    return null;
  }
}

/** Optional keys stored in localStorage (mirrors ~/.heramb/keys.json for web UI) */
const KEYS_STORAGE = 'heramb_provider_keys';
const AI_KEY_STORAGE = 'heramb_openai_key';

export function saveProviderKeys(keys: Record<string, Record<string, string>>): void {
  localStorage.setItem(KEYS_STORAGE, JSON.stringify(keys));
}

export function loadProviderKeys(): Record<string, Record<string, string>> {
  try {
    const raw = localStorage.getItem(KEYS_STORAGE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveAiKey(key: string): void {
  if (key) localStorage.setItem(AI_KEY_STORAGE, key);
  else localStorage.removeItem(AI_KEY_STORAGE);
}

export function loadAiKey(): string {
  return localStorage.getItem(AI_KEY_STORAGE) ?? '';
}
