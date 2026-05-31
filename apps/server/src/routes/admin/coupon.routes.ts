import { Router } from 'express';
import * as couponController from '../../controllers/admin/coupon.controller';
import { requireAdmin } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { adminIdParamSchema, createCouponSchema, updateCouponSchema } from '../../validations/admin-content.validation';

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

router.post('/', validate(createCouponSchema), couponController.createCoupon);
router.get('/', couponController.getCoupons);
router.get('/:id', validate(adminIdParamSchema), couponController.getCouponById);
router.put('/:id', validate(updateCouponSchema), couponController.updateCoupon);
router.delete('/:id', validate(adminIdParamSchema), couponController.deleteCoupon);
router.patch('/:id/toggle', validate(adminIdParamSchema), couponController.toggleCoupon);

export default router;
