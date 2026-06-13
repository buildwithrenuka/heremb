import inquirer from 'inquirer';
import chalk from 'chalk';
import { isProviderConfig } from '@heramb/core';
import { loadHerambConfig, saveHerambConfig } from '../utils/config.js';
import { printBanner } from '../utils/output.js';

const IMPLEMENTED_PROVIDERS = ['railway', 'vercel', 'upstash'];
const PLANNED_PROVIDERS = ['render', 'netlify', 'fly', 'heroku', 'cloudflare-pages'];

export interface MigrateOptions {
  service?: string;
  from?: string;
  to?: string;
  dryRun?: boolean;
}

export async function migrateCommand(options: MigrateOptions = {}): Promise<void> {
  printBanner();

  const config = loadHerambConfig();

  let target = options.service;
  if (!target) {
    const services = Object.entries(config.services)
      .filter(([, s]) => isProviderConfig(s))
      .map(([k]) => k);

    const { selected } = await inquirer.prompt<{ selected: string }>([
      {
        type: 'list',
        name: 'selected',
        message: 'Which service to migrate?',
        choices: services,
      },
    ]);
    target = selected;
  }

  const svc = config.services[target!];
  if (!svc || !isProviderConfig(svc)) {
    console.error(chalk.red(`Service "${target}" not found`));
    process.exit(1);
  }

  const fromProvider = options.from ?? svc.provider;
  let toProvider = options.to;

  if (!toProvider) {
    const { selected } = await inquirer.prompt<{ selected: string }>([
      {
        type: 'list',
        name: 'selected',
        message: `Migrate ${target} from ${fromProvider} to:`,
        choices: PLANNED_PROVIDERS.filter((p) => p !== fromProvider),
      },
    ]);
    toProvider = selected;
  }

  if (fromProvider === toProvider) {
    console.error(chalk.red('Source and target providers must differ'));
    process.exit(1);
  }

  console.log(chalk.dim(`\nMigration plan: ${target} (${fromProvider} → ${toProvider})\n`));

  const steps = [
    `Read env vars from ${fromProvider}`,
    `Deploy ${target} to ${toProvider}`,
    'Run smoke tests on new deployment',
    'Update frontend env vars (NEXT_PUBLIC_API_URL)',
    'Patch CORS on new backend',
    'Verify CORS + WebSocket end to end',
    'Mark migration complete (old deployment untouched until verified)',
  ];

  steps.forEach((step, i) => {
    console.log(chalk.dim(`  ${i + 1}.`) + ` ${step}`);
  });

  console.log('');

  if (!IMPLEMENTED_PROVIDERS.includes(toProvider) && !IMPLEMENTED_PROVIDERS.includes(fromProvider)) {
    console.log(chalk.yellow(`⚠ Provider locks for ${fromProvider} → ${toProvider} are planned.`));
    console.log(chalk.dim(`Available locks today: ${IMPLEMENTED_PROVIDERS.join(', ')}\n`));
  }

  if (options.dryRun) {
    console.log(chalk.dim('Dry run — config not modified.\n'));
    return;
  }

  const previousProvider = svc.provider;
  svc.provider = toProvider!;
  svc.serviceId = undefined;

  saveHerambConfig(config);

  console.log(chalk.green('✓') + ` Updated heramb.config.json: ${target} → ${toProvider}`);
  console.log(chalk.dim(`\nOld ${fromProvider} deployment remains live.`));
  console.log(chalk.dim('Next steps:'));
  console.log(chalk.dim(`  1. heramb init          # add ${toProvider} credentials if needed`));
  console.log(chalk.dim(`  2. heramb deploy        # deploy + validate before DNS switch`));
  console.log(chalk.dim(`  3. heramb status        # confirm new URLs\n`));

  if (previousProvider !== fromProvider) {
    console.log(chalk.yellow(`Note: config had provider "${previousProvider}", migrated from "${fromProvider}" as specified.\n`));
  }
}
