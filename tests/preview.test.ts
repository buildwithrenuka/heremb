import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyPreviewContext, slugifyBranch } from '../packages/cli/dist/utils/preview.js';
import { loadConfig } from '../packages/core/dist/index.js';
import exampleConfig from './fixtures/chat-app/heramb.config.json' with { type: 'json' };

describe('preview deploy', () => {
  it('slugifies branch names for resource isolation', () => {
    assert.equal(slugifyBranch('feat/new-dashboard'), 'feat-new-dashboard');
    assert.equal(slugifyBranch('refs/heads/fix/CORS'), 'fix-cors');
  });

  it('scopes config per preview branch', () => {
    const config = loadConfig(exampleConfig);
    const scoped = applyPreviewContext(config, 'feat/new-dashboard');

    assert.equal(scoped.project, 'chat-app-test-feat-new-dashboard');
    assert.equal(scoped.services.backend?.serviceId, undefined);
    assert.equal(scoped.services.frontend?.projectId, 'mock-vercel-project-feat-new-dashboard');
  });
});
