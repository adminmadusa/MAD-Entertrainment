import PDFDocument from "pdfkit";
import { COLORS } from "../utils/colors";
import { SPACING } from "../utils/spacing";
import { TYPOGRAPHY } from "../utils/typography";

export function drawEventDetails(
  doc: typeof PDFDocument,
  event: any,
  booking: any,
): void {
  const startX = SPACING.CARD_X + SPACING.MARGIN_X;
  const contentWidth = SPACING.CARD_WIDTH - 2 * SPACING.MARGIN_X;

  // Starting y position below header logo block
  let currentY = SPACING.CARD_Y + 90;

  // 1. Draw "EVENT" label
  doc
    .font(TYPOGRAPHY.FONT_BOLD)
    .fontSize(8)
    .fillColor(COLORS.TEXT_MUTED)
    .text("E V E N T", startX, currentY);

  currentY += 14;

  // 2. Draw big event title (with auto-wrap support)
  doc
    .font(TYPOGRAPHY.FONT_BOLD)
    .fontSize(20)
    .fillColor(COLORS.TEXT_PRIMARY)
    .text(event?.title || "MAD Entertainment Event", startX, currentY, {
      width: contentWidth,
      lineGap: 4,
    });

  // Calculate wrapped title height dynamically to ensure spacing below it is perfect
  const titleHeight = doc.heightOfString(
    event?.title || "MAD Entertainment Event",
    {
      width: contentWidth,
    },
  );

  currentY += titleHeight + 20;

  // 3. Draw thin division line
  doc
    .lineWidth(1)
    .strokeColor(COLORS.CARD_BORDER)
    .moveTo(startX, currentY)
    .lineTo(startX + contentWidth, currentY)
    .stroke();

  currentY += 16;

  // 4. Draw Columns (Date & Time | Venue & Location)
  const colWidth = 190;
  const colGap = 14;
  const col1X = startX;
  const col2X = startX + colWidth + colGap;

  // Formatting Date
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  const eventDateObj = event?.startDate
    ? new Date(event.startDate)
    : new Date(booking.createdAt);
  const formattedDate = eventDateObj.toLocaleDateString("en-IN", dateOptions);

  // Column 1: Date & Time Details
  doc
    .font(TYPOGRAPHY.FONT_BOLD)
    .fontSize(8)
    .fillColor(COLORS.TEXT_MUTED)
    .text("D A T E  &  T I M E", col1X, currentY);

  doc
    .font(TYPOGRAPHY.FONT_BOLD)
    .fontSize(11)
    .fillColor(COLORS.TEXT_PRIMARY)
    .text(formattedDate, col1X, currentY + 14, { width: colWidth });

  const timeString = event?.showTime
    ? `Show: ${event.showTime}`
    : eventDateObj.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });

  doc
    .font(TYPOGRAPHY.FONT_REGULAR)
    .fontSize(9)
    .fillColor(COLORS.TEXT_MUTED)
    .text(timeString, col1X, currentY + 30, { width: colWidth });

  // Column 2: Venue Details
  doc
    .font(TYPOGRAPHY.FONT_BOLD)
    .fontSize(8)
    .fillColor(COLORS.TEXT_MUTED)
    .text("V E N U E  &  L O C A T I O N", col2X, currentY);

  const venueName = event?.venue || "MAD Arena";
  doc
    .font(TYPOGRAPHY.FONT_BOLD)
    .fontSize(11)
    .fillColor(COLORS.TEXT_PRIMARY)
    .text(venueName, col2X, currentY + 14, { width: colWidth, lineGap: 2 });
}
