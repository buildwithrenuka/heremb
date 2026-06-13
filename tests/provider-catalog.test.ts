import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeployPlan,
  deriveRequirements,
  recommendForRole,
  validateProviderChoice,
} from '../packages/core/dist/provider-catalog.js';
import type { StackDetection } from '../packages/core/dist/types.js';

const chatStack: StackDetection = {
  frontend: { framework: 'next', path: './frontend', hasSocketIo: true },
  backend: { runtime: 'node', path: './backend', hasSocketIo: true, usesPortEnv: true },
  warnings: [],
};

describe('provider catalog', () => {
  it('detects redis and websocket requirements from socket.io stack', () => {
    const req = deriveRequirements(chatStack);
    assert.equal(req.websocket, true);
    assert.equal(req.redis, true);
    assert.equal(req.longRunning, true);
  });

  it('blocks Cloudflare Pages for WebSocket backend', () => {
    const req = deriveRequirements(chatStack);
    const cf = validateProviderChoice('backend', 'cloudflare-pages', req);
    assert.equal(cf.ok, false);
    assert.ok(cf.blockers.length > 0);
  });

  it('recommends Railway/Render over Vercel for socket.io backend', () => {
    const req = deriveRequirements(chatStack);
    const ranked = recommendForRole('backend', req);
    const top = ranked.find((r) => r.score > 0 && r.implemented);
    assert.ok(top);
    assert.equal(top!.provider, 'railway');
  });

  it('allows Cloudflare for frontend-only role in ws app', () => {
    const req = deriveRequirements(chatStack);
    const cf = validateProviderChoice('frontend', 'cloudflare-pages', req);
    assert.equal(cf.ok, true);
  });

  it('builds a deploy plan with cache, backend, and frontend services', () => {
    const plan = buildDeployPlan(chatStack);
    assert.equal(plan.services.length, 3);
    assert.ok(plan.services.some((s) => s.role === 'cache'));
    assert.ok(plan.summary.some((s) => s.includes('Redis')));
  });

  it('warns that websocket server cannot live on static frontend platforms', () => {
    const plan = buildDeployPlan(chatStack);
    const frontend = plan.services.find((s) => s.role === 'frontend');
    assert.ok(frontend?.warnings.some((w) => w.includes('WebSocket server')));
  });
});
