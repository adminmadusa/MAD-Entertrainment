/**
 * @public
 * @contract ADR-006
 *
 * ReportModel — structured data consumed by all ReportWriter implementations.
 *
 * Writers must render what this model contains — they must not add, remove,
 * or transform data. The model is the single source of truth for all output
 * formats (markdown, JSON, shell, etc.).
 */
import type { Finding } from './governance-rule.js';
import type { CleanupAction } from './cleanup-action.js';

export interface ReportScores {
  readonly overall: number;
  readonly branchHygiene: number;
  readonly repositoryHealth: number;
  readonly technicalDebt: number;
  readonly gitGovernance: number;
}

export interface ReportModel {
  readonly schemaVersion: string;
  readonly engineVersion: string;
  readonly generatedAt: string;      // ISO 8601
  readonly repository: string;
  readonly scores: ReportScores;
  readonly findings: ReadonlyArray<Readonly<Finding>>;
  readonly actions: ReadonlyArray<CleanupAction>;
}

/**
 * @public
 * @contract ADR-006
 *
 * ReportWriter — extension point for all output formats.
 *
 * Receives a ReportModel and produces an output artifact. Writers must be
 * stateless: the same model always produces the same output.
 */
export interface ReportWriter {
  readonly id: string;
  readonly format: 'markdown' | 'json' | 'shell' | 'html';
  write(model: ReportModel): void;
}
