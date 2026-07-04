// scripts/governance/validators/cross_reference_validator.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { CrossReferenceValidator } from './cross_reference_validator';
import { GovernanceMetadata } from '../core/types';

const workspaceRoot = resolve(__dirname, '../../..');
const testDirName = 'scratch/test-cross-ref-validator';
const testDir = join(workspaceRoot, testDirName);

describe('CrossReferenceValidator', () => {
  const validator = new CrossReferenceValidator();

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

  it('should pass if there are no circular dependencies and related links are correct', async () => {
    const fileA = join(testDirName, 'docA.md');
    const fullA = join(testDir, 'docA.md');

    writeFileSync(fullA, `
# Title

## Related Documents:
- [docB.md](docB.md)
`, 'utf8');

    const metadata: GovernanceMetadata = {
      requiredDocuments: [],
      dependencyMatrix: [
        { document: 'scratch/test-cross-ref-validator/docA.md', dependsOn: ['scratch/test-cross-ref-validator/docB.md'] }
      ]
    };

    const result = await validator.run([fileA], metadata);
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should detect circular document dependencies', async () => {
    const fileA = join(testDirName, 'docA.md');
    const fullA = join(testDir, 'docA.md');

    writeFileSync(fullA, `
# Title
`, 'utf8');

    const metadata: GovernanceMetadata = {
      requiredDocuments: [],
      dependencyMatrix: [
        { document: 'docA.md', dependsOn: ['docB.md'] },
        { document: 'docB.md', dependsOn: ['docA.md'] }
      ]
    };

    const result = await validator.run([fileA], metadata);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.rule === 'Circular Document Dependency')).toBe(true);
  });

  it('should detect missing related document links', async () => {
    const fileA = join(testDirName, 'docA.md');
    const fullA = join(testDir, 'docA.md');

    writeFileSync(fullA, `
# Title

## Related Documents:
- [docC.md](docC.md)
`, 'utf8');

    const metadata: GovernanceMetadata = {
      requiredDocuments: [],
      dependencyMatrix: [
        { document: 'scratch/test-cross-ref-validator/docA.md', dependsOn: ['scratch/test-cross-ref-validator/docB.md'] }
      ]
    };

    const result = await validator.run([fileA], metadata);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.rule === 'Missing SSOT Reference')).toBe(true);
  });
});
