import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNotificationSafe } from './notification.service';
import { Notification } from '../models/notification.schema';
import { auditLog } from '../utils/audit';

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

    vi.mocked(Notification.create).mockResolvedValue(mockCreatedDoc as any);

    const result = await createNotificationSafe(mockData);

    expect(result).toEqual(mockCreatedDoc);
    expect(Notification.create).toHaveBeenCalledWith(mockData, undefined);
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
    expect(Notification.create).toHaveBeenCalledWith(mockData, undefined);
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
});
