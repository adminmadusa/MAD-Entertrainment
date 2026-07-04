import { Schema, model, Document } from 'mongoose';
import { encryptPayload, isEncrypted } from '../utils/encryption';

export interface IDeadLetterJob extends Document {
  queueName: string;
  jobId: string;
  jobName: string;
  data: any;
  failedReason?: string;
  stacktrace?: string[];
  attemptsMade: number;
  processedAt: Date;
}

const deadLetterJobSchema = new Schema<IDeadLetterJob>({
  queueName: { type: String, required: true, index: true },
  jobId: { type: String, required: true, index: true },
  jobName: { type: String, required: true },
  data: { type: Schema.Types.Mixed, required: true },
  failedReason: String,
  stacktrace: [String],
  attemptsMade: { type: Number, required: true },
  // Data Retention Policy: Auto-expire and clean up legacy dead-letter queue logs after 14 days
  processedAt: { type: Date, default: Date.now, index: { expires: '14d' } },
});

deadLetterJobSchema.pre('save', function (next) {
  if (this.isModified('data') && this.data !== undefined && this.data !== null) {
    if (!isEncrypted(this.data)) {
      const stringifiedData = typeof this.data === 'string' ? this.data : JSON.stringify(this.data);
      this.data = encryptPayload(stringifiedData);
    }
  }

  if (this.isModified('stacktrace') && this.stacktrace !== undefined && this.stacktrace !== null) {
    const alreadyEncrypted =
      Array.isArray(this.stacktrace) &&
      this.stacktrace.length === 1 &&
      isEncrypted(this.stacktrace[0]);

    if (!alreadyEncrypted) {
      const stringifiedStacktrace = JSON.stringify(this.stacktrace);
      const encryptedStacktrace = encryptPayload(stringifiedStacktrace);
      this.stacktrace = [encryptedStacktrace];
    }
  }

  next();
});

deadLetterJobSchema.index({ queueName: 1, processedAt: -1 });

export const DeadLetterJob = model<IDeadLetterJob>('DeadLetterJob', deadLetterJobSchema);
