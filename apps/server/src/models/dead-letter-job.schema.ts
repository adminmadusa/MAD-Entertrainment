import { Schema, model, Document } from 'mongoose';

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
  processedAt: { type: Date, default: Date.now, index: true },
});

deadLetterJobSchema.index({ queueName: 1, processedAt: -1 });

export const DeadLetterJob = model<IDeadLetterJob>('DeadLetterJob', deadLetterJobSchema);
