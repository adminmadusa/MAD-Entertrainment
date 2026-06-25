// scripts/governance/core/types.ts

export interface ValidationError {
  file: string;
  line?: number;
  rule: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
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

export interface GovernanceMetadata {
  requiredDocuments: string[];
  dependencyMatrix: DocDependency[];
}
