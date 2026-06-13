import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { isProviderConfig } from '@heramb/core';
import { loadHerambConfig } from '../utils/config.js';
import { createRegistry } from '../utils/registry.js';
import { printBanner } from '../utils/output.js';

export async function envPushCommand(): Promise<void> {
  printBanner();
  const config = loadHerambConfig();
  const registry = createRegistry(config);

  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    console.error(chalk.red('No .env file found'));
    process.exit(1);
  }

  const vars = dotenv.parse(readFileSync(envPath));
  let pushed = 0;

  for (const [key, svc] of Object.entries(config.services)) {
    if (!isProviderConfig(svc) || !svc.serviceId) continue;

    const lock = registry.getLock(svc.provider);
    if (!lock) continue;

    const manual = config.env?.manual ?? [];
    const toPush: Record<string, string> = {};
    for (const [k, v] of Object.entries(vars)) {
      if (v !== undefined) toPush[k] = v;
    }
    for (const m of manual) {
      if (vars[m]) toPush[m] = vars[m]!;
    }

    const result = await lock.setEnvVars(svc.serviceId, toPush);
    if (result.ok) {
      console.log(chalk.green('✓') + ` Pushed ${Object.keys(toPush).length} vars to ${key} (${svc.provider})`);
      pushed++;
    } else {
      console.log(chalk.red('✗') + ` ${key}: ${result.error}`);
    }
  }

  console.log(chalk.dim(`\n${pushed} service(s) updated\n`));
}

export async function envPullCommand(): Promise<void> {
  printBanner();
  console.log(chalk.yellow('env pull requires provider-specific env list APIs — coming in v0.2'));
  console.log(chalk.dim('Use `heramb status` to verify deployed URLs\n'));
}
