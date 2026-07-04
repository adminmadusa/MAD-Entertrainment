// scripts/governance/core/metadata.ts

import { readFileSync, existsSync } from 'fs';
import { resolve, relative, dirname } from 'path';
import { GovernanceMetadata, DocDependency, DocOwnership } from './types';

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
    const ownershipMatrix: DocOwnership[] = [];

    let inRelatedDocsSection = false;
    let inDependencyMatrixTable = false;
    let inOwnershipMatrixTable = false;

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

      // 3. Parse Document Ownership Matrix Table
      // Header detection: | Document | Owner Role | Review Cycle |
      if (/\|\s*Document\s*\|\s*Owner Role\s*\|\s*Review Cycle\s*\|/i.test(line)) {
        inOwnershipMatrixTable = true;
        // Skip the divider line
        i++;
        continue;
      }

      if (inOwnershipMatrixTable) {
        if (line.trim().startsWith('|')) {
          const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
          if (cells.length >= 3) {
            const docName = cleanDocName(cells[0]);
            const ownerRole = cells[1];
            const reviewCycle = cells[2];

            ownershipMatrix.push({
              document: docName,
              ownerRole,
              reviewCycle,
            });
          }
        } else if (line.trim() === '') {
          // Empty line exits the table
          inOwnershipMatrixTable = false;
        }
      }
    }

    this.metadata = {
      requiredDocuments,
      dependencyMatrix,
      ownershipMatrix,
    };

    return this.metadata;
  }
}

/**
 * Helper to parse a metadata block from a markdown string.
 */
export function parseMarkdownMetadata(content: string): Record<string, any> | null {
  const lines = content.split(/\r?\n/);
  const metadataLines: string[] = [];
  let inMetadataBlock = false;
  let foundMetadata = false;

  for (let i = 0; i < Math.min(lines.length, 50); i++) {
    const line = lines[i].trim();

    if (line.toLowerCase() === '## metadata') {
      inMetadataBlock = true;
      foundMetadata = true;
      continue;
    }

    if (inMetadataBlock) {
      if (line.startsWith('---') || (line !== '' && !line.startsWith('-') && !line.startsWith('*') && !line.includes(':') && !/^\s+/.test(lines[i]))) {
        break;
      }
      metadataLines.push(lines[i]);
    } else {
      if (i < 20 && (line.startsWith('- **') || line.startsWith('**') || line.startsWith('-') || /^[a-zA-Z\s\-]+:/.test(line))) {
        foundMetadata = true;
        metadataLines.push(lines[i]);
      } else if (line.startsWith('---') && i > 0) {
        break;
      }
    }
  }

  if (!foundMetadata || metadataLines.length === 0) {
    return null;
  }

  const metadata: Record<string, any> = {};
  let currentKey: string | null = null;

  for (const line of metadataLines) {
    const keyMatch = /^[-*\s]*\*\*?([a-zA-Z\s\-]+)\*\*?:\s*(.*)/.exec(line) || /^[-*\s]*([a-zA-Z\s\-]+):\s*(.*)/.exec(line);

    if (keyMatch) {
      const rawKey = keyMatch[1].trim();
      const value = keyMatch[2].trim();
      const normKey = rawKey.toLowerCase().replace(/[\s_\-]/g, '');
      currentKey = normKey;

      if (normKey === 'lastupdated' || normKey === 'lastreviewed' || normKey === 'date') {
        metadata['lastUpdated'] = value;
        metadata['lastReviewed'] = value;
        metadata['date'] = value;
      } else {
        metadata[normKey] = value;
      }
      continue;
    }

    if (currentKey === 'relateddocuments') {
      const listItemMatch = /^\s*[-*]\s+(.*)/.exec(line);
      if (listItemMatch) {
        if (!Array.isArray(metadata['relateddocuments'])) {
          metadata['relateddocuments'] = [];
        }
        metadata['relateddocuments'].push(listItemMatch[1].trim());
      }
    }
  }

  return {
    owner: metadata['owner'] || metadata['authors'] || metadata['author'],
    status: metadata['status'],
    version: metadata['version'],
    lastUpdated: metadata['lastupdated'] || metadata['lastUpdated'],
    lastReviewed: metadata['lastreviewed'] || metadata['lastReviewed'],
    date: metadata['date'],
    reviewCycle: metadata['reviewcycle'],
    relatedDocuments: metadata['relateddocuments']
  };
}
