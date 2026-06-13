export const DEPLOY_STEPS = [
  { id: 1, label: 'Provisioning Redis...', value: 'redis://xxx.railway.internal', status: 'done' as const },
  { id: 2, label: 'Setting backend env vars...', value: '6 vars pushed to Railway', status: 'done' as const },
  { id: 3, label: 'Deploying backend...', value: 'https://api-xxx.up.railway.app', status: 'done' as const },
  { id: 4, label: 'Deriving WS URL...', value: 'wss://api-xxx.up.railway.app', status: 'done' as const },
  { id: 5, label: 'Setting frontend env vars...', value: '3 vars pushed to Vercel', status: 'done' as const },
  { id: 6, label: 'Deploying frontend...', value: 'https://my-app.vercel.app', status: 'done' as const },
  { id: 7, label: 'Patching CORS_ORIGIN...', value: 'Railway env updated', status: 'done' as const },
  { id: 8, label: 'Redeploying backend...', value: 'CORS live', status: 'done' as const },
  { id: 9, label: 'Verifying CORS...', value: 'preflight request OK', status: 'done' as const },
  { id: 10, label: 'Testing WebSocket...', value: 'handshake OK (42ms)', status: 'done' as const },
];

export const SERVICES = [
  { name: 'redis', provider: 'upstash', status: 'live' as const, url: 'rediss://***' },
  { name: 'backend', provider: 'railway', status: 'live' as const, url: 'https://api-xxx.up.railway.app' },
  { name: 'frontend', provider: 'vercel', status: 'live' as const, url: 'https://my-app.vercel.app' },
];

export const FEATURES = [
  {
    title: 'Dependency graph engine',
    desc: 'Deploys in the right order — Redis, backend, frontend, CORS patch. No copy-pasting URLs.',
    icon: '⛓',
  },
  {
    title: 'CORS solved automatically',
    desc: 'The chicken-and-egg problem between Railway and Vercel? Handled. Patched and verified every deploy.',
    icon: '🛡',
  },
  {
    title: 'WebSocket smoke tests',
    desc: 'Socket.io + Redis adapter detected at init. WS handshake tested before we call it done.',
    icon: '⚡',
  },
  {
    title: 'Zero AI on happy path',
    desc: 'Clean deploys use zero tokens. AI only fires when something genuinely unexpected breaks.',
    icon: '🎯',
  },
  {
    title: 'Preview environments',
    desc: 'One command per branch. Fresh Redis, wired CORS, unique preview URLs — every PR.',
    icon: '🌿',
  },
  {
    title: 'Provider locks',
    desc: 'Railway, Vercel, Upstash today. Render, Netlify, Fly.io planned. Same CLI everywhere.',
    icon: '🔒',
  },
];

export const INSTALL_CMD = 'npx @heramb/cli init && npx @heramb/cli deploy';
