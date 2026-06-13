import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  HERAMB_GITIGNORE_ENTRIES,
  HERAMB_GITIGNORE_SECTION,
  ensureGitignore,
} from '../packages/cli/dist/utils/gitignore.js';

describe('ensureGitignore', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'heramb-gitignore-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates .gitignore when missing', () => {
    const result = ensureGitignore(dir);
    assert.equal(result, 'created');

    const content = readFileSync(join(dir, '.gitignore'), 'utf-8');
    assert.ok(content.includes(HERAMB_GITIGNORE_SECTION));
    for (const entry of HERAMB_GITIGNORE_ENTRIES) {
      assert.ok(content.includes(entry), `expected ${entry} in new .gitignore`);
    }
  });

  it('appends missing Heramb entries to an existing .gitignore', () => {
    writeFileSync(join(dir, '.gitignore'), 'node_modules/\n.env\n');

    const result = ensureGitignore(dir);
    assert.equal(result, 'updated');

    const content = readFileSync(join(dir, '.gitignore'), 'utf-8');
    assert.ok(content.startsWith('node_modules/\n.env\n'));
    assert.ok(content.includes('.env.*'));
    assert.ok(content.includes('.heramb/'));
  });

  it('returns unchanged when all Heramb entries are already present', () => {
    writeFileSync(join(dir, '.gitignore'), `${HERAMB_GITIGNORE_SECTION}\n${HERAMB_GITIGNORE_ENTRIES.join('\n')}\n`);

    const result = ensureGitignore(dir);
    assert.equal(result, 'unchanged');
  });
});
