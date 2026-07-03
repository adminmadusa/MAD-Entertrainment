// scripts/governance/core/fingerprint.ts
import { createHash } from 'crypto';

export interface FingerprintStrategy {
  normalize(input: string): string;
  fingerprint(ruleId: string, path: string, construct: string, snippet: string): string;
}

export class SmartFingerprintStrategy implements FingerprintStrategy {
  public normalize(input: string): string {
    if (!input) return '';
    return input
      .replace(/\/\/.*$/gm, '') // Strip inline comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Strip block comments
      .replace(/\r?\n|\r/g, ' ') // Normalize line endings to space
      .replace(/\s+/g, ' ') // Collapse multiple spaces to a single space
      .replace(/\s*(>|<|\/>)\s*/g, '$1') // Strip spaces around tag brackets and slashes
      .trim(); // Trim leading/trailing whitespace
  }

  public fingerprint(ruleId: string, path: string, construct: string, snippet: string): string {
    const normalizedSnippet = this.normalize(snippet);
    const data = `${ruleId}:${path}:${construct}:${normalizedSnippet}`;
    return createHash('sha256').update(data).digest('hex');
  }
}

export class StrictFingerprintStrategy implements FingerprintStrategy {
  public normalize(input: string): string {
    return input || '';
  }

  public fingerprint(ruleId: string, path: string, construct: string, snippet: string): string {
    const data = `${ruleId}:${path}:${construct}:${snippet}`;
    return createHash('sha256').update(data).digest('hex');
  }
}

export class LegacyFingerprintStrategy implements FingerprintStrategy {
  public normalize(input: string): string {
    return '';
  }

  public fingerprint(ruleId: string, path: string, construct: string, snippet: string): string {
    // Legacy strategy does not use snippets, only rule and path
    const data = `${ruleId}:${path}:${construct}`;
    return createHash('sha256').update(data).digest('hex');
  }
}

export type MatchingStrategyType = 'STRICT' | 'SMART' | 'LEGACY';

export class FingerprintEngine {
  private static strategies: Record<MatchingStrategyType, FingerprintStrategy> = {
    STRICT: new StrictFingerprintStrategy(),
    SMART: new SmartFingerprintStrategy(),
    LEGACY: new LegacyFingerprintStrategy(),
  };

  public static getStrategy(type: MatchingStrategyType = 'SMART'): FingerprintStrategy {
    return this.strategies[type] || this.strategies.SMART;
  }
}
