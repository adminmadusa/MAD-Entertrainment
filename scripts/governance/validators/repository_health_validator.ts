// scripts/governance/validators/repository_health_validator.ts

import { existsSync, readFileSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError, GovernanceMetadata } from '../core/types';
import { extractLinks, parseMarkdownMetadata } from '../core/metadata';
import { REVIEW_CYCLE_DURATIONS } from '../core/constants';

const workspaceRoot = resolve(__dirname, '../../..');

const MANDATORY_SSOT_DOCUMENTS = [
  'README.md',
  'REPOSITORY_GOVERNANCE.md',
  'ARCHITECTURE.md',
  'DEPLOYMENT_MAP.md',
  'API_CONTRACTS.md',
  'CHANGELOG.md',
  'RUNBOOK.md',
  'TESTING.md',
  'AGENTS.MD',
  'docs/decisions/README.md'
];

export class RepositoryHealthValidator implements GovernanceValidator {
  readonly name = 'RepositoryHealthValidator';

  public async run(files: string[], metadata: GovernanceMetadata): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const startTime = Date.now();

    let missingOwnerCount = 0;
    let ownerMismatchCount = 0;
    let outdatedCount = 0;
    let orphanedCount = 0;

    const referencedFiles = new Set<string>();

    // Helper to normalize and check if a file belongs to a matrix doc (file or directory match)
    const matchMatrixDoc = (relPath: string, matrixDoc: string): boolean => {
      const normRel = relPath.replace(/\\/g, '/');
      const normMatrix = matrixDoc.replace(/\\/g, '/').replace(/\/$/, '');
      
      if (normRel === normMatrix) return true;
      
      const fullMatrixPath = resolve(workspaceRoot, normMatrix);
      if (existsSync(fullMatrixPath) && statSync(fullMatrixPath).isDirectory()) {
        return normRel.startsWith(normMatrix + '/');
      }
      return false;
    };

    // Helper to check if owner is aligned with expected matrix role
    const isOwnerAligned = (actual: string, expected: string): boolean => {
      const actualLower = actual.toLowerCase();
      const expectedLower = expected.toLowerCase();
      
      if (actualLower.includes(expectedLower) || expectedLower.includes(actualLower)) {
        return true;
      }
      
      const keywords: Record<string, string[]> = {
        'api owner': ['api', 'contract', 'governance'],
        'architecture owner': ['architecture', 'architect'],
        'platform/deployment owner': ['platform', 'deployment', 'devops', 'engineering', 'infrastructure'],
        'architecture review board': ['board', 'architecture', 'architect', 'review'],
        'repository governance owner': ['governance', 'maintainer'],
        'documentation owner': ['documentation', 'readme']
      };

      const expectedKey = expectedLower.trim();
      const allowedKeywords = keywords[expectedKey];
      if (allowedKeywords) {
        return allowedKeywords.some(kw => actualLower.includes(kw));
      }
      return false;
    };

    // 1. Scan files to extract links and build references map
    for (const relPath of files) {
      const fullPath = resolve(workspaceRoot, relPath);
      if (!existsSync(fullPath) || !statSync(fullPath).isFile()) {
        continue;
      }

      try {
        const content = readFileSync(fullPath, 'utf8');
        const links = extractLinks(content, dirname(fullPath));
        for (const link of links) {
          const cleanPath = link.path.split('#')[0].trim();
          if (cleanPath) {
            referencedFiles.add(cleanPath);
          }
        }
      } catch (err) {
        // Safe skip on read errors
      }
    }

    // 2. Perform Ownership, Freshness, and Orphan audits
    for (const relPath of files) {
      const fullPath = resolve(workspaceRoot, relPath);
      if (!existsSync(fullPath) || !statSync(fullPath).isFile()) {
        continue;
      }

      const content = readFileSync(fullPath, 'utf8');
      const fileMetadata = parseMarkdownMetadata(content);

      const isMandatory = MANDATORY_SSOT_DOCUMENTS.includes(relPath);
      const isADRFile = /docs\/decisions\/ADR-\d{3}-.*\.md$/.test(relPath);
      const isTemplateOrIndex = relPath.endsWith('TEMPLATE.md') || relPath.endsWith('INDEX.md') || relPath.endsWith('README.md');

      // Check Owner Field Existence (Skip for templates/indices)
      const owner = fileMetadata?.owner;
      if (!owner && !isTemplateOrIndex) {
        const severity = (isMandatory || isADRFile) ? 'ERROR' : 'WARNING';
        const errObj: ValidationError = {
          file: relPath,
          rule: 'Missing Document Owner',
          severity,
          message: 'Every documentation file is required to have a defined "Owner" or "Authors" in its metadata block.',
        };
        if (severity === 'ERROR') {
          errors.push(errObj);
        } else {
          warnings.push(errObj);
        }
        missingOwnerCount++;
      }

      // Check against Ownership & Freshness Matrix
      const matrixMatch = metadata.ownershipMatrix?.find(matrixDoc => matchMatrixDoc(relPath, matrixDoc.document));
      if (matrixMatch && !isTemplateOrIndex) {
        // Owner Alignment Validation
        if (owner) {
          const expectedOwner = matrixMatch.ownerRole;
          if (!isOwnerAligned(owner, expectedOwner)) {
            errors.push({
              file: relPath,
              rule: 'SSOT Owner Inconsistency',
              severity: 'ERROR',
              message: `Owner "${owner}" does not align with the expected role specified in REPOSITORY_GOVERNANCE.md: "${expectedOwner}"`,
            });
            ownerMismatchCount++;
          }
        }

        // Freshness Validation
        const cycle = matrixMatch.reviewCycle;
        const limitDays = REVIEW_CYCLE_DURATIONS[cycle];
        if (limitDays) {
          const rawDate = fileMetadata?.lastUpdated || fileMetadata?.lastReviewed || fileMetadata?.date;
          if (!rawDate) {
            errors.push({
              file: relPath,
              rule: 'Missing Review Date',
              severity: 'ERROR',
              message: `Required document is subject to a "${cycle}" review cycle but has no valid review date metadata.`,
            });
          } else {
            const parsedDate = Date.parse(rawDate);
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (isNaN(parsedDate) || !dateRegex.test(rawDate.trim())) {
              errors.push({
                file: relPath,
                rule: 'Invalid Metadata Date Format',
                severity: 'ERROR',
                message: `Review date "${rawDate}" has an invalid format. Must be YYYY-MM-DD.`,
              });
            } else {
              const elapsedMs = Date.now() - parsedDate;
              const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
              if (elapsedDays > limitDays) {
                warnings.push({
                  file: relPath,
                  rule: 'Outdated Documentation',
                  severity: 'WARNING',
                  message: `Documentation freshness cycle expired. Stale by ${Math.round(elapsedDays - limitDays)} days. Last reviewed on ${rawDate} (Cycle: ${cycle} / ${limitDays} days).`,
                });
                outdatedCount++;
              }
            }
          }
        }
      }

      // 3. Orphaned Document Validation
      const isRequired = metadata.requiredDocuments.some(doc => matchMatrixDoc(relPath, doc));
      const isADR = relPath.startsWith('docs/decisions/') || relPath === 'docs/decisions';
      const isTemplate = relPath.endsWith('TEMPLATE.md');
      const isExplicitlyExcluded = ['README.md', 'REPOSITORY_GOVERNANCE.md', 'CHANGELOG.md'].includes(relPath);

      if (!isRequired && !isADR && !isTemplate && !isExplicitlyExcluded) {
        if (!referencedFiles.has(relPath)) {
          warnings.push({
            file: relPath,
            rule: 'Orphaned Documentation',
            severity: 'WARNING',
            message: `Document exists in the repository but has no incoming references from any other active documentation.`,
          });
          orphanedCount++;
        }
      }
    }

    return {
      name: this.name,
      success: errors.filter(e => e.severity === 'ERROR').length === 0,
      errors,
      warnings,
      statistics: {
        totalFiles: files.length,
        filesProcessed: files.length,
        missingOwnerCount,
        ownerMismatchCount,
        outdatedCount,
        orphanedCount,
      },
      executionTimeMs: Date.now() - startTime,
    };
  }
}
