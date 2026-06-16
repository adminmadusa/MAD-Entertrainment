import { getEnv } from '../config/env';
import { logger } from './logger';
import * as Sentry from '@sentry/node';
import { generateTicketPDF as generateMonolithic } from './pdf.monolithic';
import { generateTicketPDF as generateModular } from '../lib/pdf/ticket/generate-ticket-pdf';

export async function generateTicketPDF(booking: any, event: any): Promise<Buffer> {
  let useModular = false;
  try {
    const env = getEnv();
    useModular = env.ENABLE_MODULAR_PDF === true;
  } catch (err) {
    // Graceful fallback during tests or uninitialized env states
    logger.warn({ err }, 'Environment configuration loader unavailable. Defaulting to monolithic PDF engine.');
  }

  if (!useModular) {
    return generateMonolithic(booking, event);
  }

  try {
    return await generateModular(booking, event);
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
    return generateMonolithic(booking, event);
  }
}
