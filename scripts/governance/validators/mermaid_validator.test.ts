// scripts/governance/validators/mermaid_validator.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { MermaidValidator } from './mermaid_validator';

const workspaceRoot = resolve(__dirname, '../../..');
const testDirName = 'scratch/test-mermaid-validator';
const testDir = join(workspaceRoot, testDirName);

describe('MermaidValidator', () => {
  const validator = new MermaidValidator();

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

  it('should pass on valid mermaid diagrams', async () => {
    const file = join(testDirName, 'valid.md');
    const fullPath = join(testDir, 'valid.md');
    writeFileSync(fullPath, `
# Diagram

\`\`\`mermaid
graph TD
    A["Some text"] --> B("Another shape")
\`\`\`
`, 'utf8');

    const result = await validator.run([file]);
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should detect unclosed mermaid blocks', async () => {
    const file = join(testDirName, 'unclosed.md');
    const fullPath = join(testDir, 'unclosed.md');
    writeFileSync(fullPath, `
# Diagram

\`\`\`mermaid
graph TD
    A --> B
`, 'utf8');

    const result = await validator.run([file]);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.rule === 'Unclosed Mermaid Block')).toBe(true);
  });

  it('should detect empty mermaid blocks', async () => {
    const file = join(testDirName, 'empty.md');
    const fullPath = join(testDir, 'empty.md');
    writeFileSync(fullPath, `
# Diagram

\`\`\`mermaid
\`\`\`
`, 'utf8');

    const result = await validator.run([file]);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.rule === 'Empty Mermaid Block')).toBe(true);
  });

  it('should detect invalid mermaid diagram types', async () => {
    const file = join(testDirName, 'invalid-type.md');
    const fullPath = join(testDir, 'invalid-type.md');
    writeFileSync(fullPath, `
# Diagram

\`\`\`mermaid
invalidType TD
    A --> B
\`\`\`
`, 'utf8');

    const result = await validator.run([file]);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.rule === 'Invalid Mermaid Diagram Type')).toBe(true);
  });

  it('should detect malformed double quotes', async () => {
    const file = join(testDirName, 'malformed-quotes.md');
    const fullPath = join(testDir, 'malformed-quotes.md');
    writeFileSync(fullPath, `
# Diagram

\`\`\`mermaid
graph TD
    A["Unclosed quote)
\`\`\`
`, 'utf8');

    const result = await validator.run([file]);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.rule === 'Malformed Mermaid Quotes')).toBe(true);
  });

  it('should detect malformed enclosures', async () => {
    const file = join(testDirName, 'malformed-enclosure.md');
    const fullPath = join(testDir, 'malformed-enclosure.md');
    writeFileSync(fullPath, `
# Diagram

\`\`\`mermaid
graph TD
    A[Unbalanced bracket
\`\`\`
`, 'utf8');

    const result = await validator.run([file]);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.rule === 'Malformed Mermaid Enclosure')).toBe(true);
  });

  it('should detect invalid arrow connectors', async () => {
    const file = join(testDirName, 'invalid-connector.md');
    const fullPath = join(testDir, 'invalid-connector.md');
    writeFileSync(fullPath, `
# Diagram

\`\`\`mermaid
graph TD
    A -> B
\`\`\`
`, 'utf8');

    const result = await validator.run([file]);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.rule === 'Invalid Mermaid Flowchart Connection')).toBe(true);
  });
});
