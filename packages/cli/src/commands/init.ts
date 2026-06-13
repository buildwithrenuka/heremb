import inquirer from 'inquirer';
import chalk from 'chalk';
import { basename } from 'node:path';
import { buildDeployPlan, providersNeededForPlan } from '@heramb/core';
import { detectStack } from '../utils/stack-detector.js';
import { saveHerambConfig, configExists } from '../utils/config.js';
import { getCredentialsPath } from '../utils/credentials.js';
import { ensureGitignore } from '../utils/gitignore.js';
import { connectProviders } from '../utils/connect.js';
import { pickProviders, generateConfigFromChoices } from '../utils/provider-pick.js';
import { printBanner } from '../utils/output.js';

export async function initCommand(): Promise<void> {
  printBanner();

  if (configExists()) {
    const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'heramb.config.json already exists. Overwrite?',
        default: false,
      },
    ]);
    if (!overwrite) {
      console.log(chalk.dim('Init cancelled.'));
      return;
    }
  }

  console.log(chalk.dim('Scanning repo...\n'));
  const stack = detectStack();
  const plan = buildDeployPlan(stack);

  if (stack.frontend) {
    console.log(chalk.green('✓') + ` Frontend: ${stack.frontend.framework} at ${stack.frontend.path}`);
  }
  if (stack.backend) {
    console.log(chalk.green('✓') + ` Backend:  ${stack.backend.runtime} at ${stack.backend.path}`);
  }
  if (!stack.frontend && !stack.backend) {
    console.log(chalk.yellow('⚠') + ' No frontend or backend detected — you can configure manually');
  }

  for (const line of plan.summary) {
    console.log(chalk.cyan('→') + ` ${line}`);
  }

  for (const warning of stack.warnings) {
    console.log(chalk.yellow('⚠') + ` ${warning}`);
    if (warning.includes('hardcode port') || warning.includes('process.env.PORT')) {
      console.log(chalk.dim('   Fix: app.listen(process.env.PORT || 3000)'));
    }
    if (warning.includes('Redis adapter')) {
      console.log(chalk.dim('   Heramb will inject REDIS_URL — add @socket.io/redis-adapter to your app'));
    }
  }

  const providerChoices = plan.services.length > 0 ? await pickProviders(plan) : ({} as Record<'frontend' | 'backend' | 'cache', string>);

  const providersNeeded = providersNeededForPlan(plan, providerChoices);
  if (providersNeeded.length > 0) {
    console.log(chalk.dim('\nConnect the platforms you chose — paste API keys or sign up on the fly:\n'));
    await connectProviders(providersNeeded, { skipExisting: true });
  }

  const defaultName = basename(process.cwd()).replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const { projectName } = await inquirer.prompt<{ projectName: string }>([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: defaultName,
    },
  ]);

  const config =
    plan.services.length > 0
      ? generateConfigFromChoices(projectName, stack, providerChoices, plan.requirements)
      : { project: projectName, services: {}, env: { manual: ['JWT_SECRET'] } };

  saveHerambConfig(config);

  const gitignoreResult = ensureGitignore();
  if (gitignoreResult === 'created') {
    console.log(chalk.green('✓') + ' Created .gitignore (secrets excluded from git)');
  } else if (gitignoreResult === 'updated') {
    console.log(chalk.green('✓') + ' Updated .gitignore with Heramb secret patterns');
  }

  console.log(chalk.green('\n✓') + ' Created heramb.config.json');
  console.log(chalk.dim(`Credentials stored in ${getCredentialsPath()}`));
  console.log(chalk.dim('\nNext: heramb deploy\n'));
}
