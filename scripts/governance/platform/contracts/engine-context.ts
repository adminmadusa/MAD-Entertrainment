/**
 * @public
 * @contract ADR-006
 *
 * EngineContext — the single coordination object passed to all rules,
 * planners, and writers.
 *
 * Contains only the stable abstractions that providers and rules genuinely
 * need. RuleRegistry and the EventBroker implementation are internal engine
 * concerns and are not exposed through this contract.
 */
import type { DomainSnapshot } from './domain-snapshot.js';
import type { GovernanceConfig, RepositoryCapabilities } from './engine-config.js';

export interface EngineContext {
  readonly snapshot: DomainSnapshot;
  readonly capabilities: RepositoryCapabilities;
  readonly config: GovernanceConfig;
}
