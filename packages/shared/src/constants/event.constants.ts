// ============================================================
// MAD Entertrainment — Event Constants & Enums
// ============================================================

export enum EventCategory {
  MAD_EVENT = 'mad_event',
  DJ_NIGHT = 'dj_night',
  CONCERT = 'concert',
  FESTIVAL = 'festival',
  COMEDY = 'comedy',
  CELEBRITY = 'celebrity',
  THEATRE = 'theatre',
  CINEMA = 'cinema',
  VIP_EVENT = 'vip_event',
  LIVE_SHOW = 'live_show',
}

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  [EventCategory.MAD_EVENT]: 'MAD Event',
  [EventCategory.DJ_NIGHT]: 'DJ Night',
  [EventCategory.CONCERT]: 'Concert',
  [EventCategory.FESTIVAL]: 'Festival',
  [EventCategory.COMEDY]: 'Comedy Show',
  [EventCategory.CELEBRITY]: 'Celebrity Event',
  [EventCategory.THEATRE]: 'Theatre',
  [EventCategory.CINEMA]: 'Cinema',
  [EventCategory.VIP_EVENT]: 'VIP Event',
  [EventCategory.LIVE_SHOW]: 'Live Show',
};

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  POSTPONED = 'postponed',
  COMPLETED = 'completed', // Deprecated, will be removed in the future
  ARCHIVED = 'archived',
}

export type EventLifecycleStatus = EventStatus;

export const EVENT_STATUS_TRANSITIONS: Readonly<Record<EventLifecycleStatus, readonly EventLifecycleStatus[]>> = {
  [EventStatus.DRAFT]: [EventStatus.PUBLISHED, EventStatus.CANCELLED],
  [EventStatus.PUBLISHED]: [EventStatus.POSTPONED, EventStatus.COMPLETED, EventStatus.ARCHIVED, EventStatus.CANCELLED],
  [EventStatus.POSTPONED]: [EventStatus.PUBLISHED, EventStatus.CANCELLED],
  [EventStatus.COMPLETED]: [EventStatus.ARCHIVED],
  [EventStatus.ARCHIVED]: [],
  [EventStatus.CANCELLED]: [],
};

export enum EventState {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  UPCOMING = 'UPCOMING',
  LIVE = 'LIVE',
  BOOKING_NOT_STARTED = 'BOOKING_NOT_STARTED',
  BOOKING_CLOSED = 'BOOKING_CLOSED',
  SOLD_OUT = 'SOLD_OUT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  ARCHIVED = 'ARCHIVED',
  HIDDEN = 'HIDDEN',
}

export enum EventLifecycle {
  UPCOMING = 'UPCOMING',
  LIVE = 'LIVE',
  COMPLETED = 'COMPLETED',
}

export type EventStatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type EventStatusMeta = {
  label: string;
  tone: EventStatusTone;
  className: string;
};

export const EVENT_STATUS_METADATA: Record<EventLifecycleStatus, EventStatusMeta> = {
  [EventStatus.DRAFT]: {
    label: 'Draft',
    tone: 'warning',
    className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  },
  [EventStatus.PUBLISHED]: {
    label: 'Published',
    tone: 'success',
    className: 'bg-green-500/10 text-green-400 border-green-500/30',
  },
  [EventStatus.POSTPONED]: {
    label: 'Postponed',
    tone: 'warning',
    className: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  },
  [EventStatus.COMPLETED]: {
    label: 'Completed',
    tone: 'info',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  [EventStatus.CANCELLED]: {
    label: 'Cancelled',
    tone: 'danger',
    className: 'bg-red-500/10 text-red-400 border-red-500/30',
  },
  [EventStatus.ARCHIVED]: {
    label: 'Archived',
    tone: 'neutral',
    className: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  },
};

export enum EventMode {
  LIVE = 'live',
  ONLINE = 'online',
  HYBRID = 'hybrid',
}

export const DEFAULT_EVENT_DURATION_HOURS = 4;
export const DEFAULT_MEMORIES_GALLERY_LIMIT = 30;
export const MAX_MEMORIES_GALLERY_LIMIT = 50;
