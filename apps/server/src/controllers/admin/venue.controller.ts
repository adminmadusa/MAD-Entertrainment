import { Request, Response, NextFunction } from "express";

import * as venueService from "../../services/admin/venue.service";

export const createVenue = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const venue = await venueService.createVenue(req.body);
    res.status(201).json({
      success: true,
      data: { venue },
      message: "Venue created successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getVenues = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await venueService.getVenues(page, limit);
    res.status(200).json({
      success: true,
      data: result,
      message: "Venues fetched successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getVenueById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const venue = await venueService.getVenueById(req.params.id);
    if (!venue) {
      return res
        .status(404)
        .json({ success: false, message: "Venue not found" });
    }
    res.status(200).json({
      success: true,
      data: { venue },
      message: "Venue fetched successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const updateVenue = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const venue = await venueService.updateVenue(req.params.id, req.body);
    if (!venue) {
      return res
        .status(404)
        .json({ success: false, message: "Venue not found" });
    }
    res.status(200).json({
      success: true,
      data: { venue },
      message: "Venue updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteVenue = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const venue = await venueService.deleteVenue(req.params.id);
    if (!venue) {
      return res
        .status(404)
        .json({ success: false, message: "Venue not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Venue deleted successfully" });
  } catch (error) {
    next(error);
  }
};
