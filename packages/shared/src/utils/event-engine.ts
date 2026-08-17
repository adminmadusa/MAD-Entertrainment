import { EventStatus, EventLifecycle, BookingState, BookingReason } from '../constants';
import { getEventEndDate } from './event-lifecycle';

export interface EventCapabilitiesInput {
  status: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  bookingStartDate?: Date | string | null;
  bookingEndDate?: Date | string | null;
  isSoldOut?: boolean;
  totalCapacity?: number;
  ticketsSold?: number;

  // Gallery inputs
  galleryPublished?: boolean;
  galleryItemCount?: number;
  isDeleted?: boolean;
}

export interface EventCapabilitiesOutput {
  lifecycle: EventLifecycle;
  visibility: {
    public: boolean;
    discoverable: boolean;
  };
  booking: {
    status: BookingState;
    reason: BookingReason;
  };
  gallery: {
    status: 'NONE' | 'DRAFT' | 'PUBLISHED';
    itemCount: number;
  };
  capabilities: {
    canBook: boolean;
    canViewGallery: boolean;
    canUploadGallery: boolean;
    canPublishGallery: boolean;
  };
}

export function deriveEventLifecycle(event: EventCapabilitiesInput): EventLifecycle {
  // Treat explicit COMPLETED status as legacy override
  if (event.status === EventStatus.COMPLETED) {
    return EventLifecycle.COMPLETED;
  }

  const now = new Date().getTime();
  const start = new Date(event.startDate).getTime();
  const end = getEventEndDate(event as any).getTime();

  if (now > end) {
    return EventLifecycle.COMPLETED;
  }
  if (now >= start && now <= end) {
    return EventLifecycle.LIVE;
  }
  return EventLifecycle.UPCOMING;
}

export function deriveVisibility(event: EventCapabilitiesInput) {
  const status = event.status as EventStatus;
  const isDeleted = event.isDeleted === true;

  const isPublic = !isDeleted && status === EventStatus.PUBLISHED;
  const isDiscoverable = !isDeleted && status === EventStatus.PUBLISHED;

  return {
    public: isPublic,
    discoverable: isDiscoverable,
  };
}

export function deriveBookingState(
  event: EventCapabilitiesInput,
  lifecycle: EventLifecycle
): { status: BookingState; reason: BookingReason } {
  // 1. Cancelled, completed, archived check
  if (event.status === EventStatus.CANCELLED) {
    return { status: BookingState.CLOSED, reason: BookingReason.EVENT_CANCELLED };
  }
  if (event.status === EventStatus.ARCHIVED) {
    return { status: BookingState.CLOSED, reason: BookingReason.EVENT_ARCHIVED };
  }
  if (lifecycle === EventLifecycle.COMPLETED) {
    return { status: BookingState.CLOSED, reason: BookingReason.EVENT_COMPLETED };
  }

  // 2. Sold out check
  const ticketsSold = event.ticketsSold ?? (event as any).soldCount ?? 0;
  const totalCapacity = event.totalCapacity ?? 0;
  if (event.isSoldOut || (totalCapacity > 0 && ticketsSold >= totalCapacity)) {
    return {
      status: BookingState.CLOSED,
      reason: event.isSoldOut ? BookingReason.SOLD_OUT : BookingReason.CAPACITY_REACHED,
    };
  }

  // 3. Date window check
  const now = new Date().getTime();

  if (event.bookingStartDate && now < new Date(event.bookingStartDate).getTime()) {
    return { status: BookingState.CLOSED, reason: BookingReason.BOOKING_NOT_STARTED };
  }

  const closeTime = event.bookingEndDate
    ? new Date(event.bookingEndDate).getTime()
    : (event.startDate ? new Date(event.startDate).getTime() : null);

  if (closeTime && now >= closeTime) {
    return { status: BookingState.CLOSED, reason: BookingReason.BOOKING_CLOSED };
  }

  return { status: BookingState.OPEN, reason: BookingReason.BOOKABLE };
}

export function deriveGalleryState(
  event: EventCapabilitiesInput,
  bookingStatus: BookingState
): { status: 'NONE' | 'DRAFT' | 'PUBLISHED'; itemCount: number } {
  const itemCount = event.galleryItemCount ?? 0;
  const published = event.galleryPublished === true;

  if (itemCount === 0) {
    return { status: 'NONE', itemCount };
  }

  if (published && bookingStatus === BookingState.CLOSED) {
    return { status: 'PUBLISHED', itemCount };
  }

  return { status: 'DRAFT', itemCount };
}

export function deriveCapabilities(
  _lifecycle: EventLifecycle,
  bookingStatus: BookingState,
  galleryStatus: 'NONE' | 'DRAFT' | 'PUBLISHED'
) {
  // Booking is allowed as long as booking status is OPEN
  const canBook = bookingStatus === BookingState.OPEN;

  // Gallery view and upload capabilities are allowed as soon as booking closes
  const canViewGallery = bookingStatus === BookingState.CLOSED && galleryStatus === 'PUBLISHED';
  const canUploadGallery = bookingStatus === BookingState.CLOSED;
  const canPublishGallery = bookingStatus === BookingState.CLOSED;

  return {
    canBook,
    canViewGallery,
    canUploadGallery,
    canPublishGallery,
  };
}

export function deriveEventCapabilities(event: EventCapabilitiesInput): EventCapabilitiesOutput {
  const lifecycle = deriveEventLifecycle(event);
  const visibility = deriveVisibility(event);
  const booking = deriveBookingState(event, lifecycle);
  const gallery = deriveGalleryState(event, booking.status);
  const capabilities = deriveCapabilities(lifecycle, booking.status, gallery.status);

  return {
    lifecycle,
    visibility,
    booking,
    gallery,
    capabilities,
  };
}
