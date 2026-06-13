export { Orchestrator } from './orchestrator.js';
export type { ProviderRegistry, OrchestratorOptions } from './orchestrator.js';
export {
  applyDerivation,
  buildDeploySteps,
  buildProducerMap,
  isPatchEnvConfig,
  isProviderConfig,
  loadConfig,
  resolveEnvMapping,
} from './dependency-graph.js';
export { handleDeployError, KNOWN_ERRORS, matchKnownError, diagnoseWithAi } from './error-table.js';
export { testWebSocket } from './websocket-test.js';
export { verifyCors } from './cors-verify.js';
export {
  PROVIDER_CATALOG,
  buildDeployPlan,
  deriveRequirements,
  getProvider,
  providersNeededForPlan,
  recommendForRole,
  topProviderForRole,
  validateProviderChoice,
} from './provider-catalog.js';
export type {
  DeployPlan,
  ProjectRequirements,
  ProviderCapabilities,
  ProviderRecommendation,
  ServiceDeployPlan,
  ServiceRole,
} from './provider-catalog.js';
export type * from './types.js';
