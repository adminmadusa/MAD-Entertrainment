import { WebhookEvent } from '../../../models/webhook-event.schema';
import { auditLog } from '../../../utils/audit';

export interface AcquireWebhookResult {
  action: 'PROCEED' | 'ALREADY_PROCESSED';
  webhookEvent?: any;
}

export async function acquireWebhookRecord(params: {
  eventId: string;
  provider: 'stripe' | 'razorpay';
  eventType: string;
  providerEventId?: string;
  providerEventTimestamp?: Date;
  rawPayload: any;
  payloadSize: number;
}): Promise<AcquireWebhookResult> {
  const { eventId, provider, eventType, providerEventId, providerEventTimestamp, rawPayload, payloadSize } = params;

  const existingEvent = await WebhookEvent.findOne({ eventId });

  if (existingEvent) {
    const isStaleProcessing =
      existingEvent.status === 'processing' &&
      Date.now() - existingEvent.receivedAt.getTime() > 5 * 60 * 1000;

    if (
      existingEvent.status === 'success' ||
      existingEvent.status === 'ignored' ||
      (existingEvent.status === 'processing' && !isStaleProcessing)
    ) {
      auditLog({
        action: 'WEBHOOK_DUPLICATE_IGNORED',
        status: 'success',
        metadata: { gateway: provider, eventId, eventType },
        description: `Ignored duplicate ${provider} webhook event ${eventId}`,
      });
      return { action: 'ALREADY_PROCESSED' };
    }

    const webhookEvent = await WebhookEvent.findOneAndUpdate(
      { eventId, status: { $in: ['failed', 'processing'] } },
      { $set: { status: 'processing', processedAt: undefined, errorMessage: undefined } },
      { new: true }
    );

    if (!webhookEvent) {
      return { action: 'ALREADY_PROCESSED' };
    }

    return { action: 'PROCEED', webhookEvent };
  }

  try {
    const webhookEvent = await WebhookEvent.create({
      eventId,
      providerEventId,
      provider,
      eventType,
      status: 'received',
      receivedAt: new Date(),
      providerEventTimestamp,
      rawPayload,
      payloadSize,
    });

    webhookEvent.status = 'processing';
    await webhookEvent.save();

    return { action: 'PROCEED', webhookEvent };
  } catch (err: any) {
    if (err.code === 11000) {
      auditLog({
        action: 'WEBHOOK_DUPLICATE_IGNORED',
        status: 'success',
        metadata: {
          gateway: provider,
          eventId,
          eventType,
          reason: 'concurrent_request',
        },
        description: `Ignored concurrent duplicate ${provider} webhook event ${eventId}`,
      });
      return { action: 'ALREADY_PROCESSED' };
    }
    throw err;
  }
}
