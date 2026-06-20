import { DEFAULT_SETUP, type SetupState } from './types';

const STORAGE_KEY = 'heramb.setup.v1';

export function loadSetup(): SetupState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETUP };
    return { ...DEFAULT_SETUP, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETUP };
  }
}

export function saveSetup(state: SetupState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearSetup(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isSetupComplete(state: SetupState): boolean {
  return Boolean(state.projectName && state.repoUrl && (state.hasBackend || state.hasFrontend));
}

export function repoSlug(url: string): string {
  const match = url.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i);
  if (!match) return '';
  return match[2]!.replace(/\.git$/i, '').toLowerCase();
}
