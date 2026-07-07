/**
 * @public
 * @contract ADR-006
 *
 * DomainSnapshot — immutable, point-in-time representation of repository
 * state collected by a GovernanceProvider.
 *
 * Never mutated after creation. All downstream consumers (rules, scorers,
 * planners, writers) treat the snapshot as read-only.
 */
export interface DomainSnapshot {
  readonly providerId: string;
  readonly timestamp: string;      // ISO 8601
  readonly schemaVersion: string;  // e.g. "1.0"
  readonly data: Record<string, unknown>;
}
