import { QUERY_KEYS } from '@mad/shared';
import { QueryClient } from '@tanstack/react-query';

function logInvalidation(scope: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[react-query] invalidate', { scope, ...details });
  }
}

export async function invalidateAdminRealtimeState(queryClient: QueryClient, details: Record<string, unknown> = {}) {
  logInvalidation('admin-realtime-state', details);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.analytics.summary() }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.analytics.revenue(30) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.bookings.all }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.events.all }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.events.listForSelect() }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.refunds.all }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.notifications.all }),
  ]);
}
