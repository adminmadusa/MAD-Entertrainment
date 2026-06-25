// scripts/governance/validators/cross_reference_validator.ts

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError, GovernanceMetadata } from '../core/types';
import { extractLinks } from '../core/metadata';

const workspaceRoot = resolve(__dirname, '../../..');

export class CrossReferenceValidator implements GovernanceValidator {
  readonly name = 'CrossReferenceValidator';

  public async run(files: string[], metadata: GovernanceMetadata): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const startTime = Date.now();

    // 1. Run cycle detection on the dependency matrix
    this.checkCircularDependencies(metadata, errors);

    // 2. Verify "Related Documents" links for each required file
    this.verifyRelatedDocuments(files, metadata, errors);

    return {
      name: this.name,
      success: errors.filter(e => e.severity === 'ERROR').length === 0,
      errors,
      warnings,
      statistics: {
        dependenciesChecked: metadata.dependencyMatrix.length,
      },
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Run DFS cycle detection on the Document Dependency Matrix.
   */
  private checkCircularDependencies(metadata: GovernanceMetadata, errors: ValidationError[]) {
    const adjList = new Map<string, string[]>();
    for (const dep of metadata.dependencyMatrix) {
      adjList.set(dep.document, dep.dependsOn);
    }

    const visited = new Map<string, 'VISITING' | 'VISITED'>();

    const dfs = (node: string, path: string[]) => {
      visited.set(node, 'VISITING');
      const neighbors = adjList.get(node) || [];

      for (const neighbor of neighbors) {
        // Handle mapping issues (e.g. if the dependsOn points to a document or ADR key)
        if (visited.get(neighbor) === 'VISITING') {
          const cyclePath = [...path, neighbor].join(' -> ');
          errors.push({
            file: 'REPOSITORY_GOVERNANCE.md',
            rule: 'Circular Document Dependency',
            severity: 'ERROR',
            message: `Circular dependency detected in Document Dependency Matrix: ${cyclePath}`,
          });
        } else if (!visited.has(neighbor)) {
          dfs(neighbor, [...path, neighbor]);
        }
      }

      visited.set(node, 'VISITED');
    };

    for (const dep of metadata.dependencyMatrix) {
      if (!visited.has(dep.document)) {
        dfs(dep.document, [dep.document]);
      }
    }
  }

  /**
   * Verify each required document contains links to its dependencies.
   */
  private verifyRelatedDocuments(files: string[], metadata: GovernanceMetadata, errors: ValidationError[]) {
    // Build a map of document filename to its dependsOn list
    // E.g. "ARCHITECTURE.md" -> ["REPOSITORY_GOVERNANCE.md"]
    const dependencyMap = new Map<string, string[]>();
    for (const dep of metadata.dependencyMatrix) {
      dependencyMap.set(dep.document, dep.dependsOn);
    }

    for (const relPath of files) {
      const fullPath = resolve(workspaceRoot, relPath);
      if (!existsSync(fullPath)) {
        continue;
      }

      const content = readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      // Find the "Related Documents" list
      let inRelatedDocs = false;
      const linkedFiles = new Set<string>();

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes('Related Documents:')) {
          inRelatedDocs = true;
          continue;
        }

        if (inRelatedDocs) {
          const listMatch = /^\s*[\-\*]\s+(.+)/.exec(line);
          if (listMatch) {
            const itemText = listMatch[1];
            const links = extractLinks(itemText, dirname(fullPath));
            for (const link of links) {
              // Normalize path
              linkedFiles.add(link.path.replace(/^\.\//, ''));
            }
          } else if (line.trim() !== '' && !/^\s+/.test(line)) {
            inRelatedDocs = false;
          }
        }
      }

      // Check if this document has dependency rules defined in the matrix
      // Match by filename or by path. E.g. "ARCHITECTURE.md" or "docs/decisions"
      let docKey = relPath;
      if (relPath.startsWith('docs/decisions/')) {
        if (relPath === 'docs/decisions/README.md') {
          docKey = 'docs/decisions';
        } else {
          continue; // Skip individual ADRs, templates, and indices
        }
      }

      const dependencies = dependencyMap.get(docKey) || [];
      for (const dep of dependencies) {
        // Resolve target document filename. If dep is "docs/decisions", it refers to docs/decisions/README.md
        const targetFilename = dep === 'docs/decisions' ? 'docs/decisions/README.md' : dep;

        if (!linkedFiles.has(targetFilename)) {
          errors.push({
            file: relPath,
            rule: 'Missing SSOT Reference',
            severity: 'ERROR',
            message: `Document "${relPath}" depends on "${targetFilename}" but does not reference it under its "Related Documents:" section.`,
          });
        }
      }
    }
  }
}
