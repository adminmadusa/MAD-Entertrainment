// scripts/governance/validators/ui_design_validator.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { UIDesignValidator } from './ui_design_validator';
import { writeFileSync, rmSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { FileContentCache, ASTParserCache } from '../core/ast_parser_cache';

describe('UIDesignValidator', () => {
  beforeEach(() => {
    FileContentCache.clear();
    ASTParserCache.clear();
  });
  const sandboxDir = join(__dirname, 'sandbox-ui-test');

  const runWithTempFile = async (filePath: string, content: string) => {
    const fullPath = join(sandboxDir, filePath);
    const parentDir = join(fullPath, '..');
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true });
    }
    writeFileSync(fullPath, content, 'utf8');

    const validator = new UIDesignValidator();
    try {
      const result = await validator.run([join('scripts/governance/validators/sandbox-ui-test', filePath)], {});
      return result;
    } finally {
      if (existsSync(fullPath)) {
        rmSync(fullPath);
      }
    }
  };

  beforeAll(() => {
    if (!existsSync(sandboxDir)) {
      mkdirSync(sandboxDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (existsSync(sandboxDir)) {
      rmSync(sandboxDir, { recursive: true, force: true });
    }
  });

  it('should flag hardcoded hex colors in standard UI files', async () => {
    const content = `
      const styles = { color: "#1a2b3c" };
    `;
    const result = await runWithTempFile('Button.tsx', content);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0].rule).toBe('VAL-UI-007');
    expect(result.warnings[0].message).toContain("Hardcoded color '#1a2b3c'");
  });

  it('should NOT flag hex-like anchor links in document link metadata', async () => {
    const content = `
      const metadata = { docLink: "AGENTS.md#dead-code-policy" };
    `;
    const result = await runWithTempFile('meta.ts', content);
    expect(result.warnings.length).toBe(0);
  });

  it('should skip hardcoded color checks in email template directories', async () => {
    const content = `
      const emailStyles = { color: "#ff0000" };
    `;
    // Simulating path location apps/server/src/lib/email/templates/Welcome.tsx
    const result = await runWithTempFile('apps/server/src/lib/email/templates/Welcome.tsx', content);
    expect(result.warnings.length).toBe(0);
  });

  it('should skip hardcoded color checks in PDF ticket drawing directories', async () => {
    const content = `
      const pdfColor = "#0000ff";
    `;
    // Simulating path location apps/server/src/lib/pdf/ticket/TicketPDF.tsx
    const result = await runWithTempFile('apps/server/src/lib/pdf/ticket/TicketPDF.tsx', content);
    expect(result.warnings.length).toBe(0);
  });

  it('should skip hardcoded color checks in Next.js global-error.tsx (no CSS tokens available in error boundary)', async () => {
    const content = `
      const bodyStyle = { background: "#0B0F1A", color: "#E2E8F0" };
    `;
    const result = await runWithTempFile('global-error.tsx', content);
    expect(result.warnings.length).toBe(0);
  });

  it('should flag VAL-UI-021 when <img> is missing width or height', async () => {
    const content = `
      export function Image() {
        return <img src="logo.png" alt="logo" />;
      }
    `;
    const result = await runWithTempFile('Image.tsx', content);
    expect(result.warnings.some(w => w.rule === 'VAL-UI-021')).toBe(true);
  });

  it('should NOT flag VAL-UI-021 when <img> has both width and height', async () => {
    const content = `
      export function Image() {
        return <img src="logo.png" alt="logo" width={100} height={100} />;
      }
    `;
    const result = await runWithTempFile('Image.tsx', content);
    expect(result.warnings.some(w => w.rule === 'VAL-UI-021')).toBe(false);
  });

  it('should flag VAL-UI-022 for hardcoded rgb/hsl colors in style prop', async () => {
    const content = `
      export function Comp() {
        return <div style={{ color: "rgb(255, 0, 0)" }}>Red</div>;
      }
    `;
    const result = await runWithTempFile('Comp.tsx', content);
    expect(result.warnings.some(w => w.rule === 'VAL-UI-022')).toBe(true);
  });

  it('should flag VAL-UI-023 for overflow-x-hidden on body className', async () => {
    const content = `
      export function Layout() {
        return <body className="overflow-x-hidden p-4">Layout</body>;
      }
    `;
    const result = await runWithTempFile('Layout.tsx', content);
    expect(result.warnings.some(w => w.rule === 'VAL-UI-023')).toBe(true);
  });

  it('should flag VAL-UI-023 for overflow-x: hidden in css selector targeting body', async () => {
    const content = `
      body {
        overflow-x: hidden;
      }
    `;
    const result = await runWithTempFile('styles.css', content);
    expect(result.warnings.some(w => w.rule === 'VAL-UI-023')).toBe(true);
  });

  it('should flag VAL-UI-024 for arbitrary Tailwind spacing', async () => {
    const content = `
      export function Comp() {
        return <div className="mt-[17px] p-[13px]">Spacing</div>;
      }
    `;
    const result = await runWithTempFile('Comp.tsx', content);
    expect(result.warnings.some(w => w.rule === 'VAL-UI-024')).toBe(true);
  });

  it('should flag VAL-UI-025 for duplicate Tailwind classes', async () => {
    const content = `
      export function Comp() {
        return <div className="flex flex items-center p-4 p-5">Flex</div>;
      }
    `;
    const result = await runWithTempFile('Comp.tsx', content);
    const warnings = result.warnings.filter(w => w.rule === 'VAL-UI-025');
    expect(warnings.length).toBeGreaterThan(0);
  });
});

