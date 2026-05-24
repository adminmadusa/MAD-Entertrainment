import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/error.middleware';

export const createOrderSchema = z.object({
  eventId: z.string().uuid(),
  tickets: z.array(
    z.object({
      tier: z.string(),
      quantity: z.number().int().positive(),
      seats: z.array(
        z.object({
          seatId: z.string(),
          row: z.string(),
          number: z.number().int(),
          section: z.string().optional(),
        })
      ).optional(),
    })
  ),
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional(),
  guestPhone: z.string().optional(),
  couponCode: z.string().optional(),
});

export const validateCreateOrder = (req: Request, res: Response, next: NextFunction) => {
  const result = createOrderSchema.safeParse(req.body);
  if (!result.success) {
    return next(AppError.badRequest('Invalid request payload'));
  }
  req.body = result.data;
  next();
};
