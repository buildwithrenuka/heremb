import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectStack, generateConfigFromStack } from '../packages/cli/dist/utils/stack-detector.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = resolve(__dirname, 'fixtures/chat-app');

describe('stack detector', () => {
  it('detects Next.js frontend and Express backend with socket.io', () => {
    const stack = detectStack(fixtureRoot);

    assert.equal(stack.frontend?.framework, 'next');
    assert.equal(stack.frontend?.path, './frontend');
    assert.equal(stack.frontend?.hasSocketIo, true);

    assert.equal(stack.backend?.runtime, 'node');
    assert.equal(stack.backend?.path, './backend');
    assert.equal(stack.backend?.hasSocketIo, true);
    assert.equal(stack.backend?.usesPortEnv, true);
  });

  it('warns about missing socket.io redis adapter', () => {
    const stack = detectStack(fixtureRoot);
    assert.ok(
      stack.warnings.some((w) => w.includes('Redis adapter')),
      `expected redis adapter warning, got: ${stack.warnings.join(', ')}`
    );
  });

  it('generates valid heramb config from detected stack', () => {
    const stack = detectStack(fixtureRoot);
    const config = generateConfigFromStack('chat-app', stack);

    assert.equal(config.project, 'chat-app');
    assert.ok(config.services.redis);
    assert.ok(config.services.backend);
    assert.ok(config.services.frontend);
    assert.ok(config.services['backend-cors']);
    assert.equal(config.services.backend?.derives?.['WS_URL'], 'BACKEND_URL → wss://');
  });
});

describe('CLI smoke', () => {
  it('status command runs against fixture config', async () => {
    const { loadHerambConfig } = await import('../packages/cli/dist/utils/config.js');
    const config = loadHerambConfig(fixtureRoot);

    assert.equal(config.project, 'chat-app-test');
    assert.ok(config.services.backend);
    assert.equal(config.services.backend?.serviceId, 'mock-railway-backend');
  });
});
