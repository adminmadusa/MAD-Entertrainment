// scripts/governance/core/reporter.ts

import { ValidationResult, ValidationError } from './types';

export class ConsoleReporter {
  public static report(results: ValidationResult[]): { totalErrors: number; totalWarnings: number } {
    let totalErrors = 0;
    let totalWarnings = 0;

    console.log('\n==================================================');
    console.log('🔍   Governance Documentation Audit Report');
    console.log('==================================================\n');

    for (const res of results) {
      const statusIcon = res.success ? '✅' : '❌';
      console.log(`${statusIcon}  ${res.name.padEnd(30)} [${res.executionTimeMs} ms]`);
      
      if (res.errors.length > 0 || res.warnings.length > 0) {
        // Print errors
        res.errors.forEach((err) => {
          totalErrors++;
          console.error(`   [ERROR] ${err.file}${err.line ? `:${err.line}` : ''} - ${err.rule}`);
          console.error(`           Message: ${err.message}`);
          if (err.snippet) {
            console.error(`           Snippet: "${err.snippet}"`);
          }
        });

        // Print warnings
        res.warnings.forEach((warn) => {
          totalWarnings++;
          console.warn(`   [WARN]  ${warn.file}${warn.line ? `:${warn.line}` : ''} - ${warn.rule}`);
          console.warn(`           Message: ${warn.message}`);
          if (warn.snippet) {
            console.warn(`           Snippet: "${warn.snippet}"`);
          }
        });
      }
    }

    console.log('\n==================================================');
    console.log('📊   Audit Summary');
    console.log('==================================================');
    console.log(`Total Errors:   ${totalErrors}`);
    console.log(`Total Warnings: ${totalWarnings}`);
    console.log('==================================================\n');

    return { totalErrors, totalWarnings };
  }
}
