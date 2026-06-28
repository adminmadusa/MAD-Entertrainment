import { EngineState } from '../constants';
import { ValidatorResult } from '../types';

export interface IntentResult {
  intent: 'audit' | 'implementation' | 'bugfix' | 'planning' | 'documentation' | 'review';
  target: string;
  confidence: number;
}

export interface TaskContext {
  layers: string[];
  validators: string[];
  skills: string[];
  prompt: string;
  template: string;
}

export interface ExecutionStepResult {
  stepName: string;
  success: boolean;
  durationMs: number;
  results?: any;
}

export interface TaskExecutionResult {
  success: boolean;
  intent: IntentResult;
  context: TaskContext;
  steps: ExecutionStepResult[];
  findings: ValidatorResult[];
  revalidationFindings?: ValidatorResult[];
  reportPath?: string;
  durationMs: number;
}
