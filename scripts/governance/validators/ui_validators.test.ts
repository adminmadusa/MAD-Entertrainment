// scripts/governance/validators/ui_validators.test.ts
import { describe, it, expect, beforeAll, vi } from 'vitest';
import * as fs from 'fs';
import { UIDesignValidator } from './ui_design_validator';
import { AccessibilityValidator } from './accessibility_validator';
import { SharedComponentValidator } from './shared_component_validator';
import { RuleRegistry } from '../rules/registry';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

describe('UI and Accessibility AST Validators', () => {
  beforeAll(() => {
    RuleRegistry.initialize();
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
  });
});
