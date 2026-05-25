import { PopupCampaign, IPopupCampaign } from '../../models/popup-campaign.schema';

export const getPopups = async (
  page: number = 1,
  limit: number = 15
): Promise<{ popups: IPopupCampaign[]; total: number; totalPages: number }> => {
  const skip = (page - 1) * limit;

  const total = await PopupCampaign.countDocuments();
  const popups = await PopupCampaign.find()
    .sort({ priority: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    popups,
    total,
    totalPages: Math.ceil(total / limit),
  };
};

export const getPopupById = async (id: string): Promise<IPopupCampaign | null> => {
  return await PopupCampaign.findById(id);
};

export const createPopup = async (payload: Partial<IPopupCampaign>): Promise<IPopupCampaign> => {
  const popup = new PopupCampaign(payload);
  return await popup.save();
};

export const updatePopup = async (
  id: string,
  payload: Partial<IPopupCampaign>
): Promise<IPopupCampaign | null> => {
  return await PopupCampaign.findByIdAndUpdate(id, payload, { new: true });
};

export const deletePopup = async (id: string): Promise<IPopupCampaign | null> => {
  return await PopupCampaign.findByIdAndDelete(id);
};

export const togglePopup = async (id: string): Promise<IPopupCampaign | null> => {
  const popup = await PopupCampaign.findById(id);
  if (!popup) {
    return null;
  }
  popup.isActive = !popup.isActive;
  return await popup.save();
};
