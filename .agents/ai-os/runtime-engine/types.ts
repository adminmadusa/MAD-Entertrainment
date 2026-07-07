import { EngineState } from './constants';

export interface TaskConfig {
  taskId: string;
  taskName: string;
  workspacePath: string;
  options?: Record<string, any>;
}

export interface EngineContext {
  repoRoot: string;
  workspaces: string[];
  packages: Record<string, string>;
  applications: Record<string, string>;
  activeSkills: string[];
  activeValidators: string[];
  activeTemplates: string[];
}

export interface RegistryItem {
  id: string;
  name: string;
  category: string;
  owner: string;
  version: string;
  status: 'active' | 'draft';
  dependencies: string[];
  meta?: Record<string, any>;
}

export interface ValidatorResult {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  evidence: string;
  recommendation: string;
}

export interface SkillDefinition {
  id: string;
  inputs: string[];
  outputs: string[];
  dependencies: string[];
  validators: string[];
  templates: string[];
}

export interface PromptDefinition {
  id: string;
  requiredLayers: string[];
  requiredSkills: string[];
  requiredValidators: string[];
  governanceRules: string[];
}

export interface SessionState {
  sessionId: string;
  taskId: string;
  state: EngineState;
  startTime: number;
  endTime?: number;
  loadedModules: string[];
  skillsExecuted: string[];
  validatorsExecuted: string[];
  cacheHits: number;
}

export interface AuditReport {
  metadata: {
    sessionId: string;
    taskId: string;
    timestamp: number;
    durationMs: number;
  };
  summary: {
    success: boolean;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  findings: ValidatorResult[];
  recommendations: string[];
}
