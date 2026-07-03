// scripts/governance/core/execution_scheduler.ts
import { ValidatorDefinition } from './validator_registry';
import { ValidationResult, ValidationError } from './types';

export interface ValidatorExecutionMetrics {
  validatorId: string;
  name: string;
  durationMs: number;
  memoryDeltaBytes: number;
  filesProcessed: number;
  success: boolean;
  skipped: boolean;
  errorsCount: number;
  warningsCount: number;
}

export interface ExecutionReport {
  results: ValidationResult[];
  metrics: ValidatorExecutionMetrics[];
  totalExecutionTimeMs: number;
  totalMemoryDeltaBytes: number;
}

export class ExecutionScheduler {
  public static async execute(
    orderedValidators: ValidatorDefinition[],
    files: string[],
    metadata: any
  ): Promise<ExecutionReport> {
    const results: ValidationResult[] = [];
    const metrics: ValidatorExecutionMetrics[] = [];
    const schedulerStart = Date.now();
    const memStartGlobal = process.memoryUsage().heapUsed;

    for (const def of orderedValidators) {
      const validator = def.validator;
      const validatorId = def.id;

      // Filter files relevant to this validator based on supportedFileTypes
      let targetFiles = files;
      if (def.supportedFileTypes && !def.supportedFileTypes.includes('*')) {
        targetFiles = files.filter(file => {
          return def.supportedFileTypes.some(ext => file.endsWith(ext));
        });
      }

      const memStart = process.memoryUsage().heapUsed;
      const start = Date.now();
      let success = false;
      let errorsCount = 0;
      let warningsCount = 0;
      let result: ValidationResult;

      try {
        result = await validator.run(targetFiles, metadata);
        success = result.success;
        errorsCount = result.errors.length;
        warningsCount = result.warnings.length;
        results.push(result);
      } catch (err: any) {
        result = {
          name: validator.name,
          success: false,
          executionTimeMs: Date.now() - start,
          statistics: {},
          errors: [
            {
              file: 'N/A',
              rule: 'Validator Crash',
              severity: 'ERROR',
              message: `Validator ${validator.name} crashed with error: ${err?.message || err}`,
            },
          ],
          warnings: [],
        };
        errorsCount = 1;
        results.push(result);
      }

      const durationMs = Date.now() - start;
      const memEnd = process.memoryUsage().heapUsed;
      const memoryDeltaBytes = memEnd - memStart;

      metrics.push({
        validatorId,
        name: def.name,
        durationMs,
        memoryDeltaBytes,
        filesProcessed: targetFiles.length,
        success,
        skipped: false,
        errorsCount,
        warningsCount,
      });
    }

    const totalExecutionTimeMs = Date.now() - schedulerStart;
    const totalMemoryDeltaBytes = process.memoryUsage().heapUsed - memStartGlobal;

    return {
      results,
      metrics,
      totalExecutionTimeMs,
      totalMemoryDeltaBytes,
    };
  }
}
