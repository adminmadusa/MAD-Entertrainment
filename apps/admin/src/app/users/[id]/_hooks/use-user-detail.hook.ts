import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetRegisteredDetail, adminToggleUserActive, UserDetailResponse } from '@/lib/api/admin/user.service';

interface UseUserDetailOptions {
  id: string;
  onToggleSuccess?: (isActive: boolean) => void;
  onToggleError?: (errorMessage: string) => void;
}

export function useUserDetail({ id, onToggleSuccess, onToggleError }: UseUserDetailOptions) {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery<UserDetailResponse['data']>({
    queryKey: ['admin-user-detail', id],
    queryFn: () => adminGetRegisteredDetail(id),
    enabled: !!id,
  });

  const toggleMutation = useMutation({
    mutationFn: () => adminToggleUserActive(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['admin-user-detail', id] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      if (onToggleSuccess) {
        onToggleSuccess(!!res.isActive);
      }
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data?.message || 'Failed to update account status.';
      if (onToggleError) {
        onToggleError(errMsg);
      }
    },
  });

  const profile = data?.profile;
  const bookings = data?.bookings || [];

  // Flatten tickets & refunds lists from bookings
  const allTickets = bookings.flatMap((b) =>
    b.tickets.map((t) => ({
      ...t,
      eventId: b.eventId,
      bookingId: b.bookingId,
      purchaseDate: b.purchaseDate,
    }))
  );

  const allRefunds = bookings.flatMap((b) =>
    b.refunds.map((r) => ({
      ...r,
      bookingId: b.bookingId,
    }))
  );

  return {
    profile,
    bookings,
    allTickets,
    allRefunds,
    isLoading,
    error,
    toggleMutation,
  };
}
