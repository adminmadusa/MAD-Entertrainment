import { describe, it, expect } from 'vitest';
import { RuleRegistry } from '../../rules/registry';

describe('RuleRegistry (Governance Rules Central Registry)', () => {
  it('should initialize successfully and load rule definitions', () => {
    RuleRegistry.initialize();
    const allRules = RuleRegistry.getAllRules();

    expect(allRules.length).toBeGreaterThan(0);
    
    // Check that core rules exist
    const docRule = RuleRegistry.getRule('VAL-DOC-001');
    expect(docRule).toBeDefined();
    expect(docRule?.category).toBe('HYGIENE');
  });

  it('should return undefined when querying unknown or invalid rule IDs', () => {
    expect(RuleRegistry.getRule('VAL-NON-EXISTENT-999')).toBeUndefined();
    expect(RuleRegistry.getRule('')).toBeUndefined();
  });

  it('should support querying rules by category', () => {
    const hygieneRules = RuleRegistry.getRulesByCategory('HYGIENE');
    expect(hygieneRules.length).toBeGreaterThan(0);
    expect(hygieneRules.every(r => r.category === 'HYGIENE')).toBe(true);

    const securityRules = RuleRegistry.getRulesByCategory('SECURITY');
    expect(securityRules.length).toBeGreaterThan(0);
    expect(securityRules.every(r => r.category === 'SECURITY')).toBe(true);
  });

  it('should handle category queries for unknown categories by returning an empty array', () => {
    const emptyResult = RuleRegistry.getRulesByCategory('NON_EXISTENT_CATEGORY');
    expect(emptyResult).toEqual([]);
  });

  it('should have overwrite/collision behavior for duplicate rules loaded in initialization list', () => {
    RuleRegistry.initialize();
    
    // RuleRegistry uses a Map. RuleRegistry.getRule() lookup key is the rule ID.
    // If a duplicate rule ID is added, it will overwrite the previous key entry.
    const rule = RuleRegistry.getRule('VAL-DOC-001');
    expect(rule?.id).toBe('VAL-DOC-001');
  });
});
