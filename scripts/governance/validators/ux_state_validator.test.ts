// scripts/governance/validators/ux_state_validator.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { UXStateValidator } from './ux_state_validator';
import { writeFileSync, rmSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { FileContentCache, ASTParserCache } from '../core/ast_parser_cache';
import { RuleRegistry } from '../rules/registry';

describe('UXStateValidator', () => {
  const sandboxDir = join(__dirname, 'sandbox-ux-test');

  const runWithTempFile = async (filePath: string, content: string) => {
    const fullPath = join(sandboxDir, filePath);
    const parentDir = join(fullPath, '..');
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true });
    }
    writeFileSync(fullPath, content, 'utf8');

    const validator = new UXStateValidator();
    try {
      const result = await validator.run([join('scripts/governance/validators/sandbox-ux-test', filePath)], {});
      return result;
    } finally {
      if (existsSync(fullPath)) {
        rmSync(fullPath);
      }
    }
  };

  beforeAll(() => {
    RuleRegistry.initialize();
    if (!existsSync(sandboxDir)) {
      mkdirSync(sandboxDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (existsSync(sandboxDir)) {
      rmSync(sandboxDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    FileContentCache.clear();
    ASTParserCache.clear();
  });

  it('should flag VAL-UX-001 (loading) and VAL-UX-003 (error) when useQuery destructuring misses loading/error variables', async () => {
    const content = `
      import { useQuery } from '@tanstack/react-query';
      export function Tickets() {
        const { data } = useQuery({ queryKey: ['tickets'], queryFn: fetchTickets });
        return <div>{data?.map(t => <div key={t.id}>{t.name}</div>)}</div>;
      }
    `;
    const result = await runWithTempFile('Tickets1.tsx', content);
    expect(result.warnings.some(w => w.rule === 'VAL-UX-001')).toBe(true);
    expect(result.warnings.some(w => w.rule === 'VAL-UX-003')).toBe(true);
  });

  it('should NOT flag VAL-UX-001 and VAL-UX-003 when useQuery destructuring includes isLoading and isError', async () => {
    const content = `
      import { useQuery } from '@tanstack/react-query';
      export function Tickets() {
        const { data, isLoading, isError } = useQuery({ queryKey: ['tickets'], queryFn: fetchTickets });
        if (isLoading) return <div>Loading...</div>;
        if (isError) return <div>Error</div>;
        return <div>{data?.map(t => <div key={t.id}>{t.name}</div>)}</div>;
      }
    `;
    const result = await runWithTempFile('Tickets2.tsx', content);
    expect(result.warnings.some(w => w.rule === 'VAL-UX-001')).toBe(false);
    expect(result.warnings.some(w => w.rule === 'VAL-UX-003')).toBe(false);
  });

  it('should NOT flag VAL-UX-001 and VAL-UX-003 for useSuspenseQuery (handled by suspense boundary)', async () => {
    const content = `
      import { useSuspenseQuery } from '@tanstack/react-query';
      export function Tickets() {
        const { data } = useSuspenseQuery({ queryKey: ['tickets'], queryFn: fetchTickets });
        return <div>{data?.map(t => <div key={t.id}>{t.name}</div>)}</div>;
      }
    `;
    const result = await runWithTempFile('Tickets3.tsx', content);
    expect(result.warnings.some(w => w.rule === 'VAL-UX-001')).toBe(false);
    expect(result.warnings.some(w => w.rule === 'VAL-UX-003')).toBe(false);
  });

  it('should flag VAL-UX-002 when .map is used without empty state references', async () => {
    const content = `
      export function List({ items }) {
        return (
          <ul>
            {items.map(item => <li key={item.id}>{item.name}</li>)}
          </ul>
        );
      }
    `;
    const result = await runWithTempFile('List1.tsx', content);
    expect(result.warnings.some(w => w.rule === 'VAL-UX-002')).toBe(true);
  });

  it('should NOT flag VAL-UX-002 when length check is in scope', async () => {
    const content = `
      export function List({ items }) {
        if (items.length === 0) return <div>No items</div>;
        return (
          <ul>
            {items.map(item => <li key={item.id}>{item.name}</li>)}
          </ul>
        );
      }
    `;
    const result = await runWithTempFile('List2.tsx', content);
    expect(result.warnings.some(w => w.rule === 'VAL-UX-002')).toBe(false);
  });
});
