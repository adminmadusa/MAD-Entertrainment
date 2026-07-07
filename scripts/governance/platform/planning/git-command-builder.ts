/**
 * GitCommandBuilder — Internal Platform Component
 * @internal ADR-008
 *
 * Translates abstract CleanupActions into Git shell commands.
 *
 * Policy boundary (strict):
 *   - Validates command syntax ONLY.
 *   - NEVER evaluates confidence, branch safety, protection status, or policy.
 *   - All policy decisions were made upstream by CleanupPlanner.
 *   - This is the ONLY class in the platform that may emit shell strings.
 *
 * Rendering strategy:
 *   - REBASE_SYNC describes *intent* (synchronise with integration target).
 *     The rendering below uses `git pull` (merge strategy, project default).
 *     Switching to rebase or fast-forward-only requires changing only this
 *     class — CleanupPlanner is unaffected.
 */
import type { CleanupAction } from '../contracts/index';

export class GitCommandBuilder {
  /**
   * Translate a single CleanupAction into a shell command string.
   * Returns a shell comment for MANUAL_REVIEW actions — never executable.
   */
  build(action: CleanupAction): string {
    switch (action.actionType) {
      case 'DELETE_LOCAL':
        return `git branch -d ${action.branchName}`;

      case 'DELETE_REMOTE': {
        const remoteName = action.branchName.replace(/^origin\//, '');
        return `git push origin --delete ${remoteName}`;
      }

      case 'REBASE_SYNC':
        // Renders REBASE_SYNC intent as merge-based pull (project default).
        // To switch to rebase strategy: replace pull with rebase here only.
        return [
          `git checkout ${action.branchName}`,
          `git pull origin ${action.targetBranch}`,
        ].join(' && ');

      case 'MANUAL_REVIEW':
        return [
          `# MANUAL_REVIEW`,
          `# Branch:        ${action.branchName}`,
          `# Preconditions: ${action.preconditions.join('; ')}`,
        ].join('\n');
    }
  }

  /**
   * Translate a list of CleanupActions into shell command strings.
   * Preserves order — output index maps 1-to-1 with input index.
   */
  buildAll(actions: ReadonlyArray<CleanupAction>): string[] {
    return actions.map(a => this.build(a));
  }

  /**
   * Build a labelled shell script block from a list of CleanupActions.
   * Useful for shell writers generating an executable script file.
   */
  buildScript(actions: ReadonlyArray<CleanupAction>): string {
    if (actions.length === 0) return '# No cleanup actions planned.';
    const lines = actions.map((a, i) => {
      const cmd = this.build(a);
      return `# [${i + 1}] ${a.actionType} — ${a.branchName}\n${cmd}`;
    });
    return lines.join('\n\n');
  }
}
