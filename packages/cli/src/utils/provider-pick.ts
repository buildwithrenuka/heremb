import inquirer from 'inquirer';
import chalk from 'chalk';
import {
  buildDeployPlan,
  type DeployPlan,
  type ProjectRequirements,
  type ServiceRole,
  validateProviderChoice,
  recommendForRole,
  getProvider,
} from '@heramb1/core';
import type { HerambConfig, StackDetection } from '@heramb1/core';

export async function pickProviders(plan: DeployPlan): Promise<Record<ServiceRole, string>> {
  const choices = {} as Record<ServiceRole, string>;
  const req = plan.requirements;

  for (const svc of plan.services) {
    const ranked = svc.recommendations.filter((r) => r.score > 0);
    const defaultChoice =
      ranked.find((r) => r.implemented)?.provider ?? ranked[0]?.provider ?? 'railway';

    console.log(chalk.cyan(`\n→ Where should Heramb deploy your ${svc.label.toLowerCase()}?`));

    for (const warning of svc.warnings.slice(0, 2)) {
      console.log(chalk.yellow('  ⚠') + ` ${warning}`);
    }

    const { provider } = await inquirer.prompt<{ provider: string }>([
      {
        type: 'list',
        name: 'provider',
        message: `${svc.label} platform:`,
        default: defaultChoice,
        choices: svc.recommendations.slice(0, 8).map((r) => {
          const tags: string[] = [];
          if (r.implemented) tags.push('ready');
          if (r.score > 0 && r === ranked[0]) tags.push('recommended');
          if (r.blockers.length > 0) tags.push('blocked');
          const suffix = tags.length > 0 ? chalk.dim(` (${tags.join(', ')})`) : '';
          const label = r.score > 0 ? r.name : `${r.name} — ${r.blockers[0] ?? 'unsuitable'}`;
          return {
            name: `${label}${suffix}`,
            value: r.provider,
            disabled: r.blockers.length > 0 ? r.blockers[0] : false,
          };
        }),
      },
    ]);

    const validation = validateProviderChoice(svc.role, provider, req);
    for (const warning of validation.warnings) {
      console.log(chalk.yellow('  ⚠') + ` ${warning}`);
    }
    if (!validation.ok) {
      console.log(chalk.red('  ✗') + ` ${validation.blockers.join('; ')}`);
      console.log(chalk.dim('  Pick a different platform for this role.\n'));
      const fallback = recommendForRole(svc.role, req).find((r) => r.implemented && r.score > 0);
      if (!fallback) {
        throw new Error(`No suitable platform for ${svc.label}`);
      }
      choices[svc.role] = fallback.provider;
      console.log(chalk.dim(`  Using ${fallback.name} instead.`));
    } else {
      choices[svc.role] = provider;
    }

    const guide = getProvider(provider);
    if (guide) {
      console.log(chalk.dim(`  ${guide.name}: ${guide.signupUrl}`));
    }
  }

  return choices;
}

export function generateConfigFromChoices(
  projectName: string,
  stack: StackDetection,
  choices: Record<ServiceRole, string>,
  req: ProjectRequirements
): HerambConfig {
  const config: HerambConfig = {
    project: projectName,
    services: {},
    wsConfig: {
      pingInterval: 25000,
      transport: 'websocket-only',
    },
    env: {
      manual: ['JWT_SECRET'],
    },
  };

  if (req.redis && choices.cache) {
    config.services.redis = {
      provider: choices.cache,
      produces: ['REDIS_URL'],
    };
  }

  if (stack.backend && choices.backend) {
    config.services.backend = {
      provider: choices.backend,
      path: stack.backend.path,
      needs: req.redis ? ['REDIS_URL'] : [],
      produces: ['BACKEND_URL'],
      derives: req.websocket
        ? { WS_URL: 'BACKEND_URL → wss://' }
        : undefined,
    };
  }

  if (stack.frontend && choices.frontend) {
    const isVite = stack.frontend.framework === 'vite';
    config.services.frontend = {
      provider: choices.frontend,
      path: stack.frontend.path,
      needs: isVite
        ? ['VITE_API_URL']
        : ['NEXT_PUBLIC_API_URL', ...(req.websocket ? ['NEXT_PUBLIC_WS_URL'] as const : [])],
      produces: ['FRONTEND_URL'],
    };

    config.services['backend-cors'] = {
      action: 'patch-env',
      target: 'backend',
      vars: isVite ? { WEB_URL: 'FRONTEND_URL' } : { CORS_ORIGIN: 'FRONTEND_URL' },
      then: 'redeploy',
    };
  }

  return config;
}
