'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [socketState, setSocketState] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:5000';

    const socket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket'],
    });

    socketRef.current = socket;
    setSocketState(socket);

    const handleConnect = () => {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[socket] connected', { id: socket.id });
      }
      setIsConnected(true);
    };

    const handleDisconnect = (reason: string) => {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[socket] disconnected', { id: socket.id, reason });
      }
      setIsConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.disconnect();
      socketRef.current = null;
      setSocketState(null);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketState, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
