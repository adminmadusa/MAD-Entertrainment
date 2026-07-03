// scripts/governance/core/autofix_observer.ts
import type { Fixer, FixResultItem } from './fix_types';
import type { StatelessViolation } from './types';

/**
 * Pluggable listener interface for AutoFixEngine execution events.
 * Keeps FixContext purely configuration-oriented and separates execution progress
 * from AutoFixEngine business logic.
 *
 * All observer calls in AutoFixEngine must be wrapped in try/catch to protect
 * execution stability.
 */
export interface AutoFixObserver {
  onFixStarted?(violation: StatelessViolation, fixer: Fixer): void;
  onFixApplied?(violation: StatelessViolation, fixer: Fixer, result: FixResultItem): void;
  onFixSkipped?(violation: StatelessViolation, fixer: Fixer, reason: string): void;
  onExecutionFinished?(): void;
}
