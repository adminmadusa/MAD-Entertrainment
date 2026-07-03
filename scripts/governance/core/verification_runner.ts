// scripts/governance/core/verification_runner.ts
import { AuditEngine } from './audit_engine';
import { ExecutionEngine } from './execution_engine';
import { MetadataProvider } from './metadata';


/**
 * Performs a targeted re-scan of a specific set of files to determine
 * which rule+file violations are still present after a fix or rollback.
 *
 * Read-only: never touches FindingManager, LifecycleManager, or the filesystem.
 */
export class VerificationRunner {
  /**
   * Runs the execution engine on the given files and returns a set of
   * `${ruleId}:${filePath}` strings for every violation still detected.
   *
   * @param workspaceRoot - Absolute path to the repository root.
   * @param filePaths     - Workspace-relative paths of files to scan.
   * @param ruleIds       - Optional list of rule IDs to restrict the scan.
   *                        When undefined all enabled validators run.
   */
  public static async run(
    workspaceRoot: string,
    filePaths: string[],
    ruleIds?: string[]
  ): Promise<Set<string>> {
    const stillPresent = new Set<string>();

    if (filePaths.length === 0) {
      return stillPresent;
    }

    // Build metadata and execute a targeted scan (reuses existing incremental capability)
    const metadataProvider = new MetadataProvider();
    const metadata = metadataProvider.getMetadata();
    const auditEngine = new AuditEngine();
    metadata.knowledgeGraph = auditEngine.getKnowledgeGraph();

    const filters: { rules?: string[] } = {};
    if (ruleIds && ruleIds.length > 0) {
      filters.rules = ruleIds;
    }

    // ExecutionEngine accepts any subset of files — passes them directly to each
    // validator which further narrows by supportedFileTypes internally.
    const report = await ExecutionEngine.execute(filePaths, metadata, filters);

    for (const result of report.results) {
      const allErrors = [...result.errors, ...result.warnings];
      for (const err of allErrors) {
        // Only record entries that are in our target file set
        if (filePaths.includes(err.file)) {
          stillPresent.add(`${err.rule}:${err.file}`);
        }
      }
    }

    return stillPresent;
  }
}
