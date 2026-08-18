import { Request, Response, NextFunction } from 'express';

import * as scannerService from '../../services/admin/scanner.service';
import { auditLog } from '../../utils/audit';

export const scanTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ticketId, eventId, requestId, source = 'manual', offline = false } = req.body;

    if (!ticketId || !eventId) {
      return res.status(400).json({
        success: false,
        message: 'Both ticketId and eventId are required parameters.',
      });
    }

    const scannerId = req.admin?.sub;
    if (!scannerId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Admin scanner identity is missing.',
      });
    }

    const result = await scannerService.validateAndCheckInTicket({
      ticketId,
      eventId,
      scannerId,
      requestId,
      source,
      offline,
    });

    const isSuccess = result.status === 'SUCCESS';
    const auditStatus = isSuccess ? 'success' : 'failure';

    // Dispatch audit log using structured event statuses
    auditLog({
      action: 'TICKET_SCAN',
      actor: {
        type: 'admin',
        id: scannerId,
      },
      status: auditStatus,
      description: `Ticket check-in attempt for ${ticketId} (Event: ${eventId}). Result: ${result.status}.`,
      metadata: {
        ticketId,
        eventId,
        requestId,
        scanSource: source,
        offline,
        result: result.status,
        tierName: result.tierName,
        admits: result.admits,
        guestName: result.guestName,
        attendeeEmail: result.attendeeEmail,
        scannedAt: result.scannedAt,
        userAgent: req.headers?.['user-agent'],
        ip: req.ip,
      },
    });

    if (result.status === 'INVALID' || result.status === 'WRONG_EVENT') {
      const statusCode = result.message?.includes('not found') || result.message?.includes('not exist') ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        message: result.message || 'Ticket validation failed.',
      });
    }

    if (result.status === 'ALREADY_SCANNED') {
      return res.status(400).json({
        success: false,
        message: result.message || 'Ticket already used.',
        details: {
          ticketId: result.ticketId,
          scannedAt: result.scannedAt,
        },
      });
    }

    return res.status(200).json({
      status: 'success',
      message: result.message || 'Ticket scanned and verified successfully.',
      data: {
        ticketId: result.ticketId,
        tierName: result.tierName,
        admits: result.admits,
        scannedAt: result.scannedAt,
        guestName: result.guestName,
        attendeeEmail: result.attendeeEmail,
      },
    });
  } catch (error: any) {
    next(error);
  }
};

export const getScannerStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const stats = await scannerService.getScannerStats(eventId);
    return res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const getScannerHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const { page, limit, status, operator, search } = req.query;

    const filters = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status ? String(status) : undefined,
      operator: operator ? String(operator) : undefined,
      search: search ? String(search) : undefined,
    };

    const history = await scannerService.getScannerHistory(eventId, filters);
    return res.status(200).json({
      status: 'success',
      data: history,
    });
  } catch (error) {
    next(error);
  }
};
