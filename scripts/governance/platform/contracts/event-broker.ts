/**
 * @public
 * @contract ADR-006
 *
 * EventBroker — the platform event bus interface.
 *
 * The INTERFACE is part of the frozen public API (this contract).
 * External providers may subscribe to platform events through this interface.
 *
 * The IMPLEMENTATION (EventBrokerImpl or equivalent) is an internal platform
 * detail and may evolve without a major version bump. Providers and rules
 * must only depend on this interface — never on the implementation class.
 */
import type { DomainSnapshot } from './domain-snapshot.js';
import type { Finding } from './governance-rule.js';
import type { CleanupAction } from './cleanup-action.js';

export type EngineEvent =
  | { type: 'CollectionStarted';   payload: { providerId: string } }
  | { type: 'CollectionCompleted'; payload: DomainSnapshot }
  | { type: 'RuleStarted';         payload: { ruleId: string } }
  | { type: 'FindingCreated';      payload: Readonly<Finding> }
  | { type: 'PlanGenerated';       payload: ReadonlyArray<CleanupAction> }
  | { type: 'ReportWritten';       payload: { paths: string[] } };

// PUBLIC — frozen by ADR-006
export interface EventBroker {
  subscribe(listener: (event: EngineEvent) => void): void;
  publish(event: EngineEvent): void;
}

// INTERNAL — EventBrokerImpl is NOT exported from platform/contracts/
// It lives in platform/engine/ and may evolve without a version bump.
