export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'heramb-theme';

export function getStoredTheme(): Theme | null {
  const value = localStorage.getItem(STORAGE_KEY);
  if (value === 'light' || value === 'dark') return value;
  return null;
}

export function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getInitialTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
}
