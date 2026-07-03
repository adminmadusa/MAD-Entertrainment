import { existsSync, readdirSync } from 'fs';
import { resolve, relative } from 'path';

/**
 * Stateful parser for markdown links to support nested brackets and parentheses.
 * Pure utility function with no validator dependencies.
 */
export function parseLinksFromLine(line: string): { type: 'inline' | 'reference'; label: string; urlOrRef: string }[] {
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
        links.push({ type: 'reference', label, urlOrRef: label });
      }
    }
    i++;
  }
  return links;
}

/**
 * Resolves path casing cross-platform.
 * Pure utility function with no validator dependencies.
 */
export function checkPathCasing(
  workspaceRoot: string,
  targetRelPath: string
): { status: 'NOT_FOUND' | 'CASE_MISMATCH' | 'FOUND'; canonicalPath?: string } {
  const segments = targetRelPath.split(/[\\/]/).filter(Boolean);
  let currentDir = workspaceRoot;
  let casingMismatch = false;

  for (const segment of segments) {
    try {
      if (!existsSync(currentDir)) {
        return { status: 'NOT_FOUND' };
      }
      const actualFiles = readdirSync(currentDir);
      
      // Check for exact case-sensitive match
      if (actualFiles.includes(segment)) {
        currentDir = resolve(currentDir, segment);
        continue;
      }

      // Check for case-insensitive match
      const lowerSegment = segment.toLowerCase();
      const match = actualFiles.find(f => f.toLowerCase() === lowerSegment);
      if (match) {
        casingMismatch = true;
        currentDir = resolve(currentDir, match);
        continue;
      }

      // No match at all
      return { status: 'NOT_FOUND' };
    } catch {
      return { status: 'NOT_FOUND' };
    }
  }

  const canonicalPath = relative(workspaceRoot, currentDir);
  return {
    status: casingMismatch ? 'CASE_MISMATCH' : 'FOUND',
    canonicalPath,
  };
}
export { resolveRelativePath } from './metadata';
