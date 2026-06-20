import type { SetupState } from './types';

export interface ChecklistItem {
  id: string;
  title: string;
  body: string;
  code?: string;
}

export interface ChecklistSection {
  id: string;
  title: string;
  platform: string;
  when: (state: SetupState) => boolean;
  items: ChecklistItem[];
}

export const CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    id: 'tokens',
    title: 'Provider tokens',
    platform: 'Heramb',
    when: () => true,
    items: [
      {
        id: 'railway-token',
        title: 'Railway API token',
        body: 'Create at railway.app/account/tokens — same account as your project.',
        code: 'npm run heramb -- init   # or paste in Settings',
      },
      {
        id: 'vercel-token',
        title: 'Vercel API token',
        body: 'Create at vercel.com/account/tokens.',
      },
    ],
  },
  {
    id: 'railway',
    title: 'Railway — backend (one-time)',
    platform: 'Railway',
    when: (s) => s.hasBackend && s.backendProvider === 'railway',
    items: [
      {
        id: 'railway-project',
        title: 'Create Railway project',
        body: 'New project → Deploy from GitHub → select your repo.',
      },
      {
        id: 'railway-service',
        title: 'Configure the API service',
        body: 'Open the backend service (not Postgres/Redis plugins). Set root directory and commands:',
        code: `Root directory: ./packages/api\nBuild: npm install && npm run build\nStart: npm start`,
      },
      {
        id: 'railway-ids',
        title: 'Copy Project ID & Service ID',
        body: 'Project → Settings → Project ID. Service → Settings → Service ID. Paste in step 2 of this wizard.',
      },
      {
        id: 'railway-jwt',
        title: 'Set JWT_SECRET',
        body: 'Railway → Variables → add JWT_SECRET (long random string). Or create .env locally and run heramb env push.',
      },
      {
        id: 'railway-first-deploy',
        title: 'First deploy in Railway dashboard',
        body: 'Click Deploy and wait for green ✓. Heramb triggers redeploys after that — it cannot create the first GitHub-linked deployment yet.',
      },
    ],
  },
  {
    id: 'vercel',
    title: 'Vercel — frontend',
    platform: 'Vercel',
    when: (s) => s.hasFrontend && s.frontendProvider === 'vercel',
    items: [
      {
        id: 'vercel-project',
        title: 'Vercel project name',
        body: 'Heramb can create heramb-frontend on first deploy, or link your repo in Vercel with root directory set to your frontend path.',
      },
      {
        id: 'vercel-protection',
        title: 'Disable Deployment Protection (optional)',
        body: 'If the site shows “Authentication Required”, turn off Deployment Protection in Vercel project Settings.',
      },
    ],
  },
  {
    id: 'cli',
    title: 'Run from your repo',
    platform: 'CLI',
    when: () => true,
    items: [
      {
        id: 'save-config',
        title: 'Save heramb.config.json',
        body: 'Copy the generated config below to your repo root as heramb.config.json.',
      },
      {
        id: 'run-deploy',
        title: 'Deploy',
        body: 'From repo root after tokens and Railway first deploy:',
        code: 'npx @heramb1/cli deploy\nnpx @heramb1/cli deploy --backend-only   # backend first',
      },
    ],
  },
];

export function visibleChecklists(state: SetupState): ChecklistSection[] {
  return CHECKLIST_SECTIONS.filter((s) => s.when(state)).map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      code: item.code
        ? item.code.replace('./packages/api', state.backendPath)
        : undefined,
    })),
  }));
}

export function checklistProgress(state: SetupState): { done: number; total: number } {
  const sections = visibleChecklists(state);
  const ids = sections.flatMap((s) => s.items.map((i) => i.id));
  const done = ids.filter((id) => state.checklistDone[id]).length;
  return { done, total: ids.length };
}
