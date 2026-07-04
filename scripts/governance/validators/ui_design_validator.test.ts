// scripts/governance/validators/ui_design_validator.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { UIDesignValidator } from './ui_design_validator';
import { writeFileSync, rmSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

describe('UIDesignValidator', () => {
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
});

