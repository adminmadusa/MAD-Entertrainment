import { describe, expect, it } from 'vitest';

import { validateReturnTo } from './safe-redirect';

describe('validateReturnTo', () => {
  it('should allow valid relative internal paths', () => {
    expect(validateReturnTo('/dashboard')).toBe('/dashboard');
    expect(validateReturnTo('/checkout/123')).toBe('/checkout/123');
    expect(validateReturnTo('/tickets')).toBe('/tickets');
    expect(validateReturnTo('/events/my-awesome-event?ref=123')).toBe('/events/my-awesome-event?ref=123');
  });

  it('should reject external absolute URLs', () => {
    expect(validateReturnTo('https://evil.com')).toBeNull();
    expect(validateReturnTo('http://evil.com/dashboard')).toBeNull();
    expect(validateReturnTo('ftp://evil.com')).toBeNull();
  });

  it('should reject protocol-relative URLs', () => {
    expect(validateReturnTo('//evil.com')).toBeNull();
    expect(validateReturnTo('//google.com/checkout')).toBeNull();
  });

  it('should reject backslash-relative URLs', () => {
    expect(validateReturnTo('\\\\evil.com')).toBeNull();
  });

  it('should reject script-based URI protocols', () => {
    expect(validateReturnTo('javascript:alert(1)')).toBeNull();
    expect(validateReturnTo('javascript:console.log(document.cookie)')).toBeNull();
    expect(validateReturnTo('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(validateReturnTo('vbscript:msgbox("hello")')).toBeNull();
  });

  it('should reject obfuscated script protocols', () => {
    expect(validateReturnTo('java\nscript:alert(1)')).toBeNull();
    expect(validateReturnTo('java\rscript:alert(1)')).toBeNull();
    expect(validateReturnTo('java\0script:alert(1)')).toBeNull();
    expect(validateReturnTo('javascript%3Aalert(1)')).toBeNull();
  });

  it('should handle null, undefined, and empty string gracefully', () => {
    expect(validateReturnTo(null)).toBeNull();
    expect(validateReturnTo(undefined)).toBeNull();
    expect(validateReturnTo('')).toBeNull();
  });
});
