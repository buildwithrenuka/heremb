import chalk from 'chalk';
import { isProviderConfig } from '@heramb1/core';
import { loadHerambConfig } from '../utils/config.js';
import { createRegistry } from '../utils/registry.js';
import { printBanner } from '../utils/output.js';

export async function logsCommand(serviceName: string): Promise<void> {
  printBanner();
  const config = loadHerambConfig();
  const registry = createRegistry(config);

  const svc = config.services[serviceName];
  if (!svc || !isProviderConfig(svc)) {
    console.error(chalk.red(`Service "${serviceName}" not found in heramb.config.json`));
    console.log(chalk.dim('\nAvailable: ' + Object.keys(config.services).join(', ')));
    process.exit(1);
  }

  const lock = registry.getLock(svc.provider);
  if (!lock || !svc.serviceId) {
    console.error(chalk.red(`Service "${serviceName}" not linked — add serviceId in config`));
    process.exit(1);
  }

  console.log(chalk.dim(`Tailing logs for ${serviceName} (${svc.provider})...\n`));

  for await (const line of lock.getLogs(svc.serviceId)) {
    console.log(line);
  }

  console.log('');
}
