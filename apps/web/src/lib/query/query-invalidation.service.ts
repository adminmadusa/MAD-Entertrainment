import { QUERY_KEYS } from '@mad/shared';
import { QueryClient } from '@tanstack/react-query';

function logInvalidation(scope: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[react-query] invalidate', { scope, ...details });
  }
}

export async function invalidatePublicBookingFlow(
  queryClient: QueryClient,
  details: { bookingId?: string; bookingRef?: string; eventId?: string; eventSlug?: string } = {}
) {
  logInvalidation('public-booking-flow', details);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.public.bookings.all }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.public.bookings.checkout(details.bookingId) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.public.bookings.detail(details.bookingRef ?? details.bookingId) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.public.bookings.mine() }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.public.events.all }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.public.events.featured() }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.public.events.detail(details.eventSlug) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.public.events.seats(details.eventId) }),
  ]);
}
