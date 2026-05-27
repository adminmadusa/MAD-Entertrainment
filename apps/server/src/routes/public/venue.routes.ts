import { Router } from "express";
import { Venue } from "../../models/venue.schema";

const router: Router = Router();

router.get("/", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const total = await Venue.countDocuments({ isDeleted: { $ne: true } });
    const items = await Venue.find({ isDeleted: { $ne: true } })
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
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const venue = await Venue.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    });
    if (!venue) {
      return res
        .status(404)
        .json({ success: false, message: "Venue not found" });
    }
    res.status(200).json({ success: true, data: venue });
  } catch (error) {
    next(error);
  }
});

export default router;
