import type { SetupState } from './types';

export function buildHerambConfig(state: SetupState): object {
  const apiEnvKey =
    state.frontendFramework === 'next' ? 'NEXT_PUBLIC_API_URL' : 'VITE_API_URL';
  const corsKey = state.frontendFramework === 'vite' ? 'WEB_URL' : 'CORS_ORIGIN';

  const services: Record<string, unknown> = {};

  if (state.hasRedis) {
    services.redis = {
      provider: state.cacheProvider,
      produces: ['REDIS_URL'],
    };
  }

  if (state.hasBackend) {
    services.backend = {
      provider: state.backendProvider,
      path: state.backendPath,
      ...(state.railwayServiceId ? { serviceId: state.railwayServiceId } : {}),
      ...(state.railwayProjectId && !state.railwayServiceId
        ? { projectId: state.railwayProjectId }
        : {}),
      needs: state.hasRedis ? ['REDIS_URL'] : [],
      produces: ['BACKEND_URL'],
      ...(state.hasRedis
        ? { derives: { WS_URL: 'BACKEND_URL → wss://' } }
        : {}),
    };
  }

  if (state.hasFrontend) {
    const frontendNeeds = [apiEnvKey];
    if (state.hasRedis && state.frontendFramework === 'next') {
      frontendNeeds.push('NEXT_PUBLIC_WS_URL');
    }
    services.frontend = {
      provider: state.frontendProvider,
      path: state.frontendPath,
      ...(state.vercelProjectName ? { projectId: state.vercelProjectName } : {}),
      needs: frontendNeeds,
      produces: ['FRONTEND_URL'],
    };
  }

  if (state.hasBackend && state.hasFrontend) {
    services['backend-cors'] = {
      action: 'patch-env',
      target: 'backend',
      vars: { [corsKey]: 'FRONTEND_URL' },
      then: 'redeploy',
    };
  }

  const manual = ['JWT_SECRET'];
  if (state.hasRedis) manual.push('DATABASE_URL');

  const config: Record<string, unknown> = {
    project: state.projectName || 'my-app',
    services,
    env: { manual },
  };

  if (state.hasRedis) {
    config.wsConfig = { pingInterval: 25000, transport: 'websocket-only' };
  }

  return config;
}

export function configJson(state: SetupState): string {
  return JSON.stringify(buildHerambConfig(state), null, 2);
}
