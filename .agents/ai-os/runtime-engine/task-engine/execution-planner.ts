import { IntentResult, TaskContext, ExecutionPlan, ExecutionGraph, ExecutionMode } from './types';
import { DependencyResolver } from '../dependency-resolver';
import { execSync } from 'child_process';

export class ExecutionPlanner {
  private resolver = new DependencyResolver();

  generatePlan(
    intent: IntentResult,
    context: TaskContext,
    mode: ExecutionMode
  ): ExecutionPlan {
    const planId = `plan_${Math.random().toString(36).substring(2, 11)}`;
    const generatedAt = new Date().toISOString();

    // Resolve repositoryVersion with precedence:
    // 1. Git SHA
    // 2. Git Tag (if detached)
    // 3. "unknown"
    let repositoryVersion = 'unknown';
    try {
      repositoryVersion = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
    } catch {
      try {
        repositoryVersion = execSync('git describe --tags', { stdio: ['ignore', 'pipe', 'ignore'] })
          .toString()
          .trim();
      } catch {
        repositoryVersion = 'unknown';
      }
    }

    // Design DAG nodes
    const graph: ExecutionGraph = {
      nodes: [
        { id: 'load-context', type: 'validate', dependencies: [], parallelizable: false },
        { id: 'run-validators', type: 'validate', dependencies: ['load-context'], parallelizable: true },
        { id: 'apply-fixes', type: 'autofix', dependencies: ['run-validators'], parallelizable: false },
        { id: 'generate-report', type: 'report', dependencies: ['apply-fixes'], parallelizable: false }
      ]
    };

    // Explain decisions
    const explanation = {
      detectedIntent: intent.intent,
      confidence: intent.confidence,
      matchedKeywords: intent.matchedKeywords,
      alternativeIntents: intent.alternatives.map(a => a.intent),
      capabilitySelectionRationale: [
        `Selected validators: ${context.selectedValidators.join(', ')} because target is ${intent.target}.`,
        `Selected skills: ${context.selectedSkills.join(', ')}.`
      ],
      dependencyResolutionTrace: [
        'Resolved load-context as base.',
        'Resolved run-validators dependent on load-context.',
        'Resolved apply-fixes dependent on run-validators.',
        'Resolved generate-report dependent on apply-fixes.'
      ]
    };

    const plan: ExecutionPlan = {
      planId,
      version: '1.0.0',
      plannerVersion: '1.0.0',
      generatedAt,
      repositoryVersion,
      executionMode: mode,
      context,
      graph,
      explanation
    };

    return Object.freeze(plan);
  }
}
export const executionPlanner = new ExecutionPlanner();
