import { Request, Response, NextFunction } from "express";
import * as ticketProfileService from "../../services/admin/ticket-profile.service";

export const createTicketProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const profile = await ticketProfileService.createTicketProfile(req.body);
    res.status(201).json({
      success: true,
      data: { profile },
      message: "Ticket profile created successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getTicketProfiles = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const profiles = await ticketProfileService.getTicketProfiles();
    res.status(200).json({
      success: true,
      data: { profiles },
      message: "Ticket profiles fetched successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getTicketProfileById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const profile = await ticketProfileService.getTicketProfileById(
      req.params.id,
    );
    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket profile not found" });
    }
    res.status(200).json({
      success: true,
      data: { profile },
      message: "Ticket profile fetched successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const updateTicketProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const profile = await ticketProfileService.updateTicketProfile(
      req.params.id,
      req.body,
    );
    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket profile not found" });
    }
    res.status(200).json({
      success: true,
      data: { profile },
      message: "Ticket profile updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTicketProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const profile = await ticketProfileService.deleteTicketProfile(
      req.params.id,
    );
    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket profile not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Ticket profile deleted successfully" });
  } catch (error) {
    next(error);
  }
};
