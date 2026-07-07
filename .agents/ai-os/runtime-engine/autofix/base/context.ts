import { Finding } from '../validators/base/validator';

export interface FixContext {
  repoRoot: string;
  finding: Finding;
  originalContent: string;
  dryRun: boolean;
}
