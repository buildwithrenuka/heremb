import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig, type HerambConfig } from '@heramb/core';

const CONFIG_FILE = 'heramb.config.json';

export function findConfigPath(cwd = process.cwd()): string {
  return resolve(cwd, CONFIG_FILE);
}

export function loadHerambConfig(cwd = process.cwd()): HerambConfig {
  const path = findConfigPath(cwd);
  if (!existsSync(path)) {
    throw new Error(`No ${CONFIG_FILE} found — run \`heramb init\` first`);
  }
  const raw = JSON.parse(readFileSync(path, 'utf-8'));
  return loadConfig(raw);
}

export function saveHerambConfig(config: HerambConfig, cwd = process.cwd()): void {
  const path = findConfigPath(cwd);
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
}

export function configExists(cwd = process.cwd()): boolean {
  return existsSync(findConfigPath(cwd));
}
