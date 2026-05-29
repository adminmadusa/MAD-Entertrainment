import PDFDocument from "pdfkit";
import { Ticket } from "../../../models/ticket.schema";
import { drawTicketCard } from "./layout/draw-ticket-card";
import { drawHeader } from "./layout/draw-header";
import { drawEventDetails } from "./layout/draw-event-details";
import { drawAttendeeDetails } from "./layout/draw-attendee-details";
import { drawQRSection } from "./layout/draw-qr-section";
import { drawFooter } from "./layout/draw-footer";

/**
 * Generates a fully-designed, production-ready, scan-ready PDF ticket attachment buffer.
 * If individual ticket records exist, it compiles a multi-page PDF where each page represents one ticket.
 * If no individual ticket records exist, it generates a booking-level ticket.
 */
export async function generateTicketPDF(
  booking: any,
  event: any,
): Promise<Buffer> {
  // Query individual ticket records from database
  let tickets = [];
  try {
    tickets = await Ticket.find({ bookingId: booking._id });
  } catch (err) {
    // Graceful fallback to empty list
  }

  // Fallback to a single placeholder ticket representing the booking if no records found
  if (tickets.length === 0) {
    tickets = [
      {
        ticketId: `TKT-${booking.bookingId}-001`,
        tierName: booking.tickets?.[0]?.tierName || "General Admission",
        tier: booking.tickets?.[0]?.tier || "general_admission",
        admits: booking.totalTickets || 1,
        guestName: booking.guestName || "Guest Attendee",
      },
    ];
  }

  return new Promise(async (resolve, reject) => {
    try {
      // Set margin to 0 since we layout absolute shapes and center the card manually
      const doc = new PDFDocument({ margin: 0, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];

        // Add page if it is subsequent ticket
        if (i > 0) {
          doc.addPage();
        }

        // 1. Draw luxury ticket card canvas with physical ticket notched cuts
        drawTicketCard(doc);

        // 2. Draw branding header and status/tier badge
        drawHeader(doc, ticket);

        // 3. Draw event details block
        drawEventDetails(doc, event, booking);

        // 4. Draw attendee, booking, admits, and seat information
        drawAttendeeDetails(doc, ticket, booking);

        // 5. Generate and draw validation scanner QR block in the stub
        await drawQRSection(doc, ticket, booking);

        // 6. Draw printable instruction terms and support contact info at page base
        drawFooter(doc);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
