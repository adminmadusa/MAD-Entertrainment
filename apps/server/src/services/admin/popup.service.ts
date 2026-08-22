import { Types } from 'mongoose';

import { PopupCampaign, IPopupCampaign } from '../../models/popup-campaign.schema';

export const getPopups = async (
  page: number = 1,
  limit: number = 15
): Promise<{ popups: IPopupCampaign[]; total: number; totalPages: number }> => {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, Math.min(100, limit));
  const skip = (safePage - 1) * safeLimit;

  const total = await PopupCampaign.countDocuments();
  const popups = await PopupCampaign.find()
    .sort({ priority: -1, createdAt: -1 })
    .skip(skip)
    .limit(safeLimit);

  return {
    popups,
    total,
    totalPages: Math.ceil(total / safeLimit),
  };
};

export const getPopupById = async (id: string): Promise<IPopupCampaign | null> => {
  const cleanId = String(id || '').trim();
  if (!cleanId || !Types.ObjectId.isValid(cleanId)) return null;
  return await PopupCampaign.findById(cleanId);
};

export const createPopup = async (payload: Partial<IPopupCampaign>): Promise<IPopupCampaign> => {
  const popup = new PopupCampaign(payload);
  return await popup.save();
};

export const updatePopup = async (
  id: string,
  payload: Partial<IPopupCampaign>
): Promise<IPopupCampaign | null> => {
  const cleanId = String(id || '').trim();
  if (!cleanId || !Types.ObjectId.isValid(cleanId)) return null;

  const updateFields: Partial<IPopupCampaign> = {};
  if (payload.name !== undefined) updateFields.name = String(payload.name).trim();
  if (payload.title !== undefined) updateFields.title = String(payload.title).trim();
  if (payload.description !== undefined) updateFields.description = String(payload.description);
  if (payload.image !== undefined) updateFields.image = payload.image;
  if (payload.ctaUrl !== undefined) updateFields.ctaUrl = String(payload.ctaUrl);
  if (payload.ctaText !== undefined) updateFields.ctaText = String(payload.ctaText);
  if (payload.trigger !== undefined) updateFields.trigger = payload.trigger;
  if (payload.triggerDelay !== undefined) updateFields.triggerDelay = Number(payload.triggerDelay);
  if (payload.cooldownHours !== undefined) updateFields.cooldownHours = Number(payload.cooldownHours);
  if (payload.priority !== undefined) updateFields.priority = Number(payload.priority);
  if (payload.showOnPages !== undefined) updateFields.showOnPages = payload.showOnPages;
  if (payload.isActive !== undefined) updateFields.isActive = Boolean(payload.isActive);
  if (payload.startDate !== undefined) updateFields.startDate = new Date(payload.startDate);
  if (payload.endDate !== undefined) updateFields.endDate = new Date(payload.endDate);
  if (payload.linkedEvent !== undefined) updateFields.linkedEvent = payload.linkedEvent;

  return await PopupCampaign.findByIdAndUpdate(cleanId, { $set: updateFields }, { new: true });
};

export const deletePopup = async (id: string): Promise<IPopupCampaign | null> => {
  const cleanId = String(id || '').trim();
  if (!cleanId || !Types.ObjectId.isValid(cleanId)) return null;
  return await PopupCampaign.findByIdAndDelete(cleanId);
};

export const togglePopup = async (id: string): Promise<IPopupCampaign | null> => {
  const cleanId = String(id || '').trim();
  if (!cleanId || !Types.ObjectId.isValid(cleanId)) return null;
  const popup = await PopupCampaign.findById(cleanId);
  if (!popup) {
    return null;
  }
  popup.isActive = !popup.isActive;
  return await popup.save();
};
