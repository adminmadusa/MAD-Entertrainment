import { ValidatorResult } from '../../types';
import { Finding } from './validator';

export interface ExtendedValidatorResult extends ValidatorResult {
  findings: Finding[];
  durationMs: number;
}
