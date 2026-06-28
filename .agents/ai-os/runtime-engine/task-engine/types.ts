import { ValidatorResult } from '../types';

export type ExecutionMode = 'PLAN' | 'ANALYZE' | 'VALIDATE' | 'FIX' | 'IMPLEMENT' | 'REPORT';

export interface IntentDefinition {
  intent: string;
  keywords: string[];
  defaultMode: ExecutionMode;
  requiredCapabilities: string[];
}

export interface IntentResult {
  intent: string;
  confidence: number;
  matchedKeywords: string[];
  alternatives: Array<{ intent: string; confidence: number }>;
}

export interface TaskContext {
  readonly repoRoot: string;
  readonly taskId: string;
  readonly request: string;
  readonly mode: ExecutionMode;
  readonly selectedValidators: string[];
  readonly selectedSkills: string[];
  readonly selectedPrompts: string[];
  readonly selectedTemplates: string[];
}

export interface ExecutionGraphNode {
  readonly id: string;
  readonly type: 'validate' | 'execute-skill' | 'autofix' | 'report';
  readonly dependencies: string[];
  readonly parallelizable: boolean;
}

export interface ExecutionGraph {
  readonly nodes: ExecutionGraphNode[];
}

export interface ExecutionPlan {
  readonly planId: string;
  readonly version: string;
  readonly plannerVersion: string;
  readonly generatedAt: string; // ISO-8601 UTC timestamp
  readonly repositoryVersion: string;
  readonly executionMode: ExecutionMode;
  readonly context: TaskContext;
  readonly graph: ExecutionGraph;
  readonly explanation: {
    readonly detectedIntent: string;
    readonly confidence: number;
    readonly matchedKeywords: string[];
    readonly alternativeIntents: string[];
    readonly capabilitySelectionRationale: string[];
    readonly dependencyResolutionTrace: string[];
  };
}

export interface ExecutionStepResult {
  readonly stepName: string;
  readonly success: boolean;
  readonly durationMs: number;
  readonly results?: any;
}

export interface TaskExecutionResult {
  readonly success: boolean;
  readonly plan: ExecutionPlan;
  readonly steps: ExecutionStepResult[];
  readonly findings: ValidatorResult[];
  readonly revalidationFindings?: ValidatorResult[];
  readonly reportPath?: string;
  readonly durationMs: number;
}
