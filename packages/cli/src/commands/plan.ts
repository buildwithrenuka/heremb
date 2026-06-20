import chalk from 'chalk';
import { buildDeployPlan } from '@heramb1/core';
import { detectStack } from '../utils/stack-detector.js';
import { printBanner } from '../utils/output.js';

export async function planCommand(): Promise<void> {
  printBanner();
  console.log(chalk.dim('Scanning repo...\n'));

  const stack = detectStack();
  const plan = buildDeployPlan(stack);

  if (plan.summary.length > 0) {
    for (const line of plan.summary) {
      console.log(chalk.cyan('→') + ` ${line}`);
    }
    console.log('');
  }

  console.log(chalk.bold('Project requirements'));
  const req = plan.requirements;
  const flags = [
    req.frontend && 'frontend',
    req.backend && 'backend',
    req.websocket && 'WebSockets',
    req.redis && 'Redis',
    req.longRunning && 'always-on server',
  ].filter(Boolean);
  console.log(chalk.dim(`  ${flags.join(' · ') || 'none detected'}\n`));

  for (const svc of plan.services) {
    console.log(chalk.bold(`${svc.label}${svc.path ? chalk.dim(` (${svc.path})`) : ''}`));
    console.log(chalk.dim(`  Needs: ${svc.requirements.join(', ')}`));

    for (const warning of svc.warnings) {
      console.log(chalk.yellow('  ⚠') + ` ${warning}`);
    }

    console.log(chalk.dim('\n  Platform fit (best first):\n'));

    for (const rec of svc.recommendations.slice(0, 6)) {
      const status =
        rec.score > 0
          ? rec.implemented
            ? chalk.green('✓ ready')
            : chalk.yellow('○ planned')
          : chalk.red('✗ unsuitable');

      console.log(`  ${status}  ${chalk.bold(rec.name)}${rec.score > 0 ? chalk.dim(` — score ${rec.score}`) : ''}`);

      if (rec.reasons.length > 0 && rec.score > 0) {
        console.log(chalk.dim(`           ${rec.reasons.join(' · ')}`));
      }
      for (const blocker of rec.blockers) {
        console.log(chalk.red(`           ✗ ${blocker}`));
      }
    }

    const best = svc.recommendations.find((r) => r.implemented && r.score > 0);
    if (best) {
      console.log(chalk.green(`\n  Recommended: ${best.name}`));
    }
    console.log('');
  }

  console.log(chalk.dim('Run `heramb init` to pick platforms and connect accounts.\n'));
}
