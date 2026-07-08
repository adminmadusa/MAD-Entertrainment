// scripts/governance/validators/ssot_validator.ts

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError, GovernanceMetadata } from '../core/types';

const workspaceRoot = resolve(__dirname, '../../..');

const MANDATORY_SSOT_DOCUMENTS = [
  'README.md',
  'REPOSITORY_GOVERNANCE.md',
  'ARCHITECTURE.md',
  'DEPLOYMENT_MAP.md',
  'API_CONTRACTS.md',
  'CHANGELOG.md',
  'RUNBOOK.md',
  'TESTING.md',
  'AGENTS.MD',
  'docs/decisions/README.md'
];

const OWNER_MAP: Record<string, string[]> = {
  'README.md': ['Documentation Owner'],
  'REPOSITORY_GOVERNANCE.md': ['Repository Governance Owner', 'Repository Governance Owner & Maintainers'],
  'ARCHITECTURE.md': ['Architecture Owner', 'Repository Architecture'],
  'DEPLOYMENT_MAP.md': ['Platform/Deployment Owner', 'DevOps & Platform Engineering', 'Platform Owner'],
  'API_CONTRACTS.md': ['API Owner', 'Repository Architecture & API Governance'],
  'docs/decisions/README.md': ['Architecture Review Board', 'Repository Architecture'],
  'RUNBOOK.md': ['Platform/Deployment Owner', 'DevOps & Platform Engineering'],
  'AGENTS.MD': ['Repository Governance Owner', 'Repository Governance Owner & Maintainers'],
  'CHANGELOG.md': ['Repository Governance Owner & Maintainers', 'Repository Governance Owner', 'Documentation Owner'],
  'TESTING.md': ['QA Owner', 'Repository Governance Owner', 'Platform/Deployment Owner']
};

const REQUIRED_SECTIONS: Record<string, string[][]> = {
  'README.md': [
    ['Overview', 'Project Overview'],
    ['Developer Workflow', 'Getting Started']
  ],
  'REPOSITORY_GOVERNANCE.md': [
    ['Governance Principles', 'Governance Policy', 'Governance Compliance Matrix', 'Subsystem Governance Rules'],
    ['Repository Lifecycle', 'Documentation Lifecycle', 'Branch & PR Governance'],
    ['Change Management', 'Repository Change & Deprecation Policy']
  ],
  'ARCHITECTURE.md': [
    ['System Overview', 'Executive Overview', 'Overview'],
    ['Package Structure', 'Monorepo Topology', 'Package Responsibilities'],
    ['Design Principles', 'Coding Standards']
  ],
  'DEPLOYMENT_MAP.md': [
    ['Environment Matrix'],
    ['Deployment Flow', 'CI/CD Pipeline', 'Git Branch Strategy & Promotion']
  ],
  'API_CONTRACTS.md': [
    ['API Inventory', 'API Inventory & Routes'],
    ['Lifecycle Policy', 'Versioning & Lifecycle']
  ],
  'CHANGELOG.md': [
    ['Version History'],
    ['Release Policy', 'Changelog Policy']
  ],
  'RUNBOOK.md': [
    ['Incident Response'],
    ['Operational Procedures', 'First-Time Staging Deployment', 'Database Backup & Restore', 'Health Check & Monitoring', 'Environment Checklist']
  ],
  'TESTING.md': [
    ['Testing Strategy', 'Purpose', 'Core Verification Commands'],
    ['Verification Requirements']
  ],
  'AGENTS.MD': [
    ['Responsibilities', 'Applies To', 'PURPOSE', 'Relationship to Repository Governance Policy'],
    ['Workflow', 'IMPLEMENTATION WORKFLOW']
  ]
};

export class SsotValidator implements GovernanceValidator {
  readonly name = 'SsotValidator';

  public async run(files: string[], metadata: GovernanceMetadata): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const startTime = Date.now();

    let passedCount = 0;
    let failedCount = 0;

    // We store paragraphs to check for duplicate governance rules across all files
    const paragraphMap = new Map<string, { file: string; originalText: string }>();

    for (const relPath of MANDATORY_SSOT_DOCUMENTS) {
      const fullPath = resolve(workspaceRoot, relPath);
      let fileFailed = false;

      if (!existsSync(fullPath)) {
        errors.push({
          file: relPath,
          rule: 'Missing SSOT Document',
          severity: 'ERROR',
          message: `Mandatory SSOT document is missing from the repository: "${relPath}"`
        });
        failedCount++;
        continue;
      }

      const content = readFileSync(fullPath, 'utf8');
      const lines = content.split(/\r?\n/);

      // 1. Validate Metadata
      const fileMetadata = this.parseMetadata(lines, relPath, errors);
      if (fileMetadata) {
        // Validate Owner Consistency
        const expectedOwners = OWNER_MAP[relPath] || [];
        const actualOwner = fileMetadata.owner;
        if (expectedOwners.length > 0) {
          if (!actualOwner) {
            errors.push({
              file: relPath,
              rule: 'Missing SSOT Owner',
              severity: 'ERROR',
              message: `Metadata "Owner" is required but was not found.`
            });
            fileFailed = true;
          } else {
            const matchesExpected = expectedOwners.some(expected =>
              actualOwner.toLowerCase().includes(expected.toLowerCase()) ||
              expected.toLowerCase().includes(actualOwner.toLowerCase())
            );
            if (!matchesExpected) {
              errors.push({
                file: relPath,
                rule: 'SSOT Owner Inconsistency',
                severity: 'ERROR',
                message: `Owner "${actualOwner}" does not align with the expected roles from REPOSITORY_GOVERNANCE.md Document Ownership Matrix: [${expectedOwners.join(', ')}]`
              });
              fileFailed = true;
            }
          }
        }

        // Validate Date format of Last Reviewed / Updated / Date
        const dateVal = fileMetadata.lastReviewed || fileMetadata.lastUpdated || fileMetadata.date;
        if (dateVal) {
          const isDateParsed = !isNaN(Date.parse(dateVal));
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!isDateParsed || !dateRegex.test(dateVal.trim())) {
            errors.push({
              file: relPath,
              rule: 'Invalid SSOT Date Format',
              severity: 'ERROR',
              message: `Metadata Date value "${dateVal}" is not in valid format. Expected YYYY-MM-DD.`
            });
            fileFailed = true;
          }
        } else {
          errors.push({
            file: relPath,
            rule: 'Missing SSOT Date',
            severity: 'ERROR',
            message: `Metadata is missing a date field (expected "Last Updated", "Last Reviewed", or "Date").`
          });
          fileFailed = true;
        }

        // Validate presence of other required fields
        const requiredKeys = ['status', 'version', 'reviewCycle'];
        for (const rKey of requiredKeys) {
          if (!fileMetadata[rKey]) {
            errors.push({
              file: relPath,
              rule: 'Missing SSOT Metadata Field',
              severity: 'ERROR',
              message: `Metadata field "${rKey.charAt(0).toUpperCase() + rKey.slice(1)}" is required but was not found.`
            });
            fileFailed = true;
          }
        }
      } else {
        errors.push({
          file: relPath,
          rule: 'Missing SSOT Metadata',
          severity: 'ERROR',
          message: `The document is missing a structured metadata block.`
        });
        fileFailed = true;
      }

      // 2. Validate Sections (Headings)
      const headingList = this.extractHeadings(lines);
      const sectionRequirements = REQUIRED_SECTIONS[relPath] || [];
      for (const requirementList of sectionRequirements) {
        const hasSection = requirementList.some(reqName =>
          headingList.some(h => h.toLowerCase().includes(reqName.toLowerCase()))
        );
        if (!hasSection) {
          errors.push({
            file: relPath,
            rule: 'Missing Required Section',
            severity: 'ERROR',
            message: `Required section is missing. Document must contain a heading matching one of: [${requirementList.join(', ')}]`
          });
          fileFailed = true;
        }
      }

      // 3. Collect paragraphs for duplicate checking
      this.collectParagraphs(content, relPath, paragraphMap, warnings);

      if (fileFailed) {
        failedCount++;
      } else {
        passedCount++;
      }
    }

    return {
      name: this.name,
      success: errors.filter(e => e.severity === 'ERROR').length === 0,
      errors,
      warnings,
      statistics: {
        passed: passedCount,
        failed: failedCount,
        mandatoryDocsChecked: MANDATORY_SSOT_DOCUMENTS.length
      },
      executionTimeMs: Date.now() - startTime
    };
  }

  /**
   * Helper to parse a metadata block from a list of markdown lines.
   */
  private parseMetadata(lines: string[], file: string, errors: ValidationError[]): Record<string, any> | null {
    let metadataLines: string[] = [];
    let inMetadataBlock = false;
    let foundMetadata = false;

    // Scan to find metadata. It can be a list under "## Metadata" or at the very start.
    for (let i = 0; i < Math.min(lines.length, 50); i++) {
      const line = lines[i].trim();

      if (line.toLowerCase() === '## metadata') {
        inMetadataBlock = true;
        foundMetadata = true;
        continue;
      }

      if (inMetadataBlock) {
        if (line.startsWith('---') || (line !== '' && !line.startsWith('-') && !line.startsWith('*') && !line.includes(':') && !/^\s+/.test(lines[i]))) {
          // Exited metadata block
          break;
        }
        metadataLines.push(lines[i]);
      } else {
        // If not explicitly under ## Metadata, check if the document starts with metadata lines (lines containing colons)
        if (i < 20 && (line.startsWith('- **') || line.startsWith('**') || line.startsWith('-') || /^[a-zA-Z\s]+:/.test(line))) {
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

    for (let i = 0; i < metadataLines.length; i++) {
      const line = metadataLines[i];

      // Match key: value patterns, e.g. "- **Owner**: Description" or "Status: Active" or "- Owner: Name"
      const keyMatch = /^[-*\s]*\*\*?([a-zA-Z\s\-]+)\*\*?:\s*(.*)/.exec(line) || /^[-*\s]*([a-zA-Z\s\-]+):\s*(.*)/.exec(line);

      if (keyMatch) {
        const rawKey = keyMatch[1].trim();
        const value = keyMatch[2].trim();
        const normKey = rawKey.toLowerCase().replace(/[\s_\-]/g, '');
        currentKey = normKey;

        // Normalize specific common aliases
        if (normKey === 'lastupdated' || normKey === 'lastreviewed' || normKey === 'date') {
          metadata['lastUpdated'] = value;
          metadata['lastReviewed'] = value;
          metadata['date'] = value;
        } else {
          metadata[normKey] = value;
        }
        continue;
      }

      // Collect related documents listed underneath "Related Documents"
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

    // Clean up normalized names to match the expected format
    return {
      owner: metadata['owner'],
      status: metadata['status'],
      version: metadata['version'],
      lastUpdated: metadata['lastupdated'] || metadata['lastUpdated'],
      lastReviewed: metadata['lastreviewed'] || metadata['lastReviewed'],
      date: metadata['date'],
      reviewCycle: metadata['reviewcycle'],
      relatedDocuments: metadata['relateddocuments']
    };
  }

  /**
   * Helper to extract all headings from a list of markdown lines.
   */
  private extractHeadings(lines: string[]): string[] {
    const headings: string[] = [];
    let inCodeBlock = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inCodeBlock) continue;

      if (line.startsWith('#')) {
        const match = /^(#+)\s+(.+)/.exec(line);
        if (match) {
          headings.push(match[2].replace(/#+$/, '').trim());
        }
      }
    }

    return headings;
  }

  /**
   * Helper to clean markdown block for duplicate checking.
   */
  private cleanTextForComparison(text: string): string {
    return text
      .toLowerCase()
      // Strip markdown syntax
      .replace(/[*_#\-+|]/g, ' ')
      // Strip reference links [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Collect paragraphs and compare them across documents to find rule duplications.
   */
  private collectParagraphs(
    content: string,
    file: string,
    paragraphMap: Map<string, { file: string; originalText: string }>,
    warnings: ValidationError[]
  ) {
    // Split by empty lines
    const blocks = content.split(/\n\s*\n/);
    let inCodeBlock = false;

    for (const block of blocks) {
      const trimmed = block.trim();

      // Keep track of code blocks
      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inCodeBlock || trimmed.endsWith('```')) {
        continue;
      }

      // Skip common markdown items that are not full paragraphs
      if (trimmed.startsWith('|') || trimmed.includes('|---|') || trimmed.startsWith('#')) {
        continue; // Tables and headers
      }

      // Skip standard lists of Related Documents, which look very similar
      if (trimmed.toLowerCase().includes('related documents:') || trimmed.toLowerCase().startsWith('- [')) {
        continue;
      }

      const cleaned = this.cleanTextForComparison(trimmed);

      // Only check paragraphs with significant content (e.g. > 15 words and > 80 chars)
      const words = cleaned.split(' ');
      if (words.length < 15 || cleaned.length < 80) {
        continue;
      }

      const existing = paragraphMap.get(cleaned);
      if (existing) {
        if (existing.file !== file) {
          warnings.push({
            file,
            rule: 'Duplicate Governance Policy',
            severity: 'WARNING',
            message: `Duplicate content found in "${existing.file}". Governance rules and SSOT descriptions should reside in exactly one canonical document to prevent duplication.`,
            snippet: trimmed.split('\n')[0] // Show first line as snippet
          });
        }
      } else {
        paragraphMap.set(cleaned, { file, originalText: trimmed });
      }
    }
  }
}
