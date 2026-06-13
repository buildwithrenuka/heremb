#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { deployCommand } from './commands/deploy.js';
import { statusCommand } from './commands/status.js';
import { envPushCommand, envPullCommand } from './commands/env.js';
import { wsTestCommand } from './commands/ws.js';
import { logsCommand } from './commands/logs.js';
import { migrateCommand } from './commands/migrate.js';
import { planCommand } from './commands/plan.js';

const program = new Command();

program
  .name('heramb')
  .description('Removes deploy obstacles — orchestration across any platform')
  .version('0.1.0');

program
  .command('plan')
  .description('Scan project and recommend deployment platforms')
  .action(planCommand);

program
  .command('init')
  .description('Detect stack, create config, validate tokens')
  .action(initCommand);

program
  .command('deploy')
  .description('Full orchestrated deploy')
  .option('--backend-only', 'Skip frontend deploy')
  .option('--frontend-only', 'Skip backend and Redis')
  .option('--env <environment>', 'Deploy environment: production or preview', 'production')
  .option('--branch <name>', 'Git branch for preview deploys')
  .action((opts) =>
    deployCommand({
      backendOnly: opts.backendOnly,
      frontendOnly: opts.frontendOnly,
      env: opts.env === 'preview' ? 'preview' : 'production',
      branch: opts.branch,
    })
  );

program
  .command('status')
  .description('Unified status across all providers')
  .action(statusCommand);

const envCmd = program.command('env').description('Sync environment variables');

envCmd
  .command('push')
  .description('Sync local .env to all services')
  .action(envPushCommand);

envCmd
  .command('pull')
  .description('Pull remote env vars to local .env')
  .action(envPullCommand);

const wsCmd = program.command('ws').description('WebSocket utilities');

wsCmd
  .command('test [url]')
  .description('WebSocket smoke test')
  .action(wsTestCommand);

program
  .command('logs <service>')
  .description('Tail logs from a service')
  .action(logsCommand);

program
  .command('migrate [service]')
  .description('Move a service to another provider')
  .option('--from <provider>', 'Source provider (e.g. heroku)')
  .option('--to <provider>', 'Target provider (e.g. render)')
  .option('--dry-run', 'Show migration plan without changing config')
  .action((service, opts) =>
    migrateCommand({
      service,
      from: opts.from,
      to: opts.to,
      dryRun: opts.dryRun,
    })
  );

program.parse();
