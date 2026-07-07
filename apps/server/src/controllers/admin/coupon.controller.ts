import { Request, Response, NextFunction } from 'express';

import * as couponService from '../../services/admin/coupon.service';

export const createCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupon = await couponService.createCoupon(req.body);
    res.status(201).json({
      success: true,
      data: coupon,
      message: 'Coupon created successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getCoupons = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const active = req.query.active as string;

    const result = await couponService.getCoupons(page, limit, active);
    res.status(200).json({
      success: true,
      data: result.coupons,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: result.totalPages,
      },
      message: 'Coupons fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getCouponById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupon = await couponService.getCouponById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    res.status(200).json({
      success: true,
      data: coupon,
      message: 'Coupon fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const updateCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupon = await couponService.updateCoupon(req.params.id, req.body);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    res.status(200).json({
      success: true,
      data: coupon,
      message: 'Coupon updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupon = await couponService.deleteCoupon(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const toggleCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupon = await couponService.toggleCoupon(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    res.status(200).json({
      success: true,
      data: { isActive: coupon.isActive },
      message: 'Coupon status toggled successfully',
    });
  } catch (error) {
    next(error);
  }
};
