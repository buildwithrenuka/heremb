import inquirer from 'inquirer';
import chalk from 'chalk';
import type { StackDetection } from '@heramb/core';
import { buildDeployPlan, getProvider, providersNeededForPlan, topProviderForRole, deriveRequirements } from '@heramb/core';
import { saveCredential, getProviderToken } from './credentials.js';

export async function connectProviders(
  providers: string[],
  options?: { skipExisting?: boolean }
): Promise<string[]> {
  const connected: string[] = [];

  for (const provider of providers) {
    if (options?.skipExisting && getProviderToken(provider)) {
      connected.push(provider);
      continue;
    }

    await promptProviderConnect(provider);
    connected.push(provider);
  }

  return connected;
}

export function providersForStack(stack: StackDetection): string[] {
  const plan = buildDeployPlan(stack);
  const req = deriveRequirements(stack);
  const choices = {
    frontend: topProviderForRole('frontend', req)?.provider ?? '',
    backend: topProviderForRole('backend', req)?.provider ?? '',
    cache: topProviderForRole('cache', req)?.provider ?? '',
  };
  return providersNeededForPlan(plan, choices as Record<'frontend' | 'backend' | 'cache', string>);
}

export async function promptProviderConnect(provider: string): Promise<void> {
  const guide = getProvider(provider);
  if (!guide) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  if (getProviderToken(provider)) {
    console.log(chalk.green('✓') + ` ${guide.name} already connected`);
    return;
  }

  console.log(chalk.cyan(`\n→ Connect ${guide.name}`));
  console.log(chalk.dim(`  Sign up:  ${guide.signupUrl}`));
  console.log(chalk.dim(`  Get key:  ${guide.tokenUrl}\n`));

  const { hasAccount } = await inquirer.prompt<{ hasAccount: boolean }>([
    {
      type: 'confirm',
      name: 'hasAccount',
      message: `Do you already have a ${guide.name} account?`,
      default: false,
    },
  ]);

  if (!hasAccount) {
    console.log(
      chalk.yellow('⚠') +
        ` Create your account at ${chalk.underline(guide.signupUrl)} then paste your API key below.`
    );
  }

  switch (provider) {
    case 'upstash': {
      const { email, apiKey } = await inquirer.prompt<{ email: string; apiKey: string }>([
        {
          type: 'input',
          name: 'email',
          message: 'Upstash account email:',
          validate: (v: string) => v.includes('@') || 'Valid email required',
        },
        {
          type: 'password',
          name: 'apiKey',
          message: 'Upstash API key:',
          validate: (v: string) => v.length > 0 || 'API key required',
        },
      ]);
      saveCredential('upstash', { email, apiKey, token: apiKey });
      break;
    }
    case 'vercel': {
      const { token, teamId } = await inquirer.prompt<{ token: string; teamId: string }>([
        {
          type: 'password',
          name: 'token',
          message: 'Vercel API token:',
          validate: (v: string) => v.length > 0 || 'Token required',
        },
        {
          type: 'input',
          name: 'teamId',
          message: 'Vercel team ID (optional):',
        },
      ]);
      saveCredential('vercel', { token, ...(teamId ? { teamId } : {}) });
      break;
    }
    default: {
      const { token } = await inquirer.prompt<{ token: string }>([
        {
          type: 'password',
          name: 'token',
          message: `${guide.name} API token:`,
          validate: (v: string) => v.length > 0 || 'Token required',
        },
      ]);
      saveCredential(provider, { token });
    }
  }

  console.log(chalk.green('✓') + ` ${guide.name} connected`);
}
