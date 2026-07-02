// scripts/governance/validators/documentation_validator.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { DocumentationValidator } from './documentation_validator';

const workspaceRoot = resolve(__dirname, '../../..');
const testDirName = 'scratch/test-doc-validator';
const testDir = join(workspaceRoot, testDirName);

describe('DocumentationValidator V2', () => {
  const validator = new DocumentationValidator();

  beforeAll(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should validate universal rules (workstation and absolute paths)', async () => {
    const file1 = join(testDirName, 'workstation-path.md');
    const fullFile1 = join(testDir, 'workstation-path.md');

    // Local workstation path (file:///)
    writeFileSync(fullFile1, `
# Title
- **Status**: Active
Link: [Gov](file:///Users/admin/Desktop/MAD/REPOSITORY_GOVERNANCE.md)
`, 'utf8');

    const result1 = await validator.run([file1], { requiredDocuments: [], dependencyMatrix: [] });
    expect(result1.success).toBe(false);
    expect(result1.errors.some(e => e.rule === 'VAL-DOC-001')).toBe(true);

    // Absolute local path (/Users/)
    writeFileSync(fullFile1, `
# Title
- **Status**: Active
Absolute: Link to /Users/admin/Desktop/MAD/REPOSITORY_GOVERNANCE.md
`, 'utf8');

    const result2 = await validator.run([file1], { requiredDocuments: [], dependencyMatrix: [] });
    expect(result2.success).toBe(false);
    expect(result2.errors.some(e => e.rule === 'VAL-DOC-002')).toBe(true);
  });

  it('should validate secret and credential detection', async () => {
    const file1 = join(testDirName, 'secrets.md');
    const fullFile1 = join(testDir, 'secrets.md');

    // Real-looking credential (causes warning under staged rollout policy)
    writeFileSync(fullFile1, `
# Config
- **Status**: Active
api_key = "sk_live_51NzABC123XYZ"
`, 'utf8');

    const result1 = await validator.run([file1], { requiredDocuments: [], dependencyMatrix: [] });
    expect(result1.warnings.some(e => e.rule === 'VAL-DOC-005')).toBe(true);

    // Placeholder credential (should bypass)
    writeFileSync(fullFile1, `
# Config
- **Status**: Active
api_key = "YOUR_API_KEY"
another_key = "<api-key>"
`, 'utf8');

    const result2 = await validator.run([file1], { requiredDocuments: [], dependencyMatrix: [] });
    expect(result2.warnings.some(e => e.rule === 'VAL-DOC-005')).toBe(false);
  });

  it('should validate link targets and casing', async () => {
    const file1 = join(testDirName, 'links.md');
    const fullFile1 = join(testDir, 'links.md');

    const targetFile = join(testDir, 'target.md');
    const targetFileRel = join(testDirName, 'target.md');
    writeFileSync(targetFile, '# Target', 'utf8');

    // Valid relative link
    writeFileSync(fullFile1, `
# Source
- **Status**: Active
Link: [Target](target.md)
`, 'utf8');

    const result1 = await validator.run([file1, targetFileRel], { requiredDocuments: [], dependencyMatrix: [] });
    expect(result1.success).toBe(true);

    // Link casing mismatch
    writeFileSync(fullFile1, `
# Source
- **Status**: Active
Link: [Target](Target.md)
`, 'utf8');

    const result2 = await validator.run([file1, targetFileRel], { requiredDocuments: [], dependencyMatrix: [] });
    expect(result2.success).toBe(false);
    expect(result2.errors.some(e => e.rule === 'VAL-DOC-004')).toBe(true);

    // Nonexistent file link
    writeFileSync(fullFile1, `
# Source
- **Status**: Active
Link: [Missing](missing.md)
`, 'utf8');

    const result3 = await validator.run([file1], { requiredDocuments: [], dependencyMatrix: [] });
    expect(result3.success).toBe(false);
    expect(result3.errors.some(e => e.rule === 'VAL-DOC-003')).toBe(true);
  });

  it('should validate duplicate markdown files', async () => {
    const file1 = join(testDirName, 'doc-a.md');
    const fullFile1 = join(testDir, 'doc-a.md');
    const file2 = join(testDirName, 'doc-b.md');
    const fullFile2 = join(testDir, 'doc-b.md');

    const docContent = `
# System Architecture Runbook
This is a standard operation guide detailing how to perform updates,
how to configure routing rules, and how to verify platform accessibility.
It contains multi-line paragraphs to satisfy the size threshold.
    `;

    writeFileSync(fullFile1, `
- **Status**: Active
${docContent}
`, 'utf8');

    writeFileSync(fullFile2, `
- **Status**: Active
${docContent}
`, 'utf8');

    const result = await validator.run([file1, file2], { requiredDocuments: [], dependencyMatrix: [] });
    // Since duplicates cause warnings under staged rollout policy
    expect(result.warnings.some(e => e.rule === 'VAL-DOC-006')).toBe(true);
  });

  it('should validate reachability and orphan detection', async () => {
    const file1 = join(testDirName, 'orphan-doc.md');
    const fullFile1 = join(testDir, 'orphan-doc.md');

    writeFileSync(fullFile1, `
# Orphan Guide
- **Status**: Active
No entrypoint points to this document.
`, 'utf8');

    const result = await validator.run([file1], { requiredDocuments: [], dependencyMatrix: [] });
    // Since orphans cause warnings under staged rollout policy
    expect(result.warnings.some(e => e.rule === 'VAL-DOC-007')).toBe(true);
  });
  });
});

