// scripts/governance/validators/link_validator.ts

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError } from '../core/types';
import { resolveRelativePath } from '../core/metadata';

const workspaceRoot = resolve(__dirname, '../../..');

/**
 * Standard GitHub slugification for internal anchors.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\-]/g, '') // remove non-alphanumeric, spaces, hyphens
    .replace(/\s/g, '-');      // replace each space with a hyphen
}

export class LinkValidator implements GovernanceValidator {
  readonly name = 'LinkValidator';

  public async run(files: string[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const startTime = Date.now();
    let filesProcessed = 0;

    // Cache of file contents and their available heading anchors
    const fileAnchorCache = new Map<string, Set<string>>();

    const getFileAnchors = (relPath: string): Set<string> | null => {
      const normalizedPath = relPath.replace(/^\.\//, '');
      if (fileAnchorCache.has(normalizedPath)) {
        return fileAnchorCache.get(normalizedPath)!;
      }

      const fullPath = resolve(workspaceRoot, normalizedPath);
      if (!existsSync(fullPath)) {
        return null;
      }

      const content = readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      const anchors = new Set<string>();
      let inCodeBlock = false;

      for (const line of lines) {
        if (line.trim().startsWith('```')) {
          inCodeBlock = !inCodeBlock;
          continue;
        }
        if (inCodeBlock) continue;

        if (line.startsWith('#')) {
          const headingMatch = /^(#+)\s+(.+)/.exec(line);
          if (headingMatch) {
            const cleanText = headingMatch[2].replace(/#+$/, '').trim();
            anchors.add(slugify(cleanText));
          }
        }
      }

      fileAnchorCache.set(normalizedPath, anchors);
      return anchors;
    };

    // Pre-populate cache for all files in the check
    for (const file of files) {
      getFileAnchors(file);
    }

    for (const relPath of files) {
      const fullPath = resolve(workspaceRoot, relPath);
      if (!existsSync(fullPath)) {
        continue;
      }

      filesProcessed++;
      const content = readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      const fileDir = dirname(fullPath);

      // Parse reference definitions first: e.g. [ref]: url
      const refMap = new Map<string, string>();
      const refDefRegex = /^\s*\[([^\]]+)\]:\s*(\S+)/;
      for (const line of lines) {
        const match = refDefRegex.exec(line);
        if (match) {
          refMap.set(match[1].trim().toLowerCase(), match[2].trim());
        }
      }

      let inCodeBlock = false;

      for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        const lineNum = index + 1;

        if (line.trim().startsWith('```')) {
          inCodeBlock = !inCodeBlock;
          continue;
        }

        if (inCodeBlock) {
          continue;
        }

        // Parse links using stateful parser to handle balanced parentheses/brackets (e.g. Next.js router groups)
        const parsedLinks = this.parseLinksFromLine(line);
        for (const pl of parsedLinks) {
          if (pl.type === 'inline') {
            this.validateLinkTarget(relPath, fileDir, pl.urlOrRef, lineNum, line.trim(), getFileAnchors, errors);
          } else {
            const targetUrl = refMap.get(pl.urlOrRef.toLowerCase());
            if (!targetUrl) {
              // Only report if there are reference definitions in this file (avoiding false positives like [JSON] or array indexing)
              if (refMap.size > 0 && /^[a-zA-Z]/.test(pl.urlOrRef)) {
                errors.push({
                  file: relPath,
                  line: lineNum,
                  rule: 'Broken Reference Link',
                  severity: 'ERROR',
                  snippet: line.trim(),
                  message: `Reference definition for [${pl.urlOrRef}] is missing.`,
                });
              }
            } else {
              this.validateLinkTarget(relPath, fileDir, targetUrl, lineNum, line.trim(), getFileAnchors, errors);
            }
          }
        }
      }
    }

    return {
      name: this.name,
      success: errors.filter(e => e.severity === 'ERROR').length === 0,
      errors,
      warnings,
      statistics: { filesProcessed },
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Stateful parser for markdown links to support nested brackets and parentheses.
   */
  private parseLinksFromLine(line: string): { type: 'inline' | 'reference'; label: string; urlOrRef: string }[] {
    const links: { type: 'inline' | 'reference'; label: string; urlOrRef: string }[] = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '[') {
        let bracketDepth = 1;
        let j = i + 1;
        while (j < line.length && bracketDepth > 0) {
          if (line[j] === '[') bracketDepth++;
          else if (line[j] === ']') bracketDepth--;
          j++;
        }
        if (bracketDepth === 0) {
          const label = line.substring(i + 1, j - 1);
          // 1. Check if followed by '(' (inline link)
          if (line[j] === '(') {
            let parenDepth = 1;
            let k = j + 1;
            while (k < line.length && parenDepth > 0) {
              if (line[k] === '(') parenDepth++;
              else if (line[k] === ')') parenDepth--;
              k++;
            }
            if (parenDepth === 0) {
              const url = line.substring(j + 1, k - 1);
              links.push({ type: 'inline', label, urlOrRef: url });
              i = k;
              continue;
            }
          }
          // 2. Check if followed by '[' (reference link with explicit ref)
          if (line[j] === '[') {
            let refDepth = 1;
            let k = j + 1;
            while (k < line.length && refDepth > 0) {
              if (line[k] === '[') refDepth++;
              else if (line[k] === ']') refDepth--;
              k++;
            }
            if (refDepth === 0) {
              const ref = line.substring(j + 1, k - 1);
              links.push({ type: 'reference', label, urlOrRef: ref || label });
              i = k;
              continue;
            }
          }
          // 3. Otherwise, it could be a shorthand reference link [label]
          links.push({ type: 'reference', label, urlOrRef: label });
        }
      }
      i++;
    }
    return links;
  }

  private validateLinkTarget(
    containingFile: string,
    containingDir: string,
    url: string,
    lineNum: number,
    snippet: string,
    getFileAnchors: (relPath: string) => Set<string> | null,
    errors: ValidationError[]
  ) {
    // Skip external http/https/mailto links
    if (/^(https?|mailto|ftp):/i.test(url)) {
      return;
    }

    // Split URL and Anchor
    const hashIdx = url.indexOf('#');
    let linkPath = hashIdx !== -1 ? url.substring(0, hashIdx) : url;
    const anchor = hashIdx !== -1 ? url.substring(hashIdx + 1) : null;

    let targetFileRel = containingFile;

    if (linkPath) {
      const resolvedRel = resolveRelativePath(linkPath, containingDir);
      const targetFullPath = resolve(workspaceRoot, resolvedRel);

      if (!existsSync(targetFullPath)) {
        // Skip links explicitly annotated as deleted/superseded
        if (snippet.toLowerCase().includes('(deleted)') || snippet.toLowerCase().includes('(superseded)')) {
          return;
        }
        errors.push({
          file: containingFile,
          line: lineNum,
          rule: 'Broken Link Target',
          severity: 'ERROR',
          snippet,
          message: `Referenced file does not exist: "${linkPath}" (resolved as: "${resolvedRel}")`,
        });
        return; // File doesn't exist, so no point checking anchor
      }

      targetFileRel = resolvedRel;
    }

    // Check anchor if specified
    if (anchor) {
      // Skip line number range anchors e.g. L123 or L123-L145
      if (/^L\d+(?:-L\d+)?$/.test(anchor)) {
        return;
      }

      const anchors = getFileAnchors(targetFileRel);
      if (!anchors) {
        errors.push({
          file: containingFile,
          line: lineNum,
          rule: 'Broken Link Anchor',
          severity: 'ERROR',
          snippet,
          message: `Could not parse target file for anchor: "${url}"`,
        });
      } else if (!anchors.has(anchor)) {
        errors.push({
          file: containingFile,
          line: lineNum,
          rule: 'Broken Link Anchor',
          severity: 'ERROR',
          snippet,
          message: `Anchor "#${anchor}" not found in target file "${targetFileRel}". Available anchors: ${Array.from(anchors).join(', ')}`,
        });
      }
    }
  }
}
