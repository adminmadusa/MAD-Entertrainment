import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { MalformedAtxHeadingFixer } from '../fixers/malformed_atx_heading_fixer';
import { FilenameCasingFixer } from '../fixers/filename_casing_fixer';
import { WorkstationPathFixer } from '../fixers/workstation_path_fixer';
import { FixContext } from '../fix_context';
import { StatelessViolation } from '../types';

const workspaceRoot = resolve(__dirname, '../../../..');
const sandboxDir = join(workspaceRoot, 'scratch/fixer-tests');
const relativeSandboxPath = 'scratch/fixer-tests';

describe('Documentation Fixers', () => {
  beforeEach(() => {
    if (existsSync(sandboxDir)) {
      rmSync(sandboxDir, { recursive: true, force: true });
    }
    mkdirSync(sandboxDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(sandboxDir)) {
      rmSync(sandboxDir, { recursive: true, force: true });
    }
  });

  describe('MalformedAtxHeadingFixer', () => {
    it('should add a space after heading hashes', async () => {
      const file = join(relativeSandboxPath, 'heading.md');
      const full = join(workspaceRoot, file);
      writeFileSync(full, '#HeadingText\n##SecondHeading\n', 'utf8');

      const fixer = new MalformedAtxHeadingFixer();
      const violation: StatelessViolation = {
        rule: 'Malformed ATX Heading',
        path: file,
        line: 1,
        message: 'Missing space',
      };

      const context = new FixContext({ workspaceRoot });
      const result = await fixer.fix(violation, context);

      expect(result.success).toBe(true);
      expect(result.applied).toBe(true);
      expect(result.fixedContent).toBe('# HeadingText\n##SecondHeading\n');
    });

    it('should report applied false if already normalized', async () => {
      const file = join(relativeSandboxPath, 'heading.md');
      const full = join(workspaceRoot, file);
      writeFileSync(full, '# HeadingText\n', 'utf8');

      const fixer = new MalformedAtxHeadingFixer();
      const violation: StatelessViolation = {
        rule: 'Malformed ATX Heading',
        path: file,
        line: 1,
        message: 'Missing space',
      };

      const context = new FixContext({ workspaceRoot });
      const result = await fixer.fix(violation, context);

      expect(result.success).toBe(true);
      expect(result.applied).toBe(false);
    });
  });

  describe('FilenameCasingFixer', () => {
    it('should rewrite relative link to match casing on disk', async () => {
      const file = join(relativeSandboxPath, 'file1.md');
      const target = join(relativeSandboxPath, 'TARGET_FILE.md');

      const fullFile = join(workspaceRoot, file);
      const fullTarget = join(workspaceRoot, target);

      writeFileSync(fullFile, 'Link: [target](./target_file.md#anchor-hash)\n', 'utf8');
      writeFileSync(fullTarget, 'content', 'utf8');

      const fixer = new FilenameCasingFixer();
      const violation: StatelessViolation = {
        rule: 'VAL-DOC-004',
        path: file,
        line: 1,
        message: 'Casing mismatch',
      };

      const context = new FixContext({ workspaceRoot });
      const result = await fixer.fix(violation, context);

      expect(result.success).toBe(true);
      expect(result.applied).toBe(true);
      expect(result.fixedContent).toBe('Link: [target](./TARGET_FILE.md#anchor-hash)\n');
    });
  });

  describe('WorkstationPathFixer', () => {
    it('should convert workspace local workstation file:/// paths to relative ones', async () => {
      const file = join(relativeSandboxPath, 'docs/file.md');
      const target = join(relativeSandboxPath, 'assets/image.png');

      const fullFile = join(workspaceRoot, file);
      const fullTarget = join(workspaceRoot, target);

      mkdirSync(dirname(fullFile), { recursive: true });
      mkdirSync(dirname(fullTarget), { recursive: true });

      // Simulate a local absolute workstation path
      const fileUrl = `file://${fullTarget}`;
      writeFileSync(fullFile, `Check [image](${fileUrl})\n`, 'utf8');
      writeFileSync(fullTarget, 'dummy png content', 'utf8');

      const fixer = new WorkstationPathFixer();
      const violation: StatelessViolation = {
        rule: 'VAL-DOC-001',
        path: file,
        line: 1,
        message: 'Exposed workstation path',
      };

      const context = new FixContext({ workspaceRoot });
      const result = await fixer.fix(violation, context);

      expect(result.success).toBe(true);
      expect(result.applied).toBe(true);
      // Relative path from scratch/fixer-tests/docs/file.md to scratch/fixer-tests/assets/image.png is ../assets/image.png
      expect(result.fixedContent).toBe('Check [image](../assets/image.png)\n');
    });

    it('should skip and report success false for file:/// paths pointing outside the workspace', async () => {
      const file = join(relativeSandboxPath, 'file.md');
      const fullFile = join(workspaceRoot, file);

      const fileUrl = 'file:///Users/external/some-machine-file.txt';
      writeFileSync(fullFile, `Check [extern](${fileUrl})\n`, 'utf8');

      const fixer = new WorkstationPathFixer();
      const violation: StatelessViolation = {
        rule: 'VAL-DOC-001',
        path: file,
        line: 1,
        message: 'Exposed workstation path',
      };

      const context = new FixContext({ workspaceRoot });
      const result = await fixer.fix(violation, context);

      expect(result.success).toBe(false);
      expect(result.applied).toBe(false);
      expect(result.message).toContain('points outside the workspace');
    });
  });
});

// Helper to resolve parent directories safely
function dirname(path: string): string {
  const parts = path.split(/[\\/]/);
  parts.pop();
  return parts.join('/');
}
