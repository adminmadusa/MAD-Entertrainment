import { Request, Response, NextFunction } from "express";
import * as tierService from "../../services/admin/tier.service";

export const createTier = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tier = await tierService.createTier(req.body);
    res.status(201).json({
      success: true,
      data: { tier },
      message: "Tier created successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getTiers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await tierService.getTiers();
    res.status(200).json({
      success: true,
      data: result,
      message: "Tiers fetched successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const updateTier = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tier = await tierService.updateTier(req.params.id, req.body);
    if (!tier) {
      return res
        .status(404)
        .json({ success: false, message: "Tier not found" });
    }
    res.status(200).json({
      success: true,
      data: { tier },
      message: "Tier updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTier = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tier = await tierService.deleteTier(req.params.id);
    if (!tier) {
      return res
        .status(404)
        .json({ success: false, message: "Tier not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Tier deleted successfully" });
  } catch (error) {
    next(error);
  }
};
