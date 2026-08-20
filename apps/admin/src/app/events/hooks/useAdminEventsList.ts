'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminGetEvents,
  adminDeleteEvent,
  adminBulkDeleteEvents,
  adminUpdateEvent,
  type AdminEvent,
} from '@/lib/api/admin/event.service';
import { extractApiError } from '@/lib/api/client';
import { useAdminAuth } from '@/providers/AdminAuthProvider';
import { EventStatus, AdminRole } from '@mad/shared';
import { useBulkSelection } from '@mad/ui';

export function useAdminEventsList() {
  const { admin } = useAdminAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const canMutateEvents =
    !!admin?.role &&
    [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER].includes(admin.role as AdminRole);

  const [statusFilter, setStatusFilter] = useState<EventStatus | ''>('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AdminEvent | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, EventStatus>>({});

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const [sortField, setSortField] = useState<'title' | 'startDate' | 'status' | 'createdAt' | null>(
    'createdAt'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: 'title' | 'startDate' | 'status' | 'createdAt') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-events', { page, search, status: statusFilter, sortField, sortOrder }],
    queryFn: () =>
      adminGetEvents({
        page,
        limit: 15,
        search,
        status: statusFilter,
        ...(sortField && { sortField }),
        ...(sortOrder && { sortOrder }),
      }),
  });

  const eventIds = (Array.isArray(data?.items) ? data?.items : []).map((e) => e._id);
  const bulkSelection = useBulkSelection({ pageIds: eventIds });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-events'] });
      setDeleteTarget(null);
      showToast('success', 'Event deleted successfully');
    },
    onError: (err: any) => {
      showToast('error', extractApiError(err).message || 'Failed to delete event');
    },
  });

  const statusUpdateMutation = useMutation({
    mutationFn: ({
      id,
      status,
      eventVersion,
    }: {
      id: string;
      status: EventStatus;
      eventVersion: number;
    }) => adminUpdateEvent(id, { status, eventVersion }),
    onMutate: ({ id, status }) => {
      setOptimisticStatuses((prev) => ({ ...prev, [id]: status }));
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin-events'] });
      setOptimisticStatuses((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      showToast('success', 'Event status updated');
    },
    onError: (err: any, { id }) => {
      setOptimisticStatuses((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      showToast('error', extractApiError(err).message || 'Failed to update event status');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => adminBulkDeleteEvents(ids),
    onSuccess: (resData) => {
      qc.invalidateQueries({ queryKey: ['admin-events'] });
      bulkSelection.clearSelection();
      setIsBulkDeleteModalOpen(false);
      const { successCount, failedCount } = resData;
      if (failedCount > 0) {
        showToast('error', `Deleted ${successCount} events. ${failedCount} failed.`);
      } else {
        showToast('success', `Deleted ${successCount} events successfully.`);
      }
    },
    onError: (err: any) => {
      setIsBulkDeleteModalOpen(false);
      showToast('error', extractApiError(err).message || 'Failed to bulk delete events');
    },
  });

  return {
    canMutateEvents,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    sortField,
    sortOrder,
    handleSort,
    deleteTarget,
    setDeleteTarget,
    isBulkDeleteModalOpen,
    setIsBulkDeleteModalOpen,
    toastMessage,
    optimisticStatuses,
    data,
    isLoading,
    isError,
    error,
    refetch,
    bulkSelection,
    deleteMutation,
    statusUpdateMutation,
    bulkDeleteMutation,
  };
}
