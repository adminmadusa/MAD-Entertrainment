"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
});

/**
 * SocketProvider — manages a single Socket.IO connection for the app lifetime.
 *
 * FIX (C-04): The previous implementation passed `socketRef.current` directly
 * as the context value. Because React captures the value at render time, and
 * refs don't trigger re-renders, all consumers received `socket: null` forever.
 *
 * Solution: store the socket instance in `useState`. When the socket is created
 * inside `useEffect`, calling `setSocket(sock)` triggers a re-render that
 * propagates the live Socket instance to all consumers.
 */
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:5000";

    const sock = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ["websocket"],
    });

    // Expose to context — triggers a re-render so consumers get the live instance
    setSocket(sock);

    sock.on("connect", () => setIsConnected(true));
    sock.on("disconnect", () => setIsConnected(false));

    return () => {
      sock.disconnect();
      // Reset state so a future mount starts fresh
      setSocket(null);
      setIsConnected(false);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
