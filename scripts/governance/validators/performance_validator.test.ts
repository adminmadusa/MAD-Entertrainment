// scripts/governance/validators/performance_validator.test.ts

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import { PerformanceValidator } from './performance_validator';
import { RuleRegistry } from '../rules/registry';
import { FileContentCache, ASTParserCache } from '../core/ast_parser_cache';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

// ─── Helpers ────────────────────────────────────────────────────────────

function setupFile(content: string): void {
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(fs.readFileSync).mockReturnValue(content);
}

const PROD_LAYOUT = 'apps/web/src/app/layout.tsx';

// ─── Setup ──────────────────────────────────────────────────────────────

describe('PerformanceValidator (PR8B)', () => {
  const validator = new PerformanceValidator();

  beforeAll(() => {
    RuleRegistry.initialize();
  });

  beforeEach(() => {
    FileContentCache.clear();
    ASTParserCache.clear();
    vi.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════════════════════
  //  VAL-PFM-001 — Optimize Font Loading
  // ══════════════════════════════════════════════════════════════════════

  describe('VAL-PFM-001 — Optimize Font Loading', () => {

    it('should pass: compliant next/font/google with display swap', async () => {
      setupFile(`
        import { Outfit } from 'next/font/google';
        const outfit = Outfit({ subsets: ['latin'], display: 'swap' });
        export default function Layout() { return <div />; }
      `);
      const result = await validator.run([PROD_LAYOUT], {});
      const pfmWarnings = result.warnings.filter(w => w.rule === 'VAL-PFM-001');
      expect(pfmWarnings.length).toBe(0);
    });

    it('should pass: compliant next/font/local with display swap', async () => {
      setupFile(`
        import { localFont } from 'next/font/local';
        const myFont = localFont({ src: './fonts/MyFont.woff2', display: 'swap' });
      `);
      const result = await validator.run([PROD_LAYOUT], {});
      const pfmWarnings = result.warnings.filter(w => w.rule === 'VAL-PFM-001');
      expect(pfmWarnings.length).toBe(0);
    });

    it('should warn: next/font without display swap', async () => {
      setupFile(`
        import { Inter } from 'next/font/google';
        const inter = Inter({ subsets: ['latin'] });
      `);
      const result = await validator.run([PROD_LAYOUT], {});
      const pfmWarnings = result.warnings.filter(w => w.rule === 'VAL-PFM-001');
      expect(pfmWarnings.length).toBeGreaterThan(0);
      expect(pfmWarnings[0].message).toContain("display: 'swap'");
    });

    it('should warn: next/font with display set to block instead of swap', async () => {
      setupFile(`
        import { Roboto } from 'next/font/google';
        const roboto = Roboto({ subsets: ['latin'], display: 'block' });
      `);
      const result = await validator.run([PROD_LAYOUT], {});
      const pfmWarnings = result.warnings.filter(w => w.rule === 'VAL-PFM-001');
      expect(pfmWarnings.length).toBeGreaterThan(0);
    });

    it('should warn: raw Google Fonts <link> tag', async () => {
      setupFile(`
        export default function Layout() {
          return (
            <html>
              <head>
                <link href="https://fonts.googleapis.com/css?family=Inter" rel="stylesheet" />
              </head>
            </html>
          );
        }
      `);
      const result = await validator.run([PROD_LAYOUT], {});
      const pfmWarnings = result.warnings.filter(w => w.rule === 'VAL-PFM-001');
      expect(pfmWarnings.length).toBeGreaterThan(0);
      expect(pfmWarnings[0].message).toContain('next/font/google');
    });

    it('should warn: duplicate font initialization of the same font in the same file', async () => {
      setupFile(`
        import { Inter } from 'next/font/google';
        const inter1 = Inter({ subsets: ['latin'], display: 'swap' });
        const inter2 = Inter({ subsets: ['latin'], display: 'swap' });
      `);
      const result = await validator.run([PROD_LAYOUT], {});
      const pfmWarnings = result.warnings.filter(w => w.rule === 'VAL-PFM-001');
      expect(pfmWarnings.length).toBeGreaterThan(0);
      expect(pfmWarnings.some(w => w.message.includes("Duplicate font initialization detected for 'Inter'"))).toBe(true);
    });

    it('should pass: distinct fonts initialized in the same layout file', async () => {
      setupFile(`
        import { Inter, Outfit } from 'next/font/google';
        const inter = Inter({ subsets: ['latin'], display: 'swap' });
        const outfit = Outfit({ subsets: ['latin'], display: 'swap' });
      `);
      const result = await validator.run([PROD_LAYOUT], {});
      const pfmWarnings = result.warnings.filter(w => w.rule === 'VAL-PFM-001');
      expect(pfmWarnings.length).toBe(0);
    });

    it('should NOT flag: approved email template using fonts.gstatic.com', async () => {
      setupFile(`
        import { Font } from '@react-email/components';
        export function EmailLayout() {
          return <Font webFont={{ url: 'https://fonts.gstatic.com/s/outfit/v11/Fons.woff2', format: 'woff2' }} fontFamily="Outfit" fallbackFontFamily="Helvetica" />;
        }
      `);
      // Email template path — approved exception
      const result = await validator.run(['apps/server/src/lib/email/templates/components/EmailLayout.tsx'], {});
      expect(result.warnings.length).toBe(0);
      expect(result.errors.length).toBe(0);
    });

    it('should NOT flag: test files', async () => {
      setupFile(`
        import { Inter } from 'next/font/google';
        const inter = Inter({ subsets: ['latin'] }); // missing display swap intentionally
      `);
      const result = await validator.run(['apps/web/src/app/layout.test.tsx'], {});
      expect(result.warnings.length).toBe(0);
    });

    it('should include required finding fields: rule, severity, message, file, line, snippet', async () => {
      setupFile(`
        import { Inter } from 'next/font/google';
        const inter = Inter({ subsets: ['latin'] });
      `);
      const result = await validator.run([PROD_LAYOUT], {});
      const pfmWarnings = result.warnings.filter(w => w.rule === 'VAL-PFM-001');
      expect(pfmWarnings.length).toBeGreaterThan(0);
      const finding = pfmWarnings[0];
      expect(finding.rule).toBe('VAL-PFM-001');
      expect(finding.severity).toBe('WARNING');
      expect(finding.message).toBeTruthy();
      expect(finding.file).toBe(PROD_LAYOUT);
      expect(finding.line).toBeGreaterThan(0);
      expect(finding.snippet).toBeTruthy();
    });

  });

  // ══════════════════════════════════════════════════════════════════════
  //  VAL-PFM-002 — Avoid Render-Blocking Resources
  // ══════════════════════════════════════════════════════════════════════

  describe('VAL-PFM-002 — Avoid Render-Blocking Resources', () => {

    it('should pass: no external scripts or stylesheets', async () => {
      setupFile(`
        import '@/styles/globals.css';
        export default function Layout({ children }: { children: React.ReactNode }) {
          return <html><body>{children}</body></html>;
        }
      `);
      const result = await validator.run([PROD_LAYOUT], {});
      const pfmWarnings = result.warnings.filter(w => w.rule === 'VAL-PFM-002');
      expect(pfmWarnings.length).toBe(0);
    });

    it('should pass: JSON-LD script tag is not flagged', async () => {
      setupFile(`
        export default function Layout() {
          const jsonLd = { '@context': 'https://schema.org', '@type': 'WebSite' };
          return (
            <html>
              <body>
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
              </body>
            </html>
          );
        }
      `);
      const result = await validator.run([PROD_LAYOUT], {});
      const pfmWarnings = result.warnings.filter(w => w.rule === 'VAL-PFM-002');
      expect(pfmWarnings.length).toBe(0);
    });

    it('should warn: external synchronous <script src="https://..."> without async or defer', async () => {
      setupFile(`
        export default function Layout() {
          return (
            <html>
              <body>
                <script src="https://cdn.example.com/analytics.js" />
              </body>
            </html>
          );
        }
      `);
      const result = await validator.run([PROD_LAYOUT], {});
      const pfmWarnings = result.warnings.filter(w => w.rule === 'VAL-PFM-002');
      expect(pfmWarnings.length).toBeGreaterThan(0);
      expect(pfmWarnings[0].message).toContain('Synchronous external script');
    });

    it('should pass: external <script> with async attribute', async () => {
      setupFile(`
        export default function Layout() {
          return (
            <html>
              <body>
                <script src="https://cdn.example.com/analytics.js" async />
              </body>
            </html>
          );
        }
      `);
      const result = await validator.run([PROD_LAYOUT], {});
      const pfmWarnings = result.warnings.filter(w => w.rule === 'VAL-PFM-002');
      expect(pfmWarnings.length).toBe(0);
    });

    it('should pass: external <script> with defer attribute', async () => {
      setupFile(`
        export default function Layout() {
          return (
            <html>
              <body>
                <script src="https://cdn.example.com/analytics.js" defer />
              </body>
            </html>
          );
        }
      `);
      const result = await validator.run([PROD_LAYOUT], {});
      const pfmWarnings = result.warnings.filter(w => w.rule === 'VAL-PFM-002');
      expect(pfmWarnings.length).toBe(0);
    });

    it('should warn: external blocking <link rel="stylesheet" href="https://..."> tag', async () => {
      setupFile(`
        export default function Layout() {
          return (
            <html>
              <head>
                <link rel="stylesheet" href="https://cdn.example.com/styles.css" />
              </head>
            </html>
          );
        }
      `);
      const result = await validator.run([PROD_LAYOUT], {});
      const pfmWarnings = result.warnings.filter(w => w.rule === 'VAL-PFM-002');
      expect(pfmWarnings.length).toBeGreaterThan(0);
      expect(pfmWarnings[0].message).toContain('blocking stylesheet');
    });

    it('should warn: <link rel="preload" as="style" href="https://..."> external CSS preload', async () => {
      setupFile(`
        export default function Layout() {
          return (
            <html>
              <head>
                <link rel="preload" as="style" href="https://cdn.example.com/critical.css" />
              </head>
            </html>
          );
        }
      `);
      const result = await validator.run([PROD_LAYOUT], {});
      const pfmWarnings = result.warnings.filter(w => w.rule === 'VAL-PFM-002');
      expect(pfmWarnings.length).toBeGreaterThan(0);
      expect(pfmWarnings[0].message).toContain('Preloading external CSS');
    });

    it('should NOT flag: internal preload hint (non-http href)', async () => {
      setupFile(`
        export default function Layout() {
          return (
            <html>
              <head>
                <link rel="preload" as="font" href="/fonts/my-font.woff2" />
              </head>
            </html>
          );
        }
      `);
      const result = await validator.run([PROD_LAYOUT], {});
      const pfmWarnings = result.warnings.filter(w => w.rule === 'VAL-PFM-002');
      expect(pfmWarnings.length).toBe(0);
    });

    it('should NOT flag: test files', async () => {
      setupFile(`
        export default function Layout() {
          return <script src="https://cdn.example.com/analytics.js" />;
        }
      `);
      const result = await validator.run(['apps/web/src/app/layout.test.tsx'], {});
      expect(result.warnings.length).toBe(0);
    });

    it('should include required finding fields: rule, severity, message, file, line, snippet', async () => {
      setupFile(`
        export default function Layout() {
          return <html><body><script src="https://cdn.example.com/widget.js" /></body></html>;
        }
      `);
      const result = await validator.run([PROD_LAYOUT], {});
      const pfmWarnings = result.warnings.filter(w => w.rule === 'VAL-PFM-002');
      expect(pfmWarnings.length).toBeGreaterThan(0);
      const finding = pfmWarnings[0];
      expect(finding.rule).toBe('VAL-PFM-002');
      expect(finding.severity).toBe('WARNING');
      expect(finding.message).toBeTruthy();
      expect(finding.file).toBe(PROD_LAYOUT);
      expect(finding.line).toBeGreaterThan(0);
      expect(finding.snippet).toBeTruthy();
    });

  });

});
