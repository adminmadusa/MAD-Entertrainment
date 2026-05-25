import { Router } from 'express';
import { getCategories } from '../../services/admin/category.service';

const router: Router = Router();

router.get('/', async (req, res, next) => {
  try {
    const categories = await getCategories();
    res.status(200).json({ success: true, data: categories, message: 'Categories fetched successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
