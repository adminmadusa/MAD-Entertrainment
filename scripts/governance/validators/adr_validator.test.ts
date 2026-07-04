// scripts/governance/validators/adr_validator.test.ts
import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import { AdrValidator } from './adr_validator';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
}));

describe('AdrValidator', () => {
  const validator = new AdrValidator();

  it('should pass on correct ADR structures and index', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockImplementation((path) => {
      const fullPath = typeof path === 'string' ? path : '';
      if (fullPath.endsWith('docs/decisions')) {
        return ['ADR-001-booking.md'] as any;
      }
      return [] as any;
    });

    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      const fullPath = typeof path === 'string' ? path : '';
      if (fullPath.endsWith('ADR-001-booking.md')) {
        return `
# ADR-001: Booking

## Metadata
- **Status**: Implemented
- **Date**: 2026-06-25
- **Authors**: Author
- **Reviewers**: Reviewer
- **Decision Category**: Category
- **Related Documents**: None
- **Related GitHub Issues**: None
- **Related Pull Requests**: None

## Context
## Problem Statement
## Decision
## Alternatives Considered
## Consequences
## Technical & Operational Impact
### Migration Strategy
### Operational Impact
### Security Impact
### Performance Impact
### Testing Strategy
### Rollback Strategy
## Future Considerations
## References
`;
      }
      if (fullPath.endsWith('ADR_INDEX.md')) {
        return `
# ADR Index
| ADR | Title | Status | Category | Last Updated | Link |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ADR-001** | Booking | Implemented | Category | 2026-06-25 | [ADR-001](ADR-001-booking.md) |
`;
      }
      return '';
    });

    const result = await validator.run([]);
    expect(result.errors.length).toBe(0);
  });

  it('should detect invalid ADR naming conventions', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue(['ADR-invalid-name.md'] as any);

    const result = await validator.run([]);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.rule === 'Invalid ADR Naming')).toBe(true);
  });

  it('should detect missing template headings', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockImplementation((path) => {
      const fullPath = typeof path === 'string' ? path : '';
      if (fullPath.endsWith('docs/decisions')) {
        return ['ADR-001-booking.md'] as any;
      }
      return [] as any;
    });

    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      const fullPath = typeof path === 'string' ? path : '';
      if (fullPath.endsWith('ADR-001-booking.md')) {
        return `
# ADR-001: Booking
## Metadata
- **Status**: Implemented
- **Date**: 2026-06-25
- **Authors**: Author
- **Reviewers**: Reviewer
- **Decision Category**: Category
`;
      }
      if (fullPath.endsWith('ADR_INDEX.md')) {
        return '';
      }
      return '';
    });

    const result = await validator.run([]);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.rule === 'Missing Template Heading')).toBe(true);
  });
});
