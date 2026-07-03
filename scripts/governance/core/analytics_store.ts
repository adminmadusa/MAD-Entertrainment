// scripts/governance/core/analytics_store.ts
import { existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

import type { AnalyticsResult } from './analytics_types';
import { readJsonIfExists, writeJsonIfChanged, sortObjectKeys } from './json_utils';

export class AnalyticsStore {
  /**
   * Writes the compiled analytics datasets under .governance/analytics/ in a deterministic order.
   */
  public static write(
    result: AnalyticsResult,
    generatedAt: string,
    workspaceRoot: string
  ): { writtenCount: number; skippedCount: number } {
    const analyticsDir = resolve(workspaceRoot, '.governance/analytics');
    if (!existsSync(analyticsDir)) {
      mkdirSync(analyticsDir, { recursive: true });
    }

    let writtenCount = 0;
    let skippedCount = 0;

    // Inject shared metadata/timestamp
    const repoWithMetadata: any = {
      ...result.repository,
      generatedAt,
    };

    const rulesWithMetadata: any = {
      schemaVersion: result.repository.schemaVersion,
      generatedAt,
      rules: result.rules,
    };

    const fixesWithMetadata: any = {
      schemaVersion: result.repository.schemaVersion,
      generatedAt,
      fixes: result.fixes,
    };

    const sessionsWithMetadata: any = {
      schemaVersion: result.repository.schemaVersion,
      generatedAt,
      sessions: result.sessions,
    };

    const trendsWithMetadata: any = {
      schemaVersion: result.repository.schemaVersion,
      generatedAt,
      trends: result.trends,
    };

    // Write in fixed order
    const filesToWrite = [
      { name: 'repository.json', data: repoWithMetadata },
      { name: 'rules.json', data: rulesWithMetadata },
      { name: 'fixes.json', data: fixesWithMetadata },
      { name: 'sessions.json', data: sessionsWithMetadata },
      { name: 'trends.json', data: trendsWithMetadata },
    ];

    for (const file of filesToWrite) {
      const filePath = join(analyticsDir, file.name);
      
      // Preserve generatedAt timestamp if the rest of the file content is identical
      const existing = readJsonIfExists<any>(filePath);
      if (existing && typeof existing === 'object') {
        const oldCopy = { ...existing };
        delete oldCopy.generatedAt;
        const newCopy = { ...file.data };
        delete newCopy.generatedAt;

        const oldSerialized = JSON.stringify(sortObjectKeys(oldCopy));
        const newSerialized = JSON.stringify(sortObjectKeys(newCopy));

        if (oldSerialized === newSerialized && existing.generatedAt) {
          file.data.generatedAt = existing.generatedAt;
        }
      }

      const res = writeJsonIfChanged(filePath, file.data);
      if (res.written) {
        writtenCount++;
      } else {
        skippedCount++;
      }
    }

    return { writtenCount, skippedCount };
  }
}
