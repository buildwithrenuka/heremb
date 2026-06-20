export type BackendProvider = 'railway' | 'render' | 'fly' | 'heroku';
export type FrontendProvider = 'vercel' | 'netlify' | 'cloudflare-pages';
export type CacheProvider = 'upstash';
export type FrontendFramework = 'vite' | 'next' | 'other';

export interface SetupState {
  projectName: string;
  repoUrl: string;
  branch: string;
  hasBackend: boolean;
  hasFrontend: boolean;
  hasRedis: boolean;
  backendPath: string;
  frontendPath: string;
  backendProvider: BackendProvider;
  frontendProvider: FrontendProvider;
  cacheProvider: CacheProvider;
  frontendFramework: FrontendFramework;
  railwayProjectId: string;
  railwayServiceId: string;
  vercelProjectName: string;
  checklistDone: Record<string, boolean>;
  wizardStep: number;
}

export const DEFAULT_SETUP: SetupState = {
  projectName: '',
  repoUrl: '',
  branch: 'main',
  hasBackend: true,
  hasFrontend: true,
  hasRedis: false,
  backendPath: './packages/api',
  frontendPath: './packages/web',
  backendProvider: 'railway',
  frontendProvider: 'vercel',
  cacheProvider: 'upstash',
  frontendFramework: 'vite',
  railwayProjectId: '',
  railwayServiceId: '',
  vercelProjectName: '',
  checklistDone: {},
  wizardStep: 0,
};

export interface PlatformOption {
  id: string;
  name: string;
  role: string;
  implemented: boolean;
  note?: string;
}
