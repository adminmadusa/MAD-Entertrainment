import { evaluateRepositoryScores, ScoreReport, AdditionalMetrics } from '../utils/scoring';
import { RegisteredBranch } from '../models/registry';

export function analyzeHealthScore(
  branches: RegisteredBranch[],
  metrics: AdditionalMetrics
): ScoreReport {
  return evaluateRepositoryScores(branches, metrics);
}
