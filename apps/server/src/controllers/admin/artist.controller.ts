import { Request, Response, NextFunction } from 'express';

import * as artistService from '../../services/admin/artist.service';

export const createArtist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const artist = await artistService.createArtist(req.body);
    res.status(201).json({ success: true, data: { artist }, message: 'Artist created successfully' });
  } catch (error) {
    next(error);
  }
};

export const getArtists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await artistService.getArtists(page, limit);
    res.status(200).json({ success: true, data: result, message: 'Artists fetched successfully' });
  } catch (error) {
    next(error);
  }
};

export const getArtistById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const artist = await artistService.getArtistById(req.params.id);
    if (!artist) {
      return res.status(404).json({ success: false, message: 'Artist not found' });
    }
    res.status(200).json({ success: true, data: { artist }, message: 'Artist fetched successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateArtist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const artist = await artistService.updateArtist(req.params.id, req.body);
    if (!artist) {
      return res.status(404).json({ success: false, message: 'Artist not found' });
    }
    res.status(200).json({ success: true, data: { artist }, message: 'Artist updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteArtist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const artist = await artistService.deleteArtist(req.params.id);
    if (!artist) {
      return res.status(404).json({ success: false, message: 'Artist not found' });
    }
    res.status(200).json({ success: true, message: 'Artist deleted successfully' });
  } catch (error) {
    next(error);
  }
};
