import { generateTicketPDF as generateModular } from '../lib/pdf/ticket/generate-ticket-pdf';

/**
 * Generates the ticket PDF buffer using the canonical Modular PDF Engine.
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
  return generateModular(booking, event, options);
}
