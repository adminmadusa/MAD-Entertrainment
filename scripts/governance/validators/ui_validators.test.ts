// scripts/governance/validators/ui_validators.test.ts
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import { UIDesignValidator } from './ui_design_validator';
import { AccessibilityValidator } from './accessibility_validator';
import { SharedComponentValidator } from './shared_component_validator';
import { RuleRegistry } from '../rules/registry';
import { FileContentCache, ASTParserCache } from '../core/ast_parser_cache';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

describe('UI and Accessibility AST Validators', () => {
  beforeAll(() => {
    RuleRegistry.initialize();
  });

  beforeEach(() => {
    FileContentCache.clear();
    ASTParserCache.clear();
  });

  describe('UIDesignValidator', () => {
    const validator = new UIDesignValidator();

    it('should detect hardcoded hex colors', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
        export function MyComponent() {
          return <div style={{ color: '#ff0000' }}>Hello</div>;
        }
      `);

      const result = await validator.run(['apps/web/src/components/Comp.tsx'], {});
      expect(result.warnings.some(e => e.rule === 'VAL-UI-007')).toBe(true);
    });

    it('should detect heading hierarchy jumps', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
        export function MyComponent() {
          return (
            <div>
              <h1>Title</h1>
              <h3>Jumped level</h3>
            </div>
          );
        }
      `);

      const result = await validator.run(['apps/web/src/components/Comp.tsx'], {});
      expect(result.warnings.some(e => e.rule === 'VAL-UI-008')).toBe(true);
    });
  });

  describe('AccessibilityValidator', () => {
    const validator = new AccessibilityValidator();

    it('should detect custom modal backdrops without shared import', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
        export function CustomModal() {
          return (
            <div className="fixed backdrop-blur-sm">
              <div>Content</div>
            </div>
          );
        }
      `);

      const result = await validator.run(['apps/web/src/components/Modal.tsx'], {});
      expect(result.warnings.some(e => e.rule === 'VAL-UI-002')).toBe(true);
      expect(result.warnings.some(e => e.rule === 'VAL-UI-003')).toBe(true);
    });

    it('should detect interactive elements with click handlers lacking keyboard accessibility', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
        export function Clicky() {
          return <div onClick={() => {}} className="clickable">Click me</div>;
        }
      `);

      const result = await validator.run(['apps/web/src/components/Clicky.tsx'], {});
      expect(result.warnings.some(e => e.rule === 'VAL-UI-009')).toBe(true);
    });

    it('should detect <img> elements missing alt text', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
        export function MyImg() {
          return <img src="image.jpg" />;
        }
      `);
      const result = await validator.run(['apps/web/src/components/MyImg.tsx'], {});
      expect(result.errors.some(e => e.rule === 'VAL-UI-020')).toBe(true);
    });

    it('should NOT flag <img> elements with alt text', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
        export function MyImg() {
          return <img src="image.jpg" alt="Description" />;
        }
      `);
      const result = await validator.run(['apps/web/src/components/MyImg.tsx'], {});
      expect(result.errors.some(e => e.rule === 'VAL-UI-020')).toBe(false);
    });
  });

  describe('SharedComponentValidator', () => {
    const validator = new SharedComponentValidator();

    it('should detect raw HTML button usage in web scope', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
        export function RawButton() {
          return <button>Click</button>;
        }
      `);

      // Needs to match scope. apps/web/ is in sharedComponentScopes.
      const result = await validator.run(['apps/web/src/components/RawButton.tsx'], {});
      expect(result.warnings.some(e => e.rule === 'VAL-UI-005')).toBe(true);
    });

    it('should track raw HTML button as suppressed when governance-ignore comment and justification are present', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
        export function IgnoredButton() {
          // governance-ignore VAL-UI-005: Using raw HTML button to implement third-party library integration.
          return <button>Click</button>;
        }
      `);

      const result = await validator.run(['apps/web/src/components/IgnoredButton.tsx'], {});
      const warning = result.warnings.find(e => e.rule === 'VAL-UI-005');
      expect(warning).toBeDefined();
      expect(warning?.message).toContain('[SUPPRESSED]');
      expect(warning?.message).toContain('third-party library integration');
    });

    it('should fail to ignore raw HTML button and append note when justification is missing', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
        export function BadIgnoredButton() {
          // governance-ignore VAL-UI-005
          return <button>Click</button>;
        }
      `);

      const result = await validator.run(['apps/web/src/components/BadIgnoredButton.tsx'], {});
      const warning = result.warnings.find(e => e.rule === 'VAL-UI-005');
      expect(warning).toBeDefined();
      expect(warning?.message).not.toContain('[SUPPRESSED]');
      expect(warning?.message).toContain('governance-ignore was skipped');
    });
  });

  describe('UIDesignValidator Scoping & context checks', () => {
    const validator = new UIDesignValidator();

    it('should ignore hex colors in server scope', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
        export const colors = { primary: '#ff0000' };
      `);

      const result = await validator.run(['apps/server/src/utils/colors.ts'], {});
      expect(result.warnings.some(e => e.rule === 'VAL-UI-007')).toBe(false);
    });

    it('should ignore SVG fill attributes in web scope', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
        export function Icon() {
          return <svg><polygon fill="#ff0000" /></svg>;
        }
      `);

      const result = await validator.run(['apps/web/src/components/Icon.tsx'], {});
      expect(result.warnings.some(e => e.rule === 'VAL-UI-007')).toBe(false);
    });

    it('should ignore URL hashes and git hashes', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
        export const link = 'AGENTS.md#dead-code-policy';
        export const hash = '#dead';
      `);

      const result = await validator.run(['apps/web/src/components/Help.tsx'], {});
      expect(result.warnings.some(e => e.rule === 'VAL-UI-007')).toBe(false);
    });

    it('should track hex colors as suppressed when governance-ignore comment and justification are present', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
        export function Comp() {
          // governance-ignore VAL-UI-007: Literal color is needed for Next.js metadata API compatibility.
          return <div style={{ color: '#ff0000' }}>Hello</div>;
        }
      `);

      const result = await validator.run(['apps/web/src/components/Comp.tsx'], {});
      const warning = result.warnings.find(e => e.rule === 'VAL-UI-007');
      expect(warning).toBeDefined();
      expect(warning?.message).toContain('[SUPPRESSED]');
      expect(warning?.message).toContain('Next.js metadata API');
    });
  });

  describe('AccessibilityValidator high-risk suppression restriction', () => {
    const validator = new AccessibilityValidator();

    it('should reject inline suppression for high-risk VAL-UI-002 rule and append restricted note', async () => {
      vi.spyOn(RuleRegistry, 'getRule').mockReturnValue({
        id: 'VAL-UI-002',
        name: 'Shared Modal Component Usage',
        severity: 'ERROR',
        category: 'UI',
        version: '1.0.0',
      } as any);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
        export function CustomModal() {
          return (
            // governance-ignore VAL-UI-002: Re-writing custom modal for custom animations
            <div className="fixed backdrop-blur-sm">
              <div>Content</div>
            </div>
          );
        }
      `);

      const result = await validator.run(['apps/web/src/components/Modal.tsx'], {});
      const error = result.errors.find(e => e.rule === 'VAL-UI-002');
      expect(error).toBeDefined();
      expect(error?.message).not.toContain('[SUPPRESSED]');
      expect(error?.message).toContain('disallowed for HIGH/CRITICAL rules');
    });
  });
});
