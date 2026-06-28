import { FixContext } from './context';
import { AutoFixResult } from './result';

export interface IFixer {
  id: string; // matches finding.ruleId or validator.id
  title: string;
  category: string;
  suggestFix(context: FixContext): Promise<AutoFixResult>;
}
