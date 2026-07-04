// scripts/governance/validators/dead_asset_duplicate_validator.ts
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError } from '../core/types';
import { governanceConfig } from '../core/governance.config';
import { DeadAssetDetector } from './helpers/dead_asset_detector';
import { DuplicateComponentDetector } from './helpers/duplicate_component_detector';
import { DuplicateFileDetector } from './helpers/duplicate_file_detector';
import { SafeDeleteClassifier } from './helpers/safe_delete_classifier';
import { KnowledgeGraph } from '../core/knowledge_graph';

export class DeadAssetDuplicateValidator implements GovernanceValidator {
  readonly name = 'DeadAssetDuplicateValidator';

  public async run(files: string[], metadata: any): Promise<ValidationResult> {
    const startTime = Date.now();
    const warnings: ValidationError[] = [];
    const errors: ValidationError[] = [];

    // 1. Retrieve the existing pre-built KnowledgeGraph from metadata
    const graph = metadata.knowledgeGraph as KnowledgeGraph;
    if (!graph) {
      return {
        name: this.name,
        success: true,
        errors: [],
        warnings: [],
        statistics: { error: 'KnowledgeGraph missing in metadata' },
        executionTimeMs: Date.now() - startTime,
      };
    }

    // 2. Load configurations and fallbacks dynamically
    const config = governanceConfig || {};
    const ignorePatterns = (config as any).ignoreFiles ||
      (config.sharedComponentEnforcement?.ignoreFiles) ||
      ['node_modules', 'dist', 'build', 'coverage'];

    // 3. Execute Helper Modules
    // A. Dead Asset Detection (Reachability BFS)
    const deadScan = DeadAssetDetector.detect(files, graph, config, ignorePatterns);

    // B. Safe Delete Classification
    const safeDeleteScan = SafeDeleteClassifier.classify(files, deadScan.violations, graph, ignorePatterns);

    // C. Duplicate Component Detection (Bucket-first similarity check)
    const duplicateComponentScan = DuplicateComponentDetector.detect(files, config, ignorePatterns);

    // D. Duplicate File Detection (Sliding window token/size Jaccard similarity)
    const duplicateFileScan = DuplicateFileDetector.detect(files, graph, config, ignorePatterns);

    // 4. Aggregate findings and map them as warnings (Rule Registration is Deferred)
    const aggregatedViolations = [
      ...deadScan.violations,
      ...safeDeleteScan.violations,
      ...duplicateComponentScan.violations,
      ...duplicateFileScan.violations,
    ];

    // 5. Deterministic sorting of all validation violations (rule, file, line)
    aggregatedViolations.sort((a, b) => {
      if (a.rule !== b.rule) {
        return a.rule.localeCompare(b.rule);
      }
      if (a.file !== b.file) {
        return a.file.localeCompare(b.file);
      }
      const lineA = a.line || 1;
      const lineB = b.line || 1;
      return lineA - lineB;
    });

    warnings.push(...aggregatedViolations);

    const executionTimeMs = Date.now() - startTime;

    // 6. Gather and expose execution statistics
    const statistics = {
      filesAnalyzed: duplicateFileScan.metrics.filesAnalyzed,
      componentsAnalyzed: duplicateComponentScan.metrics.componentsAnalyzed,
      duplicateBuckets: duplicateComponentScan.metrics.bucketsCreated,
      duplicateComparisons: duplicateComponentScan.metrics.comparisonsExecuted + duplicateFileScan.metrics.comparisonsExecuted,
      deadAssets: deadScan.metrics.deadComponents + deadScan.metrics.deadHooks + deadScan.metrics.deadUtilities + deadScan.metrics.deadIcons + deadScan.metrics.deadCSS + deadScan.metrics.deadImages,
      manualReviews: safeDeleteScan.metrics.requiresManualReview + deadScan.metrics.possibleUnreachableRoutes,
      durationMs: executionTimeMs,
    };

    return {
      name: this.name,
      success: true, // Always true since registration is deferred and findings are non-blocking warnings
      errors,
      warnings,
      statistics,
      executionTimeMs,
    };
  }
}
