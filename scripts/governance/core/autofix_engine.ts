// scripts/governance/core/autofix_engine.ts
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

import { AuditEngine } from './audit_engine';
import type { AutoFixObserver } from './autofix_observer';
import { ExecutionEngine } from './execution_engine';
import { FileWriter } from './file_writer';
import { FixContext } from './fix_context';
import { FixRegistry } from './fix_registry';
import { FixResult } from './fix_result';
import type { FixResultItem } from './fix_types';
import { MetadataProvider } from './metadata';
import { RollbackManager } from './rollback_manager';
import type { StatelessViolation } from './types';
import { ValidatorRegistry } from './validator_registry';

export class AutoFixEngine {
  /**
   * Helper to retrieve all files in the workspace (markdown + source code) for scanning.
   */
  private static getScanFiles(workspaceRoot: string): string[] {
    const graph = new AuditEngine().getKnowledgeGraph();
    return graph.getIndexedFiles().sort();
  }

  /**
   * Main entry point to execute autofix.
   */
  public static async execute(context: FixContext, observer?: AutoFixObserver): Promise<FixResult> {
    const result = new FixResult();

    if (context.preview || context.dryRun) {
      context.logger.log(`🔍 Running autofix in ${context.preview ? 'PREVIEW' : 'DRY-RUN'} mode. No files will be modified on disk.`);
    }

    // Initialize Rollback Session
    const rollbackSession = RollbackManager.createSession(context.workspaceRoot);
    context.rollbackSession = rollbackSession;

    // 1. Gather all files and execute scan
    const filesToScan = this.getScanFiles(context.workspaceRoot);
    const metadataProvider = new MetadataProvider();
    const metadata = metadataProvider.getMetadata();
    const auditEngine = new AuditEngine();
    metadata.knowledgeGraph = auditEngine.getKnowledgeGraph();

    // Map filters
    const filters: { rules?: string[] } = {};
    if (context.rule) {
      filters.rules = [context.rule];
    }

    context.logger.log(`📂 Discovered ${filesToScan.length} files. Executing validation scan...`);
    const report = await ExecutionEngine.execute(filesToScan, metadata, filters);

    // 2. Map all ValidationErrors to StatelessViolations
    const violations: StatelessViolation[] = [];
    for (const res of report.results) {
      const allErrors = [...res.errors, ...res.warnings];
      const def = ValidatorRegistry.getValidator(res.name) || 
                  ValidatorRegistry.getAllValidators().find(v => v.name === res.name);
      
      const construct = def?.id === 'DeadAssetDuplicateValidator' || 
                        def?.id === 'UIDesignValidator' || 
                        def?.id === 'AccessibilityValidator' || 
                        def?.id === 'SharedComponentValidator' ? 'UIElement' : 'Document';

      for (const err of allErrors) {
        // Apply CLI rule and path filters
        if (context.rule && err.rule !== context.rule) {
          continue;
        }
        if (context.path) {
          const resolvedPath = resolve(context.workspaceRoot, err.file);
          const resolvedFilter = resolve(context.workspaceRoot, context.path);
          if (!resolvedPath.startsWith(resolvedFilter)) {
            continue;
          }
        }
        
        violations.push({
          rule: err.rule,
          path: err.file,
          construct,
          line: err.line,
          snippet: err.snippet,
          message: err.message,
          confidence: 1.0,
        });
      }
    }

    // Sort violations deterministically
    violations.sort((a, b) => {
      if (a.path !== b.path) return a.path.localeCompare(b.path);
      if (a.rule !== b.rule) return a.rule.localeCompare(b.rule);
      if ((a.construct || '') !== (b.construct || '')) {
        return (a.construct || '').localeCompare(b.construct || '');
      }
      if (a.line !== b.line) return (a.line || 0) - (b.line || 0);
      return (a.message || '').localeCompare(b.message || '');
    });

    context.logger.log(`🧠 Discovered ${violations.length} violations matching filters.`);

    // 3. Process each violation
    for (const violation of violations) {
      // Graceful interruption check before starting the next item
      if (context.signal?.aborted) {
        context.logger.warn('⚠️  Execution aborted by signal controller.');
        break;
      }

      const ruleId = violation.rule;
      const filePath = violation.path;

      if (!FixRegistry.supports(ruleId)) {
        const skipItem: FixResultItem = {
          ruleId,
          filePath,
          success: false,
          message: `No fixer registered for rule: ${ruleId}`,
          safety: 'UNSUPPORTED',
          applied: false,
        };
        result.addResult(skipItem);

        if (observer?.onFixSkipped) {
          try {
            const dummyFixer = { ruleId, safety: 'UNSUPPORTED' as const, fix: async () => ({}) as any };
            observer.onFixSkipped(violation, dummyFixer, 'No fixer registered');
          } catch (e: any) {
            context.logger.warn(`AutoFixObserver.onFixSkipped failed: ${e.message}`);
          }
        }
        continue;
      }

      const fixer = FixRegistry.get(ruleId)!;

      // Delegate execution decision to the pluggable ExecutionPolicy.
      if (!context.executionPolicy.shouldExecute(violation, fixer, context)) {
        const skipItem: FixResultItem = {
          ruleId,
          filePath,
          success: true,
          message: `Fix skipped by execution policy (${fixer.safety})`,
          safety: fixer.safety,
          applied: false,
        };
        result.addResult(skipItem);

        if (observer?.onFixSkipped) {
          try {
            observer.onFixSkipped(violation, fixer, 'Skipped by execution policy');
          } catch (e: any) {
            context.logger.warn(`AutoFixObserver.onFixSkipped failed: ${e.message}`);
          }
        }
        continue;
      }

      // Observer hook: onFixStarted
      if (observer?.onFixStarted) {
        try {
          observer.onFixStarted(violation, fixer);
        } catch (e: any) {
          context.logger.warn(`AutoFixObserver.onFixStarted failed: ${e.message}`);
        }
      }

      // Record original file content before running the fixer (only if not dry run / preview)
      const fullPath = resolve(context.workspaceRoot, filePath);
      let originalContent = '';
      if (existsSync(fullPath)) {
        originalContent = readFileSync(fullPath, 'utf8');
      }

      if (!context.dryRun && !context.preview) {
        rollbackSession.recordFile(filePath, originalContent);
      }

      try {
        const fixResult = await fixer.fix(violation, context);
        
        if (fixResult.success && fixResult.applied && !context.dryRun && !context.preview && fixResult.fixedContent !== undefined) {
          // Perform writes via centralized FileWriter
          FileWriter.write(context.workspaceRoot, filePath, fixResult.fixedContent);
        }

        result.addResult(fixResult);

        if (observer?.onFixApplied) {
          try {
            observer.onFixApplied(violation, fixer, fixResult);
          } catch (e: any) {
            context.logger.warn(`AutoFixObserver.onFixApplied failed: ${e.message}`);
          }
        }
      } catch (err: any) {
        context.logger.error(`Failed to apply fixer for rule ${ruleId} on ${filePath}: ${err.message}`, err);
        const errorItem = {
          ruleId,
          filePath,
          success: false,
          message: `Fixer execution threw error: ${err.message}`,
          safety: fixer.safety,
          applied: false,
          error: err,
        };
        result.addResult(errorItem);

        if (observer?.onFixApplied) {
          try {
            observer.onFixApplied(violation, fixer, errorItem);
          } catch (e: any) {
            context.logger.warn(`AutoFixObserver.onFixApplied failed: ${e.message}`);
          }
        }
      }
    }

    // Save rollback session if any files were recorded and we're not in preview/dry-run
    if (!context.dryRun && !context.preview) {
      const rollbackFile = rollbackSession.save();
      if (rollbackFile) {
        context.logger.log(`💾 Rollback session saved at: ${rollbackFile}`);
      }
    }

    if (observer?.onExecutionFinished) {
      try {
        observer.onExecutionFinished();
      } catch (e: any) {
        context.logger.warn(`AutoFixObserver.onExecutionFinished failed: ${e.message}`);
      }
    }

    result.endTime = Date.now();
    return result;
  }
}
