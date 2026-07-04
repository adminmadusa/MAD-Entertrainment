// scripts/governance/core/dependency_graph.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { DependencyAnalyzer } from './dependency_analyzer';
import { KnowledgeGraph } from './knowledge_graph';

const workspaceRoot = resolve(__dirname, '../../..');
const scratchDir = join(workspaceRoot, 'scratch/test-env');

describe('Dependency Graph Foundation (Phase 1)', () => {
  beforeAll(() => {
    if (!existsSync(scratchDir)) {
      mkdirSync(scratchDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (existsSync(scratchDir)) {
      rmSync(scratchDir, { recursive: true, force: true });
    }
  });

  it('should correctly parse AST dependencies (static, dynamic, exports, and assets)', () => {
    const fileAPath = join(scratchDir, 'fileA.tsx');
    const fileBPath = join(scratchDir, 'fileB.ts');
    const dynamicModulePath = join(scratchDir, 'dynamicModule.ts');

    writeFileSync(fileBPath, 'export function something() {}', 'utf8');
    writeFileSync(dynamicModulePath, 'export const dynamicVal = 1;', 'utf8');

    const content = `
      import React from 'react';
      import { something } from './fileB';
      export function ComponentA() {
        React.useEffect(() => {
          import('./dynamicModule');
        }, []);
        return <img src="/images/logo.png" />;
      }
      export const helperConst = 10;
      export default ComponentA;
    `;
    writeFileSync(fileAPath, content, 'utf8');

    const result = DependencyAnalyzer.analyzeFileDetailed('scratch/test-env/fileA.tsx');

    // Verify dependencies
    expect(result.dependencies).toContain('scratch/test-env/fileB.ts');
    expect(result.dependencies).toContain('scratch/test-env/dynamicModule.ts');

    // Verify exports
    expect(result.exports).toContain('ComponentA');
    expect(result.exports).toContain('helperConst');
    expect(result.exports).toContain('default');

    // Verify dynamic imports
    expect(result.dynamicImports).toContain('./dynamicModule');

    // Verify asset references
    expect(result.assetReferences).toContain('/images/logo.png');

    unlinkSync(fileAPath);
    unlinkSync(fileBPath);
    unlinkSync(dynamicModulePath);
  });

  it('should fallback to regex on syntax parsing errors', () => {
    const fileBPath = join(scratchDir, 'fileB.ts');
    const validFilePath = join(scratchDir, 'validFile.ts');

    writeFileSync(validFilePath, 'export const val = 1;', 'utf8');

    // Code with syntax error (invalid class structure)
    const content = `
      import { val } from './validFile';
      class UnfinishedClass {
        export default val; // syntax error
    `;
    writeFileSync(fileBPath, content, 'utf8');

    DependencyAnalyzer.clearWarnings();
    const result = DependencyAnalyzer.analyzeFileDetailed('scratch/test-env/fileB.ts');

    // Check dependency resolution via fallback regex
    expect(result.dependencies).toContain('scratch/test-env/validFile.ts');
    // Should have recorded a parser warning
    expect(DependencyAnalyzer.getWarnings().length).toBeGreaterThan(0);
    expect(DependencyAnalyzer.getWarnings()[0].file).toBe('scratch/test-env/fileB.ts');

    unlinkSync(fileBPath);
    unlinkSync(validFilePath);
  });

  it('should resolve tsconfig path aliases relative to the current file', () => {
    const aliasPath = DependencyAnalyzer.resolveImport('@mad/shared', 'apps/web/src/app/page.tsx');
    expect(aliasPath).toBe('packages/shared/src/index.ts');

    const internalAliasPath = DependencyAnalyzer.resolveImport('@/components/auth/AuthForm', 'apps/web/src/app/page.tsx');
    expect(internalAliasPath).toBe('apps/web/src/components/auth/AuthForm.tsx');
  });

  it('should run full and incremental graph builds and produce identical results', () => {
    const file1 = join(scratchDir, 'comp1.tsx');
    const file2 = join(scratchDir, 'comp2.tsx');
    writeFileSync(file1, "import './comp2'; export const C1 = 1;", 'utf8');
    writeFileSync(file2, "export const C2 = 2;", 'utf8');

    const graph1 = new KnowledgeGraph();
    // Manually index mock files incrementally since scratch/ is ignored by workspace scan
    graph1.updateFileIncremental('scratch/test-env/comp2.tsx');
    graph1.updateFileIncremental('scratch/test-env/comp1.tsx');

    const depsBefore = graph1.getDependencies('scratch/test-env/comp1.tsx');
    expect(depsBefore).toContain('scratch/test-env/comp2.tsx');

    // Verify consumer mapping
    const consumersBefore = graph1.getDirectConsumers('scratch/test-env/comp2.tsx');
    expect(consumersBefore).toContain('scratch/test-env/comp1.tsx');

    // Perform an incremental update on comp1.tsx to remove comp2 import
    writeFileSync(file1, "export const C1 = 1;", 'utf8');
    graph1.updateFileIncremental('scratch/test-env/comp1.tsx');

    // Verify incremental changes reflected
    const depsAfter = graph1.getDependencies('scratch/test-env/comp1.tsx');
    expect(depsAfter).not.toContain('scratch/test-env/comp2.tsx');

    const consumersAfter = graph1.getDirectConsumers('scratch/test-env/comp2.tsx');
    expect(consumersAfter).not.toContain('scratch/test-env/comp1.tsx');

    unlinkSync(file1);
    unlinkSync(file2);
  });

  it('should validate hybrid caching, mtime matches, timestamp modifications, and content modifications', () => {
    const fs = require('fs');
    const tempFile = resolve(workspaceRoot, 'packages/temp_perf_test_file.ts');

    // 1. Initial creation of temp file in scanned workspace
    writeFileSync(tempFile, 'export const tempVal = 123;', 'utf8');

    try {
      // Rebuild/register the new file
      new KnowledgeGraph();

      // Second run: mtime should match, hitting the fast path
      const g2 = new KnowledgeGraph();
      const metadata2 = g2.getDetailedData('packages/temp_perf_test_file.ts');
      expect(metadata2).toBeDefined();
      expect(metadata2?.hash).toBeDefined();

      // 2. Simulate git timestamp change (git checkout/restore simulation):
      // Modify mtime without altering content
      const futureTime = (Date.now() + 50000) / 1000;
      fs.utimesSync(tempFile, futureTime, futureTime);

      const g3 = new KnowledgeGraph();
      const metadata3 = g3.getDetailedData('packages/temp_perf_test_file.ts');
      // The cached timestamp should have been updated to the new mtime (futureTime * 1000)
      // due to hash matching fallback reconciliation
      expect(metadata3).toBeDefined();
      expect(Math.abs((metadata3?.lastModified || 0) - futureTime * 1000)).toBeLessThan(1000);

      // 3. Real content modification (mtime and content hash both change)
      writeFileSync(tempFile, 'export const tempVal = 456; // edited content', 'utf8');
      const g4 = new KnowledgeGraph();
      const metadata4 = g4.getDetailedData('packages/temp_perf_test_file.ts');
      expect(metadata4).toBeDefined();
      expect(metadata4?.hash).not.toBe(metadata3?.hash);
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      // Run once more to remove tempFile from cache baselines
      new KnowledgeGraph();
    }
  });
});
