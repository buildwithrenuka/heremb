/** Provider lock interface — every platform implements these 5 methods */

export type DeployStatus = 'pending' | 'building' | 'deploying' | 'live' | 'failed' | 'unknown';

export interface DeployResult {
  url: string;
  serviceId: string;
}

export interface StatusResult {
  status: DeployStatus;
  url?: string;
}

export interface EnvVarResult {
  ok: boolean;
  error?: string;
}

export interface DestroyResult {
  ok: boolean;
  error?: string;
}

export interface DeployOptions {
  path?: string;
  projectId?: string;
  serviceId?: string;
  envVars?: Record<string, string>;
  name?: string;
}

export interface ProviderLock {
  readonly name: string;

  deploy(options: DeployOptions): Promise<DeployResult>;
  getStatus(serviceId: string): Promise<StatusResult>;
  setEnvVars(serviceId: string, vars: Record<string, string>): Promise<EnvVarResult>;
  getLogs(serviceId: string): AsyncIterable<string>;
  destroy(serviceId: string): Promise<DestroyResult>;
}

/** Redis/cache providers may only provision URLs */
export interface CacheLock {
  readonly name: string;
  provision(options?: { name?: string; region?: string }): Promise<{ url: string; serviceId: string }>;
  destroy(serviceId: string): Promise<DestroyResult>;
}

export interface HerambConfig {
  project: string;
  services: Record<string, ServiceConfig>;
  wsConfig?: {
    pingInterval?: number;
    transport?: 'websocket-only' | 'polling';
  };
  env?: {
    manual?: string[];
  };
}

export type ServiceConfig =
  | ProviderServiceConfig
  | PatchEnvServiceConfig;

export interface ProviderServiceConfig {
  provider: string;
  path?: string;
  needs?: string[];
  produces?: string[];
  derives?: Record<string, string>;
  projectId?: string;
  serviceId?: string;
}

export interface PatchEnvServiceConfig {
  action: 'patch-env';
  target: string;
  vars: Record<string, string>;
  then?: 'redeploy';
}

export interface ResolvedValues {
  [key: string]: string;
}

export interface DeployStep {
  id: string;
  label: string;
  type: 'provision' | 'set-env' | 'deploy' | 'derive' | 'patch-env' | 'redeploy' | 'test' | 'verify-cors';
  serviceKey: string;
  dependsOn: string[];
}

export interface StepResult {
  step: DeployStep;
  success: boolean;
  value?: string;
  error?: string;
  durationMs: number;
}

export interface DeployReport {
  steps: StepResult[];
  resolved: ResolvedValues;
  serviceIds: Record<string, string>;
  aiCalls: number;
  tokensUsed: number;
  success: boolean;
}

export interface KnownError {
  pattern: RegExp;
  message: string;
  autoFix?: (context: ErrorContext) => AutoFixResult | null;
}

export interface ErrorContext {
  step: DeployStep;
  error: string;
  logs?: string;
  config: HerambConfig;
  resolved: ResolvedValues;
}

export interface AutoFixResult {
  action: 'retry' | 'patch-env' | 'set-env';
  vars?: Record<string, string>;
  message: string;
}

export interface StackDetection {
  frontend?: {
    framework: 'next' | 'vite' | 'create-react-app' | 'unknown';
    path: string;
    hasSocketIo: boolean;
  };
  backend?: {
    runtime: 'node' | 'python' | 'go' | 'unknown';
    path: string;
    hasSocketIo: boolean;
    usesPortEnv: boolean;
  };
  warnings: string[];
}

export interface Credentials {
  [provider: string]: {
    token: string;
    [key: string]: string;
  };
}
