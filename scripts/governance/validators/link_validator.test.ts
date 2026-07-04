// scripts/governance/validators/link_validator.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { LinkValidator } from './link_validator';

const workspaceRoot = resolve(__dirname, '../../..');
const testDirName = 'scratch/test-link-validator';
const testDir = join(workspaceRoot, testDirName);

describe('LinkValidator', () => {
  const validator = new LinkValidator();

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

  it('should validate valid links and anchors', async () => {
    const sourceFile = join(testDirName, 'source.md');
    const fullSource = join(testDir, 'source.md');

    const targetFile = join(testDirName, 'target.md');
    const fullTarget = join(testDir, 'target.md');

    writeFileSync(fullTarget, `
# Target Heading

Some content.
`, 'utf8');

    writeFileSync(fullSource, `
# Source

Here is a [link](target.md#target-heading).
`, 'utf8');

    const result = await validator.run([sourceFile, targetFile]);
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should detect broken reference links', async () => {
    const sourceFile = join(testDirName, 'broken-ref.md');
    const fullSource = join(testDir, 'broken-ref.md');

    writeFileSync(fullSource, `
# Source

[Link][nonexistent-ref]

[valid-ref]: target.md
`, 'utf8');

    const result = await validator.run([sourceFile]);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.rule === 'Broken Reference Link')).toBe(true);
  });

  it('should detect broken link target files', async () => {
    const sourceFile = join(testDirName, 'broken-target.md');
    const fullSource = join(testDir, 'broken-target.md');

    writeFileSync(fullSource, `
# Source

[Link](missing-file.md)
`, 'utf8');

    const result = await validator.run([sourceFile]);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.rule === 'Broken Link Target')).toBe(true);
  });

  it('should detect broken link anchors', async () => {
    const sourceFile = join(testDirName, 'broken-anchor.md');
    const fullSource = join(testDir, 'broken-anchor.md');

    const targetFile = join(testDirName, 'target-ok.md');
    const fullTarget = join(testDir, 'target-ok.md');

    writeFileSync(fullTarget, `
# Real Heading
`, 'utf8');

    writeFileSync(fullSource, `
# Source

[Link](target-ok.md#missing-heading)
`, 'utf8');

    const result = await validator.run([sourceFile, targetFile]);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.rule === 'Broken Link Anchor')).toBe(true);
  });
});
