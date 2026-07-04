import { describe, it, expect } from 'vitest';
import { FingerprintEngine, SmartFingerprintStrategy, StrictFingerprintStrategy, LegacyFingerprintStrategy } from './fingerprint';

describe('Fingerprint strategies', () => {
  const smart = new SmartFingerprintStrategy();
  const strict = new StrictFingerprintStrategy();
  const legacy = new LegacyFingerprintStrategy();

  const sampleSnippet = `
    // this is a comment
    <button className="btn">
      /* another comment */
      Click Me
    </button>
  `;

  it('SmartFingerprintStrategy normalize should collapse space and strip comments', () => {
    const normalized = smart.normalize(sampleSnippet);
    expect(normalized).toBe('<button className="btn">Click Me</button>');
  });

  it('StrictFingerprintStrategy normalize should return input as-is', () => {
    const normalized = strict.normalize(sampleSnippet);
    expect(normalized).toBe(sampleSnippet);
  });

  it('LegacyFingerprintStrategy normalize should return empty string', () => {
    const normalized = legacy.normalize(sampleSnippet);
    expect(normalized).toBe('');
  });

  it('SmartFingerprintStrategy should generate stable hashes independent of comments/spacing', () => {
    const snippet1 = '  <button>  Click  </button> // comment ';
    const snippet2 = '<button>Click</button>';
    const normalized1 = smart.normalize(snippet1);
    const normalized2 = smart.normalize(snippet2);
    expect(normalized1).toBe('<button>Click</button>');
    expect(normalized2).toBe('<button>Click</button>');
  });

  it('SmartFingerprintStrategy should generate identical fingerprints for formatting-only, blank line, and comment modifications', () => {
    const rawCode = `
      // First line comment
      <button className="btn" onClick={onClick}>
        Click Me
      </button>
    `;

    const formattedCode = `
      <button
        className="btn"
        onClick={onClick}
      >
        /* Block comment inside */
        Click Me
      </button>

    `;

    const fp1 = smart.fingerprint('VAL-UI-010', 'src/Component.tsx', 'Button', rawCode);
    const fp2 = smart.fingerprint('VAL-UI-010', 'src/Component.tsx', 'Button', formattedCode);
    expect(fp1).toBe(fp2);
  });

  it('FingerprintEngine should resolve strategies', () => {
    expect(FingerprintEngine.getStrategy('SMART')).toBeInstanceOf(SmartFingerprintStrategy);
    expect(FingerprintEngine.getStrategy('STRICT')).toBeInstanceOf(StrictFingerprintStrategy);
    expect(FingerprintEngine.getStrategy('LEGACY')).toBeInstanceOf(LegacyFingerprintStrategy);
  });
});
