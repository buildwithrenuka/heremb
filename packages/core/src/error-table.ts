import type { AutoFixResult, ErrorContext, KnownError } from './types.js';

export const KNOWN_ERRORS: KnownError[] = [
  {
    pattern: /EADDRINUSE|address already in use|port.*already/i,
    message: 'Port conflict — app may be hardcoding a port instead of using process.env.PORT',
    autoFix: () => ({
      action: 'retry',
      message: 'Ensure your app listens on process.env.PORT. Check init warnings.',
    }),
  },
  {
    pattern: /CORS|Access-Control-Allow-Origin|blocked by CORS/i,
    message: 'CORS misconfiguration detected',
    autoFix: (ctx) => {
      if (ctx.resolved['FRONTEND_URL']) {
        return {
          action: 'patch-env',
          vars: { CORS_ORIGIN: ctx.resolved['FRONTEND_URL'] },
          message: `Setting CORS_ORIGIN to ${ctx.resolved['FRONTEND_URL']}`,
        };
      }
      return {
        action: 'patch-env',
        vars: { CORS_ORIGIN: '*' },
        message: 'Setting temporary CORS_ORIGIN=* until frontend deploys',
      };
    },
  },
  {
    pattern: /redis.*connect|ECONNREFUSED.*6379|NOAUTH|WRONGPASS/i,
    message: 'Redis connection failed — check REDIS_URL and adapter config',
  },
  {
    pattern: /socket\.io.*adapter|missing.*redis.*adapter/i,
    message: 'Socket.io needs Redis adapter for multi-instance deployments',
    autoFix: (ctx) => {
      if (ctx.resolved['REDIS_URL']) {
        return {
          action: 'set-env',
          vars: { REDIS_URL: ctx.resolved['REDIS_URL'] },
          message: 'Injecting REDIS_URL for Socket.io adapter',
        };
      }
      return null;
    },
  },
  {
    pattern: /build.*failed|npm ERR!|error Command failed|Module not found/i,
    message: 'Build failure — check dependencies and build command',
  },
  {
    pattern: /401|403|unauthorized|invalid token|authentication failed/i,
    message: 'Authentication failed — run heramb init to refresh credentials (Key not found)',
  },
  {
    pattern: /websocket.*upgrade|400 Bad Request.*upgrade/i,
    message: 'WebSocket upgrade failed — ensure transports include websocket',
    autoFix: () => ({
      action: 'set-env',
      vars: { SOCKET_TRANSPORTS: 'websocket' },
      message: 'Forcing websocket-only transport',
    }),
  },
  {
    pattern: /ENOENT|cannot find module|file not found/i,
    message: 'Missing file or module — verify path in heramb.config.json',
  },
  {
    pattern: /timeout|ETIMEDOUT|deployment timed out/i,
    message: 'Deployment timed out — provider may be under load, retrying',
    autoFix: () => ({
      action: 'retry',
      message: 'Retrying deploy after timeout',
    }),
  },
];

export function matchKnownError(context: ErrorContext): { known: KnownError; autoFix: AutoFixResult | null } | null {
  const haystack = `${context.error}\n${context.logs ?? ''}`;

  for (const known of KNOWN_ERRORS) {
    if (known.pattern.test(haystack)) {
      const autoFix = known.autoFix?.(context) ?? null;
      return { known, autoFix };
    }
  }

  return null;
}

export interface AiDiagnosis {
  explanation: string;
  canAutoFix: boolean;
  fix?: AutoFixResult;
  tokensUsed: number;
}

/** Placeholder for AI fallback — returns structured diagnosis without calling AI in v0.1 */
export async function diagnoseWithAi(context: ErrorContext): Promise<AiDiagnosis> {
  // In production, this would call an LLM with ~200-400 tokens
  return {
    explanation: `Unexpected error during "${context.step.label}": ${context.error.slice(0, 200)}`,
    canAutoFix: false,
    tokensUsed: 0,
  };
}

export interface ErrorHandlerResult {
  handled: boolean;
  shouldRetry: boolean;
  autoFix?: AutoFixResult;
  message: string;
  usedAi: boolean;
  tokensUsed: number;
}

export async function handleDeployError(context: ErrorContext): Promise<ErrorHandlerResult> {
  const match = matchKnownError(context);

  if (match) {
    if (match.autoFix) {
      return {
        handled: true,
        shouldRetry: true,
        autoFix: match.autoFix,
        message: match.autoFix.message,
        usedAi: false,
        tokensUsed: 0,
      };
    }
    return {
      handled: true,
      shouldRetry: false,
      message: match.known.message,
      usedAi: false,
      tokensUsed: 0,
    };
  }

  const ai = await diagnoseWithAi(context);
  if (ai.canAutoFix && ai.fix) {
    return {
      handled: true,
      shouldRetry: true,
      autoFix: ai.fix,
      message: ai.explanation,
      usedAi: true,
      tokensUsed: ai.tokensUsed,
    };
  }

  return {
    handled: false,
    shouldRetry: false,
    message: ai.explanation,
    usedAi: true,
    tokensUsed: ai.tokensUsed,
  };
}
