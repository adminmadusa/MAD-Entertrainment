import { describe, it, expect } from 'vitest';
import { normalizeTicketReference } from './scanner';

describe('normalizeTicketReference', () => {
  it('handles empty or non-string inputs', () => {
    expect(normalizeTicketReference('')).toBe('');
    expect(normalizeTicketReference('   ')).toBe('');
    expect(normalizeTicketReference(null as any)).toBe('');
    expect(normalizeTicketReference(undefined as any)).toBe('');
  });

  it('normalizes raw ticket IDs and trims whitespace', () => {
    expect(normalizeTicketReference('TKT-001')).toBe('TKT-001');
    expect(normalizeTicketReference('  TKT-MAD-2026-X7Y8Z-001 \n ')).toBe('TKT-MAD-2026-X7Y8Z-001');
    expect(normalizeTicketReference('MAD-2026-ABCDE')).toBe('MAD-2026-ABCDE');
  });

  it('normalizes absolute ticket URLs', () => {
    expect(normalizeTicketReference('https://www.madentertainments.net/tickets/TKT-001')).toBe('TKT-001');
    expect(normalizeTicketReference('http://localhost:3000/tickets/TKT-MAD-2026-X7Y8Z-001')).toBe('TKT-MAD-2026-X7Y8Z-001');
    expect(normalizeTicketReference('https://api.madentertainments.net/api/public/tickets/TKT-001/qr')).toBe('TKT-001');
  });

  it('normalizes relative ticket URLs', () => {
    expect(normalizeTicketReference('/tickets/TKT-001')).toBe('TKT-001');
    expect(normalizeTicketReference('/api/public/tickets/TKT-001/qr')).toBe('TKT-001');
  });

  it('handles query parameters and hash fragments', () => {
    expect(normalizeTicketReference('https://madentertainments.net/tickets/TKT-001?source=email&ref=share')).toBe('TKT-001');
    expect(normalizeTicketReference('/tickets/TKT-001#preview')).toBe('TKT-001');
  });
});
