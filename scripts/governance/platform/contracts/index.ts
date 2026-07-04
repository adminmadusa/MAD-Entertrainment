/**
 * Platform Contracts — Public API Surface
 * @version 1.0
 * @contract ADR-006
 *
 * This barrel file is the single import point for all frozen public contracts.
 *
 * Import from here:
 *   import type { GovernanceRule, Finding } from '../platform/contracts/index.js';
 *
 * Do NOT import directly from individual contract files in consumer code —
 * that creates coupling to internal file organisation.
 */

export type { DomainSnapshot } from './domain-snapshot.js';

export type {
  GovernanceConfig,
  RepositoryCapabilities,
} from './engine-config.js';

export type { EngineContext } from './engine-context.js';

export type {
  RuleCategory,
  Severity,
  Finding,
  RuleMetadata,
  GovernanceRule,
} from './governance-rule.js';

export { Confidence } from './governance-rule.js';

export type {
  ActionType,
  CleanupAction,
} from './cleanup-action.js';

export type {
  ReportScores,
  ReportModel,
  ReportWriter,
} from './report-model.js';

export type {
  EngineEvent,
  EventBroker,
} from './event-broker.js';

export type {
  ProviderMetadata,
  GovernanceProvider,
} from './governance-provider.js';

export { BranchLifecycleState } from './lifecycle.js';
