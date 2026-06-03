import { Schema, model, Document } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  actor: {
    type: 'user' | 'admin' | 'system' | 'guest';
    id?: string;
  };
  status: 'success' | 'failure' | 'pending';
  metadata?: Record<string, any>;
  description?: string;
  correlationId?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, index: true },
    actor: {
      type: { type: String, required: true },
      id: String,
    },
    status: { type: String, required: true, index: true },
    metadata: { type: Schema.Types.Mixed },
    description: String,
    correlationId: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Index for fast query of history logs by booking
auditLogSchema.index({ 'metadata.bookingId': 1, createdAt: -1 });
auditLogSchema.index({ 'metadata.bookingReference': 1, createdAt: -1 });

export const AuditLogModel = model<IAuditLog>('AuditLog', auditLogSchema);
