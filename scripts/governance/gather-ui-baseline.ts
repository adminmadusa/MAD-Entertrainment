#!/usr/bin/env tsx
/**
 * gather-ui-baseline.ts
 *
 * Generates two governance artifacts alongside each other:
 *
 *   1. ui-baseline.json       — repository metadata snapshot (components, files, exports)
 *   2. component-manifest.json — per-component governance metadata (schema v1.1)
 *
 * Usage:
 *   pnpm governance:ui-baseline
 *
 * Output (not committed — generated in CI/release):
 *   .governance/baselines/<version>/ui-baseline.json
 *   .governance/baselines/<version>/component-manifest.json
 *
 * Per the approved plan, only versioned release snapshots are committed.
 * The generator runs in CI on every merge to develop and on release branches.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';

// ─── Configuration ─────────────────────────────────────────────────────────────

const ROOT = join(__dirname, '../../');
const UI_PKG = join(ROOT, 'packages/ui');
const UI_SRC = join(UI_PKG, 'src');

function getPackageVersion(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(join(UI_PKG, 'package.json')).version as string;
}

function getGitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
  } catch {
    return 'unknown';
  }
}

function getGitBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT }).toString().trim();
  } catch {
    return 'unknown';
  }
}

// ─── Component Manifest Schema v1.1 ────────────────────────────────────────────

type A11yRecord = {
  wcag: 'AA' | 'AAA' | null;
  keyboard: boolean;
  screenReader: boolean;
  colorContrast: boolean;
};

type ComponentEntry = {
  id: string;
  status: 'experimental' | 'preview' | 'stable' | 'deprecated' | 'removed' | 'planned';
  group: 'primitives' | 'composites' | 'layouts';
  since: string | null;
  owner: string;
  docs: boolean;
  tests: boolean;
  a11y: A11yRecord;
};

// Registry of all planned/implemented components with their permanent IDs.
// This registry is the source of truth for governance.
// IDs never change, even if components are renamed or moved.
const COMPONENT_REGISTRY: Record<string, ComponentEntry> = {
  Button:       { id: 'UI-PR-001', status: 'stable', group: 'primitives', since: '1.4.0', owner: 'platform', docs: true, tests: true, a11y: { wcag: 'AA', keyboard: true, screenReader: true, colorContrast: true } },
  IconButton:   { id: 'UI-PR-002', status: 'stable', group: 'primitives', since: '1.4.0', owner: 'platform', docs: true, tests: true, a11y: { wcag: 'AA', keyboard: true, screenReader: true, colorContrast: true } },
  Input:        { id: 'UI-PR-003', status: 'stable', group: 'primitives', since: '1.4.0', owner: 'platform', docs: true, tests: true, a11y: { wcag: 'AA', keyboard: true, screenReader: true, colorContrast: true } },
  Textarea:     { id: 'UI-PR-004', status: 'stable', group: 'primitives', since: '1.4.0', owner: 'platform', docs: true, tests: true, a11y: { wcag: 'AA', keyboard: true, screenReader: true, colorContrast: true } },
  Label:        { id: 'UI-PR-005', status: 'stable', group: 'primitives', since: '1.4.0', owner: 'platform', docs: true, tests: true, a11y: { wcag: 'AA', keyboard: true, screenReader: true, colorContrast: true } },
  Badge:        { id: 'UI-PR-006', status: 'stable', group: 'primitives', since: '1.4.0', owner: 'platform', docs: true, tests: true, a11y: { wcag: 'AA', keyboard: true, screenReader: true, colorContrast: true } },
  Spinner:      { id: 'UI-PR-007', status: 'stable', group: 'primitives', since: '1.4.0', owner: 'platform', docs: true, tests: true, a11y: { wcag: 'AA', keyboard: true, screenReader: true, colorContrast: true } },
  Skeleton:     { id: 'UI-PR-008', status: 'stable', group: 'primitives', since: '1.4.0', owner: 'platform', docs: true, tests: true, a11y: { wcag: 'AA', keyboard: true, screenReader: true, colorContrast: true } },
  Progress:     { id: 'UI-PR-009', status: 'stable', group: 'primitives', since: '1.4.0', owner: 'platform', docs: true, tests: true, a11y: { wcag: 'AA', keyboard: true, screenReader: true, colorContrast: true } },
  FormField:    { id: 'UI-CP-001', status: 'stable', group: 'composites', since: '1.4.0', owner: 'platform', docs: true, tests: true, a11y: { wcag: 'AA', keyboard: true, screenReader: true, colorContrast: true } },
  Alert:        { id: 'UI-CP-002', status: 'stable', group: 'composites', since: '1.4.0', owner: 'platform', docs: true, tests: true, a11y: { wcag: 'AA', keyboard: true, screenReader: true, colorContrast: true } },
  Modal:        { id: 'UI-CP-003', status: 'stable', group: 'composites', since: '1.4.0', owner: 'platform', docs: true, tests: true, a11y: { wcag: 'AA', keyboard: true, screenReader: true, colorContrast: true } },
  Drawer:       { id: 'UI-CP-004', status: 'stable', group: 'composites', since: '1.4.0', owner: 'platform', docs: true, tests: true, a11y: { wcag: 'AA', keyboard: true, screenReader: true, colorContrast: true } },
  Tooltip:      { id: 'UI-CP-005', status: 'stable', group: 'composites', since: '1.4.0', owner: 'platform', docs: true, tests: true, a11y: { wcag: 'AA', keyboard: true, screenReader: true, colorContrast: true } },
  Table:        { id: 'UI-CP-006', status: 'stable', group: 'composites', since: '1.4.0', owner: 'platform', docs: true, tests: true, a11y: { wcag: 'AA', keyboard: true, screenReader: true, colorContrast: true } },
  EmptyState:   { id: 'UI-CP-007', status: 'stable', group: 'composites', since: '1.4.0', owner: 'platform', docs: true, tests: true, a11y: { wcag: 'AA', keyboard: true, screenReader: true, colorContrast: true } },
  ErrorState:   { id: 'UI-CP-008', status: 'stable', group: 'composites', since: '1.4.0', owner: 'platform', docs: true, tests: true, a11y: { wcag: 'AA', keyboard: true, screenReader: true, colorContrast: true } },
  LoadingState: { id: 'UI-CP-009', status: 'stable', group: 'composites', since: '1.4.0', owner: 'platform', docs: true, tests: true, a11y: { wcag: 'AA', keyboard: true, screenReader: true, colorContrast: true } },
  Card:         { id: 'UI-LY-001', status: 'stable', group: 'layouts', since: '1.4.0', owner: 'platform', docs: true, tests: true, a11y: { wcag: 'AA', keyboard: true, screenReader: true, colorContrast: true } },
  Section:      { id: 'UI-LY-002', status: 'stable', group: 'layouts', since: '1.4.0', owner: 'platform', docs: true, tests: true, a11y: { wcag: 'AA', keyboard: true, screenReader: true, colorContrast: true } },
  Stack:        { id: 'UI-LY-003', status: 'stable', group: 'layouts', since: '1.4.0', owner: 'platform', docs: true, tests: true, a11y: { wcag: 'AA', keyboard: true, screenReader: true, colorContrast: true } },
  Grid:         { id: 'UI-LY-004', status: 'stable', group: 'layouts', since: '1.4.0', owner: 'platform', docs: true, tests: true, a11y: { wcag: 'AA', keyboard: true, screenReader: true, colorContrast: true } },
};

// ─── Validators ────────────────────────────────────────────────────────────────

type ValidationResult = { valid: boolean; warnings: string[]; errors: string[] };

/**
 * Validates manifest entries against the component folder structure.
 * In Phase 2B, this will also check for the presence of Component.md,
 * index.ts, and test files.
 */
function validateManifestEntries(
  registry: Record<string, ComponentEntry>,
  srcDir: string,
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const [name, entry] of Object.entries(registry)) {
    const folderPath = join(srcDir, entry.group, name);
    if (!existsSync(folderPath)) {
      if (entry.status === 'planned') {
        warnings.push(`[${entry.id}] ${name}: folder not yet created (status: planned)`);
      } else {
        errors.push(`[${entry.id}] ${name}: folder missing but status is "${entry.status}"`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

// ─── File inventory helpers ─────────────────────────────────────────────────────

function countSourceFiles(dir: string, ext: string[] = ['.ts', '.tsx', '.css']): number {
  if (!existsSync(dir)) return 0;
  let count = 0;
  for (const entry of readdirSync(dir, { recursive: true } as Parameters<typeof readdirSync>[1])) {
    const p = join(dir, entry as string);
    if (statSync(p).isFile() && ext.some((e) => (entry as string).endsWith(e))) count++;
  }
  return count;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const version = getPackageVersion();
  const gitCommit = getGitCommit();
  const gitBranch = getGitBranch();
  const generatedAt = new Date().toISOString();

  const outputDir = join(ROOT, `.governance/baselines/v${version}`);
  mkdirSync(outputDir, { recursive: true });

  console.log(`\n📦  @mad/ui v${version} — Governance Baseline Generator`);
  console.log(`    Commit : ${gitCommit}`);
  console.log(`    Branch : ${gitBranch}`);
  console.log(`    Output : .governance/baselines/v${version}/\n`);

  // ── 1. Validate manifest entries ─────────────────────────────────────────────
  const validation = validateManifestEntries(COMPONENT_REGISTRY, UI_SRC);

  if (validation.warnings.length > 0) {
    console.warn('⚠️  Manifest Warnings:');
    validation.warnings.forEach((w) => console.warn(`    ${w}`));
  }
  if (validation.errors.length > 0) {
    console.error('❌  Manifest Errors:');
    validation.errors.forEach((e) => console.error(`    ${e}`));
    process.exit(1);
  }

  // ── 2. Emit component-manifest.json ─────────────────────────────────────────
  const manifest = {
    schemaVersion: '1.1',
    packageVersion: version,
    generatedAt,
    gitCommit,
    gitBranch,
    components: COMPONENT_REGISTRY,
  };

  const manifestPath = join(outputDir, 'component-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`✅  component-manifest.json written`);
  console.log(`    Components: ${Object.keys(COMPONENT_REGISTRY).length} total`);
  const byStatus = Object.values(COMPONENT_REGISTRY).reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  Object.entries(byStatus).forEach(([s, n]) => console.log(`    • ${s}: ${n}`));

  // ── 3. Emit ui-baseline.json ──────────────────────────────────────────────────
  const baseline = {
    schemaVersion: '1.0',
    packageVersion: version,
    generatedAt,
    gitCommit,
    gitBranch,
    inventory: {
      totalSourceFiles: countSourceFiles(UI_SRC),
      styleFiles: countSourceFiles(UI_SRC, ['.css']),
      tsFiles: countSourceFiles(UI_SRC, ['.ts', '.tsx']),
      componentGroups: {
        primitives: Object.keys(COMPONENT_REGISTRY).filter(
          (k) => COMPONENT_REGISTRY[k].group === 'primitives',
        ).length,
        composites: Object.keys(COMPONENT_REGISTRY).filter(
          (k) => COMPONENT_REGISTRY[k].group === 'composites',
        ).length,
        layouts: Object.keys(COMPONENT_REGISTRY).filter(
          (k) => COMPONENT_REGISTRY[k].group === 'layouts',
        ).length,
      },
    },
    publicEntryPoints: [
      '@mad/ui',
      '@mad/ui/icons',
      '@mad/ui/styles/*',
      '@mad/ui/themes/mad',
      '@mad/ui/themes/default',
      '@mad/ui/tailwind/preset',
      '@mad/ui/testing',
    ],
    validation: {
      warnings: validation.warnings.length,
      errors: validation.errors.length,
      passed: validation.valid,
    },
  };

  const baselinePath = join(outputDir, 'ui-baseline.json');
  writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
  console.log(`\n✅  ui-baseline.json written`);
  console.log(`    Source files : ${baseline.inventory.totalSourceFiles}`);
  console.log(`    Validation   : ${validation.valid ? 'PASSED' : 'FAILED'}`);
  console.log(`\n✅  Baseline generation complete → .governance/baselines/v${version}/\n`);
}

main().catch((err) => {
  console.error('❌  Baseline generation failed:', err);
  process.exit(1);
});
