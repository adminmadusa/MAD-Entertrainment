import { Document, Types } from 'mongoose';
import { PopupTrigger } from '@mad/shared';
export interface IPopupCampaign extends Document {
    name: string;
    title: string;
    description?: string;
    image?: {
        url: string;
        publicId: string;
    };
    ctaText?: string;
    ctaUrl?: string;
    trigger: PopupTrigger;
    triggerDelay?: number;
    cooldownHours: number;
    isActive: boolean;
    showOnPages?: string[];
    linkedEventId?: Types.ObjectId;
    startDate?: Date;
    endDate?: Date;
    priority: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const PopupCampaign: import("mongoose").Model<IPopupCampaign, {}, {}, {}, Document<unknown, {}, IPopupCampaign, {}, {}> & IPopupCampaign & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=PopupCampaign.model.d.ts.map