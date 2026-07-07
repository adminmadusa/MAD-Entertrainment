import { describe, it, expect } from 'vitest';

import { Notification } from './notification.schema';

describe('Notification Schema Index Definitions', () => {
  it('should define a partial unique index on jobId', () => {
    const indexes = Notification.schema.indexes();

    // Find the index configuration on jobId
    const jobIdIndex = indexes.find((idx) => {
      const fields = idx[0];
      return fields && fields.jobId === 1;
    });

    expect(jobIdIndex).toBeDefined();

    const options = jobIdIndex![1];
    expect(options.unique).toBe(true);
    expect(options.background).toBe(true);
    expect(options.partialFilterExpression).toEqual({
      jobId: { $type: 'string' },
    });
  });

  it('should not have duplicate or basic index definitions on jobId field level', () => {
    const jobIdPath: any = Notification.schema.path('jobId');
    // Ensure that it does not have index: true directly on the field path definition
    expect(jobIdPath._index).toBeNull();
  });
});
