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
  if (!cleanId) return null;
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
  if (!cleanId) return null;
  return await PopupCampaign.findByIdAndUpdate(cleanId, payload, { new: true });
};

export const deletePopup = async (id: string): Promise<IPopupCampaign | null> => {
  const cleanId = String(id || '').trim();
  if (!cleanId) return null;
  return await PopupCampaign.findByIdAndDelete(cleanId);
};

export const togglePopup = async (id: string): Promise<IPopupCampaign | null> => {
  const cleanId = String(id || '').trim();
  if (!cleanId) return null;
  const popup = await PopupCampaign.findById(cleanId);
  if (!popup) {
    return null;
  }
  popup.isActive = !popup.isActive;
  return await popup.save();
};
