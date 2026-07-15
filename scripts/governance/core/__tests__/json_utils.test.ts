// scripts/governance/core/__tests__/json_utils.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import {
  sortObjectKeys,
  canonicalizeJson,
  writeJsonIfChanged,
  persistenceStats,
} from '../json_utils';

describe('JSON Utilities', () => {
  const testFile = join(__dirname, 'test-temp-file.json');

  beforeEach(() => {
    persistenceStats.examined = 0;
    persistenceStats.written = 0;
    persistenceStats.skipped = 0;
  });

  afterEach(() => {
    if (existsSync(testFile)) {
      try {
        rmSync(testFile);
      } catch (e) {}
    }
  });

  it('should recursively sort keys of an object', () => {
    const input = { b: 2, c: { y: 2, x: 1 }, a: 1 };
    const expected = { a: 1, b: 2, c: { x: 1, y: 2 } };
    expect(sortObjectKeys(input)).toEqual(expected);
  });

  it('should canonicalize JSON deterministically', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { b: 2, a: 1 };
    expect(canonicalizeJson(obj1)).toBe(canonicalizeJson(obj2));
  });

  it('should write JSON if file does not exist', () => {
    const data = { message: 'hello' };
    const res = writeJsonIfChanged(testFile, data);
    expect(res.written).toBe(true);
    expect(res.skipped).toBe(false);
    expect(existsSync(testFile)).toBe(true);
    expect(JSON.parse(readFileSync(testFile, 'utf8'))).toEqual(data);
  });

  it('should skip write if content is cryptographically identical', () => {
    const data1 = { a: 1, b: 2 };
    const data2 = { b: 2, a: 1 }; // key sorting makes them identical

    // First write
    writeJsonIfChanged(testFile, data1);
    expect(persistenceStats.written).toBe(1);
    expect(persistenceStats.skipped).toBe(0);

    // Second write with different key order
    const res = writeJsonIfChanged(testFile, data2);
    expect(res.written).toBe(false);
    expect(res.skipped).toBe(true);
    expect(persistenceStats.written).toBe(1);
    expect(persistenceStats.skipped).toBe(1);
  });

  it('should overwrite JSON if content changes', () => {
    const data1 = { a: 1, b: 2 };
    const data2 = { a: 1, b: 3 }; // value changes

    // First write
    writeJsonIfChanged(testFile, data1);
    expect(persistenceStats.written).toBe(1);

    // Second write with changed value
    const res = writeJsonIfChanged(testFile, data2);
    expect(res.written).toBe(true);
    expect(res.skipped).toBe(false);
    expect(persistenceStats.written).toBe(2);
    expect(persistenceStats.skipped).toBe(0);
  });
});
