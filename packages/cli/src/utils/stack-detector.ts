import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { HerambConfig, StackDetection } from '@heramb/core';

export function detectStack(cwd = process.cwd()): StackDetection {
  const result: StackDetection = { warnings: [] };

  const candidates = findProjectRoots(cwd);

  for (const dir of candidates) {
    const pkgPath = join(dir, 'package.json');
    if (!existsSync(pkgPath)) continue;

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
      name?: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const relPath = dir === cwd ? '.' : `./${dir.replace(cwd, '').replace(/^[/\\]/, '')}`;
    const hasSocketIo = Boolean(deps['socket.io'] || deps['socket.io-client']);

    if (deps.next || deps['@next/env']) {
      result.frontend = { framework: 'next', path: relPath, hasSocketIo };
    } else if (deps.vite || deps['@vitejs/plugin-react']) {
      result.frontend = { framework: 'vite', path: relPath, hasSocketIo };
    } else if (deps.react && !result.frontend) {
      result.frontend = { framework: 'create-react-app', path: relPath, hasSocketIo };
    }

    if (deps.express || deps.fastify || deps['@nestjs/core'] || deps.hono || deps['@hono/node-server'] || deps['socket.io']) {
      const usesPortEnv = checkUsesPortEnv(dir);
      result.backend = {
        runtime: 'node',
        path: relPath,
        hasSocketIo: Boolean(deps['socket.io']),
        usesPortEnv,
      };

      if (!usesPortEnv) {
        result.warnings.push(
          `${relPath}: may hardcode port — use process.env.PORT for Railway/Render`
        );
      }

      if (deps['socket.io'] && !deps['@socket.io/redis-adapter']) {
        result.warnings.push(
          `${relPath}: socket.io detected without Redis adapter — needed for multi-instance`
        );
      }
    }
  }

  if (existsSync(join(cwd, 'requirements.txt'))) {
    result.backend = {
      runtime: 'python',
      path: '.',
      hasSocketIo: false,
      usesPortEnv: true,
    };
  }

  if (existsSync(join(cwd, 'go.mod'))) {
    result.backend = {
      runtime: 'go',
      path: '.',
      hasSocketIo: false,
      usesPortEnv: true,
    };
  }

  return result;
}

function findProjectRoots(cwd: string): string[] {
  const roots: string[] = [cwd];

  for (const sub of ['frontend', 'backend', 'apps/web', 'apps/api', 'packages/web', 'packages/api']) {
    const p = resolve(cwd, sub);
    if (existsSync(p) && statSync(p).isDirectory()) {
      roots.push(p);
    }
  }

  try {
    const packagesDir = join(cwd, 'packages');
    if (existsSync(packagesDir)) {
      for (const name of readdirSync(packagesDir)) {
        const p = join(packagesDir, name);
        if (statSync(p).isDirectory()) roots.push(p);
      }
    }
  } catch {
    // ignore
  }

  return roots;
}

function checkUsesPortEnv(dir: string): boolean {
  const entryFiles = ['index.js', 'index.ts', 'server.js', 'server.ts', 'main.ts', 'app.ts'];
  for (const file of entryFiles) {
    const p = join(dir, 'src', file);
    const p2 = join(dir, file);
    for (const fp of [p, p2]) {
      if (existsSync(fp)) {
        const content = readFileSync(fp, 'utf-8');
        if (/process\.env\.PORT|env\.PORT|os\.getenv\s*\(\s*['"]PORT['"]\)/.test(content)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function generateConfigFromStack(
  projectName: string,
  stack: StackDetection
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

  if (stack.backend?.hasSocketIo) {
    config.services.redis = {
      provider: 'upstash',
      produces: ['REDIS_URL'],
    };
  }

  if (stack.backend) {
    config.services.backend = {
      provider: 'railway',
      path: stack.backend.path,
      needs: stack.backend.hasSocketIo ? ['REDIS_URL'] : [],
      produces: ['BACKEND_URL'],
      derives: {
        WS_URL: 'BACKEND_URL → wss://',
      },
    };
  }

  if (stack.frontend) {
    config.services.frontend = {
      provider: 'vercel',
      path: stack.frontend.path,
      needs: ['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_WS_URL'],
      produces: ['FRONTEND_URL'],
    };

    config.services['backend-cors'] = {
      action: 'patch-env',
      target: 'backend',
      vars: { CORS_ORIGIN: 'FRONTEND_URL' },
      then: 'redeploy',
    };
  }

  return config;
}
