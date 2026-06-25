// scripts/governance/reports/json_reporter.ts

import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { ValidationResult, ValidationError } from '../core/types';
import { OWNERSHIP_WEIGHT, FRESHNESS_WEIGHT, LINKAGE_WEIGHT } from '../core/constants';

const workspaceRoot = resolve(__dirname, '../../..');

export class JsonReporter {
  public static report(results: ValidationResult[], totalTimeMs: number): any {
    const reportDir = resolve(workspaceRoot, 'reports/governance');
    const reportPath = resolve(reportDir, 'governance-report.json');

    // Make sure reports directory exists
    mkdirSync(reportDir, { recursive: true });

    let allErrors: ValidationError[] = [];
    let allWarnings: ValidationError[] = [];
    let totalFilesProcessed = 0;

    for (const res of results) {
      allErrors = allErrors.concat(res.errors);
      allWarnings = allWarnings.concat(res.warnings);
      if (res.statistics && typeof res.statistics.filesProcessed === 'number') {
        totalFilesProcessed += res.statistics.filesProcessed;
      }
    }

    const totalErrors = allErrors.filter(e => e.severity === 'ERROR').length;
    const totalWarnings = allWarnings.length + allErrors.filter(e => e.severity === 'WARNING').length;

    const ssotResult = results.find(r => r.name === 'SsotValidator');
    const adrResult = results.find(r => r.name === 'AdrValidator');
    const healthResult = results.find(r => r.name === 'RepositoryHealthValidator');

    const ssot = ssotResult ? {
      passed: ssotResult.statistics.passed || 0,
      failed: ssotResult.statistics.failed || 0
    } : { passed: 0, failed: 0 };

    const adr = adrResult ? {
      passed: adrResult.statistics.passed || 0,
      failed: adrResult.statistics.failed || 0
    } : { passed: 0, failed: 0 };

    // Health statistics extraction
    const healthStats = healthResult ? healthResult.statistics : {
      totalFiles: 0,
      missingOwnerCount: 0,
      ownerMismatchCount: 0,
      outdatedCount: 0,
      orphanedCount: 0
    };

    const totalFiles = healthStats.totalFiles || 0;
    const missingOwnerCount = healthStats.missingOwnerCount || 0;
    const ownerMismatchCount = healthStats.ownerMismatchCount || 0;
    const outdatedCount = healthStats.outdatedCount || 0;
    const orphanedCount = healthStats.orphanedCount || 0;

    const ownershipCompliance = totalFiles > 0 ? Math.round(((totalFiles - missingOwnerCount - ownerMismatchCount) / totalFiles) * 100) : 100;
    const freshnessCompliance = totalFiles > 0 ? Math.round(((totalFiles - outdatedCount) / totalFiles) * 100) : 100;
    const linkageCompliance = totalFiles > 0 ? Math.round(((totalFiles - orphanedCount) / totalFiles) * 100) : 100;
    const healthScore = Math.round(
      ownershipCompliance * OWNERSHIP_WEIGHT +
      freshnessCompliance * FRESHNESS_WEIGHT +
      linkageCompliance * LINKAGE_WEIGHT
    );

    // KPI compilation
    const linkResult = results.find(r => r.name === 'LinkValidator');
    const crossRefResult = results.find(r => r.name === 'CrossReferenceValidator');

    const brokenLinksCount = linkResult ? linkResult.errors.filter(e => e.severity === 'ERROR').length : 0;
    const missingSsotReferences = crossRefResult ? crossRefResult.errors.filter(e => e.severity === 'ERROR').length : 0;
    const adrNumberingInconsistencies = adrResult ? adrResult.errors.filter(e => e.severity === 'ERROR').length : 0;
    const documentationReviewSlaViolations = missingOwnerCount + ownerMismatchCount + outdatedCount;

    const reportContent = {
      schemaVersion: '1.2',
      validatorVersion: '1.2.0',
      generatedAt: new Date().toISOString(),
      repository: 'MAD Entertrainment',
      summary: {
        success: totalErrors === 0,
        totalErrors,
        totalWarnings,
        totalTimeMs,
      },
      ssot,
      adr,
      health: {
        score: healthScore,
        ownershipCompliance,
        freshnessCompliance,
        linkageCompliance
      },
      kpis: {
        brokenLinksCount,
        missingSsotReferences,
        adrNumberingInconsistencies,
        outdatedDocumentsCount: outdatedCount,
        documentationReviewSlaViolations
      },
      validators: results.map(res => ({
        name: res.name,
        success: res.success,
        executionTimeMs: res.executionTimeMs,
        statistics: res.statistics,
        errors: res.errors.filter(e => e.severity === 'ERROR'),
        warnings: [
          ...res.warnings,
          ...res.errors.filter(e => e.severity === 'WARNING'),
        ],
      })),
      statistics: {
        totalFilesProcessed,
      },
      warnings: allWarnings.concat(allErrors.filter(e => e.severity === 'WARNING')),
      errors: allErrors.filter(e => e.severity === 'ERROR'),
    };

    writeFileSync(reportPath, JSON.stringify(reportContent, null, 2), 'utf8');
    console.log(`📝 Generated governance report at: ${reportPath}`);
    return reportContent;
  }
}
