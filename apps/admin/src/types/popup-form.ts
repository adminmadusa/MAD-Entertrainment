import { PopupCampaign } from "@mad/types";

export type PopupFormMode = "create" | "edit";
export type PopupTriggerType =
  | "on_load"
  | "after_delay"
  | "on_exit"
  | "on_scroll";

export interface PopupFormImage {
  url: string;
  publicId: string;
  alt?: string;
}

export interface PopupFormValues {
  name: string;
  title: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  trigger: PopupTriggerType;
  triggerDelay: number | "";
  cooldownHours: number | "";
  priority: number | "";
  isActive: boolean;
  showOnPages: string;
  linkedEventId: string;
  startDate: string;
  endDate: string;
  image: PopupFormImage | null;
}

export type PopupMutationPayload = Partial<
  Pick<
    PopupCampaign,
    | "name"
    | "title"
    | "description"
    | "ctaText"
    | "ctaUrl"
    | "trigger"
    | "triggerDelay"
    | "cooldownHours"
    | "priority"
    | "isActive"
    | "showOnPages"
    | "startDate"
    | "endDate"
    | "image"
  > & { linkedEventId?: string }
>;
