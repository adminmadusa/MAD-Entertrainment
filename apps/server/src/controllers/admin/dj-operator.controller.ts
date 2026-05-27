import { Request, Response, NextFunction } from "express";

import * as djOperatorService from "../../services/admin/dj-operator.service";

export const createDJOperator = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const dj = await djOperatorService.createDJOperator(req.body);
    res.status(201).json({
      success: true,
      data: { dj },
      message: "DJ Operator created successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getDJOperators = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await djOperatorService.getDJOperators(page, limit);
    res.status(200).json({
      success: true,
      data: result,
      message: "DJ Operators fetched successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getDJOperatorById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const dj = await djOperatorService.getDJOperatorById(req.params.id);
    if (!dj) {
      return res
        .status(404)
        .json({ success: false, message: "DJ Operator not found" });
    }
    res.status(200).json({
      success: true,
      data: { dj },
      message: "DJ Operator fetched successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const updateDJOperator = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const dj = await djOperatorService.updateDJOperator(
      req.params.id,
      req.body,
    );
    if (!dj) {
      return res
        .status(404)
        .json({ success: false, message: "DJ Operator not found" });
    }
    res.status(200).json({
      success: true,
      data: { dj },
      message: "DJ Operator updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDJOperator = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const dj = await djOperatorService.deleteDJOperator(req.params.id);
    if (!dj) {
      return res
        .status(404)
        .json({ success: false, message: "DJ Operator not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "DJ Operator deleted successfully" });
  } catch (error) {
    next(error);
  }
};
