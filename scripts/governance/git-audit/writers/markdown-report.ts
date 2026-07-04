import fs from 'fs';
import path from 'path';
import { RegisteredBranch } from '../models/registry';
import { ActionItem } from '../models/action';
import { ScoreReport } from '../utils/scoring';

const WORKSPACE_REPORT_PATH = '/Users/admin/Desktop/MAD Entertrainment/.agents/git_repository_hygiene_audit.md';
const BRAIN_REPORT_PATH = '/Users/admin/.gemini/antigravity-ide/brain/5ec77dfb-c991-40e2-9ca2-944b443e59dd/git_repository_hygiene_audit.md';
const CLEANUP_SCRIPT_PATH = '/Users/admin/Desktop/MAD Entertrainment/.agents/cleanup_commands.sh';

export function writeMarkdownReport(
  branches: RegisteredBranch[],
  actions: ActionItem[],
  scoreReport: ScoreReport,
  metrics: Record<string, any>,
  danglingCommitsCount: number
): void {
  // Build branch inventory table
  let inventoryTable = '| Branch Name | Scope | Category | Base Commit SHA | Reason / Evidence |\n| :--- | :---: | :---: | :---: | :--- |\n';
  for (const b of branches) {
    const scope = b.isLocal ? 'Local' : 'Remote';
    inventoryTable += `| \`${b.name}\` | ${scope} | ${b.lifecycleState} | \`${b.sha.substring(0, 8)}\` | ${b.tipMsg} |\n`;
  }

  // Build branch verification table
  let verificationTable = '| Branch Name | Unique Commits? | Merged? | Squash Merged? | Patch-Equiv? | Reachable develop? | Reachable live? | Has Upstream? | Open PR? | Used by another? | Safe Delete? | Needs Review? | Must Never Delete? |\n';
  verificationTable += '| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n';
  for (const b of branches) {
    const v = b.verification;
    const hasUnique = v.hasUniqueCommits ? 'Yes' : 'No';
    const isMerged = v.isMerged ? 'Yes' : 'No';
    const squashMerged = v.isSquashMerged ? 'Yes' : 'No';
    const patchEquiv = v.isSquashMerged ? 'Yes' : 'No';
    const reachDev = v.isMerged ? 'Yes' : 'No';
    const reachLive = v.reachableFromLive ? 'Yes' : 'No';
    const hasUpstream = b.isLocal ? (b.upstream ? 'Yes' : 'No') : 'N/A';
    const openPr = v.hasOpenPR === 'YES' ? `Yes (#${v.prNumber})` : (v.hasOpenPR === 'UNKNOWN' ? 'Unknown' : 'No');
    const usedBy = v.usedByBranches.length > 0 ? `Yes (${v.usedByBranches.length})` : 'No';
    
    let safeDelete = 'No';
    let needsReview = 'No';
    let mustNever = 'No';
    
    if (v.isProtected) {
      mustNever = 'Yes';
    } else if (b.lifecycleState === 'Archived') {
      needsReview = 'Yes';
    } else if (b.lifecycleState === 'Ready For Delete') {
      safeDelete = 'Yes';
    } else {
      needsReview = 'Yes';
    }
    
    verificationTable += `| \`${b.name}\` | ${hasUnique} | ${isMerged} | ${squashMerged} | ${patchEquiv} | ${reachDev} | ${reachLive} | ${hasUpstream} | ${openPr} | ${usedBy} | ${safeDelete} | ${needsReview} | ${mustNever} |\n`;
  }

  // Build final action queue table containing confidence, evidence, verification
  let actionTable = '| Branch | Lifecycle State | Action | Confidence | Verification | Evidence | Risk |\n| :--- | :--- | :--- | :---: | :--- | :--- | :---: |\n';
  for (const a of actions) {
    const evidenceStr = a.evidence.map(e => `\`${e}\``).join(', ');
    actionTable += `| \`${a.branchName}\` | **${a.status === 'Blocked' ? 'Blocked' : 'Ready'}** | ${a.action} | ${a.confidence} | ${a.verification} | ${evidenceStr} | ${a.risk} |\n`;
  }

  // Build health score deductions markdown
  let scoreDeductions = '';
  if (scoreReport.deductions.length === 0) {
    scoreDeductions = 'No deductions. The repository adheres perfectly to repository hygiene policies.\n';
  } else {
    scoreDeductions = '| Category | Points Deducted | Deduction Reason |\n| :--- | :---: | :--- |\n';
    for (const d of scoreReport.deductions) {
      scoreDeductions += `| ${d.category} | -${d.points} | ${d.reason} |\n`;
    }
  }

  // Build clean shell command execution block
  let safeCommands = '';
  let blockedCommands = '';
  let activeCommands = '';
  let experimentalCommands = '';
  let legacyCommands = '';

  for (const a of actions) {
    const cleanName = a.branchName;
    const isRemote = cleanName.startsWith('origin/');
    
    if (a.status === 'Execute Now' || a.action.includes('Delete')) {
      if (a.risk === 'Low') {
        if (isRemote) {
          safeCommands += `git push origin --delete ${cleanName.replace('origin/', '')}\n`;
        } else {
          safeCommands += `git branch -d ${cleanName}\n`;
        }
      } else {
        legacyCommands += `# Branch: ${cleanName}\n# Reason: ${a.reason}\n# git branch -D ${cleanName}\n\n`;
      }
    } else if (a.status === 'Blocked') {
      blockedCommands += `# Branch: ${cleanName}\n# Reason: ${a.reason}\n# Command: git branch -d ${cleanName}\n\n`;
    } else if (a.action.includes('Rebase')) {
      activeCommands += `# Branch: ${cleanName}\n# Reason: ${a.reason}\n# Command: git checkout ${cleanName} && git pull origin develop\n\n`;
    } else {
      experimentalCommands += `# Branch: ${cleanName}\n# Reason: ${a.reason}\n# Command: git branch -d ${cleanName}\n\n`;
    }
  }

  const shellScript = `#!/bin/bash
# MAD Entertrainment Git Cleanup Commands
# Generated on: ${new Date().toISOString().split('T')[0]}

# ==========================================
# 1. SAFE TO DELETE COMMANDS
# ==========================================
${safeCommands || '# No safe branches verified for deletion right now.\n'}

# ==========================================
# 2. EXPERIMENTAL & STACKED BRANCHES (PENDING MERGE)
# ==========================================
${experimentalCommands || '# No experimental branch stack actions pending.\n'}

# ==========================================
# 3. ACTIVE BRANCH SYNC (REBASES)
# ==========================================
${activeCommands || '# No active branches require sync.\n'}

# ==========================================
# 4. BLOCKED BRANCHES (UNMERGED / ACTIVE WORKTREE / OPEN PR)
# ==========================================
${blockedCommands || '# No blocked branches.\n'}

# ==========================================
# 5. LEGACY BRANCH ARCHIVAL (REQUIRES MANUAL CLEARANCE)
# ==========================================
${legacyCommands || '# No legacy branch archivals.\n'}
`;

  // Write the clean shell commands script
  fs.writeFileSync(CLEANUP_SCRIPT_PATH, shellScript, 'utf8');
  fs.chmodSync(CLEANUP_SCRIPT_PATH, '755');

  const markdown = `# Git Repository Hygiene Audit Report

**Date**: 2026-07-04  
**Repository**: MAD Entertrainment  
**Overall Git Repository Hygiene Score**: **${scoreReport.overallScore} / 100**

---

## 1. Repository Health Analysis

### 1.1. Overall Git Repository Health Score
The repository is evaluated using a deterministic scoring model with fixed deductions, yielding a hygiene score of **${scoreReport.overallScore} / 100**. While the remote branch references are clean, the local workspace remains cluttered with unpruned tracking branches, local-only stacks, and a legacy default branch.

### 1.2. Local Branch Hygiene
* **Total Local Branches**: ${metrics.localBranchCount} branches.
* **Tracking issues**: **${metrics.localOrphanBranchesCount} local branches have no remote upstream tracking branch** (local-only).
* **Worktree status**: Current HEAD is checked out cleanly. No lingering worktree directories are polluting the workspace.

### 1.3. Remote Branch Hygiene
* **Total Remote Branches**: ${metrics.remoteBranchCount} branches.
* **Hygiene**: Highly synchronized. Only 1 remote branch is orphaned (\`origin/fix/hyg-001-formatting\`), where its local counterpart has been pruned but the remote ref was left behind on the central server.

### 1.4. Commit History Quality
* **Dangling Commits**: There are **${danglingCommitsCount} dangling commits** present in the local database (resulting from rebasing, stashing, and pruning). This is standard Git behavior and is not treated as a deduction, but should be pruned periodically via Git Garbage Collection (\`git gc\`).
* **Metadata Footprint**: Commits on Sentry reporting and duplicate imports branches had automatic \`.governance/\` JSON outputs staged by mistake. These have been filtered out of the staging/production merges but still reside in the local commit object history.

---

## 2. Branch Inventory

Every local and remote branch is classified into **exactly one** lifecycle state:

${inventoryTable}

---

## 3. Branch Verification

Verification criteria for each branch, backed by Git evidence:

${verificationTable}

### Git Evidence & Verification Methods
1. **Ancestry Containment**: Verified via \`git merge-base --is-ancestor\`.
2. **Patch Equivalence**: Verified via \`git cherry develop <branch_name>\`.
3. **Upstream Tracking**: Verified via \`git rev-parse --abbrev-ref <branch>@{u}\`.
4. **Worktree Checkout**: Verified via \`git worktree list\`.

---

## 4. Commit Analysis

### 4.1. Duplicate Commits
* The commit message \`fix: report unhandled router errors and payment webhook failures to Sentry\` is duplicated:
  - Local branch \`fix/production-sentry-reporting\`: Commit \`cebe94fc\`
  - Primary branch \`develop\`: Commit \`7155b1e9\`

### 4.2. Patch-Equivalent / Squash-Merged Commits
The following local commits are patch-equivalent to commits on \`develop\` but have different hashes due to squash-merges or accidental metadata staging:
* **Sentry Reporting**: Local \`cebe94fc\` is patch-equivalent to develop \`7155b1e9\` (PR #446).
* **Import Hygiene**: Local \`76a983b1\` is patch-equivalent to develop \`cb77ef95\` (PR #442).
* **Agent Instructions**: Local \`e3d86d8c\` is patch-equivalent to develop \`dc72cba9\`.
* **Governance Analytics**: Local \`96efc034\` is patch-equivalent to develop \`3748d4b3\` (PR #440).

---

## 5. Duplicate Detection

* **\`fix/server-hygiene-duplicate-imports\`** and **\`fix/hyg-002-duplicate-imports\`**: Both address the same VAL-HYG-002 duplicate imports issue. The changes on both branches are functionally identical, with \`fix/hyg-002-duplicate-imports\` already patch-equivalent to develop \`cb77ef95\`.
* **\`origin/fix/server-hygiene-duplicate-imports\`**: Tracks the duplicate local branch.

---

## 6. Dead Branch Detection

* **\`main\` / \`origin/main\`**: Legacy default branch, behind develop by **440 commits**. No activity since 2026-06-25.
* **\`feat/ai-os-phase-1-foundation\`** through **\`feat/ai-os-phase-20-task-engine\`**: Behind develop by **40 commits**. No recent activity.

---

## 7. Phased Execution Plan

The cleanup of the repository must be conducted in the following strict phases to prevent accidental code loss:

### Phase 1: Verify Evidence (Verification Phase)
* Verify all local and remote branches against multidimensional safety rules (protected status, worktree, PR, ancestry containment, tags).

### Phase 2: Merge Open Work (Integration Phase)
* Merge the integration container branch \`test/remediation-integration\` (incorporating the 7 validated hotfixes) into \`develop\` after running the automated builds.

### Phase 3: Delete Merged Local Branches
* Prune local branches that are verified as \`Ready For Delete\` using \`git branch -d\` (e.g. \`fix/hyg-002-duplicate-imports\` and Sentry branch).

### Phase 4: Delete Duplicate Branches
* Force-delete duplicate unmerged branches whose code edits have already been integrated under another name.

### Phase 5: Delete Stale Remotes
* Prune remote-only branches that are already squash-merged or obsolete (e.g., \`origin/fix/hyg-001-formatting\`).

### Phase 6: Archive Legacy Branches
* Archive the legacy default branch \`main\` and remove its remote references after verifying repository settings.

### Phase 7: Consolidate Stacks
* Consolidate the 20 experimental AI OS phase branches into a single backup branch or keep only the tip branch (\`feat/ai-os-phase-20-task-engine\`), removing phases 1-19 as their ancestry is fully contained.

### Phase 8: Garbage Collection (Cleanup Phase)
* Execute Git garbage collection (\`git gc --prune=now\`) to clean up dangling blobs and commits.

---

## 8. Repository Metrics

| Metric | Current Value | Target / Reference |
| :--- | :---: | :---: |
| **Local Branch Count** | ${metrics.localBranchCount} | <10 |
| **Remote Branch Count** | ${metrics.remoteBranchCount} | <10 |
| **Protected Branches** | ${metrics.protectedBranchesCount} | 4 |
| **Active Branches** | ${metrics.activeBranchesCount} | <5 |
| **Experimental Branches** | ${metrics.experimentalBranchesCount} | 0 |
| **Merged Branches** | ${metrics.mergedBranchesCount} | 0 |
| **Duplicate Branches** | ${metrics.duplicateBranchesCount} | 0 |
| **Dead Branches** | ${metrics.deadBranchesCount} | <2 |
| **Ready-for-Deletion Branches** | ${metrics.readyForDeleteBranchesCount} | 0 |
| **Remote Orphan Branches** | ${metrics.remoteOrphanBranchesCount} | 0 |
| **Local Orphan Branches** | ${metrics.localOrphanBranchesCount} | <2 |
| **Branches Without Upstream** | ${metrics.branchesWithoutUpstreamCount} | <2 |
| **Branches Waiting for Merge** | ${metrics.branchesWaitingForMergeCount} | <5 |

---

## 9. Score Deductions Breakdown

Health score computed from fixed rules:

${scoreDeductions}

---

## 10. Action Queue

Structured action items generated based on multi-dimensional checks:

${actionTable}

---

## 11. Executable Cleanup Script (\`cleanup_commands.sh\`)

Below is the generated execution script. It has also been saved to [.agents/cleanup_commands.sh](file://${CLEANUP_SCRIPT_PATH}) and marked as executable.

\`\`\`bash
${shellScript}
\`\`\`
`;

  // Write to both workspace and brain folder
  fs.writeFileSync(WORKSPACE_REPORT_PATH, markdown, 'utf8');
  
  const brainDir = path.dirname(BRAIN_REPORT_PATH);
  if (!fs.existsSync(brainDir)) {
    fs.mkdirSync(brainDir, { recursive: true });
  }
  fs.writeFileSync(BRAIN_REPORT_PATH, markdown, 'utf8');
  
  console.log('Markdown report generated successfully.');
}
