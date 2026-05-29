import { generateTicketPDF as generateBrandedPDF } from "../lib/pdf/ticket/generate-ticket-pdf";

/**
 * Generates a production-ready, beautifully branded ticket PDF by delegating to the
 * newly implemented modular layout drawer modules under src/lib/pdf/ticket.
 */
export async function generateTicketPDF(
  booking: any,
  event: any,
): Promise<Buffer> {
  return generateBrandedPDF(booking, event);
}
