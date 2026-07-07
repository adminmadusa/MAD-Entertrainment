import PDFDocument from "pdfkit";

import { COLORS } from "../utils/colors";
import { SPACING } from "../utils/spacing";
import { TYPOGRAPHY } from "../utils/typography";

export function drawAttendeeDetails(
  doc: typeof PDFDocument,
  ticket: any,
  booking: any,
): void {
  const startX = SPACING.CARD_X + SPACING.MARGIN_X;
  const contentWidth = SPACING.CARD_WIDTH - 2 * SPACING.MARGIN_X;

  // Place attendee block centered vertically in the middle section of the ticket card
  let currentY = SPACING.CARD_Y + 250;

  // 1. Draw partition line
  doc
    .lineWidth(1)
    .strokeColor(COLORS.CARD_BORDER)
    .moveTo(startX, currentY)
    .lineTo(startX + contentWidth, currentY)
    .stroke();

  currentY += 16;

  // 2. Draw Column Grid
  const colWidth = 190;
  const colGap = 14;
  const col1X = startX;
  const col2X = startX + colWidth + colGap;

  // Column 1: Attendee Name & Booking ID
  doc
    .font(TYPOGRAPHY.FONT_BOLD)
    .fontSize(8)
    .fillColor(COLORS.TEXT_MUTED)
    .text("T I C K E T  H O L D E R", col1X, currentY);

  const guestName = ticket?.guestName || booking.guestName || "Guest Attendee";
  doc
    .font(TYPOGRAPHY.FONT_BOLD)
    .fontSize(12)
    .fillColor(COLORS.TEXT_PRIMARY)
    .text(guestName, col1X, currentY + 14, { width: colWidth });

  doc
    .font(TYPOGRAPHY.FONT_BOLD)
    .fontSize(8)
    .fillColor(COLORS.TEXT_MUTED)
    .text("B O O K I N G  R E F E R E N C E", col1X, currentY + 44);

  doc
    .font(TYPOGRAPHY.FONT_BOLD)
    .fontSize(11)
    .fillColor(COLORS.TEXT_PRIMARY)
    .text(booking.bookingId, col1X, currentY + 58, { width: colWidth });

  // Column 2: Ticket Serial ID & Entry admits count
  doc
    .font(TYPOGRAPHY.FONT_BOLD)
    .fontSize(8)
    .fillColor(COLORS.TEXT_MUTED)
    .text("T I C K E T  I D", col2X, currentY);

  const ticketId = ticket?.ticketId || `TKT-${booking.bookingId}-001`;
  doc
    .font(TYPOGRAPHY.FONT_BOLD)
    .fontSize(12)
    .fillColor(COLORS.TEXT_PRIMARY)
    .text(ticketId, col2X, currentY + 14, { width: colWidth });

  doc
    .font(TYPOGRAPHY.FONT_BOLD)
    .fontSize(8)
    .fillColor(COLORS.TEXT_MUTED)
    .text("E N T R Y  L I M I T", col2X, currentY + 44);

  const admitsCount = ticket?.admits || 1;
  const admitsText = `Admits ${admitsCount} Person${admitsCount > 1 ? "s" : ""}`;
  doc
    .font(TYPOGRAPHY.FONT_BOLD)
    .fontSize(11)
    .fillColor(COLORS.TEXT_PRIMARY)
    .text(admitsText, col2X, currentY + 58, { width: colWidth });

  currentY += 86;

  // 3. Highlighted Seats or General Admission Zone block
  const seatBoxHeight = 36;
  const seatBoxY = currentY;

  // Draw container box
  doc
    .roundedRect(startX, seatBoxY, contentWidth, seatBoxHeight, 6)
    .fill("#1A1A1A"); // Dark subtle container inside luxury card

  doc
    .lineWidth(1)
    .strokeColor(COLORS.CARD_BORDER)
    .roundedRect(startX, seatBoxY, contentWidth, seatBoxHeight, 6)
    .stroke();

  // Draw seat descriptions inside container
  const isSeated = ticket?.seatNumber || ticket?.row;
  if (isSeated) {
    const sectionText = ticket.section ? `${ticket.section}` : "Main Hall";
    const seatDescription = `SECTION: ${sectionText.toUpperCase()}   |   ROW: ${ticket.row.toUpperCase()}   |   SEAT: ${ticket.seatNumber}`;

    doc
      .font(TYPOGRAPHY.FONT_BOLD)
      .fontSize(9)
      .fillColor(COLORS.TEXT_PRIMARY)
      .text(seatDescription, startX, seatBoxY + 13, {
        align: "center",
        width: contentWidth,
      });
  } else {
    const tierNameStr = (ticket?.tierName || "General Admission").toUpperCase();
    doc
      .font(TYPOGRAPHY.FONT_BOLD)
      .fontSize(9)
      .fillColor(COLORS.TEXT_PRIMARY)
      .text(
        `ACCESS ZONE: ${tierNameStr} (STANDING / UNRESERVED)`,
        startX,
        seatBoxY + 13,
        {
          align: "center",
          width: contentWidth,
        },
      );
  }
}
