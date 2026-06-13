import chalk from 'chalk';
import { isProviderConfig } from '@heramb/core';
import { loadHerambConfig } from '../utils/config.js';
import { createRegistry } from '../utils/registry.js';
import { printBanner } from '../utils/output.js';

export async function statusCommand(): Promise<void> {
  printBanner();
  const config = loadHerambConfig();
  const registry = createRegistry(config);

  console.log(chalk.bold(`Project: ${config.project}\n`));

  for (const [key, svc] of Object.entries(config.services)) {
    if (!isProviderConfig(svc)) continue;

    const lock = registry.getLock(svc.provider);
    const serviceId = svc.serviceId;

    if (!lock || !serviceId) {
      console.log(`${chalk.dim(key.padEnd(12))} ${chalk.yellow('not linked')} (${svc.provider})`);
      continue;
    }

    try {
      const status = await lock.getStatus(serviceId);
      const statusColor =
        status.status === 'live'
          ? chalk.green
          : status.status === 'failed'
            ? chalk.red
            : chalk.yellow;

      console.log(
        `${chalk.dim(key.padEnd(12))} ${statusColor(status.status.padEnd(10))} ${status.url ?? chalk.dim('no url')}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`${chalk.dim(key.padEnd(12))} ${chalk.red('error')} ${msg}`);
    }
  }

  console.log('');
}
