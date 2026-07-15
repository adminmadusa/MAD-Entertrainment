/**
 * review-generator.ts — Dynamic Governance Decisions Document Generator
 * Phase 7
 *
 * Generates and updates .agents/branch_review_decisions.md dynamically.
 * Filters branches requiring human governance decisions (non-protected unmerged refs).
 * Parses and preserves existing manual review entries to prevent data loss.
 */
import fs from 'fs';
import path from 'path';
import { RegisteredBranch } from '../models/registry';
const DECISIONS_PATH = '/Users/admin/Desktop/MAD Entertrainment/.agents/branch_review_decisions.md';

interface ReviewDecision {
  branchName: string;
  lifecycleState: string;
  decision: string;
  rationale: string;
  reviewer: string;
  date: string;
}

/**
 * Parses existing branch_review_decisions.md if present to recover manual inputs.
 */
function parseExistingDecisions(): Map<string, ReviewDecision> {
  const decisions = new Map<string, ReviewDecision>();
  if (!fs.existsSync(DECISIONS_PATH)) {
    return decisions;
  }

  try {
    const content = fs.readFileSync(DECISIONS_PATH, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      if (!line.trim().startsWith('|')) continue;
      const parts = line.split('|').map(p => p.trim());
      // Expect: | Branch Name | Lifecycle State | Decision | Rationale | Reviewer | Date |
      if (parts.length < 8) continue;
      
      const branchName = parts[1].replace(/`/g, '');
      // Skip table header and separator lines
      if (branchName === 'Branch Name' || branchName.startsWith(':') || branchName.startsWith('-')) {
        continue;
      }

      decisions.set(branchName, {
        branchName,
        lifecycleState: parts[2],
        decision: parts[3] || '*Select Option*',
        rationale: parts[4] || 'N/A',
        reviewer: parts[5] || 'N/A',
        date: parts[6] || 'N/A'
      });
    }
  } catch (err) {
    console.warn('⚠️ Could not parse existing branch review decisions. Re-initializing.');
  }

  return decisions;
}

export function generateReviewDecisionsDocument(branches: RegisteredBranch[]): void {
  const existingDecisions = parseExistingDecisions();

  // Filter for branches requiring review (exclude protected system refs)
  const systemRefs = new Set([
    'develop',
    'live',
    'main',
    'origin/develop',
    'origin/live',
    'origin/main',
    'test/remediation-integration'
  ]);

  const reviewBranches = branches.filter(b => {
    const cleanName = b.name.replace('origin/', '');
    return !systemRefs.has(b.name) && !systemRefs.has(cleanName);
  });

  if (reviewBranches.length === 0) {
    // If no branches require manual review, output a clean placeholder
    const cleanContent = `# Branch Review Decisions Audit Record\n\nNo branches require manual review at this time.\n`;
    fs.writeFileSync(DECISIONS_PATH, cleanContent, 'utf8');
    return;
  }

  let table = '# Branch Review Decisions Audit Record\n\n';
  table += 'This record tracks human governance decisions for branches with unmerged drift or stale references.\n\n';
  table += 'Please edit the **Decision**, **Rationale**, **Reviewer**, and **Date** columns directly in this file to document your reviews.\n\n';
  table += '| Branch Name | Lifecycle State | Decision | Rationale | Reviewer | Date |\n';
  table += '| :--- | :---: | :--- | :--- | :--- | :--- |\n';

  for (const rb of reviewBranches) {
    const name = rb.name;
    const existing = existingDecisions.get(name);

    const lifecycleState = rb.lifecycleState;
    const decision = existing?.decision || '*Select Option*';
    const rationale = existing?.rationale || 'N/A';
    const reviewer = existing?.reviewer || 'N/A';
    const date = existing?.date || 'N/A';

    table += `| \`${name}\` | ${lifecycleState} | ${decision} | ${rationale} | ${reviewer} | ${date} |\n`;
  }

  const dir = path.dirname(DECISIONS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(DECISIONS_PATH, table, 'utf8');
}
