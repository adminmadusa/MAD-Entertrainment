import PDFDocument from 'pdfkit';
import qrcode from 'qrcode';

import { Ticket } from '../models/ticket.schema';
import { getPurchaserPDFTicketState } from '../services/public/ticket-ownership.service';
import { logger } from './logger';

/**
 * LEGACY
 * Reason: Monolithic PDF generator fallback while Modular PDF Engine (generate-ticket-pdf.ts) reaches 100% production burn-in.
 * Owner: Platform Engineering
 * Ticket: GOV-PDF-001
 * Removal Plan: Remove when ENABLE_MODULAR_PDF feature flag is permanently retired.
 *
 * @deprecated Use generateTicketPDF from `../lib/pdf/ticket/generate-ticket-pdf` instead.
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
  const role = options?.role ?? 'purchaser';
  let tickets: any[] = [];

  if (role === 'attendee') {
    if (!options?.targetTicketId) {
      throw new Error('targetTicketId is required for attendee PDF generation');
    }
    const ticket = await Ticket.findOne({
      ticketId: options.targetTicketId,
      status: 'active',
    });
    if (!ticket) {
      logger.error({ ticketId: options.targetTicketId }, 'Attendee ticket not found for PDF generation');
      throw new Error(`Ticket not found: ${options.targetTicketId}`);
    }
    // Authorize attendee: must be claimed and assignee must match options.userId
    if (
      (ticket.assignmentStatus ?? 'unassigned') !== 'claimed' ||
      !ticket.attendeeUserId ||
      !options.userId ||
      ticket.attendeeUserId.toString() !== options.userId
    ) {
      logger.error({ ticketId: options.targetTicketId, userId: options.userId }, 'Unauthorized attendee PDF request');
      throw new Error('Unauthorized to access this ticket PDF');
    }
    tickets = [ticket];
  } else {
    // 1. Fetch active tickets associated with this booking, ordered deterministically
    tickets = await Ticket.find({ bookingId: booking._id, status: 'active' }).sort({ createdAt: 1 });
  }

  if (tickets.length === 0) {
    logger.error({ bookingId: booking._id }, 'No tickets found for booking during PDF generation');
    throw new Error(`No tickets found for booking: ${booking.bookingId}`);
  }

  // 2. Generate QR PNG buffers in parallel (or null if masked)
  const qrPromises = tickets.map((t) => {
    let canRenderQR = false;
    if (role === 'attendee') {
      canRenderQR = true;
    } else {
      const state = getPurchaserPDFTicketState(t);
      canRenderQR = state.canRenderQR;
    }

    if (canRenderQR) {
      return qrcode.toBuffer(t.qrCode ?? t.ticketId, { type: 'png', margin: 1 });
    }
    return Promise.resolve(null);
  });
  const qrBuffers = await Promise.all(qrPromises);

  return new Promise((resolve, reject) => {
    // Initialize PDF document with a margin of 48pt
    const doc = new PDFDocument({ margin: 48, size: 'LETTER' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // 3. Render one page per ticket
    tickets.forEach((ticket, idx) => {
      if (idx > 0) {
        doc.addPage();
      }

      const qrBuffer = qrBuffers[idx];

      // Draw Outer Frame Bounding Card Border
      doc.roundedRect(36, 36, doc.page.width - 72, doc.page.height - 72, 8)
        .strokeColor('#e2e8f0')
        .lineWidth(1.5)
        .stroke();

      // --- HEADER BRANDING ---
      // Solid Purple Box Logo
      doc.fillColor('#a855f7')
        .roundedRect(48, 52, 28, 28, 6)
        .fill();

      // White Centered 'M' inside the Box
      doc.fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('M', 48, 60, { width: 28, align: 'center' });

      // Brand Title Text
      doc.fillColor('#0f172a')
        .font('Helvetica-Bold')
        .fontSize(13)
        .text('MAD ENTERTAINMENT', 86, 60);

      // Right-aligned Booking Reference Metadata
      doc.fillColor('#64748b')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text('BOOKING REFERENCE', 350, 56, { width: doc.page.width - 48 - 350, align: 'right' });

      doc.fillColor('#0f172a')
        .font('Courier-Bold')
        .fontSize(11)
        .text(booking.bookingId, 350, 68, { width: doc.page.width - 48 - 350, align: 'right' });

      // Divider line below header
      doc.moveTo(48, 94)
        .lineTo(doc.page.width - 48, 94)
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .stroke();

      // --- EVENT SECTION ---
      // Event Title (wraps automatically, track Y dynamically)
      doc.fillColor('#0f172a')
        .font('Helvetica-Bold')
        .fontSize(18)
        .text(event?.title ?? 'MAD Event', 48, 108, { width: doc.page.width - 96 });

      let currentY = doc.y + 12;

      // Two-column layout grid for Event Details
      const leftColX = 48;
      const rightColX = 300;
      const colWidth = (doc.page.width - 96 - 24) / 2; // (516 - 24) / 2 = 246

      // Date & Time Column
      doc.fillColor('#64748b')
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text('DATE & TIME', leftColX, currentY);

      const eventDateStr = event?.startDate
        ? new Date(event.startDate).toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : 'N/A';

      doc.fillColor('#0f172a')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(eventDateStr, leftColX, currentY + 12);

      let timeStr = `Show: ${event?.showTime ?? 'N/A'}`;
      if (event?.doorsOpenTime) {
        timeStr += ` (Doors: ${event.doorsOpenTime})`;
      }

      doc.fillColor('#475569')
        .font('Helvetica')
        .fontSize(9.5)
        .text(timeStr, leftColX, currentY + 28);

      const dateColHeight = 44;

      // Venue Column
      doc.fillColor('#64748b')
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text('VENUE', rightColX, currentY);

      doc.fillColor('#0f172a')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(event?.venue ?? 'TBA', rightColX, currentY + 12, { width: colWidth });

      const venueYEnd = doc.y;
      currentY = Math.max(currentY + dateColHeight, venueYEnd) + 12;

      // Divider line below Event Section
      doc.moveTo(48, currentY)
        .lineTo(doc.page.width - 48, currentY)
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .stroke();

      // --- GUEST & TICKET DETAILS SECTION ---
      currentY += 12;

      // Guest Name
      doc.fillColor('#64748b')
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text('GUEST NAME', leftColX, currentY);

      const guestName = booking.guestName || [booking.firstName, booking.lastName].filter(Boolean).join(' ') || 'Guest';
      doc.fillColor('#0f172a')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(guestName, leftColX, currentY + 12, { width: colWidth });

      const guestYEnd = doc.y;

      // Ticket Tier
      doc.fillColor('#64748b')
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text('TICKET TIER', rightColX, currentY);

      const tierName = ticket.tierName || ticket.tier || 'General';
      doc.fillColor('#0f172a')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(tierName.toUpperCase(), rightColX, currentY + 12, { width: colWidth });

      const tierYEnd = doc.y;
      currentY = Math.max(guestYEnd, tierYEnd) + 12;

      const assignmentStatus = ticket.assignmentStatus ?? 'unassigned';
      let canRenderQR = false;
      let statusMessage = '';
      if (role === 'attendee') {
        canRenderQR = true;
      } else {
        const state = getPurchaserPDFTicketState(ticket);
        canRenderQR = state.canRenderQR;
        statusMessage = state.message || '';
      }

      // Ticket ID
      doc.fillColor('#64748b')
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text('TICKET ID', leftColX, currentY);

      let ticketIdText = ticket.ticketId;
      if (!canRenderQR) {
        if (assignmentStatus === 'pending') {
          ticketIdText = 'Awaiting Claim';
        } else if (assignmentStatus === 'claimed') {
          ticketIdText = 'Claimed By Attendee';
        } else {
          ticketIdText = 'Restricted';
        }
      }

      doc.fillColor('#0f172a')
        .font('Courier-Bold')
        .fontSize(10.5)
        .text(ticketIdText, leftColX, currentY + 12);

      // Admit Count
      doc.fillColor('#64748b')
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text('ADMIT COUNT', rightColX, currentY);

      doc.fillColor('#0f172a')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(`${ticket.admits ?? 1} Person(s)`, rightColX, currentY + 12);

      currentY += 28 + 12;

      // Divider line below Ticket Section
      doc.moveTo(48, currentY)
        .lineTo(doc.page.width - 48, currentY)
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .stroke();

      // --- QR CODE SECTION ---
      currentY += 12;

      doc.fillColor('#64748b')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text('SCAN FOR ENTRY', leftColX, currentY, { width: doc.page.width - 96, align: 'center' });

      const qrWidth = 120;
      const qrX = (doc.page.width - qrWidth) / 2;

      if (canRenderQR && qrBuffer) {
        doc.image(qrBuffer, qrX, currentY + 12, { width: qrWidth, height: qrWidth });
        currentY += 12 + qrWidth + 12;
      } else {
        const boxWidth = 260;
        const boxHeight = 100;
        const boxX = (doc.page.width - boxWidth) / 2;
        const boxY = currentY + 12;

        doc.fillColor('#f8fafc')
          .roundedRect(boxX, boxY, boxWidth, boxHeight, 6)
          .fill();

        doc.strokeColor('#e2e8f0')
          .lineWidth(1)
          .roundedRect(boxX, boxY, boxWidth, boxHeight, 6)
          .stroke();

        doc.fillColor('#64748b')
          .font('Helvetica')
          .fontSize(8.5)
          .text(statusMessage, boxX + 12, boxY + 16, {
            align: 'center',
            width: boxWidth - 24,
          });

        currentY += 12 + boxHeight + 12;
      }

      // Divider line below QR Section
      doc.moveTo(48, currentY)
        .lineTo(doc.page.width - 48, currentY)
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .stroke();

      // --- CHECK-IN INSTRUCTIONS SECTION ---
      currentY += 12;

      const instHeight = 84;
      // Draw background card box
      doc.fillColor('#f8fafc')
        .roundedRect(48, currentY, doc.page.width - 96, instHeight, 6)
        .fill();

      // Text positions
      const instTextX = 60;
      const instTextY = currentY + 10;

      doc.fillColor('#9f1239')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text('IMPORTANT INFORMATION', instTextX, instTextY);

      const rules = [
        'Please present this ticket at the venue gate for check-in.',
        'Ensure the QR code is clearly visible on your screen or printed page.',
        'Admission is subject to verification of booking details and venue rules.',
        'Keep this ticket secure. Do not share the QR code or Ticket ID with anyone.',
      ];

      let rulesY = instTextY + 14;
      rules.forEach((rule) => {
        doc.fillColor('#475569').font('Helvetica').fontSize(8);
        doc.text('\u2022', instTextX, rulesY, { width: 10 });
        doc.text(rule, instTextX + 10, rulesY, { width: doc.page.width - 96 - 24 });
        rulesY += 12;
      });
    });

    doc.end();
  });
}
