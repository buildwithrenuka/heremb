import ora from 'ora';
import chalk from 'chalk';
import { Orchestrator, isProviderConfig } from '@heramb1/core';
import { loadHerambConfig, saveHerambConfig } from '../utils/config.js';
import { createRegistry } from '../utils/registry.js';
import { applyPreviewContext, resolveBranch, type DeployEnv } from '../utils/preview.js';
import {
  formatStepFailure,
  formatStepLabel,
  formatStepSuccess,
  printBanner,
  printError,
  printPreviewReady,
  printUnlock,
} from '../utils/output.js';

export interface DeployCommandOptions {
  backendOnly?: boolean;
  frontendOnly?: boolean;
  env?: DeployEnv;
  branch?: string;
}

export async function deployCommand(options: DeployCommandOptions = {}): Promise<void> {
  printBanner();

  const deployEnv = options.env ?? 'production';
  let config = loadHerambConfig();

  if (deployEnv === 'preview') {
    const branch = resolveBranch(options.branch);
    if (!branch) {
      printError('Preview deploy requires --branch (or GITHUB_HEAD_REF in CI)');
      process.exit(1);
    }
    config = applyPreviewContext(config, branch);
    console.log(chalk.dim(`Preview deploy for branch: ${chalk.cyan(branch)}\n`));
  }

  const registry = createRegistry(config);

  let currentSpinner: ReturnType<typeof ora> | null = null;

  const orchestrator = new Orchestrator({
    config,
    registry,
    credentials: {},
    backendOnly: options.backendOnly,
    frontendOnly: options.frontendOnly,
    deployEnv,
    branch: resolveBranch(options.branch),
    corsWildcardFirstDeploy: deployEnv === 'production',
    onStepStart: (step, index, total) => {
      currentSpinner?.stop();
      currentSpinner = ora(formatStepLabel(index, total, step.label)).start();
    },
    onStepComplete: (result, index, total) => {
      currentSpinner?.stop();
      const prefix = formatStepLabel(index, total, result.step.label);

      if (result.success) {
        console.log(`${prefix}  ${formatStepSuccess(result.value)}`);
      } else {
        console.log(`${prefix}  ${formatStepFailure(result.error)}`);
      }
      currentSpinner = null;
    },
  });

  const report = await orchestrator.run();

  if (Object.keys(report.serviceIds).length > 0) {
    let configUpdated = false;
    for (const [key, id] of Object.entries(report.serviceIds)) {
      const svc = config.services[key];
      if (isProviderConfig(svc) && !svc.serviceId && !svc.projectId) {
        svc.serviceId = id;
        configUpdated = true;
      } else if (
        isProviderConfig(svc) &&
        (svc.provider === 'vercel' || svc.provider === 'netlify') &&
        !svc.projectId
      ) {
        svc.projectId = id;
        configUpdated = true;
      }
    }
    if (configUpdated) {
      saveHerambConfig(config);
      console.log(chalk.dim('Updated heramb.config.json with linked service IDs\n'));
    }
  }

  if (report.success) {
    if (deployEnv === 'preview') {
      printPreviewReady(report);
    } else {
      printUnlock(report);
    }
    process.exit(0);
  } else {
    const lastError = report.steps.find((s) => !s.success)?.error;
    printError(lastError ?? 'Deploy failed');
    process.exit(1);
  }
}
