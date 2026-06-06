import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import mongoose from 'mongoose';

vi.mock('../config/env', () => ({
  getEnv: () => ({
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/mad_test',
    DLQ_ENCRYPTION_KEY: 'a_secret_key_of_32_characters_long_for_dev_test',
  }),
}));

vi.mock('../services/queue.service', () => ({
  QueueService: {
    enqueue: vi.fn().mockResolvedValue(undefined),
  },
}));

import { DeadLetterJob } from './dead-letter-job.schema';
import { DiagnosticsService } from '../services/diagnostics.service';
import { QueueService } from '../services/queue.service';
import { getEnv } from '../config/env';

describe('DeadLetterJob Model Encryption Integration Tests', () => {
  beforeAll(async () => {
    const uri = getEnv().MONGODB_URI;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should encrypt data and stacktrace fields on pre-save and persist encrypted values in MongoDB', async () => {
    // Clear any previous records
    await DeadLetterJob.deleteMany({});

    const rawData = { email: 'user@example.com', creditCard: '1234-5678-9012' };
    const rawStacktrace = ['Error: Something went wrong', 'at Object.<anonymous> (/file.js:10:5)'];

    const job = await DeadLetterJob.create({
      queueName: 'email-queue',
      jobId: 'job-1234',
      jobName: 'email:send',
      data: rawData,
      stacktrace: rawStacktrace,
      attemptsMade: 1,
    });

    // Verify fields in mongoose document are encrypted
    expect(job.data).toContain('enc:v1:');
    expect(job.stacktrace![0]).toContain('enc:v1:');
    expect(job.stacktrace!.length).toBe(1);

    // Direct MongoDB check using raw driver
    const dbCollection = mongoose.connection.db.collection('deadletterjobs');
    const dbDoc = await dbCollection.findOne({ jobId: 'job-1234' });

    expect(dbDoc).not.toBeNull();
    expect(typeof dbDoc?.data).toBe('string');
    expect(dbDoc?.data.startsWith('enc:v1:')).toBe(true);
    expect(Array.isArray(dbDoc?.stacktrace)).toBe(true);
    expect(dbDoc?.stacktrace.length).toBe(1);
    expect(dbDoc?.stacktrace[0].startsWith('enc:v1:')).toBe(true);
  });

  it('should not double-encrypt fields when saving an already encrypted document', async () => {
    const job = await DeadLetterJob.findOne({ jobId: 'job-1234' });
    expect(job).not.toBeNull();

    const dbCollection = mongoose.connection.db.collection('deadletterjobs');
    const rawDocBefore = await dbCollection.findOne({ jobId: 'job-1234' });
    const encryptedDataBefore = rawDocBefore?.data;
    const encryptedStacktraceBefore = rawDocBefore?.stacktrace[0];

    // Trigger save again without modifications
    await job!.save();

    const rawDocAfter = await dbCollection.findOne({ jobId: 'job-1234' });
    expect(rawDocAfter?.data).toBe(encryptedDataBefore);
    expect(rawDocAfter?.stacktrace[0]).toBe(encryptedStacktraceBefore);
  });

  it('should decrypt job data correctly during retry and re-enqueue the original plaintext payload', async () => {
    const enqueueSpy = vi.spyOn(QueueService, 'enqueue');

    const job = await DeadLetterJob.findOne({ jobId: 'job-1234' });
    expect(job).not.toBeNull();

    const success = await DiagnosticsService.retryDeadLetterJob(job!._id.toString());
    expect(success).toBe(true);

    expect(enqueueSpy).toHaveBeenCalledWith(
      'email-queue',
      'email:send',
      { email: 'user@example.com', creditCard: '1234-5678-9012' },
      'job-1234'
    );

    // Verify the record was cleaned up from the DB
    const finalCheck = await DeadLetterJob.findById(job!._id);
    expect(finalCheck).toBeNull();
  });
});
