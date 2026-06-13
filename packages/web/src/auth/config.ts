/** API base for fetch — empty in dev uses Vite proxy to localhost:3001 */
export function getApiBase(): string {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  if (import.meta.env.DEV) return '';
  return 'http://localhost:3001';
}

/** Full API URL for browser redirects (OAuth) — must hit API port directly */
export function getOAuthBase(): string {
  return (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
}

export class ApiConnectionError extends Error {
  constructor() {
    super(
      'Cannot reach Heramb API. Start it with: npm run dev:all (or npm run dev:api in another terminal)'
    );
    this.name = 'ApiConnectionError';
  }
}
