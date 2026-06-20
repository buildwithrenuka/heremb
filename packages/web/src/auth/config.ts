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
    const hint = import.meta.env.DEV
      ? 'Start it with: npm run dev:all (or npm run dev:api in another terminal)'
      : 'Check that the API is running and CORS allows your frontend URL (run heramb deploy to sync WEB_URL)';
    super(`Cannot reach Heramb API. ${hint}`);
    this.name = 'ApiConnectionError';
  }
}
