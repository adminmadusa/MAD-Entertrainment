import { Router } from 'express';
import { Artist } from '../../models/artist.schema';

const router: Router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const total = await Artist.countDocuments({ isActive: true, isDeleted: { $ne: true } });
    const items = await Artist.find({ isActive: true, isDeleted: { $ne: true } })
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const artist = await Artist.findOne({ slug: req.params.slug, isActive: true, isDeleted: { $ne: true } });
    if (!artist) {
      return res.status(404).json({ success: false, message: 'Artist not found' });
    }
    res.status(200).json({ success: true, data: artist });
  } catch (error) {
    next(error);
  }
});

export default router;
