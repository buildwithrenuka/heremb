import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyDerivation,
  buildDeploySteps,
  loadConfig,
  matchKnownError,
  resolveEnvMapping,
} from '../packages/core/dist/index.js';
import exampleConfig from './fixtures/chat-app/heramb.config.json' with { type: 'json' };

describe('dependency graph', () => {
  const config = loadConfig(exampleConfig);

  it('topologically sorts deploy steps in correct order', () => {
    const steps = buildDeploySteps(config);
    const ids = steps.map((s) => s.id);

    const redisIdx = ids.indexOf('redis');
    const backendEnvIdx = ids.indexOf('backend-env');
    const backendDeployIdx = ids.indexOf('backend-deploy');
    const deriveWsIdx = ids.indexOf('backend-derive-WS_URL');
    const frontendEnvIdx = ids.indexOf('frontend-env');
    const frontendDeployIdx = ids.indexOf('frontend-deploy');
    const corsPatchIdx = ids.indexOf('backend-cors');
    const corsRedeployIdx = ids.indexOf('backend-cors-redeploy');
    const corsVerifyIdx = ids.indexOf('backend-cors-verify-cors');

    assert.ok(redisIdx >= 0, 'redis step exists');
    assert.ok(redisIdx < backendEnvIdx, 'redis before backend env');
    assert.ok(backendEnvIdx < backendDeployIdx, 'backend env before deploy');
    assert.ok(backendDeployIdx < deriveWsIdx, 'backend deploy before WS derive');
    assert.ok(deriveWsIdx < frontendEnvIdx, 'WS derive before frontend env');
    assert.ok(frontendDeployIdx < corsPatchIdx, 'frontend deploy before CORS patch');
    assert.ok(corsPatchIdx < corsRedeployIdx, 'CORS patch before redeploy');
    assert.ok(corsRedeployIdx < corsVerifyIdx, 'CORS redeploy before verify');
  });

  it('skips frontend on --backend-only', () => {
    const steps = buildDeploySteps(config, { backendOnly: true });
    const ids = steps.map((s) => s.id);
    assert.ok(!ids.some((id) => id.startsWith('frontend')));
    assert.ok(!ids.includes('backend-cors'));
  });

  it('derives wss:// from https:// backend URL', () => {
    const result = applyDerivation(
      'BACKEND_URL',
      'https://api-xxx.up.railway.app',
      'BACKEND_URL → wss://'
    );
    assert.equal(result, 'wss://api-xxx.up.railway.app');
  });

  it('maps frontend env aliases from resolved values', () => {
    const resolved = {
      BACKEND_URL: 'https://api.example.com',
      WS_URL: 'wss://api.example.com',
      REDIS_URL: 'rediss://localhost:6379',
    };

    const vars = resolveEnvMapping('frontend', config, resolved);
    assert.equal(vars['NEXT_PUBLIC_API_URL'], 'https://api.example.com');
    assert.equal(vars['NEXT_PUBLIC_WS_URL'], 'wss://api.example.com');
  });

  it('sets CORS wildcard for backend on first deploy', () => {
    const resolved = { REDIS_URL: 'rediss://localhost:6379' };
    const vars = resolveEnvMapping('backend', config, resolved, true);
    assert.equal(vars['CORS_ORIGIN'], '*');
    assert.equal(vars['REDIS_URL'], 'rediss://localhost:6379');
  });
});

describe('error table', () => {
  it('matches CORS errors and suggests auto-fix', () => {
    const match = matchKnownError({
      step: { id: 'test', label: 'test', type: 'deploy', serviceKey: 'backend', dependsOn: [] },
      error: 'blocked by CORS policy',
      config: loadConfig(exampleConfig),
      resolved: { FRONTEND_URL: 'https://my-app.vercel.app' },
    });

    assert.ok(match);
    assert.ok(match.autoFix);
    assert.equal(match.autoFix?.vars?.['CORS_ORIGIN'], 'https://my-app.vercel.app');
  });

  it('matches auth errors with Key not found hint', () => {
    const match = matchKnownError({
      step: { id: 'test', label: 'test', type: 'deploy', serviceKey: 'backend', dependsOn: [] },
      error: '401 unauthorized invalid token',
      config: loadConfig(exampleConfig),
      resolved: {},
    });

    assert.ok(match);
    assert.match(match.known.message, /Authentication failed/i);
  });
});
