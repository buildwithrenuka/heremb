import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const HERAMB_GITIGNORE_SECTION = '# Heramb — secrets (do not commit)';

export const HERAMB_GITIGNORE_ENTRIES = [
  '.env',
  '.env.*',
  '!.env.example',
  '.heramb/',
  'keys.json',
];

export type EnsureGitignoreResult = 'created' | 'updated' | 'unchanged';

function hasGitignoreLine(content: string, entry: string): boolean {
  return content.split('\n').some((line) => line.trim() === entry);
}

function formatBlock(entries: string[]): string {
  return `${HERAMB_GITIGNORE_SECTION}\n${entries.join('\n')}\n`;
}

export function ensureGitignore(cwd = process.cwd()): EnsureGitignoreResult {
  const gitignorePath = join(cwd, '.gitignore');

  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, formatBlock(HERAMB_GITIGNORE_ENTRIES));
    return 'created';
  }

  const content = readFileSync(gitignorePath, 'utf-8');
  const missing = HERAMB_GITIGNORE_ENTRIES.filter((entry) => !hasGitignoreLine(content, entry));

  if (missing.length === 0) {
    return 'unchanged';
  }

  const hasSection = content.includes(HERAMB_GITIGNORE_SECTION);
  const suffix = hasSection
    ? `\n${missing.join('\n')}\n`
    : `\n${formatBlock(missing)}`;

  writeFileSync(gitignorePath, content.trimEnd() + suffix);
  return 'updated';
}
