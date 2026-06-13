import chalk from 'chalk';

export function printBanner(): void {
  console.log(chalk.bold.cyan('\nHeramb 🐘'));
  console.log(chalk.dim('Removes the obstacles between your code and production\n'));
}

export function printUnlock(report: {
  aiCalls: number;
  tokensUsed: number;
  resolved: Record<string, string>;
}): void {
  console.log(chalk.green.bold('\n🔑 Unlocked\n'));
  printDeploySummary(report);
}

export function printPreviewReady(report: {
  aiCalls: number;
  tokensUsed: number;
  resolved: Record<string, string>;
  steps?: Array<{ step: { type: string }; success: boolean; value?: string }>;
}): void {
  console.log(chalk.green.bold('\nPreview environment ready 🔑\n'));

  if (report.resolved['FRONTEND_URL']) {
    console.log(`  Frontend : ${report.resolved['FRONTEND_URL']}`);
  }
  if (report.resolved['BACKEND_URL']) {
    console.log(`  Backend  : ${report.resolved['BACKEND_URL']}`);
  }
  if (report.resolved['REDIS_URL']) {
    console.log(`  Redis    : provisioned (preview tier)`);
  }

  const wsStep = report.steps?.find((s) => s.step.type === 'test' && s.success);
  if (wsStep?.value) {
    console.log(`  WS test  : ✓ ${wsStep.value}`);
  }

  console.log('');
  printDeploySummary(report);
}

function printDeploySummary(report: {
  aiCalls: number;
  tokensUsed: number;
  resolved: Record<string, string>;
}): void {
  console.log(chalk.dim('─'.repeat(40)));
  console.log(`AI calls this deploy : ${report.aiCalls}`);
  console.log(`Tokens used          : ${report.tokensUsed}`);
  console.log(`Cost                 : $${(report.tokensUsed * 0.000002).toFixed(2)}`);
  console.log(chalk.dim('─'.repeat(40)));

  if (report.resolved['FRONTEND_URL']) {
    console.log(chalk.cyan(`Frontend: ${report.resolved['FRONTEND_URL']}`));
  }
  if (report.resolved['BACKEND_URL']) {
    console.log(chalk.cyan(`Backend:  ${report.resolved['BACKEND_URL']}`));
  }
}

export function printError(message: string): void {
  console.error(chalk.red(`\n✗ ${message}\n`));
}

export function formatStepLabel(index: number, total: number, label: string): string {
  return chalk.dim(`[${index}/${total}]`) + ' ' + label;
}

export function formatStepSuccess(value?: string): string {
  return chalk.green('✓') + (value ? chalk.dim(` ${value}`) : '');
}

export function formatStepFailure(error?: string): string {
  return chalk.red('✗') + (error ? chalk.red(` ${error}`) : '');
}
