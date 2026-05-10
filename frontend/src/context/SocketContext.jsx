/**
 * context/SocketContext.jsx
 * Manages Socket.io connection lifecycle and real-time notifications.
 */

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext(null);

const NOTIF_ICONS = {
  room_assigned:       '📍',
  room_changed:        '🔄',
  schedule_updated:    '📅',
  class_cancelled:     '❌',
  class_rescheduled:   '🔁',
  timetable_published: '📣',
  approval_required:   '⏳',
  general:             '🔔',
};

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
      setConnected(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || '', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Real-time notification handler
    socket.on('notification', (notif) => {
      setUnreadCount((c) => c + 1);
      const icon = NOTIF_ICONS[notif.type] || '🔔';
      toast(`${icon} ${notif.title}\n${notif.message}`, {
        duration: 6000,
        style: {
          background: 'var(--surface)',
          color: 'var(--text)',
          border: '1px solid var(--accent)',
          borderRadius: '12px',
          maxWidth: '380px',
          whiteSpace: 'pre-line',
        },
      });
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, unreadCount, setUnreadCount }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
