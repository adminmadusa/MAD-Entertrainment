import { readFileSync, statSync } from 'fs';
import { resolve } from 'path';
import { KnowledgeGraph } from '../../core/knowledge_graph';
import { ValidationError } from '../../core/types';

export interface FileSignature {
  file: string;
  size: number;
  tokens: Set<string>;
  imports: Set<string>;
  exports: Set<string>;
}

export interface DuplicateFileMetrics {
  filesAnalyzed: number;
  comparisonsExecuted: number;
  duplicatesDetected: number;
}

export class DuplicateFileDetector {
  private static workspaceRoot = resolve(__dirname, '../../../..');

  public static detect(
    files: string[],
    graph: KnowledgeGraph,
    config: any,
    ignorePatterns: string[]
  ): { violations: ValidationError[]; metrics: DuplicateFileMetrics } {
    const violations: ValidationError[] = [];
    const metrics: DuplicateFileMetrics = {
      filesAnalyzed: 0,
      comparisonsExecuted: 0,
      duplicatesDetected: 0,
    };

    const threshold = config.duplicateDetection?.fileThreshold ?? 90;

    // 1. Scan and build file signatures
    const signatures: FileSignature[] = [];
    const sourceFiles = files.filter(f => {
      const ext = f.split('.').pop()?.toLowerCase();
      const isIgnored = ignorePatterns.some(p => f.includes(p));
      const isTest = f.endsWith('.test.ts') || f.endsWith('.spec.ts') || f.endsWith('.test.tsx') || f.endsWith('.spec.tsx');
      const isStory = f.endsWith('.stories.tsx');
      return (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx') && !isIgnored && !isTest && !isStory;
    });

    for (const file of sourceFiles) {
      const fullPath = resolve(this.workspaceRoot, file);

      try {
        const content = readFileSync(fullPath, 'utf8');
        const byteSize = Buffer.byteLength(content, 'utf8');
        if (byteSize < 100) continue;

        const tokens = this.extractTokens(content);
        const detailed = graph.getDetailedData(file);

        signatures.push({
          file,
          size: byteSize,
          tokens,
          imports: new Set(detailed?.dependencies || []),
          exports: new Set(detailed?.exports || []),
        });
        metrics.filesAnalyzed++;
      } catch (e) {}
    }

    signatures.sort((a, b) => a.size - b.size);

    // 2. Sliding window pairwise comparison
    for (let i = 0; i < signatures.length; i++) {
      const sigA = signatures[i];

      for (let j = i + 1; j < signatures.length; j++) {
        const sigB = signatures[j];

        if (sigB.size > sigA.size * 1.30) {
          break;
        }

        metrics.comparisonsExecuted++;

        const similarity = this.calculateSimilarity(sigA, sigB);
        const similarityPct = Math.round(similarity * 100);

        if (similarityPct >= threshold) {
          metrics.duplicatesDetected++;

          violations.push({
            file: sigA.file,
            line: 1,
            rule: 'VAL-UI-019',
            severity: 'WARNING',
            message: `Duplicate file detected: shares ${similarityPct}% similarity with "${sigB.file}".`,
          });

          violations.push({
            file: sigB.file,
            line: 1,
            rule: 'VAL-UI-019',
            severity: 'WARNING',
            message: `Duplicate file detected: shares ${similarityPct}% similarity with "${sigA.file}".`,
          });
        }
      }
    }

    return { violations, metrics };
  }

  private static extractTokens(content: string): Set<string> {
    const cleanContent = content
      .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1')
      .toLowerCase();

    const words = cleanContent.match(/\b[a-z0-9_]{3,25}\b/g) || [];
    return new Set(words);
  }

  private static calculateSimilarity(sigA: FileSignature, sigB: FileSignature): number {
    const tokenSim = this.jaccard(sigA.tokens, sigB.tokens);
    const importSim = this.jaccard(sigA.imports, sigB.imports);
    const exportSim = this.jaccard(sigA.exports, sigB.exports);

    const sizeDiff = Math.abs(sigA.size - sigB.size);
    const maxSize = Math.max(sigA.size, sigB.size, 1);
    const sizeSim = 1.0 - (sizeDiff / maxSize);

    return (
      tokenSim * 0.50 +
      importSim * 0.20 +
      exportSim * 0.20 +
      sizeSim * 0.10
    );
  }

  private static jaccard(setA: Set<any>, setB: Set<any>): number {
    if (setA.size === 0 && setB.size === 0) return 1.0;
    const intersect = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    if (union.size === 0) return 0.0;
    return intersect.size / union.size;
  }
}
export const duplicateFileDetectorVersion = '1.0.0';
