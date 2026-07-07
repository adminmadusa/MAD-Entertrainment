import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Notification } from '../models/notification.schema';
import { auditLog } from '../utils/audit';
import { createNotificationSafe } from './notification.service';

vi.mock('../models/notification.schema', () => ({
  Notification: {
    create: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('../utils/audit', () => ({
  auditLog: vi.fn(),
}));

describe('Notification Service Safe Wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully create a notification and return it under normal conditions', async () => {
    const mockData = {
      jobId: 'job-123',
      type: 'otp',
      channel: 'email',
      recipient: 'test@example.com',
    };
    const mockCreatedDoc = { ...mockData, _id: 'notif-123' };

    vi.mocked(Notification.create).mockResolvedValue([mockCreatedDoc] as any);

    const result = await createNotificationSafe(mockData);

    expect(result).toEqual(mockCreatedDoc);
    expect(Notification.create).toHaveBeenCalledWith([mockData], undefined);
    expect(Notification.findOne).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('should catch duplicate key errors (11000) and return the existing document', async () => {
    const mockData = {
      jobId: 'job-dup',
      type: 'otp',
      channel: 'email',
      recipient: 'test@example.com',
      bookingId: 'booking-789',
    };
    const mockExistingDoc = {
      _id: 'notif-existing',
      jobId: 'job-dup',
      type: 'otp',
      channel: 'email',
      recipient: 'test@example.com',
      bookingId: 'booking-789',
    };

    // Mongoose throws MongoError with code 11000 for duplicate key
    const duplicateError = new Error('Duplicate key error');
    (duplicateError as any).code = 11000;

    vi.mocked(Notification.create).mockRejectedValue(duplicateError);
    vi.mocked(Notification.findOne).mockReturnValue({
      session: vi.fn().mockResolvedValue(mockExistingDoc),
    } as any);

    const result = await createNotificationSafe(mockData);

    expect(result).toEqual(mockExistingDoc);
    expect(Notification.create).toHaveBeenCalledWith([mockData], undefined);
    expect(Notification.findOne).toHaveBeenCalledWith({ jobId: 'job-dup' });
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'NOTIFICATION_DUPLICATE_PREVENTED',
        status: 'success',
        metadata: expect.objectContaining({
          notificationId: 'notif-existing',
          bookingId: 'booking-789',
          jobId: 'job-dup',
        }),
      })
    );
  });

  it('should support array creation and options matching the mongoose signature', async () => {
    const mockData = [
      {
        jobId: 'job-arr',
        type: 'otp',
        channel: 'email',
      },
    ];
    const mockCreatedDocs = [{ ...mockData[0], _id: 'notif-arr' }];
    const mockOptions = { session: 'dummy-session' };

    vi.mocked(Notification.create).mockResolvedValue(mockCreatedDocs as any);

    const result = await createNotificationSafe(mockData, mockOptions);

    expect(result).toEqual(mockCreatedDocs);
    expect(Notification.create).toHaveBeenCalledWith(mockData, mockOptions);
  });

  it('should catch duplicate key error in array format and return the array containing the existing document', async () => {
    const mockData = [
      {
        jobId: 'job-dup-arr',
        type: 'otp',
        channel: 'email',
      },
    ];
    const mockExistingDoc = {
      _id: 'notif-existing-arr',
      jobId: 'job-dup-arr',
      type: 'otp',
      channel: 'email',
    };

    const duplicateError = new Error('Duplicate key error');
    (duplicateError as any).code = 11000;

    vi.mocked(Notification.create).mockRejectedValue(duplicateError);
    vi.mocked(Notification.findOne).mockReturnValue({
      session: vi.fn().mockResolvedValue(mockExistingDoc),
    } as any);

    const result = await createNotificationSafe(mockData);

    expect(result).toEqual([mockExistingDoc]);
    expect(Notification.findOne).toHaveBeenCalledWith({ jobId: 'job-dup-arr' });
  });

  it('should rethrow any other errors that are not code 11000 duplicate key errors', async () => {
    const mockData = { jobId: 'job-error' };
    const databaseError = new Error('Database connection failed');

    vi.mocked(Notification.create).mockRejectedValue(databaseError);

    await expect(createNotificationSafe(mockData)).rejects.toThrow('Database connection failed');
    expect(Notification.findOne).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  // REGRESSION TESTS APPROVED IN PHASE 5
  describe('Regression Tests - Options and Array Wrapping', () => {
    it('should wrap single document and forward session option correctly', async () => {
      const mockData = { jobId: 'job-single-session', type: 'otp', channel: 'email' };
      const mockCreatedDoc = { ...mockData, _id: 'notif-single-session' };
      const mockOptions = { session: 'dummy-session-123' };

      vi.mocked(Notification.create).mockResolvedValue([mockCreatedDoc] as any);

      const result = await createNotificationSafe(mockData, mockOptions);

      // Verify Notification.create receives array-wrapped documents [mockData]
      expect(Notification.create).toHaveBeenCalledWith([mockData], mockOptions);
      // Verify return value compatibility: returns single doc and not an array
      expect(result).toEqual(mockCreatedDoc);
      expect(Array.isArray(result)).toBe(false);
    });

    it('should not alter double document arrays and forward session option correctly', async () => {
      const mockData = [
        { jobId: 'job-arr-1', type: 'otp', channel: 'email' },
        { jobId: 'job-arr-2', type: 'otp', channel: 'email' },
      ];
      const mockCreatedDocs = [
        { ...mockData[0], _id: 'notif-arr-1' },
        { ...mockData[1], _id: 'notif-arr-2' },
      ];
      const mockOptions = { session: 'dummy-session-456' };

      vi.mocked(Notification.create).mockResolvedValue(mockCreatedDocs as any);

      const result = await createNotificationSafe(mockData, mockOptions);

      // Verify Notification.create receives original array unchanged
      expect(Notification.create).toHaveBeenCalledWith(mockData, mockOptions);
      // Verify returns the created documents array
      expect(result).toEqual(mockCreatedDocs);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should verify return value compatibility of createNotificationSafe(singleDoc)', async () => {
      const mockData = { jobId: 'job-single-compatibility', type: 'otp', channel: 'email' };
      const mockCreatedDoc = { ...mockData, _id: 'notif-compatibility' };

      vi.mocked(Notification.create).mockResolvedValue([mockCreatedDoc] as any);

      const result = await createNotificationSafe(mockData);

      // Verify that return value is singleDoc (created[0]) and not an array
      expect(result).toEqual(mockCreatedDoc);
      expect(Array.isArray(result)).toBe(false);
    });
  });
});
