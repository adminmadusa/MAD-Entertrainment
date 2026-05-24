'use client';

import { STORAGE_KEYS } from '@mad/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '@mad/shared/config/frontend';

import { useAdminAuth } from '@/hooks/use-admin-auth.hook';
import { invalidateAdminRealtimeState } from '@/lib/query/query-invalidation.service';

export function AdminRealtimeSync() {
  const { isAuthenticated } = useAdminAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) return;

    const token = localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
    if (!token) return;

    const socketUrl = SOCKET_URL;
    const socket = io(`${socketUrl}/admin`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const handleConnect = () => {
      socket.emit('admin:join', { room: 'bookings' });
      socket.emit('admin:join', { room: 'analytics' });
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[admin-socket] connected', { id: socket.id });
      }
    };

    const handleDisconnect = (reason: string) => {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[admin-socket] disconnected', { reason });
      }
    };

    const handleRealtimeChange = (payload: Record<string, unknown>) => {
      invalidateAdminRealtimeState(queryClient, { source: 'admin-socket', ...payload });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('booking:created', handleRealtimeChange);
    socket.on('booking:updated', handleRealtimeChange);
    socket.on('analytics:changed', handleRealtimeChange);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('booking:created', handleRealtimeChange);
      socket.off('booking:updated', handleRealtimeChange);
      socket.off('analytics:changed', handleRealtimeChange);
      socket.disconnect();
    };
  }, [isAuthenticated, queryClient]);

  return null;
}
