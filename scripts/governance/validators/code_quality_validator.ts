// scripts/governance/validators/code_quality_validator.ts
import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { normalize, resolve } from "path";

import { governanceConfig } from "../core/governance.config";
import {
  GovernanceMetadata,
  ValidationError,
  ValidationResult,
} from "../core/types";
import { GovernanceValidator } from "../core/validator";
import { classifyCodeFile } from "./helpers/code_quality_classifier";

const workspaceRoot = resolve(__dirname, "../../..");
const baselineFile = resolve(__dirname, "../core/code_quality_baseline.json");

interface BaselineEntry {
  ruleId: string;
  lineCount: number;
}

export class CodeQualityValidator implements GovernanceValidator {
  readonly name = "CodeQualityValidator";

  private getChangedFiles(_metadata?: GovernanceMetadata): Set<string> {
    if ((_metadata as any)?.changedFiles) {
      return new Set(
        ((_metadata as any).changedFiles as string[]).map((f) =>
          normalize(f).replace(/\\/g, "/"),
        ),
      );
    }
    const set = new Set<string>();
    try {
      const diff = execSync("git diff --name-only HEAD", {
        cwd: workspaceRoot,
        encoding: "utf8",
      });
      diff
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean)
        .forEach((f) => set.add(normalize(f).replace(/\\/g, "/")));
    } catch {}
    try {
      const untracked = execSync("git ls-files --others --exclude-standard", {
        cwd: workspaceRoot,
        encoding: "utf8",
      });
      untracked
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean)
        .forEach((f) => set.add(normalize(f).replace(/\\/g, "/")));
    } catch {}
    return set;
  }

  private loadBaseline(): { entries: Record<string, BaselineEntry>; raw: any } {
    if (!existsSync(baselineFile)) return { entries: {}, raw: { entries: {} } };
    try {
      const raw = JSON.parse(readFileSync(baselineFile, "utf-8"));
      return { entries: raw.entries || {}, raw };
    } catch {
      return { entries: {}, raw: { entries: {} } };
    }
  }

  public async run(
    files: string[],
    _metadata: GovernanceMetadata,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const startTime = Date.now();

    const config = governanceConfig.codeQuality;
    if (!config) {
      return {
        name: this.name,
        success: true,
        errors: [],
        warnings: [],
        statistics: {},
        executionTimeMs: 0,
      };
    }

    const { thresholds, exceptions = [], enforcement } = config;
    const now = new Date();
    const exceptionMap = new Map<string, (typeof exceptions)[0]>();
    for (const exc of exceptions) {
      exceptionMap.set(normalize(exc.filePath).replace(/\\/g, "/"), exc);
    }

    const { entries: baseline, raw } = this.loadBaseline();
    const changedFiles = this.getChangedFiles(_metadata);
    let baselinePruned = false;

    const excluded = new Set(
      (governanceConfig.scanScope.excludedPaths || []).map((p) =>
        normalize(p).replace(/\\/g, "/"),
      ),
    );

    for (const relPath of files) {
      const normPath = normalize(relPath).replace(/\\/g, "/");
      if (
        Array.from(excluded).some(
          (ex) => normPath.startsWith(ex) || normPath.includes(`/${ex}/`),
        )
      )
        continue;
      if (!/\.(ts|tsx)$/.test(normPath)) continue;

      const fullPath = resolve(workspaceRoot, relPath);
      if (!existsSync(fullPath)) continue;

      let content: string;
      try {
        content = readFileSync(fullPath, "utf-8");
      } catch {
        continue;
      }

      const lines = content.split("\n");
      const lineCount = lines.length;
      const classification = classifyCodeFile(normPath, thresholds);
      if (!classification) continue;

      const { ruleId, limit, label } = classification;
      const exception = exceptionMap.get(normPath);
      const baselineEntry = baseline[normPath];
      const isChanged = changedFiles.has(normPath);

      // 1. Explicit in-memory exception handling (for backward compatibility)
      if (exception && exception.ruleId === ruleId) {
        const expiresAt = new Date(exception.expiresAt);
        if (now > expiresAt) {
          errors.push({
            file: relPath,
            rule: ruleId,
            severity: "ERROR",
            message: `Code Quality Exception Expired! File "${relPath}" (${lineCount} lines) was granted an exception until ${exception.expiresAt}. Owner: ${exception.owner}.`,
            line: 1,
            snippet: `Exception expired: ${exception.expiresAt} (Ceiling: ${exception.maxLinesCeiling} lines)`,
          });
          continue;
        }

        if (lineCount > exception.maxLinesCeiling) {
          errors.push({
            file: relPath,
            rule: ruleId,
            severity: "ERROR",
            message: `Code Quality Freeze Violation! File "${relPath}" has grown to ${lineCount} lines, exceeding frozen exception ceiling of ${exception.maxLinesCeiling} lines.`,
            line: 1,
            snippet: `Current lines: ${lineCount} > Exception ceiling: ${exception.maxLinesCeiling}`,
          });
          continue;
        }
        continue;
      }

      // 2. Tracked baseline handling
      if (baselineEntry && lineCount <= limit) {
        delete baseline[normPath];
        baselinePruned = true;
      } else if (lineCount > limit) {
        if (baselineEntry) {
          if (isChanged) {
            errors.push({
              file: relPath,
              rule: ruleId,
              severity: "ERROR",
              message: `Modified maintained file "${relPath}" must comply with the 249-line limit (${lineCount} lines > ${limit} lines). Refactor before merge.`,
              line: 1,
              snippet: `File length: ${lineCount} lines (Limit: ${limit} lines)`,
            });
          } else if (lineCount > baselineEntry.lineCount) {
            errors.push({
              file: relPath,
              rule: ruleId,
              severity: "ERROR",
              message: `Code Quality Freeze Violation! File "${relPath}" has grown to ${lineCount} lines, exceeding frozen exception ceiling of ${baselineEntry.lineCount} lines.`,
              line: 1,
              snippet: `Current lines: ${lineCount} > Baseline ceiling: ${baselineEntry.lineCount}`,
            });
          } else {
            warnings.push({
              file: relPath,
              rule: ruleId,
              severity: "WARNING",
              message: `[BASELINE] Legacy code quality debt: "${relPath}" has ${lineCount} lines (Ceiling: ${baselineEntry.lineCount}, Target: ${limit} lines). Tracked in code_quality_baseline.json.`,
              line: 1,
              snippet: `Baseline violation: ${lineCount} lines (Ceiling: ${baselineEntry.lineCount})`,
            });
          }
        } else {
          // Un-baselined oversized file
          const severity =
            enforcement[ruleId as keyof typeof enforcement] === "WARN"
              ? "WARNING"
              : "ERROR";
          const errorObj: ValidationError = {
            file: relPath,
            rule: ruleId,
            severity: severity === "ERROR" ? "ERROR" : "WARNING",
            message: `${label} file size limit exceeded: "${relPath}" has ${lineCount} lines (Maximum allowed: ${limit} lines). Decompose this file into modular units.`,
            line: 1,
            snippet: `File length: ${lineCount} lines (Limit: ${limit} lines)`,
          };
          if (severity === "ERROR") errors.push(errorObj);
          else warnings.push(errorObj);
        }
      }

      // Check VAL-QUAL-008: State & Hook Overload in UI Components
      if (classification.ruleId === "VAL-QUAL-001") {
        const stateCount = (content.match(/\buseState\s*\(/g) || []).length;
        const effectCount = (content.match(/\buseEffect\s*\(/g) || []).length;
        const totalHooks = stateCount + effectCount;

        if (totalHooks > thresholds.maxStateHooks && !exception && !baselineEntry) {
          warnings.push({
            file: relPath,
            rule: "VAL-QUAL-008",
            severity: "WARNING",
            message: `Single Responsibility Warning: Component "${relPath}" declares ${totalHooks} state/effect hooks (${stateCount} useState, ${effectCount} useEffect).`,
            line: 1,
            snippet: `Total state/effect hooks: ${totalHooks} (Recommended max: ${thresholds.maxStateHooks})`,
          });
        }
      }
    }

    if (baselinePruned) {
      try {
        raw.entries = baseline;
        raw.updatedAt = new Date().toISOString();
        writeFileSync(baselineFile, JSON.stringify(raw, null, 2), "utf-8");
      } catch {}
    }

    return {
      name: this.name,
      success: errors.length === 0,
      errors,
      warnings,
      statistics: { totalFilesEvaluated: files.length },
      executionTimeMs: Date.now() - startTime,
    };
  }
}
