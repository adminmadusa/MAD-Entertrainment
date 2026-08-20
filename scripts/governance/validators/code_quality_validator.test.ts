import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CodeQualityValidator } from './code_quality_validator';
import * as fs from 'fs';
import { governanceConfig } from '../core/governance.config';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

describe('CodeQualityValidator Unit Tests', () => {
  let validator: CodeQualityValidator;

  beforeEach(() => {
    validator = new CodeQualityValidator();
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  it('passes for a UI component within limits (<= 300 lines)', async () => {
    const fakeContent = Array(150).fill('const a = 1;').join('\n');
    vi.mocked(fs.readFileSync).mockReturnValue(fakeContent);

    const result = await validator.run(['apps/web/src/components/common/SmallCard.tsx'], {} as any);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails for an unexempted UI component exceeding 300 lines', async () => {
    const fakeContent = Array(350).fill('const a = 1;').join('\n');
    vi.mocked(fs.readFileSync).mockReturnValue(fakeContent);

    const result = await validator.run(['apps/web/src/components/common/GiantComponent.tsx'], {} as any);
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].rule).toBe('VAL-QUAL-001');
    expect(result.errors[0].message).toContain('UI Component / Page file size limit exceeded');
  });

  it('fails for an unexempted controller exceeding 200 lines', async () => {
    const fakeContent = Array(220).fill('export const get = () => {};').join('\n');
    vi.mocked(fs.readFileSync).mockReturnValue(fakeContent);

    const result = await validator.run(['apps/server/src/controllers/public/test.controller.ts'], {} as any);
    expect(result.success).toBe(false);
    expect(result.errors[0].rule).toBe('VAL-QUAL-003');
    expect(result.errors[0].message).toContain('Controller file size limit exceeded');
  });

  it('fails for an unexempted service exceeding 500 lines', async () => {
    const fakeContent = Array(550).fill('export function doWork() {}').join('\n');
    vi.mocked(fs.readFileSync).mockReturnValue(fakeContent);

    const result = await validator.run(['apps/server/src/services/public/test.service.ts'], {} as any);
    expect(result.success).toBe(false);
    expect(result.errors[0].rule).toBe('VAL-QUAL-004');
    expect(result.errors[0].message).toContain('Backend Service file size limit exceeded');
  });

  it('passes for a legacy file on an active exception within its frozen ceiling', async () => {
    // Dynamic mock exception for unit test
    governanceConfig.codeQuality.exceptions = [
      { filePath: 'apps/server/src/services/public/mock.service.ts', ruleId: 'VAL-QUAL-004', maxLinesCeiling: 600, expiresAt: '2026-12-31', owner: 'Test Team', reason: 'Test Exception' }
    ];
    const fakeContent = Array(550).fill('export function doWork() {}').join('\n');
    vi.mocked(fs.readFileSync).mockReturnValue(fakeContent);

    const result = await validator.run(['apps/server/src/services/public/mock.service.ts'], {} as any);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    governanceConfig.codeQuality.exceptions = [];
  });

  it('fails if a legacy file on exception exceeds its frozen ceiling', async () => {
    // Dynamic mock exception for unit test
    governanceConfig.codeQuality.exceptions = [
      { filePath: 'apps/server/src/services/public/mock.service.ts', ruleId: 'VAL-QUAL-004', maxLinesCeiling: 600, expiresAt: '2026-12-31', owner: 'Test Team', reason: 'Test Exception' }
    ];
    const fakeContent = Array(650).fill('export function doWork() {}').join('\n');
    vi.mocked(fs.readFileSync).mockReturnValue(fakeContent);

    const result = await validator.run(['apps/server/src/services/public/mock.service.ts'], {} as any);
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('Code Quality Freeze Violation');
    governanceConfig.codeQuality.exceptions = [];
  });
});
