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

  private getChangedFiles(meta?: GovernanceMetadata): Set<string> {
    if ((meta as any)?.changedFiles) {
      return new Set(
        ((meta as any).changedFiles as string[]).map((f) =>
          normalize(f).replace(/\\/g, "/"),
        ),
      );
    }
    const run = (cmd: string) => {
      try {
        return execSync(cmd, { cwd: workspaceRoot, encoding: "utf8" })
          .split("\n")
          .filter(Boolean);
      } catch {
        return [];
      }
    };
    const files = [
      ...run("git diff --name-only HEAD"),
      ...run("git ls-files --others --exclude-standard"),
    ];
    return new Set(files.map((f) => normalize(f.trim()).replace(/\\/g, "/")));
  }

  private loadBaseline(): { entries: Record<string, BaselineEntry>; raw: any } {
    try {
      const raw = JSON.parse(readFileSync(baselineFile, "utf-8"));
      return { entries: raw.entries || {}, raw };
    } catch {
      return { entries: {}, raw: { entries: {} } };
    }
  }

  private addIssue(
    list: ValidationError[],
    file: string,
    rule: string,
    severity: "ERROR" | "WARNING",
    message: string,
    snippet: string,
  ): void {
    list.push({ file, rule, severity, message, line: 1, snippet });
  }

  public async run(
    files: string[],
    meta: GovernanceMetadata,
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
    const exceptionMap = new Map(
      exceptions.map((e) => [normalize(e.filePath).replace(/\\/g, "/"), e]),
    );
    const { entries: baseline, raw } = this.loadBaseline();
    const changedFiles = this.getChangedFiles(meta);
    let baselinePruned = false;
    const excluded = new Set(
      (governanceConfig.scanScope.excludedPaths || [])
        .filter((p) => p !== "scripts/governance")
        .map((p) => normalize(p).replace(/\\/g, "/")),
    );

    for (const relPath of files) {
      const normPath = normalize(relPath).replace(/\\/g, "/");
      if (
        Array.from(excluded).some(
          (x) => normPath.startsWith(x) || normPath.includes(`/${x}/`),
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

      const lineCount = content.split("\n").length;
      const classification = classifyCodeFile(normPath, thresholds);
      if (!classification) continue;

      const { ruleId, limit, label } = classification;
      const exc = exceptionMap.get(normPath);
      const baselineEntry = baseline[normPath];
      const isChanged = changedFiles.has(normPath);

      // 1. Explicit in-memory exception handling
      if (exc && exc.ruleId === ruleId) {
        if (now > new Date(exc.expiresAt)) {
          this.addIssue(
            errors,
            relPath,
            ruleId,
            "ERROR",
            `Code Quality Exception Expired! File "${relPath}" (${lineCount} lines) expired ${exc.expiresAt}. Owner: ${exc.owner}.`,
            `Ceiling: ${exc.maxLinesCeiling} lines`,
          );
        } else if (lineCount > exc.maxLinesCeiling) {
          this.addIssue(
            errors,
            relPath,
            ruleId,
            "ERROR",
            `Code Quality Freeze Violation! File "${relPath}" (${lineCount} lines) > ceiling ${exc.maxLinesCeiling}.`,
            `Ceiling: ${exc.maxLinesCeiling} lines`,
          );
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
            this.addIssue(
              errors,
              relPath,
              ruleId,
              "ERROR",
              `Modified maintained file "${relPath}" must comply with the 249-line limit (${lineCount} lines > ${limit} lines). Refactor before merge.`,
              `Limit: ${limit} lines`,
            );
          } else if (lineCount > baselineEntry.lineCount) {
            this.addIssue(
              errors,
              relPath,
              ruleId,
              "ERROR",
              `Code Quality Freeze Violation! File "${relPath}" (${lineCount} lines) > baseline ceiling ${baselineEntry.lineCount}.`,
              `Baseline ceiling: ${baselineEntry.lineCount}`,
            );
          } else {
            this.addIssue(
              warnings,
              relPath,
              ruleId,
              "WARNING",
              `[BASELINE] Legacy code quality debt: "${relPath}" has ${lineCount} lines (Ceiling: ${baselineEntry.lineCount}, Target: ${limit} lines). Tracked in code_quality_baseline.json.`,
              `Ceiling: ${baselineEntry.lineCount}`,
            );
          }
        } else {
          const isWarn =
            enforcement[ruleId as keyof typeof enforcement] === "WARN";
          this.addIssue(
            isWarn ? warnings : errors,
            relPath,
            ruleId,
            isWarn ? "WARNING" : "ERROR",
            `${label} file size limit exceeded: "${relPath}" has ${lineCount} lines (Maximum allowed: ${limit} lines). Decompose this file into modular units.`,
            `Limit: ${limit} lines`,
          );
        }
      }

      // Check VAL-QUAL-008: State & Hook Overload in UI Components
      if (classification.ruleId === "VAL-QUAL-001") {
        const stateCount = (content.match(/\buseState\s*\(/g) || []).length;
        const effectCount = (content.match(/\buseEffect\s*\(/g) || []).length;
        const totalHooks = stateCount + effectCount;
        if (totalHooks > thresholds.maxStateHooks && !exc && !baselineEntry) {
          this.addIssue(
            warnings,
            relPath,
            "VAL-QUAL-008",
            "WARNING",
            `Single Responsibility Warning: Component "${relPath}" declares ${totalHooks} state/effect hooks (${stateCount} useState, ${effectCount} useEffect).`,
            `Recommended max: ${thresholds.maxStateHooks}`,
          );
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
