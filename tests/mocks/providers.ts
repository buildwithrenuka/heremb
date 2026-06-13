import type {
  CacheLock,
  HerambConfig,
  DeployOptions,
  DeployResult,
  DestroyResult,
  EnvVarResult,
  ProviderLock,
  ProviderRegistry,
  StatusResult,
} from '../../packages/core/dist/index.js';
import { Orchestrator, loadConfig } from '../../packages/core/dist/index.js';

function createMockLock(
  name: string,
  url: string,
  serviceId: string
): ProviderLock {
  const envLog: Record<string, Record<string, string>> = {};

  return {
    name,
    async deploy(options: DeployOptions): Promise<DeployResult> {
      if (options.envVars && options.serviceId) {
        envLog[options.serviceId] = { ...envLog[options.serviceId], ...options.envVars };
      }
      return { url, serviceId: options.serviceId ?? serviceId };
    },
    async getStatus(): Promise<StatusResult> {
      return { status: 'live', url };
    },
    async setEnvVars(id: string, vars: Record<string, string>): Promise<EnvVarResult> {
      envLog[id] = { ...envLog[id], ...vars };
      return { ok: true };
    },
    async *getLogs(): AsyncIterable<string> {
      yield `[mock-${name}] ok`;
    },
    async destroy(): Promise<DestroyResult> {
      return { ok: true };
    },
    ...( { _envLog: envLog } as object ),
  };
}

function createMockCacheLock(): CacheLock {
  return {
    name: 'upstash',
    async provision() {
      return {
        url: 'rediss://mock:6379',
        serviceId: 'mock-redis-id',
      };
    },
    async destroy() {
      return { ok: true };
    },
  };
}

export function createMockRegistry(): ProviderRegistry {
  return {
    getLock: (provider: string) => {
      switch (provider) {
        case 'railway':
          return createMockLock('railway', 'https://api-mock.up.railway.app', 'mock-railway-backend');
        case 'vercel':
          return createMockLock('vercel', 'https://chat-app-test.vercel.app', 'mock-vercel-project');
        default:
          return undefined;
      }
    },
    getCacheLock: (provider: string) => {
      if (provider === 'upstash') return createMockCacheLock();
      return undefined;
    },
  };
}

/** Config identical to fixture but without WS test step (no real socket server in CI) */
export function mockDeployConfig(): HerambConfig {
  return loadConfig({
    project: 'chat-app-test',
    services: {
      redis: { provider: 'upstash', produces: ['REDIS_URL'] },
      backend: {
        provider: 'railway',
        path: './backend',
        serviceId: 'mock-railway-backend',
        needs: ['REDIS_URL'],
        produces: ['BACKEND_URL'],
      },
      frontend: {
        provider: 'vercel',
        path: './frontend',
        projectId: 'mock-vercel-project',
        needs: ['NEXT_PUBLIC_API_URL'],
        produces: ['FRONTEND_URL'],
      },
      'backend-cors': {
        action: 'patch-env',
        target: 'backend',
        vars: { CORS_ORIGIN: 'FRONTEND_URL' },
        then: 'redeploy',
      },
    },
  });
}

export async function runMockDeploy() {
  const config = mockDeployConfig();
  const registry = createMockRegistry();
  const stepLog: string[] = [];

  const orchestrator = new Orchestrator({
    config,
    registry,
    credentials: {},
    corsWildcardFirstDeploy: true,
    skipVerification: true,
    onStepStart: (step) => stepLog.push(`start:${step.id}`),
    onStepComplete: (result) => stepLog.push(`done:${result.step.id}:${result.success}`),
  });

  const report = await orchestrator.run();
  return { report, stepLog };
}
