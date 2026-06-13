/**
 * Simulates a full deploy with mock providers — no real API tokens needed.
 * Run: npm run test:deploy
 */
import { runMockDeploy } from './mocks/providers.js';
import chalk from 'chalk';

async function main() {
  const { report } = await runMockDeploy();

  let i = 0;
  for (const result of report.steps) {
    i++;
    const prefix = chalk.dim(`[${i}/${report.steps.length}]`) + ' ' + result.step.label;
    if (result.success) {
      console.log(`${prefix}  ${chalk.green('✓')}${result.value ? chalk.dim(` ${result.value}`) : ''}`);
    } else {
      console.log(`${prefix}  ${chalk.red('✗')} ${result.error}`);
    }
  }

  console.log(chalk.green.bold('\n🔑 Unlocked\n'));
  console.log(chalk.dim('─'.repeat(40)));
  console.log(`AI calls this deploy : ${report.aiCalls}`);
  console.log(`Tokens used          : ${report.tokensUsed}`);
  console.log(`Cost                 : $0.00`);
  console.log(chalk.dim('─'.repeat(40)));
  console.log(chalk.cyan(`Frontend: ${report.resolved['FRONTEND_URL']}`));
  console.log(chalk.cyan(`Backend:  ${report.resolved['BACKEND_URL']}`));
  console.log(chalk.cyan(`Redis:    ${report.resolved['REDIS_URL']}`));
  console.log(chalk.cyan(`CORS:     ${report.resolved['CORS_ORIGIN']}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
