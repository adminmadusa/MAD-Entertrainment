// scripts/governance/core/types.ts

// --- Backward Compatibility Types ---

export interface ValidationError {
  file: string;
  line?: number;
  rule: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  snippet?: string;
  message: string;
}

export interface ValidationResult {
  name: string;
  success: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  statistics: Record<string, any>;
  executionTimeMs: number;
}

export interface DocDependency {
  document: string;
  dependsOn: string[];
}

export interface DocOwnership {
  document: string;
  ownerRole: string;
  reviewCycle: string;
}

export interface GovernanceMetadata {
  requiredDocuments: string[];
  dependencyMatrix: DocDependency[];
  ownershipMatrix?: DocOwnership[];
}

// --- Stateful Audit Intelligence Types ---

export type FindingStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'FALSE_POSITIVE'
  | 'IGNORED'
  | 'INTENTIONAL'
  | 'DOCUMENTED'
  | 'IMPLEMENTED'
  | 'VERIFIED'
  | 'CLOSED'
  | 'REGRESSION';

export interface FindingRelationship {
  type: 'duplicates' | 'depends_on' | 'blocks' | 'related_to' | 'supersedes';
  targetId: string;
}

export interface FindingOccurrence {
  id: string; // SHA-256 fingerprint hash
  line: number;
  column?: number;
  construct?: string;
  snippet?: string;
  message: string;
  fingerprint: string;
}

export interface FindingStateMetadata {
  firstSeenCommit?: string;
  lastSeenCommit?: string;
  firstSeenAudit?: string;
  lastSeenAudit?: string;
}

export interface FindingEvidence {
  path: string;
  construct?: string;
  snippet?: string;
  line?: number;
  message: string;
  occurrences?: FindingOccurrence[]; // <-- Added for grouped occurrences
}

export interface Finding {
  schemaVersion?: number; // <-- Added for schema version tracking (default: 2)
  id: string;
  rule: string;
  ruleVersion: string;
  engineVersion: string;
  domain: string;
  owner: string;
  package: string;
  feature: string;
  status: FindingStatus;
  confidence: number;
  relationships: FindingRelationship[];
  evidence: FindingEvidence;
  createdDate: string;
  firstDetected: string;
  lastDetected: string;
  lastModified?: string; // <-- Added
  occurrenceCount?: number; // <-- Added
  state?: FindingStateMetadata; // <-- Added
}

export interface HistoryEvent {
  timestamp: string;
  action: string;
  status: FindingStatus;
  commit?: string;
  pr?: string;
  reviewer?: string;
  notes?: string;
}

export interface FindingHistory {
  id: string;
  history: HistoryEvent[];
}

export interface FindingException {
  id: string;
  justification: string;
  expiration: string;
  approver: string;
}

export interface RepositorySnapshot {
  commit: string;
  branch: string;
  timestamp: string;
  engineVersion: string;
  ruleRegistryVersion: string;
}

export interface GovernancePerformanceMetrics {
  findingsScanned: number;
  filesScanned: number;
  scanDurationMs: number;
  groupingDurationMs: number;
  migrationDurationMs?: number;
  filesWritten: number;
  filesArchived: number;
}

export interface GovernanceManifest {
  schemaVersion: 2;
  manifestVersion: 1;
  migrationVersion: 1;
  engineVersion: string;
  findingCount: number;
  historySnapshots: number;
  lastMigration: string;
  lastAudit: string;
  performance?: GovernancePerformanceMetrics;
}

export interface FailureRecoveryMetadata {
  failureTimestamp: string;
  failedPhase: string;
  exceptionSummary: string;
  rollbackStatus: 'SUCCESS' | 'FAILED';
}

export interface GovernanceMetrics {
  totalFindings: number;
  newFindings: number;
  closedFindings: number;
  regressionCount: number;
  falsePositiveRate: number;
  averageConfidence: number;
  averageResolutionTimeMs: number;
  scores: {
    architecture: number;
    security: number;
    performance: number;
    accessibility: number;
    uiConsistency: number;
    technicalDebt: number;
    testing: number;
    documentation: number;
    maintainability: number;
    overall: number;
  };
}

export interface PerformanceGuardrails {
  totalScanDurationMs: number;
  astParsingTimeMs: number;
  dependencyGraphBuildTimeMs: number;
  validatorExecutionTimeMs: number;
  reportGenerationTimeMs: number;
  memoryUsageBytes: number;
}

export interface RuleDefinition {
  id: string;
  name: string;
  category: 'UI' | 'UX' | 'ACCESSIBILITY' | 'SECURITY' | 'PERFORMANCE' | 'ARCHITECTURE' | 'HYGIENE';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  confidence: number;
  defaultLifecycle: FindingStatus;
  ciPolicy: 'FAIL_BUILD' | 'WARN' | 'INFO_ONLY';
  owner: string;
  version: string;
  documentationLink: string;
}

// --- Stateless Violation Input ---

export interface StatelessViolation {
  rule: string;
  path: string;
  construct?: string;
  line?: number;
  snippet?: string;
  message: string;
  confidence?: number;
}
