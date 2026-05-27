import { EventCategory } from "@mad/shared";

export const COUPON_INPUT_CLASSNAME =
  "w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors";

export const COUPON_CATEGORY_LABELS: Record<EventCategory, string> = {
  [EventCategory.MAD_EVENT]: "MAD Event",
  [EventCategory.DJ_NIGHT]: "DJ Night",
  [EventCategory.CONCERT]: "Concert",
  [EventCategory.FESTIVAL]: "Festival",
  [EventCategory.COMEDY]: "Comedy Show",
  [EventCategory.CELEBRITY]: "Celebrity Event",
  [EventCategory.THEATRE]: "Theatre",
  [EventCategory.CINEMA]: "Cinema",
  [EventCategory.VIP_EVENT]: "VIP Event",
  [EventCategory.LIVE_SHOW]: "Live Show",
};
