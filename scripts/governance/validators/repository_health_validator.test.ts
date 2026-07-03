// scripts/governance/validators/repository_health_validator.test.ts
import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import { RepositoryHealthValidator } from './repository_health_validator';
import { GovernanceMetadata } from '../core/types';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  statSync: vi.fn(),
}));

describe('RepositoryHealthValidator', () => {
  const validator = new RepositoryHealthValidator();

  it('should pass on correct repository health', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true, isDirectory: () => false } as any);
    vi.mocked(fs.readFileSync).mockReturnValue(`
# Title
- **Status**: Active
- **Owner**: Platform/Deployment Owner
- **Version**: 1.0
- **Review Cycle**: Quarterly
- **Last Updated**: 2026-07-01
`);

    const metadata: GovernanceMetadata = {
      requiredDocuments: ['DEPLOYMENT_MAP.md'],
      ownershipMatrix: [
        { document: 'DEPLOYMENT_MAP.md', ownerRole: 'Platform/Deployment Owner', reviewCycle: 'Quarterly' }
      ],
      dependencyMatrix: []
    };

    const result = await validator.run(['DEPLOYMENT_MAP.md'], metadata);
    expect(result.errors.length).toBe(0);
  });

  it('should detect owner mismatch inconsistencies', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true, isDirectory: () => false } as any);
    vi.mocked(fs.readFileSync).mockReturnValue(`
# Title
- **Status**: Active
- **Owner**: Documentation Owner
- **Version**: 1.0
- **Review Cycle**: Quarterly
- **Last Updated**: 2026-07-01
`);

    const metadata: GovernanceMetadata = {
      requiredDocuments: ['DEPLOYMENT_MAP.md'],
      ownershipMatrix: [
        { document: 'DEPLOYMENT_MAP.md', ownerRole: 'Platform/Deployment Owner', reviewCycle: 'Quarterly' }
      ],
      dependencyMatrix: []
    };

    const result = await validator.run(['DEPLOYMENT_MAP.md'], metadata);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.rule === 'SSOT Owner Inconsistency')).toBe(true);
  });

  it('should detect outdated documents', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true, isDirectory: () => false } as any);
    // Outdated by using a very old date (2020)
    vi.mocked(fs.readFileSync).mockReturnValue(`
# Title
- **Status**: Active
- **Owner**: Platform/Deployment Owner
- **Version**: 1.0
- **Review Cycle**: Quarterly
- **Last Updated**: 2020-07-01
`);

    const metadata: GovernanceMetadata = {
      requiredDocuments: ['DEPLOYMENT_MAP.md'],
      ownershipMatrix: [
        { document: 'DEPLOYMENT_MAP.md', ownerRole: 'Platform/Deployment Owner', reviewCycle: 'Quarterly' }
      ],
      dependencyMatrix: []
    };

    const result = await validator.run(['DEPLOYMENT_MAP.md'], metadata);
    expect(result.success).toBe(true); // outdated causes warning, not error!
    expect(result.warnings.some(e => e.rule === 'Outdated Documentation')).toBe(true);
  });
});
