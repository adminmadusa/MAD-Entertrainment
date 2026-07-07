/**
 * @public
 * @contract ADR-006
 *
 * GovernanceConfig — repository-level policy configuration consumed by
 * rules and scorers via EngineContext. Values are read-only at runtime.
 */
export interface GovernanceConfig {
  readonly stale_commit_threshold: number;  // days, default 30
  readonly integration_branches: string[];  // e.g. ["develop", "main", "live"]
  readonly protected_branches: string[];    // e.g. ["develop", "live", "main"]
  readonly max_branch_age_days: number;     // default 90
}

/**
 * @public
 * @contract ADR-006
 *
 * RepositoryCapabilities — static facts about the repository environment,
 * collected once at engine startup and made available to all components.
 */
export interface RepositoryCapabilities {
  readonly supportsWorktrees: boolean;
  readonly supportsSubmodules: boolean;
  readonly supportsLFS: boolean;
  readonly hasRemoteOrigin: boolean;
  readonly defaultBranch: string;
}
