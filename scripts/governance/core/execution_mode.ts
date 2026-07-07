// scripts/governance/core/execution_mode.ts

/**
 * Canonical enumeration of all execution modes supported by the auto-fix CLI.
 * Used exclusively by cli/fix.ts to route to the appropriate code path.
 * Nothing below the CLI layer imports this enum.
 */
export enum ExecutionMode {
  STANDARD    = 'STANDARD',
  INTERACTIVE = 'INTERACTIVE',
  PREVIEW     = 'PREVIEW',
  DRY_RUN     = 'DRY_RUN',
  ROLLBACK    = 'ROLLBACK',
}

export interface ExecutionModeArgs {
  rollback: boolean;
  interactive: boolean;
  preview: boolean;
  dryRun: boolean;
}

/**
 * Resolves the effective execution mode from CLI flags.
 * Priority: ROLLBACK > INTERACTIVE > PREVIEW > DRY_RUN > STANDARD
 */
export function resolveExecutionMode(args: ExecutionModeArgs): ExecutionMode {
  if (args.rollback) return ExecutionMode.ROLLBACK;
  if (args.interactive) return ExecutionMode.INTERACTIVE;
  if (args.preview) return ExecutionMode.PREVIEW;
  if (args.dryRun) return ExecutionMode.DRY_RUN;
  return ExecutionMode.STANDARD;
}
