// scripts/governance/validators/adr_validator.ts

import { readdirSync, readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError } from '../core/types';

const workspaceRoot = resolve(__dirname, '../../..');
const DECISIONS_DIR = 'docs/decisions';

const ALLOWED_LIFECYCLE_STATES = [
  'Proposed',
  'Accepted',
  'Implemented',
  'Superseded',
  'Deprecated',
  'Rejected'
];

const REQUIRED_ADR_HEADINGS = [
  '## Context',
  '## Problem Statement',
  '## Decision',
  '## Alternatives Considered',
  '## Consequences',
  '## Technical & Operational Impact',
  '### Migration Strategy',
  '### Operational Impact',
  '### Security Impact',
  '### Performance Impact',
  '### Testing Strategy',
  '### Rollback Strategy',
  '## Future Considerations',
  '## References'
];

export class AdrValidator implements GovernanceValidator {
  readonly name = 'AdrValidator';

  public async run(files: string[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const startTime = Date.now();

    const decisionsPath = resolve(workspaceRoot, DECISIONS_DIR);
    if (!existsSync(decisionsPath)) {
      errors.push({
        file: DECISIONS_DIR,
        rule: 'Missing Decisions Directory',
        severity: 'ERROR',
        message: `The Architecture Decision Records directory "${DECISIONS_DIR}" does not exist.`
      });
      return this.getResult(startTime, errors, warnings, 0, 0);
    }

    // 1. Scan decisions directory
    let adrFiles: string[] = [];
    try {
      adrFiles = readdirSync(decisionsPath).filter(file => {
        const lower = file.toLowerCase();
        return lower.endsWith('.md') &&
               lower !== 'readme.md' &&
               lower !== 'adr_index.md' &&
               lower !== 'adr_template.md';
      });
    } catch (err: any) {
      errors.push({
        file: DECISIONS_DIR,
        rule: 'Read Directory Error',
        severity: 'ERROR',
        message: `Failed to read decisions directory: ${err.message || err}`
      });
      return this.getResult(startTime, errors, warnings, 0, 0);
    }

    const adrNumbers: { num: number; file: string; title: string; status: string }[] = [];

    // 2. Validate each ADR file name and contents
    let passedCount = 0;
    let failedCount = 0;

    for (const adrFile of adrFiles) {
      const relPath = join(DECISIONS_DIR, adrFile);
      const fullPath = resolve(workspaceRoot, relPath);
      let fileFailed = false;

      // Validate filename convention: ADR-XXX-title.md
      const nameMatch = /^ADR-(\d{3})-(.+)\.md$/.exec(adrFile);
      if (!nameMatch) {
        errors.push({
          file: relPath,
          rule: 'Invalid ADR Naming',
          severity: 'ERROR',
          message: `Filename "${adrFile}" does not match the ADR convention: "ADR-XXX-description.md" (e.g. ADR-001-booking-ownership.md)`
        });
        fileFailed = true;
        failedCount++;
        continue;
      }

      const adrNum = parseInt(nameMatch[1], 10);

      const content = readFileSync(fullPath, 'utf8');
      const lines = content.split(/\r?\n/);

      // Validate Title in H1
      let h1Title = '';
      const h1Line = lines.find(l => l.startsWith('# '));
      if (h1Line) {
        const titleMatch = /^#\s+ADR-\d{3}:\s*(.+)$/.exec(h1Line) || /^#\s+ADR-\d{3}-\s*(.+)$/.exec(h1Line) || /^#\s+ADR-\d{3}\s*(.+)$/.exec(h1Line);
        if (titleMatch) {
          h1Title = titleMatch[1].trim();
        } else {
          // Fallback just grab everything after H1 prefix
          h1Title = h1Line.replace(/^#\s+/, '').trim();
          errors.push({
            file: relPath,
            rule: 'Malformed H1 Title',
            severity: 'ERROR',
            message: `The H1 heading should match "# ADR-XXX: Title" but was: "${h1Line}"`
          });
          fileFailed = true;
        }
      } else {
        errors.push({
          file: relPath,
          rule: 'Missing H1 Heading',
          severity: 'ERROR',
          message: 'The ADR document is missing an H1 title.'
        });
        fileFailed = true;
      }

      // Validate Metadata
      const metadata = this.parseAdrMetadata(lines);
      if (metadata) {
        // Status Check
        if (!metadata.status) {
          errors.push({
            file: relPath,
            rule: 'Missing ADR Status',
            severity: 'ERROR',
            message: 'ADR metadata block is missing "Status".'
          });
          fileFailed = true;
        } else if (!ALLOWED_LIFECYCLE_STATES.includes(metadata.status)) {
          errors.push({
            file: relPath,
            rule: 'Invalid ADR Lifecycle Status',
            severity: 'ERROR',
            message: `ADR status "${metadata.status}" is invalid. Allowed: [${ALLOWED_LIFECYCLE_STATES.join(', ')}]`
          });
          fileFailed = true;
        }

        // Date format Check
        if (!metadata.date) {
          errors.push({
            file: relPath,
            rule: 'Missing ADR Date',
            severity: 'ERROR',
            message: 'ADR metadata block is missing "Date".'
          });
          fileFailed = true;
        } else {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          const isDateParsed = !isNaN(Date.parse(metadata.date));
          if (!isDateParsed || !dateRegex.test(metadata.date.trim())) {
            errors.push({
              file: relPath,
              rule: 'Invalid ADR Date Format',
              severity: 'ERROR',
              message: `ADR Date value "${metadata.date}" is not in valid format. Expected YYYY-MM-DD.`
            });
            fileFailed = true;
          }
        }

        // Authors Check
        if (!metadata.authors && !metadata.owner) {
          errors.push({
            file: relPath,
            rule: 'Missing ADR Authors',
            severity: 'ERROR',
            message: 'ADR metadata block must contain either "Authors" or "Owner".'
          });
          fileFailed = true;
        }

        // Related Documents Check
        if (!metadata.relatedDocuments) {
          errors.push({
            file: relPath,
            rule: 'Missing ADR Related Documents',
            severity: 'ERROR',
            message: 'ADR metadata block is missing "Related Documents".'
          });
          fileFailed = true;
        }

        adrNumbers.push({
          num: adrNum,
          file: relPath,
          title: h1Title,
          status: metadata.status || ''
        });
      } else {
        errors.push({
          file: relPath,
          rule: 'Missing ADR Metadata',
          severity: 'ERROR',
          message: 'The ADR document is missing the ## Metadata block.'
        });
        fileFailed = true;
      }

      // Template Compliance checks (headings verification)
      const headingSet = new Set(this.extractHeadings(lines));
      for (const requiredHeading of REQUIRED_ADR_HEADINGS) {
        if (!headingSet.has(requiredHeading)) {
          errors.push({
            file: relPath,
            rule: 'Missing Template Heading',
            severity: 'ERROR',
            message: `ADR is missing required heading from template: "${requiredHeading}"`
          });
          fileFailed = true;
        }
      }

      if (fileFailed) {
        failedCount++;
      } else {
        passedCount++;
      }
    }

    // Sort numbers to check sequence
    adrNumbers.sort((a, b) => a.num - b.num);

    // 3. Validate Sequential Numbering (No gaps, no duplicates)
    let expectedNum = 1;
    const seenNums = new Set<number>();
    for (const entry of adrNumbers) {
      if (seenNums.has(entry.num)) {
        errors.push({
          file: entry.file,
          rule: 'Duplicate ADR Number',
          severity: 'ERROR',
          message: `ADR number "${entry.num}" is duplicated.`
        });
      }
      seenNums.add(entry.num);

      if (entry.num !== expectedNum) {
        errors.push({
          file: entry.file,
          rule: 'ADR Number Gap',
          severity: 'ERROR',
          message: `ADR numbers are not sequential. Expected ADR number ${String(expectedNum).padStart(3, '0')}, but found ${String(entry.num).padStart(3, '0')}.`
        });
        // Catch up expected number to current so we don't spam errors
        expectedNum = entry.num;
      }
      expectedNum++;
    }

    // 4. Validate ADR_INDEX.md alignment
    this.validateIndex(adrNumbers, errors);

    return this.getResult(startTime, errors, warnings, passedCount, failedCount);
  }

  /**
   * Helper to parse an ADR metadata block.
   */
  private parseAdrMetadata(lines: string[]): Record<string, any> | null {
    let inMetadata = false;
    const metadata: Record<string, any> = {};
    let currentKey: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.toLowerCase() === '## metadata') {
        inMetadata = true;
        continue;
      }

      if (inMetadata) {
        // Stop parsing if we hit horizontal rule or a new H2 heading
        if (line.startsWith('---') || (line.startsWith('##') && line.toLowerCase() !== '## metadata')) {
          break;
        }

        const match = /^[-*\s]*\*\*?([a-zA-Z\s]+)\*\*?:\s*(.*)/.exec(line) || /^[-*\s]*([a-zA-Z\s]+):\s*(.*)/.exec(line);
        if (match) {
          const rawKey = match[1].trim();
          const value = match[2].trim();
          const normKey = rawKey.toLowerCase().replace(/[\s_]/g, '');
          currentKey = normKey;
          metadata[normKey] = value;
          continue;
        }

        // Collect related document list items
        if (currentKey === 'relateddocuments') {
          const listMatch = /^\s*[-*]\s+(.*)/.exec(line);
          if (listMatch) {
            if (!Array.isArray(metadata['relateddocuments'])) {
              metadata['relateddocuments'] = [];
            }
            metadata['relateddocuments'].push(listMatch[1].trim());
          }
        }
      }
    }

    if (!inMetadata) return null;

    return {
      status: metadata['status'],
      date: metadata['date'],
      authors: metadata['authors'],
      owner: metadata['owner'],
      relatedDocuments: metadata['relateddocuments']
    };
  }

  /**
   * Helper to extract headings along with their markdown level (e.g. "## Context")
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
          const hashes = match[1];
          const text = match[2].replace(/#+$/, '').trim();
          headings.push(`${hashes} ${text}`);
        }
      }
    }

    return headings;
  }

  /**
   * Validate that ADR_INDEX.md aligns perfectly with existing files.
   */
  private validateIndex(
    existingAdrs: { num: number; file: string; title: string; status: string }[],
    errors: ValidationError[]
  ) {
    const indexPath = resolve(workspaceRoot, 'docs/decisions/ADR_INDEX.md');
    if (!existsSync(indexPath)) {
      errors.push({
        file: 'docs/decisions/ADR_INDEX.md',
        rule: 'Missing ADR Index',
        severity: 'ERROR',
        message: 'ADR_INDEX.md is missing from the decisions directory.'
      });
      return;
    }

    const content = readFileSync(indexPath, 'utf8');
    const lines = content.split(/\r?\n/);
    const indexEntries: { adrId: string; title: string; status: string; link: string }[] = [];

    // Parse the markdown table
    // Row format: | **ADR-001** | Booking Ownership | Implemented | Category | Date | [ADR-001](link) |
    let inTable = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('|')) {
        if (trimmed.includes('---|') || trimmed.toLowerCase().includes('| adr |')) {
          inTable = true;
          continue;
        }

        if (inTable) {
          const cells = trimmed.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
          if (cells.length >= 6) {
            // Clean bold markings from ADR Id
            const adrId = cells[0].replace(/\*\*/g, '').trim();
            const title = cells[1];
            const status = cells[2];
            const linkCell = cells[5];

            // Extract link path from markdown e.g. [ADR-001](file:///...)
            let link = '';
            const linkMatch = /\[[^\]]+\]\(([^)]+)\)/.exec(linkCell);
            if (linkMatch) {
              link = linkMatch[1];
            }

            indexEntries.push({ adrId, title, status, link });
          }
        }
      } else {
        inTable = false;
      }
    }

    // Check index consistency
    // Match each file with an index entry
    const entryMap = new Map<string, typeof indexEntries[0]>();
    for (const entry of indexEntries) {
      entryMap.set(entry.adrId, entry);
    }

    for (const adr of existingAdrs) {
      const adrId = `ADR-${String(adr.num).padStart(3, '0')}`;
      const entry = entryMap.get(adrId);

      if (!entry) {
        errors.push({
          file: 'docs/decisions/ADR_INDEX.md',
          rule: 'Missing Index Entry',
          severity: 'ERROR',
          message: `ADR "${adrId}" exists as a file but is not registered in ADR_INDEX.md.`
        });
      } else {
        // Validate title
        // We do a loose comparison of the titles (case-insensitive, ignoring minor formatting)
        const cleanAdrTitle = adr.title.toLowerCase().replace(/[\s\-_]/g, '');
        const cleanEntryTitle = entry.title.toLowerCase().replace(/[\s\-_]/g, '');

        if (!cleanAdrTitle.includes(cleanEntryTitle) && !cleanEntryTitle.includes(cleanAdrTitle)) {
          errors.push({
            file: 'docs/decisions/ADR_INDEX.md',
            rule: 'Index Title Mismatch',
            severity: 'ERROR',
            message: `Title for "${adrId}" in index ("${entry.title}") does not match the actual ADR H1 title ("${adr.title}").`
          });
        }

        // Validate status
        if (entry.status.toLowerCase() !== adr.status.toLowerCase()) {
          errors.push({
            file: 'docs/decisions/ADR_INDEX.md',
            rule: 'Index Status Mismatch',
            severity: 'ERROR',
            message: `Status for "${adrId}" in index ("${entry.status}") does not match status in ADR metadata ("${adr.status}").`
          });
        }
      }
    }

    // Check for entries in index that do not exist as files
    const fileSet = new Set(existingAdrs.map(adr => `ADR-${String(adr.num).padStart(3, '0')}`));
    for (const entry of indexEntries) {
      if (entry.adrId.startsWith('ADR-') && !fileSet.has(entry.adrId)) {
        errors.push({
          file: 'docs/decisions/ADR_INDEX.md',
          rule: 'Orphan Index Entry',
          severity: 'ERROR',
          message: `ADR "${entry.adrId}" is registered in ADR_INDEX.md but no corresponding ADR file exists.`
        });
      }
    }
  }

  private getResult(
    startTime: number,
    errors: ValidationError[],
    warnings: ValidationError[],
    passed: number,
    failed: number
  ): ValidationResult {
    return {
      name: this.name,
      success: errors.filter(e => e.severity === 'ERROR').length === 0,
      errors,
      warnings,
      statistics: {
        passed,
        failed,
        adrsChecked: passed + failed
      },
      executionTimeMs: Date.now() - startTime
    };
  }
}
