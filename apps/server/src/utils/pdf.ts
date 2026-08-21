import * as Sentry from '@sentry/node';

import { getEnv } from '../config/env';
import { generateTicketPDF as generateModular } from '../lib/pdf/ticket/generate-ticket-pdf';
import { logger } from './logger';
import { generateTicketPDF as generateMonolithic } from './pdf.monolithic';

/**
 * Generates the ticket PDF buffer.
 *
 * NOTE ON WORKER/SYSTEM CONTEXT (Condition 3):
 * All background worker jobs (e.g. confirmations, resends, consistency repairs) and admin triggers
 * generate PDFs for the purchaser's email. Therefore, they structurally operate in the purchaser's
 * context. The default options object below defaults to `{ role: 'purchaser' }` to ensure all
 * system/worker calls implicitly inherit and enforce purchaser QR-masking rules.
 */
export async function generateTicketPDF(
  booking: any,
  event: any,
  options: {
    role?: 'purchaser' | 'attendee';
    targetTicketId?: string;
    userId?: string;
  } = { role: 'purchaser' }
): Promise<Buffer> {
  let useModular = false;
  try {
    const env = getEnv();
    useModular = env.ENABLE_MODULAR_PDF === true;
  } catch (err) {
    // Graceful fallback during tests or uninitialized env states
    logger.warn({ err }, 'Environment configuration loader unavailable. Defaulting to monolithic PDF engine.');
  }

  if (!useModular) {
    logger.warn({ bookingId: booking?._id }, '[LEGACY] Invoking monolithic PDF generator. Modular PDF engine disabled via ENABLE_MODULAR_PDF.');
    return generateMonolithic(booking, event, options);
  }

  try {
    return await generateModular(booking, event, options);
  } catch (err: any) {
    logger.error({ err, bookingId: booking._id }, 'Modular PDF engine failed. Falling back to monolithic.');
    try {
      Sentry.captureException(err, {
        tags: { component: 'pdf-generator', fallback_triggered: 'true' },
        extra: { bookingId: booking._id },
      });
    } catch (sentryError) {
      logger.error({ err: sentryError }, 'Failed to capture exception in Sentry during PDF fallback');
    }
    // Propagate complete options context during fallback
    return generateMonolithic(booking, event, options);
  }
}
