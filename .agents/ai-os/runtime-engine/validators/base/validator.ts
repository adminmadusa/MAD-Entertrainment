import { ValidatorResult } from '../../types';

export interface Finding {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line: number;
  evidence: string;
  recommendation: string;
}

export interface IBaseValidator {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  dependencies: string[];
  execute(repoRoot: string, filesList: string[]): Promise<ValidatorResult>;
}
