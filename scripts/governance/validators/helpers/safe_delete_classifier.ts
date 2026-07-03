// scripts/governance/validators/helpers/safe_delete_classifier.ts
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { KnowledgeGraph } from '../../core/knowledge_graph';
import { ValidationError } from '../../core/types';

export interface SafeDeleteMetrics {
  highConfidenceUnused: number;
  possiblyUnused: number;
  requiresManualReview: number;
}

export class SafeDeleteClassifier {
  private static workspaceRoot = resolve(__dirname, '../../../..');

  public static classify(
    files: string[],
    deadViolations: ValidationError[],
    graph: KnowledgeGraph,
    ignorePatterns: string[]
  ): { violations: ValidationError[]; metrics: SafeDeleteMetrics } {
    const violations: ValidationError[] = [];
    const metrics: SafeDeleteMetrics = {
      highConfidenceUnused: 0,
      possiblyUnused: 0,
      requiresManualReview: 0,
    };

    // Build a map of all file contents (excluding test and config files) to do fast string matching
    const searchScopes: { file: string; content: string }[] = [];
    const textFiles = files.filter(f => {
      const ext = f.split('.').pop()?.toLowerCase();
      const isIgnored = ignorePatterns.some(p => f.includes(p));
      const isTest = f.endsWith('.test.ts') || f.endsWith('.spec.ts') || f.endsWith('.test.tsx') || f.endsWith('.spec.tsx');
      const isConfig = f.endsWith('.json') || f.includes('tailwind.config') || f.includes('next.config');
      return (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx' || ext === 'md' || ext === 'css' || ext === 'scss') && !isIgnored && !isTest && !isConfig;
    });

    for (const file of textFiles) {
      const fullPath = resolve(this.workspaceRoot, file);
      if (existsSync(fullPath)) {
        try {
          const content = readFileSync(fullPath, 'utf8');
          searchScopes.push({ file, content });
        } catch (e) {}
      }
    }

    // Classify each flagged dead asset violation
    for (const violation of deadViolations) {
      const targetFile = violation.file;
      const consumers = graph.getDirectConsumers(targetFile);

      let classification: 'HIGH_CONFIDENCE_UNUSED' | 'POSSIBLY_UNUSED' | 'REQUIRES_MANUAL_REVIEW' = 'HIGH_CONFIDENCE_UNUSED';
      let reason = 'No active imports, consumers, or text references found.';

      // Rule A: Check direct consumers
      if (consumers.length > 0) {
        const nonTestConsumers = consumers.filter(c => {
          const isTest = c.endsWith('.test.ts') || c.endsWith('.spec.ts') || c.endsWith('.test.tsx') || c.endsWith('.spec.tsx');
          const isStory = c.endsWith('.stories.tsx');
          return !isTest && !isStory;
        });

        if (nonTestConsumers.length > 0) {
          classification = 'REQUIRES_MANUAL_REVIEW';
          reason = `File is consumed by active production files: ${nonTestConsumers.slice(0, 2).join(', ')}.`;
        } else {
          classification = 'POSSIBLY_UNUSED';
          reason = `File is only consumed by test/storybook files: ${consumers.slice(0, 2).join(', ')}.`;
        }
      }

      // Rule B: If still classified as HIGH_CONFIDENCE_UNUSED, scan other file contents for filename matching
      if (classification === 'HIGH_CONFIDENCE_UNUSED') {
        const basename = targetFile.split('/').pop()?.split('.')[0];
        if (basename) {
          const references: string[] = [];
          for (const scope of searchScopes) {
            if (scope.file === targetFile) continue;

            const regex = new RegExp(`\\b${basename}\\b`);
            if (regex.test(scope.content)) {
              references.push(scope.file);
              if (references.length >= 2) break;
            }
          }

          if (references.length > 0) {
            classification = 'REQUIRES_MANUAL_REVIEW';
            reason = `Filename "${basename}" referenced as text/string in other files: ${references.slice(0, 2).join(', ')}.`;
          }
        }
      }

      // Rule C: Special files like entry files, configurations or root assets should require manual review
      if (classification === 'HIGH_CONFIDENCE_UNUSED') {
        const isEntry = targetFile.includes('src/pages/') || targetFile.includes('src/app/') || targetFile.includes('server.ts') || targetFile.includes('app.ts');
        if (isEntry) {
          classification = 'REQUIRES_MANUAL_REVIEW';
          reason = `Root application or page/route entry files require manual verification.`;
        }
      }

      // Increment metrics
      if (classification === 'HIGH_CONFIDENCE_UNUSED') {
        metrics.highConfidenceUnused++;
      } else if (classification === 'POSSIBLY_UNUSED') {
        metrics.possiblyUnused++;
      } else {
        metrics.requiresManualReview++;
      }

      violations.push({
        file: targetFile,
        line: violation.line || 1,
        rule: 'VAL-UI-017',
        severity: 'INFO',
        message: `Safe delete classification: [${classification}] for "${targetFile}". Reason: ${reason}`,
      });
    }

    return { violations, metrics };
  }
}
export const safeDeleteClassifierVersion = '1.0.0';
