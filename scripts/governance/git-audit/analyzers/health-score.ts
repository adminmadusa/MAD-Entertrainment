import { computeHygieneScore, ScoreReport } from '../utils/scoring';
import { RegisteredBranch } from '../models/registry';

export function analyzeHealthScore(branches: RegisteredBranch[]): ScoreReport {
  const scoreInput = branches.map(b => ({
    name: b.name,
    category: b.lifecycleState,
    isLocal: b.isLocal,
    upstream: b.upstream,
    behind: b.behind
  }));
  
  return computeHygieneScore(scoreInput);
}
