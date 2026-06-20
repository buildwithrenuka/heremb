import chalk from 'chalk';
import { testWebSocket } from '@heramb1/core';
import { loadHerambConfig } from '../utils/config.js';
import { printBanner } from '../utils/output.js';

export async function wsTestCommand(urlArg?: string): Promise<void> {
  printBanner();

  let url = urlArg;

  if (!url) {
    try {
      const config = loadHerambConfig();
      const backend = config.services.backend;
      if (backend && 'derives' in backend) {
        console.log(chalk.dim('No URL provided — deploy first or pass a URL'));
        process.exit(1);
      }
    } catch {
      console.error(chalk.red('Provide a WebSocket URL: heramb ws test wss://...'));
      process.exit(1);
    }
  }

  if (!url) {
    console.error(chalk.red('WebSocket URL required'));
    process.exit(1);
  }

  process.stdout.write(chalk.dim(`Testing ${url}... `));

  try {
    const latency = await testWebSocket(url, 10000);
    console.log(chalk.green(`✓ handshake OK (${latency}ms)\n`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(chalk.red(`✗ ${msg}\n`));
    process.exit(1);
  }
}
