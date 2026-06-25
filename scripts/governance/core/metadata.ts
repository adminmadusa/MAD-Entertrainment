// scripts/governance/core/metadata.ts

import { readFileSync, existsSync } from 'fs';
import { resolve, relative, dirname } from 'path';
import { GovernanceMetadata, DocDependency } from './types';

const workspaceRoot = resolve(__dirname, '../../..');

/**
 * Helper to clean and decode link paths, returning them relative to workspace root.
 */
export function resolveRelativePath(url: string, baseDir: string = workspaceRoot): string {
  try {
    const decoded = decodeURIComponent(url);
    if (decoded.startsWith('file:///')) {
      // Strip 'file://' prefix to get the absolute path
      const absolutePath = decoded.substring(7);
      return relative(workspaceRoot, absolutePath);
    }
    // Handle standard relative paths
    if (decoded.startsWith('.') || !decoded.includes('://')) {
      const absolutePath = resolve(baseDir, decoded);
      return relative(workspaceRoot, absolutePath);
    }
  } catch (err) {
    // Ignore URL decode errors for external urls
  }
  return url;
}

/**
 * Parses markdown link structures like [text](url)
 */
export function extractLinks(text: string, baseDir: string = workspaceRoot): { text: string; path: string }[] {
  const links: { text: string; path: string }[] = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    const linkText = match[1].trim();
    const linkUrl = match[2].trim();
    if (!linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
      links.push({
        text: linkText,
        path: resolveRelativePath(linkUrl, baseDir),
      });
    }
  }
  return links;
}

/**
 * Extracts and cleans the document identifier (e.g. **README.md** -> README.md)
 */
function cleanDocName(name: string): string {
  let cleaned = name.trim();
  // Strip bold/italic formatting
  cleaned = cleaned.replace(/^(\*\*|\*|__|_)/, '').replace(/(\*\*|\*|__|_)$/, '').trim();
  // If it's a markdown link, extract the link text or target path
  if (cleaned.startsWith('[') && cleaned.includes('](')) {
    const links = extractLinks(cleaned);
    if (links.length > 0) {
      cleaned = links[0].path;
    }
  }
  // Special case: map ADR to docs/decisions/README.md or similar if appropriate,
  // or keep it as ADR and resolve in the graph mapping.
  if (cleaned.toUpperCase() === 'ADR') {
    return 'docs/decisions';
  }
  return cleaned;
}

/**
 * Metadata provider implementation.
 */
export class MetadataProvider {
  private metadata: GovernanceMetadata | null = null;
  private governanceFilePath: string;

  constructor() {
    this.governanceFilePath = resolve(workspaceRoot, 'REPOSITORY_GOVERNANCE.md');
  }

  /**
   * Loads and parses REPOSITORY_GOVERNANCE.md.
   */
  public getMetadata(): GovernanceMetadata {
    if (this.metadata) {
      return this.metadata;
    }

    if (!existsSync(this.governanceFilePath)) {
      throw new Error(`Authoritative governance file not found at: ${this.governanceFilePath}`);
    }

    const content = readFileSync(this.governanceFilePath, 'utf8');
    const lines = content.split('\n');

    const requiredDocuments: string[] = ['REPOSITORY_GOVERNANCE.md'];
    const dependencyMatrix: DocDependency[] = [];

    let inRelatedDocsSection = false;
    let inDependencyMatrixTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 1. Parse Related Documents Section
      if (line.includes('- **Related Documents**:') || line.includes('* **Related Documents**:')) {
        inRelatedDocsSection = true;
        continue;
      }

      if (inRelatedDocsSection) {
        // A list item under Related Documents typically starts with indentation (spaces or tabs) followed by - or *
        const listMatch = /^\s*[\-\*]\s+(.+)/.exec(line);
        if (listMatch) {
          const itemText = listMatch[1];
          const links = extractLinks(itemText, dirname(this.governanceFilePath));
          for (const link of links) {
            if (!requiredDocuments.includes(link.path)) {
              requiredDocuments.push(link.path);
            }
          }
        } else if (line.trim() !== '' && !/^\s+/.test(line)) {
          // If we encounter a non-empty line with no leading indentation, we have exited the section
          inRelatedDocsSection = false;
        }
      }

      // 2. Parse Dependency Matrix Table
      // Header detection: | Document | Depends On | Description |
      if (/\|\s*Document\s*\|\s*Depends On\s*\|/i.test(line)) {
        inDependencyMatrixTable = true;
        // Skip the divider line
        i++;
        continue;
      }

      if (inDependencyMatrixTable) {
        if (line.trim().startsWith('|')) {
          const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
          if (cells.length >= 2) {
            const docName = cleanDocName(cells[0]);
            const dependsOnCol = cells[1];

            const dependsOnDocs: string[] = [];
            if (dependsOnCol.toLowerCase() !== 'none') {
              const links = extractLinks(dependsOnCol, dirname(this.governanceFilePath));
              for (const link of links) {
                dependsOnDocs.push(cleanDocName(link.path));
              }
            }

            dependencyMatrix.push({
              document: docName,
              dependsOn: dependsOnDocs,
            });
          }
        } else if (line.trim() === '') {
          // Empty line exits the table
          inDependencyMatrixTable = false;
        }
      }
    }

    this.metadata = {
      requiredDocuments,
      dependencyMatrix,
    };

    return this.metadata;
  }
}
