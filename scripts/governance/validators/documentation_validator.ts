// scripts/governance/validators/documentation_validator.ts

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { resolve, relative, dirname, basename, join } from 'path';
import { createHash } from 'crypto';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError, GovernanceMetadata } from '../core/types';
import { parseMarkdownMetadata, resolveRelativePath } from '../core/metadata';
import { governanceConfig } from '../core/governance.config';
import { parseLinksFromLine, checkPathCasing } from '../core/markdown_utils';

const workspaceRoot = resolve(__dirname, '../../..');
const historicalFilesPath = resolve(workspaceRoot, '.governance/baselines/historical-files.json');
const validationCachePath = resolve(workspaceRoot, '.governance/baselines/cached-docs-validation.json');

interface CacheEntry {
  hash: string;
  lastModified: number;
  errors: ValidationError[];
  warnings: ValidationError[];
  status: string;
  tokens: string[];
}

export function getNormalizedStatus(statusStr: string, relPath: string): string {
  const norm = statusStr.trim().replace(/^\*\*|\*\*$/g, '').toLowerCase();

  if (relPath.startsWith('docs/archive/')) {
    return 'Historical';
  }
  if (relPath.startsWith('reports/') || relPath.startsWith('.governance/')) {
    return 'Operational';
  }

  if (['active', 'approved', 'approved for production', 'active / canonical policy'].some(k => norm.includes(k))) {
    return 'Active';
  }
  if (['completed', 'complete', 'passed', 'secure', 'verification', 'validation', 'ready', 'ops', 'operations'].some(k => norm.includes(k))) {
    return 'Operational';
  }
  if (['historical', 'archive', 'audit', 'draft', 'findings', 'plan', 'reconciliation', 'report', 'review'].some(k => norm.includes(k))) {
    return 'Historical';
  }
  if (norm.includes('generated')) {
    return 'Generated';
  }
  if (['deprecated', 'superseded', 'rejected'].some(k => norm.includes(k))) {
    return 'Deprecated';
  }

  // ADR mapping fallback
  if (relPath.startsWith('docs/decisions/')) {
    if (['proposed', 'accepted', 'implemented'].some(k => norm.includes(k))) {
      return 'Active';
    }
    if (['superseded', 'rejected'].some(k => norm.includes(k))) {
      return 'Deprecated';
    }
  }

  return 'Active'; // Default fallback
}

export class DocumentationValidator implements GovernanceValidator {
  readonly name = 'DocumentationValidator';

  public async run(files: string[], metadata: GovernanceMetadata): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const startTime = Date.now();

    const docGovConfig = governanceConfig.documentationGovernance;
    const enforcement = docGovConfig.enforcement;

    // Helper to get severity based on rule enforcement config
    const getSeverity = (ruleId: string): 'ERROR' | 'WARNING' | 'INFO' | null => {
      const level = enforcement[ruleId as keyof typeof enforcement];
      if (level === 'FAIL_BUILD') return 'ERROR';
      if (level === 'WARN') return 'WARNING';
      if (level === 'OFF') return null;
      return 'ERROR'; // fallback default
    };

    // 1. Load or initialize historical files baseline index
    let historicalFiles = new Set<string>();
    if (existsSync(historicalFilesPath)) {
      try {
        const content = readFileSync(historicalFilesPath, 'utf8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          historicalFiles = new Set(parsed);
        }
      } catch (err) {
        // Fallback to empty if baseline is corrupted
      }
    }

    // 2. Load or initialize content validation cache
    let cache: Record<string, CacheEntry> = {};
    try {
      if (existsSync(validationCachePath)) {
        cache = JSON.parse(readFileSync(validationCachePath, 'utf8'));
      }
    } catch {
      // Ignore cache load errors
    }

    // 3. Keep track of file tokens and classifications for multi-file checks
    const fileTokensMap = new Map<string, Set<string>>();
    const fileStatusMap = new Map<string, string>();
    const fileMtimeMap = new Map<string, number>();
    const fileHashMap = new Map<string, string>();
    const fileContentMap = new Map<string, string>();

    // Graph mapping for reachability
    const activeFiles = new Set<string>();
    const outgoingLinksMap = new Map<string, Set<string>>();

    const newCache: Record<string, CacheEntry> = {};
    let cacheHits = 0;
    let cacheMisses = 0;

    // First scan & process files
    for (const relPath of files) {
      const fullPath = resolve(workspaceRoot, relPath);
      if (!existsSync(fullPath) || !statSync(fullPath).isFile()) {
        continue;
      }

      let mtime = 0;
      try {
        mtime = statSync(fullPath).mtimeMs;
        fileMtimeMap.set(relPath, mtime);
      } catch {}

      let content = '';
      let hash = '';
      try {
        content = readFileSync(fullPath, 'utf8');
        fileContentMap.set(relPath, content);
        hash = createHash('sha1').update(content).digest('hex');
        fileHashMap.set(relPath, hash);
      } catch {
        continue;
      }

      // Check cache validity
      const cached = cache[relPath];
      if (cached && cached.hash === hash && cached.lastModified === mtime) {
        cacheHits++;
        fileStatusMap.set(relPath, cached.status);
        fileTokensMap.set(relPath, new Set(cached.tokens));
        newCache[relPath] = cached;

        // Push cached errors/warnings
        cached.errors.forEach(e => errors.push(e));
        cached.warnings.forEach(w => warnings.push(w));

        // Re-parse links for active files to rebuild reachability graph
        const docStatus = cached.status;
        if (docStatus === 'Active') {
          activeFiles.add(relPath);
          const fileDir = dirname(fullPath);
          const lines = content.split('\n');
          const outgoing = new Set<string>();
          lines.forEach(line => {
            const parsed = parseLinksFromLine(line);
            for (const pl of parsed) {
              if (pl.type === 'inline' && !pl.urlOrRef.startsWith('http://') && !pl.urlOrRef.startsWith('https://')) {
                const cleanRelPath = resolveRelativePath(pl.urlOrRef, fileDir);
                const hashIdx = cleanRelPath.indexOf('#');
                const cleanPath = hashIdx !== -1 ? cleanRelPath.substring(0, hashIdx) : cleanRelPath;
                if (cleanPath.trim()) {
                  outgoing.add(cleanPath.trim());
                }
              }
            }
          });
          outgoingLinksMap.set(relPath, outgoing);
        }
        continue;
      }

      cacheMisses++;

      const localErrors: ValidationError[] = [];
      const localWarnings: ValidationError[] = [];

      // Helper to add local violation
      const addViolation = (ruleId: string, message: string, line?: number, snippet?: string) => {
        const severity = getSeverity(ruleId);
        if (!severity) return;
        const err: ValidationError = { file: relPath, rule: ruleId, severity, message, line, snippet };
        if (severity === 'ERROR') {
          localErrors.push(err);
          errors.push(err);
        } else {
          localWarnings.push(err);
          warnings.push(err);
        }
      };

      // Rule: UTF-8 Integrity check (VAL-DOC-008 status check handles parsing, but we check UTF-8 corruption first)
      if (content.includes('\uFFFD')) {
        addViolation('VAL-DOC-008', 'File contains corrupted UTF-8 characters (replacement character detected).');
      }

      // Metadata status parsing
      const fileMetadata = parseMarkdownMetadata(content);
      let status = 'Active'; // Inferred status default
      const isAdr = relPath.startsWith('docs/decisions/ADR-');
      const isRoot = !relPath.includes('/');
      const isLegal = relPath.startsWith('apps/web/src/content/legal/');
      const isArchive = relPath.startsWith('docs/archive/');
      const isReport = relPath.startsWith('reports/') || relPath.startsWith('.governance/');

      if (fileMetadata?.status) {
        status = getNormalizedStatus(fileMetadata.status, relPath);
      } else {
        // Inferred fallback based on path hierarchy
        if (isArchive) {
          status = 'Historical';
        } else if (isReport) {
          status = 'Operational';
        } else if (isAdr || isRoot || isLegal) {
          status = 'Active';
        } else {
          status = 'Active';
        }
      }

      const allowedStatuses = ['Active', 'Operational', 'Historical', 'Generated', 'Deprecated'];
      if (!allowedStatuses.includes(status)) {
        addViolation('VAL-DOC-008', `Invalid document lifecycle status: "${status}". Must be one of: ${allowedStatuses.join(', ')}`);
      }

      fileStatusMap.set(relPath, status);

      // Track active files for reachability graph
      if (status === 'Active') {
        activeFiles.add(relPath);
      }

      // Check Universal Path Rules (VAL-DOC-001 / VAL-DOC-002)
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmed = line.trim();

        // VAL-DOC-001: Local Workstation Paths
        if (trimmed.includes('file:///')) {
          addViolation('VAL-DOC-001', 'Forbidden local workstation path (file:///) detected.', lineNum, trimmed);
        }

        // VAL-DOC-002: Absolute local paths
        // Precise check matching /Users/<username>/ or /home/<username>/
        const absMatch = /(?:\s|^|["'`\`])\/Users\/[a-zA-Z0-9_-]+\//i.test(line) ||
                         /(?:\s|^|["'`\`])\/home\/[a-zA-Z0-9_-]+\//i.test(line) ||
                         /(?:\s|^|["'`\`])\/private\/var\//i.test(line) ||
                         /\b[c-z]:[\\\/]/i.test(line);
        if (absMatch && !trimmed.includes('file:///')) {
          addViolation('VAL-DOC-002', 'Forbidden absolute local filesystem path detected.', lineNum, trimmed);
        }

        // VAL-DOC-005: Secret & Credential Detection
        const hasSecretPattern =
          /(?:api[_-]?key|api[_-]?secret|client[_-]?secret|db[_-]?password|database[_-]?password|auth[_-]?token|access[_-]?token|private[_-]?key|session[_-]?secret|jwt[_-]?secret)\b\s*[:=]\s*["']?([a-zA-Z0-9_\-\.\~]{16,})["']?/i.test(line) ||
          /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(line) ||
          /xox[bapr]-[0-9]{12}-[0-9]{12}-[a-zA-Z0-9]{24}/.test(line) ||
          /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/.test(line) ||
          /sk_live_[0-9a-zA-Z]{24}/.test(line);

        if (hasSecretPattern) {
          // FP mitigation check: check if it contains placeholder indicators
          const lower = trimmed.toLowerCase();
          const isPlaceholder =
            lower.includes('placeholder') ||
            lower.includes('mock') ||
            lower.includes('your_') ||
            lower.includes('example_') ||
            lower.includes('test_') ||
            lower.includes('dummy') ||
            lower.includes('<') ||
            lower.includes('>');

          if (!isPlaceholder) {
            addViolation('VAL-DOC-005', 'Potential exposed secret or API credential detected.', lineNum, trimmed);
          }
        }
      });

      // VAL-DOC-003 & VAL-DOC-004: Parse & Validate Relative Links line-by-line
      const fileDir = dirname(fullPath);
      const outgoing = new Set<string>();

      lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmed = line.trim();

        // Skip links explicitly annotated as deleted/superseded
        if (trimmed.toLowerCase().includes('(deleted)') || trimmed.toLowerCase().includes('(superseded)')) {
          return;
        }

        const parsed = parseLinksFromLine(line);
        for (const pl of parsed) {
          if (pl.type === 'inline' && !pl.urlOrRef.startsWith('http://') && !pl.urlOrRef.startsWith('https://')) {
            const cleanRelPath = resolveRelativePath(pl.urlOrRef, fileDir);
            const hashIdx = cleanRelPath.indexOf('#');
            const cleanPath = hashIdx !== -1 ? cleanRelPath.substring(0, hashIdx) : cleanRelPath;
            const targetRelPath = cleanPath.trim();

            if (targetRelPath) {
              outgoing.add(targetRelPath);

              // Resolve relative path to workspace root
              const resolvedPath = resolve(workspaceRoot, targetRelPath);

              const pathStatus = checkPathCasing(workspaceRoot, targetRelPath);

              if (pathStatus.status === 'NOT_FOUND') {
                // Check if it historically existed in baseline
                const existedHistorically = historicalFiles.has(targetRelPath);
                if (!existedHistorically) {
                  addViolation('VAL-DOC-003', `Reference to a file that never existed in the repository: "${targetRelPath}"`, lineNum, trimmed);
                } else {
                  // Existed historically: verify category
                  if (status !== 'Historical' && status !== 'Deprecated') {
                    addViolation('VAL-DOC-003', `Broken relative link: referenced file "${targetRelPath}" has been deleted, which is only permitted in historical archives.`, lineNum, trimmed);
                  }
                }
              } else if (pathStatus.status === 'CASE_MISMATCH') {
                addViolation('VAL-DOC-004', `Filename casing mismatch: relative link path "${targetRelPath}" casing does not match the actual filesystem casing on disk.`, lineNum, trimmed);
              }
            }
          }
        }
      });

      if (status === 'Active') {
        outgoingLinksMap.set(relPath, outgoing);
      }

      // Check Generated Documentation location rule
      if (status === 'Generated') {
        const inApprovedDir = docGovConfig.approvedGeneratedDirs.some(dir => relPath.startsWith(dir));
        if (!inApprovedDir) {
          addViolation('VAL-DOC-008', `Generated document committed outside approved directories (allowed: ${docGovConfig.approvedGeneratedDirs.join(', ')}).`);
        }
      }

      // Check Temporary Documentation rule
      const pathSegments = relPath.split(/[\\/]/);
      const filename = pathSegments[pathSegments.length - 1];
      const filenameWithoutExt = filename.includes('.') ? filename.substring(0, filename.lastIndexOf('.')) : filename;
      const isTempName = docGovConfig.disallowedTempPatterns.some(pat => {
        const hasMatchingDir = pathSegments.slice(0, -1).some(seg => seg.toLowerCase() === pat);
        const hasMatchingFile = filenameWithoutExt.toLowerCase() === pat;
        return hasMatchingDir || hasMatchingFile;
      });
      if (isTempName) {
        addViolation('VAL-DOC-008', 'Temporary or draft document remains committed in the repository.');
      }

      // Tokenize for duplicate document check (VAL-DOC-006)
      // Strip metadata frontmatter & structural characters
      const cleanContent = content
        .replace(/^---[\s\S]*?---/g, '') // remove frontmatter
        .replace(/^## Metadata[\s\S]*?---/gi, '') // remove metadata block
        .replace(/[#\|\*\-\`]/g, ' ') // remove structure chars
        .toLowerCase();

      const tokens = cleanContent.match(/\b[a-z0-9_]{3,25}\b/g) || [];
      const tokenSet = new Set(tokens);
      fileTokensMap.set(relPath, tokenSet);

      // Save to cache
      newCache[relPath] = {
        hash,
        lastModified: mtime,
        errors: localErrors,
        warnings: localWarnings,
        status: status,
        tokens: Array.from(tokenSet),
      };
    }

    // 4. Duplicate Document Detection (VAL-DOC-006)
    // Run pairwise Jaccard similarity checks on all files in scope
    const sortedFilePaths = Array.from(fileTokensMap.keys()).sort();
    for (let i = 0; i < sortedFilePaths.length; i++) {
      const fileA = sortedFilePaths[i];
      const tokensA = fileTokensMap.get(fileA)!;
      const contentA = fileContentMap.get(fileA) || '';
      const statusA = fileStatusMap.get(fileA);

      if (tokensA.size === 0 || contentA.length < 200 || fileA.endsWith('TEMPLATE.md')) {
        continue;
      }

      const sizeA = contentA.length;

      for (let j = i + 1; j < sortedFilePaths.length; j++) {
        const fileB = sortedFilePaths[j];
        const tokensB = fileTokensMap.get(fileB)!;
        const contentB = fileContentMap.get(fileB) || '';
        const statusB = fileStatusMap.get(fileB);

        if (tokensB.size === 0 || contentB.length < 200 || fileB.endsWith('TEMPLATE.md')) {
          continue;
        }

        const sizeB = contentB.length;

        // Sliding window optimization: only compare files if size is within +-30%
        if (sizeB > sizeA * 1.30 || sizeB < sizeA * 0.70) {
          continue;
        }

        // Calculate Jaccard Similarity
        const intersect = new Set([...tokensA].filter(x => tokensB.has(x)));
        const union = new Set([...tokensA, ...tokensB]);
        const jaccard = union.size === 0 ? 0 : intersect.size / union.size;
        const jaccardPct = Math.round(jaccard * 100);

        if (jaccardPct >= docGovConfig.duplicateThreshold.warn) {
          const isError = jaccardPct >= docGovConfig.duplicateThreshold.error;
          const ruleId = 'VAL-DOC-006';
          const severity = getSeverity(ruleId);

          if (severity) {
            const finalSeverity = isError && severity === 'ERROR' ? 'ERROR' : 'WARNING';
            const canonical = fileA; // Alphabetically first is canonical
            const duplicate = fileB;
            const msg = `Duplicate document detected: "${duplicate}" (Status: ${statusB}) shares ${jaccardPct}% similarity with canonical "${canonical}" (Status: ${statusA}).`;

            const err: ValidationError = {
              file: duplicate,
              rule: ruleId,
              severity: finalSeverity,
              message: msg,
            };

            if (finalSeverity === 'ERROR') {
              errors.push(err);
            } else {
              warnings.push(err);
            }
          }
        }
      }
    }

    // 5. Reachability-Based Orphan Detection (VAL-DOC-007)
    // BFS directed graph search starting from configured entrypoint roots
    const entrypoints = docGovConfig.exemptEntrypoints;

    // Verify configured entrypoints actually exist
    for (const ep of entrypoints) {
      const fullEpPath = resolve(workspaceRoot, ep);
      if (!existsSync(fullEpPath)) {
        errors.push({
          file: 'governance.config.ts',
          rule: 'VAL-DOC-007',
          severity: 'ERROR',
          message: `Configured exempt entrypoint root does not exist on disk: "${ep}"`,
        });
      }
    }

    const visited = new Set<string>();
    const queue: string[] = [];

    // Initialize queue with all existing entrypoints
    for (const ep of entrypoints) {
      if (activeFiles.has(ep)) {
        queue.push(ep);
        visited.add(ep);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      const outgoing = outgoingLinksMap.get(current) || new Set<string>();
      for (const target of outgoing) {
        if (activeFiles.has(target) && !visited.has(target)) {
          visited.add(target);
          queue.push(target);
        }
      }
    }

    // Flag active files not visited as orphans
    for (const active of activeFiles) {
      if (!visited.has(active) && !entrypoints.includes(active)) {
        const ruleId = 'VAL-DOC-007';
        const severity = getSeverity(ruleId);
        if (severity) {
          const err: ValidationError = {
            file: active,
            rule: ruleId,
            severity,
            message: 'Orphaned document: active production file has no incoming links from any documentation entrypoint.',
          };
          if (severity === 'ERROR') {
            errors.push(err);
          } else {
            warnings.push(err);
          }
        }
      }
    }

    // Write updated validation cache back to disk
    try {
      const baselinesDir = dirname(validationCachePath);
      if (!existsSync(baselinesDir)) {
        const { mkdirSync } = require('fs');
        mkdirSync(baselinesDir, { recursive: true });
      }
      writeFileSync(validationCachePath, JSON.stringify(newCache, null, 2), 'utf8');
    } catch {
      // Ignore cache write failures
    }

    return {
      name: this.name,
      success: errors.filter(e => e.severity === 'ERROR').length === 0,
      errors,
      warnings,
      statistics: {
        totalFilesChecked: files.length,
        cacheHits,
        cacheMisses,
        activeDocumentsCount: activeFiles.size,
      },
      executionTimeMs: Date.now() - startTime,
    };
  }
}
