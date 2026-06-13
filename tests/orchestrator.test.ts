import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runMockDeploy } from './mocks/providers.js';

describe('orchestrator (mock providers)', () => {
  it('runs full deploy pipeline without real API calls', async () => {
    const { report, stepLog } = await runMockDeploy();

    assert.equal(report.success, true, `failed: ${report.steps.find((s) => !s.success)?.error}`);
    assert.equal(report.aiCalls, 0);
    assert.equal(report.tokensUsed, 0);

    assert.equal(report.resolved['REDIS_URL'], 'rediss://mock:6379');
    assert.equal(report.resolved['BACKEND_URL'], 'https://api-mock.up.railway.app');
    assert.equal(report.resolved['FRONTEND_URL'], 'https://chat-app-test.vercel.app');
    assert.equal(report.resolved['CORS_ORIGIN'], 'https://chat-app-test.vercel.app');

    assert.ok(stepLog.includes('done:redis:true'));
    assert.ok(stepLog.includes('done:backend-deploy:true'));
    assert.ok(stepLog.includes('done:frontend-deploy:true'));
    assert.ok(stepLog.includes('done:backend-cors:true'));
    assert.ok(stepLog.includes('done:backend-cors-redeploy:true'));
    assert.ok(stepLog.includes('done:backend-cors-verify-cors:true'));
  });
});
