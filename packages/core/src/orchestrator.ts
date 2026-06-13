import { applyDerivation, buildDeploySteps, isPatchEnvConfig, isProviderConfig, resolveEnvMapping } from './dependency-graph.js';
import { handleDeployError } from './error-table.js';
import type {
  CacheLock,
  HerambConfig,
  Credentials,
  DeployReport,
  DeployStep,
  ProviderLock,
  ResolvedValues,
  StepResult,
} from './types.js';

export interface ProviderRegistry {
  getLock(provider: string): ProviderLock | undefined;
  getCacheLock(provider: string): CacheLock | undefined;
}

export interface OrchestratorOptions {
  config: HerambConfig;
  registry: ProviderRegistry;
  credentials: Credentials;
  onStepStart?: (step: DeployStep, index: number, total: number) => void;
  onStepComplete?: (result: StepResult, index: number, total: number) => void;
  skipServices?: string[];
  backendOnly?: boolean;
  frontendOnly?: boolean;
  corsWildcardFirstDeploy?: boolean;
  deployEnv?: 'production' | 'preview';
  branch?: string;
  skipVerification?: boolean;
}

const REDIS_PROVIDERS = new Set(['upstash', 'redis', 'railway-redis']);

export class Orchestrator {
  private config: HerambConfig;
  private registry: ProviderRegistry;
  private resolved: ResolvedValues = {};
  private serviceIds: Record<string, string> = {};
  private aiCalls = 0;
  private tokensUsed = 0;
  private corsWildcard: boolean;
  private deployEnv: 'production' | 'preview';
  private branch?: string;

  constructor(private options: OrchestratorOptions) {
    this.config = options.config;
    this.registry = options.registry;
    this.deployEnv = options.deployEnv ?? 'production';
    this.branch = options.branch;
    this.corsWildcard =
      options.corsWildcardFirstDeploy ?? this.deployEnv === 'production';
  }

  private resourceName(suffix: string): string {
    return `${this.config.project}-${suffix}`;
  }

  async run(): Promise<DeployReport> {
    const steps = buildDeploySteps(this.config, {
      skipServices: this.options.skipServices,
      backendOnly: this.options.backendOnly,
      frontendOnly: this.options.frontendOnly,
    });

    const results: StepResult[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      this.options.onStepStart?.(step, i + 1, steps.length);

      const result = await this.executeStep(step);
      results.push(result);
      this.options.onStepComplete?.(result, i + 1, steps.length);

      if (!result.success) {
        return {
          steps: results,
          resolved: this.resolved,
          serviceIds: this.serviceIds,
          aiCalls: this.aiCalls,
          tokensUsed: this.tokensUsed,
          success: false,
        };
      }
    }

    return {
      steps: results,
      resolved: this.resolved,
      serviceIds: this.serviceIds,
      aiCalls: this.aiCalls,
      tokensUsed: this.tokensUsed,
      success: true,
    };
  }

  private async executeStep(step: DeployStep): Promise<StepResult> {
    const start = Date.now();

    try {
      const value = await this.runStep(step);
      return {
        step,
        success: true,
        value,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      const handler = await handleDeployError({
        step,
        error,
        config: this.config,
        resolved: this.resolved,
      });

      this.aiCalls += handler.usedAi ? 1 : 0;
      this.tokensUsed += handler.tokensUsed;

      if (handler.shouldRetry && handler.autoFix) {
        await this.applyAutoFix(step, handler.autoFix);
        try {
          const value = await this.runStep(step);
          return {
            step,
            success: true,
            value,
            durationMs: Date.now() - start,
          };
        } catch (retryErr) {
          const retryError = retryErr instanceof Error ? retryErr.message : String(retryErr);
          return {
            step,
            success: false,
            error: retryError,
            durationMs: Date.now() - start,
          };
        }
      }

      return {
        step,
        success: false,
        error: handler.message || error,
        durationMs: Date.now() - start,
      };
    }
  }

  private async applyAutoFix(
    step: DeployStep,
    fix: { action: string; vars?: Record<string, string> }
  ): Promise<void> {
    if (fix.action === 'patch-env' || fix.action === 'set-env') {
      const targetKey = step.serviceKey.replace(/-env$|-deploy$/, '');
      const svc = this.config.services[targetKey];
      if (isProviderConfig(svc) && fix.vars) {
        const lock = this.registry.getLock(svc.provider);
        const serviceId = this.serviceIds[targetKey] ?? svc.serviceId;
        if (lock && serviceId) {
          await lock.setEnvVars(serviceId, fix.vars);
        }
      }
    }
  }

  private async runStep(step: DeployStep): Promise<string | undefined> {
    switch (step.type) {
      case 'provision':
        return this.provision(step.serviceKey);
      case 'set-env':
        return this.setEnv(step.serviceKey);
      case 'deploy':
        return this.deploy(step.serviceKey);
      case 'derive':
        return this.derive(step);
      case 'patch-env':
        return this.patchEnv(step.serviceKey);
      case 'redeploy':
        return this.redeploy(step.serviceKey);
      case 'test':
        return this.testWebSocket();
      case 'verify-cors':
        if (this.options.skipVerification) return 'skipped (verify disabled)';
        return this.verifyCors(step.serviceKey);
      default:
        return undefined;
    }
  }

  private getServiceConfig(key: string) {
    const svc = this.config.services[key];
    if (!svc || !isProviderConfig(svc)) {
      throw new Error(`Service not found: ${key}`);
    }
    return svc;
  }

  private async provision(key: string): Promise<string> {
    const svc = this.getServiceConfig(key);
    const cache = this.registry.getCacheLock(svc.provider);
    if (!cache) {
      throw new Error(`No cache lock for provider: ${svc.provider}`);
    }

    const result = await cache.provision({
      name: this.resourceName(key),
      region: this.deployEnv === 'preview' ? 'us-east-1' : undefined,
    });
    this.serviceIds[key] = result.serviceId;

    for (const produced of svc.produces ?? ['REDIS_URL']) {
      this.resolved[produced] = result.url;
    }

    return result.url;
  }

  private async setEnv(key: string): Promise<string> {
    const svc = this.getServiceConfig(key);
    const lock = this.registry.getLock(svc.provider);
    if (!lock) throw new Error(`No lock for provider: ${svc.provider}`);

    const vars = resolveEnvMapping(key, this.config, this.resolved, this.corsWildcard);
    const serviceId = svc.serviceId ?? this.serviceIds[key];

    if (serviceId) {
      await lock.setEnvVars(serviceId, vars);
    }

    return `${Object.keys(vars).length} vars`;
  }

  private async deploy(key: string): Promise<string> {
    const svc = this.getServiceConfig(key);

    if (REDIS_PROVIDERS.has(svc.provider)) {
      return this.provision(key);
    }

    const lock = this.registry.getLock(svc.provider);
    if (!lock) throw new Error(`No lock for provider: ${svc.provider}`);

    const vars = resolveEnvMapping(key, this.config, this.resolved, this.corsWildcard);

    const result = await lock.deploy({
      path: svc.path,
      projectId: svc.projectId,
      serviceId: svc.serviceId ?? this.serviceIds[key],
      envVars: vars,
      name: this.resourceName(key),
    });

    this.serviceIds[key] = result.serviceId;

    for (const produced of svc.produces ?? []) {
      if (produced.includes('URL')) {
        this.resolved[produced] = result.url;
      }
    }

    // Standard URL mappings
    if (svc.produces?.includes('BACKEND_URL')) {
      this.resolved['BACKEND_URL'] = result.url;
    }
    if (svc.produces?.includes('FRONTEND_URL')) {
      this.resolved['FRONTEND_URL'] = result.url;
    }

    return result.url;
  }

  private derive(step: DeployStep): string {
    const svc = this.config.services[step.serviceKey];
    if (!isProviderConfig(svc) || !svc.derives) {
      throw new Error(`No derivations for ${step.serviceKey}`);
    }

    for (const [derivedKey, rule] of Object.entries(svc.derives)) {
      if (step.id.includes(derivedKey)) {
        const sourceKey = rule.split('→')[0]?.trim() ?? '';
        const sourceValue = this.resolved[sourceKey];
        if (!sourceValue) throw new Error(`Cannot derive ${derivedKey}: ${sourceKey} not resolved`);
        const derived = applyDerivation(sourceKey, sourceValue, rule);
        this.resolved[derivedKey] = derived;
        return derived;
      }
    }

    throw new Error(`Derivation step not matched: ${step.id}`);
  }

  private async patchEnv(key: string): Promise<string> {
    const svc = this.config.services[key];
    if (!isPatchEnvConfig(svc)) throw new Error(`Not a patch-env service: ${key}`);

    const targetSvc = this.config.services[svc.target];
    if (!isProviderConfig(targetSvc)) throw new Error(`Patch target not found: ${svc.target}`);

    const lock = this.registry.getLock(targetSvc.provider);
    if (!lock) throw new Error(`No lock for provider: ${targetSvc.provider}`);

    const vars: Record<string, string> = {};
    for (const [envKey, sourceKey] of Object.entries(svc.vars)) {
      const value = this.resolved[sourceKey];
      if (!value) throw new Error(`Cannot patch ${envKey}: ${sourceKey} not resolved`);
      vars[envKey] = value;
      this.resolved[envKey] = value;
    }

    const serviceId = this.serviceIds[svc.target] ?? targetSvc.serviceId;
    if (!serviceId) throw new Error(`No service ID for ${svc.target}`);

    await lock.setEnvVars(serviceId, vars);
    this.corsWildcard = false;

    return Object.values(vars).join(', ');
  }

  private async redeploy(key: string): Promise<string> {
    const svc = this.getServiceConfig(key);
    const lock = this.registry.getLock(svc.provider);
    if (!lock) throw new Error(`No lock for provider: ${svc.provider}`);

    const serviceId = this.serviceIds[key] ?? svc.serviceId;
    if (!serviceId) throw new Error(`No service ID for ${key}`);

    const result = await lock.deploy({
      path: svc.path,
      projectId: svc.projectId,
      serviceId,
      envVars: resolveEnvMapping(key, this.config, this.resolved, false),
      name: this.resourceName(key),
    });

    return result.url;
  }

  private async verifyCors(targetKey: string): Promise<string> {
    const backendUrl = this.resolved['BACKEND_URL'];
    const frontendUrl = this.resolved['FRONTEND_URL'] ?? this.resolved['CORS_ORIGIN'];

    if (!backendUrl || !frontendUrl) {
      return 'skipped (no URLs to verify)';
    }

    const { verifyCors: verify } = await import('./cors-verify.js');
    return verify(backendUrl, frontendUrl);
  }

  private async testWebSocket(): Promise<string> {
    const wsUrl = this.resolved['WS_URL'];
    if (!wsUrl) return 'skipped (no WS_URL)';

    // Dynamic import to avoid requiring ws in core consumers that don't test
    const { testWebSocket: test } = await import('./websocket-test.js');
    const latency = await test(wsUrl, this.config.wsConfig?.pingInterval ?? 5000);
    return `handshake OK (${latency}ms)`;
  }
}

export { applyDerivation, buildDeploySteps, buildProducerMap, loadConfig, resolveEnvMapping } from './dependency-graph.js';
export { handleDeployError, KNOWN_ERRORS, matchKnownError } from './error-table.js';
export type * from './types.js';
