import { Request, Response, NextFunction } from 'express';
import * as refundService from '../../services/admin/refund.service';

export const createRefund = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refund = await refundService.createRefund(req.body);
    res.status(201).json({
      success: true,
      data: refund,
      message: 'Refund requested successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getRefunds = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const status = req.query.status as string;

    const result = await refundService.getRefunds(page, limit, status);
    res.status(200).json({
      success: true,
      data: result.refunds,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: result.totalPages,
      },
      message: 'Refunds fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const processRefund = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action, adminNotes, gatewayRefundId } = req.body;
    const refund = await refundService.processRefund(req.params.id, action, adminNotes, gatewayRefundId);
    if (!refund) {
      return res.status(404).json({ success: false, message: 'Refund request not found' });
    }
    res.status(200).json({
      success: true,
      data: refund,
      message: `Refund ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error) {
    next(error);
  }
};
