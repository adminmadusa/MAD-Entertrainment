import { PopupCampaign } from "../../models/popup-campaign.schema";

export class PublicPopupService {
  static async getActivePopups() {
    const now = new Date();

    const popups = await PopupCampaign.find({
      isActive: true,
      $or: [{ startDate: { $exists: false } }, { startDate: { $lte: now } }],
      $and: [
        {
          $or: [{ endDate: { $exists: false } }, { endDate: { $gt: now } }],
        },
      ],
    })
      .select("-__v")
      .lean();

    return popups;
  }
}
