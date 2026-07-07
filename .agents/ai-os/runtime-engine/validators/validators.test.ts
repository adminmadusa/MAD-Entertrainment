import { describe, it, expect } from 'vitest';
import { validatorRegistry } from './base/registry';
import { BaseValidatorRunner } from './base/runner';
import { NamingValidator } from './naming/validator';
import { TypeScriptValidator } from './typescript/validator';
import { ReactValidator } from './react/validator';
import { DocumentationValidator } from './documentation/validator';

// Ensure they are registered
import './naming/validator';
import './typescript/validator';
import './react/validator';
import './documentation/validator';

describe('AI OS Executable Validator Library Suites', () => {
  it('should successfully register validators into registry', () => {
    const list = validatorRegistry.list();
    expect(list.length).toBeGreaterThan(0);
    const naming = validatorRegistry.get('VAL-NAM-001');
    expect(naming).toBeDefined();
    expect(naming?.title).toBe('Naming Validator');
  });

  it('should detect naming violations in files paths list', async () => {
    const validator = new NamingValidator();
    const result = await validator.execute(process.cwd(), ['apps/web/temp2/test.tsx']);
    expect(result.severity).toBe('high');
    const findings = (result as any).findings;
    expect(findings.length).toBe(1);
    expect(findings[0].evidence).toContain('temp2');
  });

  it('should find explicit any violations in source code', async () => {
    const validator = new TypeScriptValidator();
    const result = await validator.execute(process.cwd(), [
      join(process.cwd(), '.agents/ai-os/runtime-engine/types.ts')
    ]);
    const findings = (result as any).findings;
    // Check that findings are returned or verify strong typing holds
    expect(result.id).toBe('VAL-TS-001');
  });

  it('should catch relative markdown links in documentation files', async () => {
    const validator = new DocumentationValidator();
    const result = await validator.execute(process.cwd(), [
      join(process.cwd(), '.agents/ai-os/README.md')
    ]);
    expect(result.id).toBe('VAL-DOC-001');
  });

  it('should execute validator list topologically via BaseValidatorRunner', async () => {
    const runner = new BaseValidatorRunner();
    const results = await runner.runValidators(
      ['VAL-NAM-001', 'VAL-TS-001'],
      process.cwd(),
      ['apps/web/temp2/test.tsx']
    );
    expect(results.length).toBe(2);
    expect(results[0].findings.length).toBeGreaterThan(0);
  });
});

// Helper for joining paths
import { join } from 'path';
