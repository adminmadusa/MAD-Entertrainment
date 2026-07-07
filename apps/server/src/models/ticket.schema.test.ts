import { describe, it, expect } from 'vitest';

import { Ticket } from './ticket.schema';

describe('Ticket Schema Validation Tests', () => {
  it('should default assignmentStatus to unassigned', () => {
    const ticket = new Ticket({});
    expect(ticket.assignmentStatus).toBe('unassigned');
  });

  it('should accept valid assignmentStatus values', () => {
    const validStatuses = ['unassigned', 'pending', 'claimed'];
    for (const status of validStatuses) {
      const ticket = new Ticket({ assignmentStatus: status });
      const validateError = ticket.validateSync();

      // If validation error exists, ensure assignmentStatus is not the cause
      if (validateError) {
        expect(validateError.errors.assignmentStatus).toBeUndefined();
      }
    }
  });

  it('should reject invalid assignmentStatus values', () => {
    const ticket = new Ticket({ assignmentStatus: 'invalid_status' });
    const validateError = ticket.validateSync();

    expect(validateError).toBeDefined();
    expect(validateError!.errors.assignmentStatus).toBeDefined();
    expect(validateError!.errors.assignmentStatus.message).toContain('is not a valid enum value');
  });
});
