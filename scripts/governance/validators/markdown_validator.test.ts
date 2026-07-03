// scripts/governance/validators/markdown_validator.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { MarkdownValidator } from './markdown_validator';

const workspaceRoot = resolve(__dirname, '../../..');
const testDirName = 'scratch/test-markdown-validator';
const testDir = join(workspaceRoot, testDirName);

describe('MarkdownValidator', () => {
  const validator = new MarkdownValidator();

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

  it('should pass on valid markdown', async () => {
    const file = join(testDirName, 'valid.md');
    const fullPath = join(testDir, 'valid.md');
    writeFileSync(fullPath, `
# Valid Heading

Some text.

## Another Heading

| Header 1 | Header 2 |
| :--- | :--- |
| Row 1 | Row 2 |
`, 'utf8');

    const result = await validator.run([file]);
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should detect malformed ATX headings', async () => {
    const file = join(testDirName, 'malformed-heading.md');
    const fullPath = join(testDir, 'malformed-heading.md');
    writeFileSync(fullPath, `
#Malformed Heading
`, 'utf8');

    const result = await validator.run([file]);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.rule === 'Malformed ATX Heading')).toBe(true);
  });

  it('should detect duplicate headings', async () => {
    const file = join(testDirName, 'duplicate-heading.md');
    const fullPath = join(testDir, 'duplicate-heading.md');
    writeFileSync(fullPath, `
# Heading
## Subheading
## Subheading
`, 'utf8');

    const result = await validator.run([file]);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.rule === 'Duplicate Heading')).toBe(true);
  });

  it('should detect unclosed fenced code blocks', async () => {
    const file = join(testDirName, 'unclosed-code-block.md');
    const fullPath = join(testDir, 'unclosed-code-block.md');
    writeFileSync(fullPath, `
# Heading

\`\`\`ts
const x = 1;
`, 'utf8');

    const result = await validator.run([file]);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.rule === 'Unclosed Fenced Code Block')).toBe(true);
  });

  it('should detect malformed table columns count', async () => {
    const file = join(testDirName, 'malformed-table.md');
    const fullPath = join(testDir, 'malformed-table.md');
    writeFileSync(fullPath, `
| Header 1 | Header 2 |
| :--- | :--- |
| Row 1 |
`, 'utf8');

    const result = await validator.run([file]);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.rule === 'Malformed Table Column Count')).toBe(true);
  });
});
