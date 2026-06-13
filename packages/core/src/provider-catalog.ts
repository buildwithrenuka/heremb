import type { StackDetection } from './types.js';

export type ServiceRole = 'frontend' | 'backend' | 'cache';

export interface ProviderCapabilities {
  id: string;
  name: string;
  roles: ServiceRole[];
  /** Lock driver is wired in the CLI today */
  implemented: boolean;
  websocket: 'full' | 'limited' | 'none';
  /** Host managed Redis on this platform */
  managedRedis: boolean;
  longRunningServer: boolean;
  staticHosting: boolean;
  ssr: boolean;
  signupUrl: string;
  tokenUrl: string;
}

export interface ProjectRequirements {
  frontend: boolean;
  backend: boolean;
  websocket: boolean;
  redis: boolean;
  longRunning: boolean;
}

export interface ProviderRecommendation {
  provider: string;
  name: string;
  score: number;
  reasons: string[];
  blockers: string[];
  implemented: boolean;
}

export interface ServiceDeployPlan {
  role: ServiceRole;
  label: string;
  path?: string;
  requirements: string[];
  recommendations: ProviderRecommendation[];
  warnings: string[];
}

export interface DeployPlan {
  requirements: ProjectRequirements;
  services: ServiceDeployPlan[];
  summary: string[];
}

export const PROVIDER_CATALOG: ProviderCapabilities[] = [
  {
    id: 'railway',
    name: 'Railway',
    roles: ['backend', 'cache'],
    implemented: true,
    websocket: 'full',
    managedRedis: true,
    longRunningServer: true,
    staticHosting: false,
    ssr: false,
    signupUrl: 'https://railway.app',
    tokenUrl: 'https://railway.app/account/tokens',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    roles: ['frontend', 'backend'],
    implemented: true,
    websocket: 'limited',
    managedRedis: false,
    longRunningServer: false,
    staticHosting: true,
    ssr: true,
    signupUrl: 'https://vercel.com/signup',
    tokenUrl: 'https://vercel.com/account/tokens',
  },
  {
    id: 'upstash',
    name: 'Upstash',
    roles: ['cache'],
    implemented: true,
    websocket: 'none',
    managedRedis: true,
    longRunningServer: false,
    staticHosting: false,
    ssr: false,
    signupUrl: 'https://console.upstash.com',
    tokenUrl: 'https://console.upstash.com/account/api',
  },
  {
    id: 'render',
    name: 'Render',
    roles: ['backend', 'frontend', 'cache'],
    implemented: false,
    websocket: 'full',
    managedRedis: true,
    longRunningServer: true,
    staticHosting: true,
    ssr: false,
    signupUrl: 'https://render.com',
    tokenUrl: 'https://dashboard.render.com/u/settings#api-keys',
  },
  {
    id: 'fly',
    name: 'Fly.io',
    roles: ['backend'],
    implemented: false,
    websocket: 'full',
    managedRedis: false,
    longRunningServer: true,
    staticHosting: false,
    ssr: false,
    signupUrl: 'https://fly.io',
    tokenUrl: 'https://fly.io/user/personal_access_tokens',
  },
  {
    id: 'netlify',
    name: 'Netlify',
    roles: ['frontend', 'backend'],
    implemented: false,
    websocket: 'limited',
    managedRedis: false,
    longRunningServer: false,
    staticHosting: true,
    ssr: true,
    signupUrl: 'https://app.netlify.com/signup',
    tokenUrl: 'https://app.netlify.com/user/applications#personal-access-tokens',
  },
  {
    id: 'cloudflare-pages',
    name: 'Cloudflare Pages',
    roles: ['frontend'],
    implemented: false,
    websocket: 'none',
    managedRedis: false,
    longRunningServer: false,
    staticHosting: true,
    ssr: true,
    signupUrl: 'https://dash.cloudflare.com/sign-up',
    tokenUrl: 'https://dash.cloudflare.com/profile/api-tokens',
  },
  {
    id: 'heroku',
    name: 'Heroku',
    roles: ['backend', 'cache'],
    implemented: false,
    websocket: 'full',
    managedRedis: true,
    longRunningServer: true,
    staticHosting: false,
    ssr: false,
    signupUrl: 'https://signup.heroku.com',
    tokenUrl: 'https://dashboard.heroku.com/account/applications/authorizations/new',
  },
];

export function getProvider(id: string): ProviderCapabilities | undefined {
  return PROVIDER_CATALOG.find((p) => p.id === id);
}

export function deriveRequirements(stack: StackDetection): ProjectRequirements {
  return {
    frontend: Boolean(stack.frontend),
    backend: Boolean(stack.backend),
    websocket: Boolean(stack.backend?.hasSocketIo || stack.frontend?.hasSocketIo),
    redis: Boolean(stack.backend?.hasSocketIo),
    longRunning: Boolean(stack.backend?.hasSocketIo || stack.backend?.runtime === 'node'),
  };
}

function scoreProvider(
  provider: ProviderCapabilities,
  role: ServiceRole,
  req: ProjectRequirements
): ProviderRecommendation {
  const blockers: string[] = [];
  const reasons: string[] = [];
  let score = 0;

  if (!provider.roles.includes(role)) {
    blockers.push(`${provider.name} does not host ${role} workloads`);
    return { provider: provider.id, name: provider.name, score: 0, reasons, blockers, implemented: provider.implemented };
  }

  if (role === 'backend') {
    if (req.websocket && provider.websocket === 'none') {
      blockers.push('WebSockets are not supported for backend deploys here');
    } else if (req.websocket && provider.websocket === 'limited') {
      blockers.push('WebSockets are limited — use a long-running server (Railway, Render, Fly.io)');
    } else if (req.websocket && provider.websocket === 'full') {
      score += 30;
      reasons.push('Full WebSocket support');
    }

    if (req.longRunning && !provider.longRunningServer) {
      blockers.push('Your app needs a always-on server, not serverless functions');
    } else if (req.longRunning && provider.longRunningServer) {
      score += 25;
      reasons.push('Long-running server');
    }

    if (req.redis && provider.managedRedis) {
      score += 10;
      reasons.push('Can co-locate Redis');
    }
  }

  if (role === 'frontend') {
    if (provider.staticHosting) {
      score += 20;
      reasons.push('Static / SPA hosting');
    }
    if (provider.ssr) {
      score += 10;
      reasons.push('SSR-capable');
    }
  }

  if (role === 'cache') {
    if (provider.managedRedis) {
      score += 40;
      reasons.push('Managed Redis');
    } else {
      blockers.push('Does not provide Redis');
    }
    if (req.websocket && provider.id === 'upstash') {
      score += 20;
      reasons.push('Works with serverless and edge frontends');
    }
  }

  if (provider.implemented) {
    score += 15;
    reasons.push('Ready in Heramb today');
  } else {
    reasons.push('Planned — lock driver coming soon');
  }

  return {
    provider: provider.id,
    name: provider.name,
    score: blockers.length > 0 ? 0 : score,
    reasons,
    blockers,
    implemented: provider.implemented,
  };
}

export function recommendForRole(
  role: ServiceRole,
  req: ProjectRequirements
): ProviderRecommendation[] {
  return PROVIDER_CATALOG.map((p) => scoreProvider(p, role, req))
    .filter((r) => r.score > 0 || r.blockers.length > 0)
    .sort((a, b) => b.score - a.score);
}

export function buildDeployPlan(stack: StackDetection): DeployPlan {
  const requirements = deriveRequirements(stack);
  const services: ServiceDeployPlan[] = [];
  const summary: string[] = [];

  if (requirements.redis) {
    services.push({
      role: 'cache',
      label: 'Redis',
      requirements: ['Managed Redis for Socket.io multi-instance'],
      recommendations: recommendForRole('cache', requirements),
      warnings: [],
    });
    summary.push('Redis required — Socket.io detected without in-memory-only scaling');
  }

  if (stack.backend) {
    const warnings = [...stack.warnings];
    const recs = recommendForRole('backend', requirements);

    if (requirements.websocket) {
      const bad = recs.filter((r) => r.blockers.some((b) => b.includes('WebSocket')));
      for (const b of bad) {
        warnings.push(`${b.name}: ${b.blockers.join('; ')}`);
      }
    }

    services.push({
      role: 'backend',
      label: 'Backend',
      path: stack.backend.path,
      requirements: [
        requirements.websocket ? 'WebSocket server' : 'HTTP API',
        requirements.longRunning ? 'Always-on process' : 'Request handler',
      ],
      recommendations: recs,
      warnings,
    });
  }

  if (stack.frontend) {
    const warnings: string[] = [];
    if (requirements.websocket) {
      warnings.push(
        'Frontend can live on Cloudflare/Vercel/Netlify — WebSocket server must stay on a backend platform'
      );
    }

    services.push({
      role: 'frontend',
      label: 'Frontend',
      path: stack.frontend.path,
      requirements: [`${stack.frontend.framework} app`],
      recommendations: recommendForRole('frontend', requirements),
      warnings,
    });
  }

  if (!stack.frontend && !stack.backend) {
    summary.push('No frontend or backend detected — run init with a manual heramb.config.json');
  }

  return { requirements, services, summary };
}

export function topProviderForRole(
  role: ServiceRole,
  req: ProjectRequirements,
  preferImplemented = true
): ProviderRecommendation | undefined {
  const ranked = recommendForRole(role, req);
  if (preferImplemented) {
    return ranked.find((r) => r.implemented && r.score > 0) ?? ranked.find((r) => r.score > 0);
  }
  return ranked.find((r) => r.score > 0);
}

export function validateProviderChoice(
  role: ServiceRole,
  providerId: string,
  req: ProjectRequirements
): { ok: boolean; blockers: string[]; warnings: string[] } {
  const provider = getProvider(providerId);
  if (!provider) {
    return { ok: false, blockers: [`Unknown provider: ${providerId}`], warnings: [] };
  }

  const rec = scoreProvider(provider, role, req);
  const warnings: string[] = [];

  if (!provider.implemented) {
    warnings.push(`${provider.name} lock is not implemented yet — config will be saved for a future deploy`);
  }

  return {
    ok: rec.blockers.length === 0 && rec.score > 0,
    blockers: rec.blockers,
    warnings,
  };
}

export function providersNeededForPlan(plan: DeployPlan, choices: Record<ServiceRole, string>): string[] {
  const set = new Set<string>();
  for (const svc of plan.services) {
    const provider = choices[svc.role];
    if (provider) set.add(provider);
  }
  if (plan.requirements.redis && choices.cache === 'upstash') {
    set.add('upstash');
  }
  return [...set];
}
