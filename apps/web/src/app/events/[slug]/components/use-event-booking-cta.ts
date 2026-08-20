import type { Event as EventData, EventBookingCTA } from '@mad/types';

export function getEventBookingCTA(event?: EventData): EventBookingCTA {
  if (!event) {
    return { text: 'Book Now', disabled: false, variant: 'primary', action: 'BOOK' };
  }

  if (event.lifecycle === 'COMPLETED') {
    return {
      text: 'Happy Moments',
      disabled: false,
      variant: 'secondary',
      action: 'GALLERY',
    };
  }

  if (event.lifecycle === 'LIVE') {
    if (event.booking?.status === 'OPEN') {
      return {
        text: 'Join Now',
        disabled: false,
        variant: 'primary',
        action: 'BOOK',
      };
    }
    return {
      text: 'In Progress',
      disabled: true,
      variant: 'disabled',
      action: 'NONE',
    };
  }

  if (event.booking?.status === 'OPEN') {
    return {
      text: 'Book Now',
      disabled: false,
      variant: 'primary',
      action: 'BOOK',
    };
  }

  let text = 'Booking Closed';
  if (event.booking?.reason === 'SOLD_OUT' || event.booking?.reason === 'CAPACITY_REACHED') {
    text = 'Sold Out';
  } else if (event.booking?.reason === 'BOOKING_NOT_STARTED') {
    text = 'Coming Soon';
  }

  return {
    text,
    disabled: true,
    variant: 'disabled',
    action: 'NONE',
  };
}
