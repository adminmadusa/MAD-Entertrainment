/**
 * @public
 * @contract ADR-006
 *
 * GovernanceProvider — extension point for all governance domains.
 *
 * The platform engine knows only this interface — never domain specifics.
 * Adding a new governance domain (Documentation, Security, Architecture)
 * requires only implementing this interface with no changes to the engine.
 */
import type { EngineContext } from './engine-context.js';
import type { DomainSnapshot } from './domain-snapshot.js';
import type { GovernanceRule } from './governance-rule.js';
import type { ReportWriter } from './report-model.js';

export interface ProviderMetadata {
  readonly id: string;            // e.g. "git"
  readonly name: string;          // e.g. "Git Governance Provider"
  readonly version: string;       // semver: "1.0.0"
  readonly engineVersion: string; // semver range: "^1.0.0"
  readonly apiVersion: string;    // e.g. "1.0"
  readonly description: string;
}

export interface GovernanceProvider {
  readonly metadata: ProviderMetadata;
  collect(context: EngineContext): Promise<DomainSnapshot>;
  rules(): GovernanceRule[];
  writers(): ReportWriter[];
}
