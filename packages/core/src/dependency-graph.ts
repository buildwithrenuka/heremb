import type { HerambConfig, DeployStep, PatchEnvServiceConfig, ProviderServiceConfig, ServiceConfig } from './types.js';

const DERIVE_PREFIX = '→';

/** Apply derivation rules like "BACKEND_URL → wss://" */
export function applyDerivation(sourceKey: string, sourceValue: string, rule: string): string {
  const parts = rule.split(DERIVE_PREFIX).map((s) => s.trim());
  if (parts.length !== 2 || parts[0] !== sourceKey) {
    throw new Error(`Invalid derivation rule: ${rule}`);
  }

  const transform = parts[1];

  if (transform === 'wss://') {
    return sourceValue.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
  }

  if (transform.startsWith('wss://')) {
    return transform + sourceValue.replace(/^https?:\/\//, '');
  }

  if (transform.startsWith('https://')) {
    return transform + sourceValue.replace(/^https?:\/\//, '');
  }

  // Generic env var alias: "BACKEND_URL" as NEXT_PUBLIC_API_URL
  if (transform === sourceKey) {
    return sourceValue;
  }

  return sourceValue;
}

export function isPatchEnvConfig(config: ServiceConfig): config is PatchEnvServiceConfig {
  return 'action' in config && config.action === 'patch-env';
}

export function isProviderConfig(config: ServiceConfig): config is ProviderServiceConfig {
  return 'provider' in config;
}

/** Build ordered deploy steps from heramb.config.json */
export function buildDeploySteps(config: HerambConfig, options?: {
  skipServices?: string[];
  backendOnly?: boolean;
  frontendOnly?: boolean;
}): DeployStep[] {
  const steps: DeployStep[] = [];
  const skip = new Set(options?.skipServices ?? []);
  const producerMap = buildProducerMap(config);

  const stepIdForNeed = (need: string): string => {
    if (need === 'NEXT_PUBLIC_API_URL' || need === 'VITE_API_URL') return stepIdForNeed('BACKEND_URL');
    if (need === 'NEXT_PUBLIC_WS_URL') return stepIdForNeed('WS_URL');

    const producer = producerMap.get(need);
    if (!producer) return need;
    const prodSvc = config.services[producer];
    if (!prodSvc || !isProviderConfig(prodSvc)) return need;
    if (['upstash', 'redis', 'railway-redis'].includes(prodSvc.provider)) {
      return producer;
    }
    return `${producer}-deploy`;
  };

  const isRedis = (key: string, svc: ServiceConfig) =>
    isProviderConfig(svc) && ['upstash', 'redis', 'railway-redis'].includes(svc.provider);

  const isBackend = (key: string, svc: ServiceConfig) =>
    isProviderConfig(svc) && !isRedis(key, svc) &&
    ['railway', 'render', 'fly', 'heroku'].includes(svc.provider);

  const isFrontend = (key: string, svc: ServiceConfig) =>
    isProviderConfig(svc) && ['vercel', 'netlify', 'cloudflare-pages', 'amplify'].includes(svc.provider);

  for (const [key, svc] of Object.entries(config.services)) {
    if (skip.has(key)) continue;
    if (options?.backendOnly && isFrontend(key, svc)) continue;
    if (options?.frontendOnly && (isBackend(key, svc) || isRedis(key, svc))) continue;

    if (isPatchEnvConfig(svc)) {
      if (options?.backendOnly && Object.values(svc.vars).some((v) => v === 'FRONTEND_URL')) {
        continue;
      }
      steps.push({
        id: key,
        label: `Patching ${svc.target} env...`,
        type: 'patch-env',
        serviceKey: key,
        dependsOn: Object.values(svc.vars).map(stepIdForNeed),
      });
      if (svc.then === 'redeploy') {
        steps.push({
          id: `${key}-redeploy`,
          label: `Redeploying ${svc.target}...`,
          type: 'redeploy',
          serviceKey: svc.target,
          dependsOn: [key],
        });
        if ('CORS_ORIGIN' in svc.vars) {
          steps.push({
            id: `${key}-verify-cors`,
            label: 'Verifying CORS...',
            type: 'verify-cors',
            serviceKey: svc.target,
            dependsOn: [`${key}-redeploy`],
          });
        }
      }
      continue;
    }

    if (!isProviderConfig(svc)) continue;

    const needs = svc.needs ?? [];

    if (isRedis(key, svc)) {
      steps.push({
        id: key,
        label: `Provisioning Redis...`,
        type: 'provision',
        serviceKey: key,
        dependsOn: needs.map(stepIdForNeed),
      });
    } else {
      if (needs.length > 0) {
        steps.push({
          id: `${key}-env`,
          label: `Setting ${key} env vars...`,
          type: 'set-env',
          serviceKey: key,
          dependsOn: needs.map(stepIdForNeed),
        });
      }

      steps.push({
        id: `${key}-deploy`,
        label: `Deploying ${key}...`,
        type: 'deploy',
        serviceKey: key,
        dependsOn: needs.length > 0 ? [`${key}-env`] : needs.map(stepIdForNeed),
      });
    }

    if (svc.derives) {
      for (const [derivedKey, rule] of Object.entries(svc.derives)) {
        steps.push({
          id: `${key}-derive-${derivedKey}`,
          label: `Deriving ${derivedKey}...`,
          type: 'derive',
          serviceKey: key,
          dependsOn: [`${key}-deploy`],
        });
      }
    }
  }

  // WebSocket smoke test if WS_URL is derived
  for (const [key, svc] of Object.entries(config.services)) {
    if (!isProviderConfig(svc) || !svc.derives?.['WS_URL']) continue;
    if (options?.frontendOnly) break;
    steps.push({
      id: 'ws-test',
      label: 'Testing WebSocket...',
      type: 'test',
      serviceKey: 'ws',
      dependsOn: [`${key}-derive-WS_URL`],
    });
    break;
  }

  return topologicalSort(steps);
}

function topologicalSort(steps: DeployStep[]): DeployStep[] {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const visited = new Set<string>();
  const result: DeployStep[] = [];

  function visit(step: DeployStep) {
    if (visited.has(step.id)) return;
    visited.add(step.id);

    for (const dep of step.dependsOn) {
      const depStep = [...byId.values()].find(
        (s) => s.id === dep || s.serviceKey === dep
      );
      if (depStep) visit(depStep);
    }

    result.push(step);
  }

  for (const step of steps) {
    visit(step);
  }

  return result;
}

/** Map produced env var names to the service that produces them */
export function buildProducerMap(config: HerambConfig): Map<string, string> {
  const map = new Map<string, string>();

  for (const [key, svc] of Object.entries(config.services)) {
    if (!isProviderConfig(svc)) continue;
    for (const produced of svc.produces ?? []) {
      map.set(produced, key);
    }
    if (svc.derives) {
      for (const derivedKey of Object.keys(svc.derives)) {
        map.set(derivedKey, key);
      }
    }
  }

  return map;
}

/** Resolve env var names needed by a service to actual values or frontend aliases */
export function resolveEnvMapping(
  serviceKey: string,
  config: HerambConfig,
  resolved: Record<string, string>,
  corsWildcard = false
): Record<string, string> {
  const svc = config.services[serviceKey];
  if (!isProviderConfig(svc)) return {};

  const vars: Record<string, string> = {};
  const needs = svc.needs ?? [];

  for (const need of needs) {
    if (resolved[need]) {
      vars[need] = resolved[need];
    }
  }

  // Frontend env aliases
  if (resolved['BACKEND_URL']) {
    if (needs.includes('NEXT_PUBLIC_API_URL')) {
      vars['NEXT_PUBLIC_API_URL'] = resolved['BACKEND_URL'];
    }
    if (needs.includes('VITE_API_URL')) {
      vars['VITE_API_URL'] = resolved['BACKEND_URL'];
    }
  }
  if (resolved['WS_URL'] && needs.includes('NEXT_PUBLIC_WS_URL')) {
    vars['NEXT_PUBLIC_WS_URL'] = resolved['WS_URL'];
  }

  // Temporary CORS wildcard for chicken-and-egg
  if (corsWildcard && isBackendProvider(svc)) {
    vars['CORS_ORIGIN'] = '*';
  }

  return vars;
}

function isBackendProvider(svc: ProviderServiceConfig): boolean {
  return ['railway', 'render', 'fly', 'heroku'].includes(svc.provider);
}

export function loadConfig(raw: unknown): HerambConfig {
  const config = raw as HerambConfig;
  if (!config.project || !config.services) {
    throw new Error('Invalid heramb.config.json: missing project or services');
  }
  return config;
}
