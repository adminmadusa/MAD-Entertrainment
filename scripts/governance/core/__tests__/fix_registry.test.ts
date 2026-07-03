import { describe, it, expect, beforeEach } from 'vitest';
import { FixRegistry } from '../fix_registry';
import { Fixer } from '../fix_types';
import { StatelessViolation } from '../types';
import { FixContext } from '../fix_context';

class MockFixer implements Fixer {
  constructor(
    public readonly ruleId: string,
    public readonly safety: 'SAFE' | 'MANUAL' | 'UNSUPPORTED'
  ) {}
  async fix(violation: StatelessViolation, context: FixContext) {
    return {
      ruleId: this.ruleId,
      filePath: violation.path,
      success: true,
      message: 'Fixed successfully',
      safety: this.safety,
      applied: true,
    };
  }
}

describe('FixRegistry', () => {
  beforeEach(() => {
    FixRegistry.clear();
  });

  it('should register and retrieve a fixer successfully', () => {
    const fixer = new MockFixer('VAL-TEST-001', 'SAFE');
    FixRegistry.register(fixer);

    expect(FixRegistry.supports('VAL-TEST-001')).toBe(true);
    expect(FixRegistry.supports('VAL-TEST-002')).toBe(false);
    expect(FixRegistry.get('VAL-TEST-001')).toBe(fixer);
  });

  it('should prevent duplicate fixer registrations for the same rule', () => {
    const fixer1 = new MockFixer('VAL-TEST-001', 'SAFE');
    const fixer2 = new MockFixer('VAL-TEST-001', 'MANUAL');

    FixRegistry.register(fixer1);
    expect(() => FixRegistry.register(fixer2)).toThrow(
      'Duplicate fixer registration for rule: VAL-TEST-001'
    );
  });

  it('should support discovery APIs correctly', () => {
    const fixer1 = new MockFixer('VAL-TEST-001', 'SAFE');
    const fixer2 = new MockFixer('VAL-TEST-002', 'MANUAL');

    FixRegistry.register(fixer2);
    FixRegistry.register(fixer1);

    expect(FixRegistry.registeredRuleIds()).toEqual(['VAL-TEST-001', 'VAL-TEST-002']);
    
    const fixers = FixRegistry.registeredFixers();
    expect(fixers.length).toBe(2);
    expect(fixers).toContain(fixer1);
    expect(fixers).toContain(fixer2);
  });
});
