// scripts/governance/core/dead_asset_duplicate_validator.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { KnowledgeGraph } from './knowledge_graph';
import { DeadAssetDuplicateValidator } from '../validators/dead_asset_duplicate_validator';

const workspaceRoot = resolve(__dirname, '../../..');
const testDir = join(workspaceRoot, 'scratch/test-validator');

describe('Dead Asset & Duplicate Detection Validator (Phase 2)', () => {
  beforeAll(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should run reachability, duplicate component, and duplicate file checks deterministically', async () => {
    // 1. Create a mock workspace state on disk
    const entryPath = join(testDir, 'page.tsx'); // recognized Next.js entry point
    const usedCompPath = join(testDir, 'UsedComponent.tsx');
    const unusedCompPath = join(testDir, 'UnusedComponent.tsx');
    const unusedHookPath = join(testDir, 'useUnusedHook.ts');
    
    const comp1Path = join(testDir, 'DuplicateComp1.tsx');
    const comp2Path = join(testDir, 'DuplicateComp2.tsx');

    const file1Path = join(testDir, 'DuplicateFile1.ts');
    const file2Path = join(testDir, 'DuplicateFile2.ts');

    // Entry imports UsedComponent and DuplicateComp1
    writeFileSync(entryPath, `
      import { UsedComponent } from './UsedComponent';
      import { DuplicateComp1 } from './DuplicateComp1';
      export default function Page() {
        return (
          <div>
            <UsedComponent />
            <DuplicateComp1 />
          </div>
        );
      }
    `, 'utf8');

    writeFileSync(usedCompPath, `
      export function UsedComponent() {
        return <span>Used Component</span>;
      }
    `, 'utf8');

    writeFileSync(unusedCompPath, `
      export function UnusedComponent() {
        return <p>Unused Component</p>;
      }
    `, 'utf8');

    writeFileSync(unusedHookPath, `
      import { useState } from 'react';
      export function useUnusedHook() {
        const [val, setVal] = useState(0);
        return val;
      }
    `, 'utf8');

    // Make duplicate components highly similar (tags, hooks, props, classes)
    const componentCode = `
      import { useState, useEffect } from 'react';
      export function MyDuplicateComponent({ title, description }: { title: string, description?: string }) {
        const [count, setCount] = useState(0);
        useEffect(() => {}, []);
        return (
          <div className="flex flex-col p-4 bg-gray-100 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            {description && <p className="text-sm text-gray-600">{description}</p>}
            <button onClick={() => setCount(c => c + 1)} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Clicks: {count}
            </button>
          </div>
        );
      }
    `;
    writeFileSync(comp1Path, componentCode, 'utf8');
    writeFileSync(comp2Path, componentCode.replace('MyDuplicateComponent', 'OtherComponentCopy'), 'utf8');

    // Make duplicate files completely identical except for simple names/comments to ensure >90% similarity
    const fileCode = `
      // Helper function definitions
      export function utilityOne(a: number, b: number): number {
        const factor = 10;
        return (a + b) * factor;
      }
      export function utilityTwo(text: string): string {
        return text.trim().toLowerCase();
      }
      export function utilityThree(items: any[]): any[] {
        return items.filter(Boolean);
      }
    `;
    writeFileSync(file1Path, fileCode, 'utf8');
    // 100% identical copy to guarantee 100% similarity score
    writeFileSync(file2Path, fileCode, 'utf8');

    // 2. Incrementally populate KnowledgeGraph
    const graph = new KnowledgeGraph();
    const mockFiles = [
      'scratch/test-validator/page.tsx',
      'scratch/test-validator/UsedComponent.tsx',
      'scratch/test-validator/UnusedComponent.tsx',
      'scratch/test-validator/useUnusedHook.ts',
      'scratch/test-validator/DuplicateComp1.tsx',
      'scratch/test-validator/DuplicateComp2.tsx',
      'scratch/test-validator/DuplicateFile1.ts',
      'scratch/test-validator/DuplicateFile2.ts',
    ];

    for (const f of mockFiles) {
      graph.updateFileIncremental(f);
    }

    // 3. Execute DeadAssetDuplicateValidator
    const validator = new DeadAssetDuplicateValidator();
    const result = await validator.run(mockFiles, { knowledgeGraph: graph });

    // 4. Assert correctness
    expect(result.success).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);

    // Verify Dead Components & Hooks
    const warnings = result.warnings;
    const deadComponentWarning = warnings.find(w => w.file === 'scratch/test-validator/UnusedComponent.tsx' && w.rule === 'VAL-UI-012');
    expect(deadComponentWarning).toBeDefined();

    const deadHookWarning = warnings.find(w => w.file === 'scratch/test-validator/useUnusedHook.ts' && w.rule === 'VAL-UI-013');
    expect(deadHookWarning).toBeDefined();

    // Verify Safe Delete Classifications
    const safeDeleteUnused = warnings.find(w => w.file === 'scratch/test-validator/UnusedComponent.tsx' && w.rule === 'VAL-UI-017');
    expect(safeDeleteUnused).toBeDefined();
    expect(safeDeleteUnused?.message).toContain('HIGH_CONFIDENCE_UNUSED');

    // Verify Duplicate Component Detection
    const duplicateCompWarning = warnings.find(w => w.file === 'scratch/test-validator/DuplicateComp1.tsx' && w.rule === 'VAL-UI-011');
    expect(duplicateCompWarning).toBeDefined();
    expect(duplicateCompWarning?.message).toContain('DuplicateComp2.tsx');

    // Verify Duplicate File Detection
    const duplicateFileWarning = warnings.find(w => w.file === 'scratch/test-validator/DuplicateFile1.ts' && w.rule === 'VAL-UI-019');
    expect(duplicateFileWarning).toBeDefined();
    expect(duplicateFileWarning?.message).toContain('DuplicateFile2.ts');

    // Verify execution statistics
    expect(result.statistics.filesAnalyzed).toBeGreaterThan(0);
    expect(result.statistics.componentsAnalyzed).toBeGreaterThan(0);
    expect(result.statistics.duplicateBuckets).toBeGreaterThan(0);
    expect(result.statistics.deadAssets).toBeGreaterThan(0);
    expect(result.statistics.durationMs).toBeDefined();

    // Verify deterministic sorting: rule first, then file, then line
    for (let k = 0; k < warnings.length - 1; k++) {
      const current = warnings[k];
      const next = warnings[k + 1];
      if (current.rule !== next.rule) {
        expect(current.rule.localeCompare(next.rule)).toBeLessThanOrEqual(0);
      } else if (current.file !== next.file) {
        expect(current.file.localeCompare(next.file)).toBeLessThanOrEqual(0);
      } else {
        expect((current.line || 1) <= (next.line || 1)).toBe(true);
      }
    }
  });
});
