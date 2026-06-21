import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('../config/env', () => ({
  getEnv: () => ({
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/mad_test',
    JWT_SECRET: 'test_secret_key_32_chars_minimum_length_for_test',
    JWT_ADMIN_SECRET: 'test_admin_secret_key_32_chars_minimum_length_for_test',
    JWT_SESSION_SECRET: 'test_session_secret_key_32_chars_minimum_length_for_test',
  }),
}));

import mongoose from 'mongoose';
import { getEnv } from '../config/env';
import { Ticket } from '../models/ticket.schema';
import { backfillTicketAssignment } from './backfill-ticket-assignment';
import { TicketTier } from '@mad/shared';

describe('backfillTicketAssignment Migration Tests', () => {
  beforeAll(async () => {
    const uri = getEnv().MONGODB_URI;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should backfill missing assignmentStatus, preserve existing statuses, and run idempotently', async () => {
    // 1. Clear any existing test tickets to start with a clean test state
    await Ticket.deleteMany({ ticketId: { $regex: /^TKT-MIG-TEST-/ } });

    const bookingId = new mongoose.Types.ObjectId();
    const eventId = new mongoose.Types.ObjectId();

    // 2. Create test documents bypassing schema defaults to simulate legacy documents
    await Ticket.collection.insertMany([
      {
        ticketId: 'TKT-MIG-TEST-001',
        bookingId,
        eventId,
        tierName: 'general',
        tier: TicketTier.GENERAL,
        admits: 1,
        qrCode: 'TKT-MIG-TEST-001',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        ticketId: 'TKT-MIG-TEST-002',
        bookingId,
        eventId,
        tierName: 'general',
        tier: TicketTier.GENERAL,
        admits: 1,
        qrCode: 'TKT-MIG-TEST-002',
        status: 'active',
        assignmentStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        ticketId: 'TKT-MIG-TEST-003',
        bookingId,
        eventId,
        tierName: 'general',
        tier: TicketTier.GENERAL,
        admits: 1,
        qrCode: 'TKT-MIG-TEST-003',
        status: 'active',
        assignmentStatus: 'claimed',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ]);

    // 3. First execution of migration
    const result1 = await backfillTicketAssignment();
    expect(result1.matchedCount).toBeGreaterThanOrEqual(1); // At least TKT-MIG-TEST-001 plus any other legacy tickets in the database
    expect(result1.modifiedCount).toBeGreaterThanOrEqual(1);

    // 4. Assert changes in DB
    const t1 = await Ticket.findOne({ ticketId: 'TKT-MIG-TEST-001' }).lean();
    expect(t1).not.toBeNull();
    expect(t1!.assignmentStatus).toBe('unassigned');

    const t2 = await Ticket.findOne({ ticketId: 'TKT-MIG-TEST-002' }).lean();
    expect(t2).not.toBeNull();
    expect(t2!.assignmentStatus).toBe('pending'); // preserved

    const t3 = await Ticket.findOne({ ticketId: 'TKT-MIG-TEST-003' }).lean();
    expect(t3).not.toBeNull();
    expect(t3!.assignmentStatus).toBe('claimed'); // preserved

    // 5. Run migration again (idempotency check)
    const result2 = await backfillTicketAssignment();
    expect(result2.matchedCount).toBe(0); // None should match anymore
    expect(result2.modifiedCount).toBe(0);

    // Clean up test documents
    await Ticket.deleteMany({ ticketId: { $regex: /^TKT-MIG-TEST-/ } });
  });
});
