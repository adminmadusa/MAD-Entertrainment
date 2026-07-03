// scripts/governance/core/json_utils.ts
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export const persistenceStats = {
  examined: 0,
  written: 0,
  skipped: 0,
  snapshotWritten: 0,
  findingWritten: 0,
  cacheWritten: 0,
  trendWritten: 0,
};

/**
 * Recursively sorts the keys of an object and any nested objects/arrays to guarantee deterministic JSON serialization.
 */
export function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  const sortedObj: any = {};
  const sortedKeys = Object.keys(obj).sort();
  for (const key of sortedKeys) {
    sortedObj[key] = sortObjectKeys(obj[key]);
  }
  return sortedObj;
}

/**
 * Returns a canonicalized JSON string representation of the object.
 */
export function canonicalizeJson(object: any): string {
  const sorted = sortObjectKeys(object);
  return JSON.stringify(sorted, null, 2);
}

/**
 * Reads a JSON file if it exists, parsing it. Returns undefined if the file does not exist or fails to parse.
 */
export function readJsonIfExists<T = any>(filePath: string): T | undefined {
  if (!existsSync(filePath)) {
    return undefined;
  }
  try {
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch (e) {
    return undefined;
  }
}

/**
 * Writes the object to the specified file path only if the canonical serialized JSON content has changed.
 * Emits JSON using two-space indentation.
 */
export function writeJsonIfChanged(filePath: string, object: any): { written: boolean; skipped: boolean } {
  persistenceStats.examined++;
  const newContent = canonicalizeJson(object);
  
  if (existsSync(filePath)) {
    try {
      const existingContent = readFileSync(filePath, 'utf8');
      const existingObj = JSON.parse(existingContent);
      
      // Volatility Filtering to avoid Git/disk churn on unchanged state
      if (filePath.endsWith('manifest.json')) {
        const cleanExisting = {
          ...existingObj,
          lastAudit: undefined,
          performance: existingObj.performance
            ? {
                ...existingObj.performance,
                scanDurationMs: undefined,
                groupingDurationMs: undefined,
                migrationDurationMs: undefined,
                filesWritten: undefined,
              }
            : undefined,
        };
        const cleanNew = {
          ...object,
          lastAudit: undefined,
          performance: object.performance
            ? {
                ...object.performance,
                scanDurationMs: undefined,
                groupingDurationMs: undefined,
                migrationDurationMs: undefined,
                filesWritten: undefined,
              }
            : undefined,
        };
        if (canonicalizeJson(cleanExisting) === canonicalizeJson(cleanNew)) {
          persistenceStats.skipped++;
          return { written: false, skipped: true };
        }
      } else if (filePath.includes('archive/history/')) {
        const cleanExisting = { ...existingObj, timestamp: undefined };
        const cleanNew = { ...object, timestamp: undefined };
        if (canonicalizeJson(cleanExisting) === canonicalizeJson(cleanNew)) {
          persistenceStats.skipped++;
          return { written: false, skipped: true };
        }
      } else {
        const existingCanonical = canonicalizeJson(existingObj);
        if (existingCanonical === newContent) {
          persistenceStats.skipped++;
          return { written: false, skipped: true };
        }
      }
    } catch (e) {
      // If parsing existing fails, we proceed with write
    }
  }

  // Ensure parent directories exist
  const parentDir = dirname(filePath);
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }

  writeFileSync(filePath, newContent, 'utf8');
  persistenceStats.written++;
  return { written: true, skipped: false };
}
