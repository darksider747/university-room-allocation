/**
 * components/notifications/NotificationBell.jsx
 */

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext.jsx';
import api from '../../services/api.js';
import './NotificationBell.css';

const TYPE_ICONS = {
  room_assigned:       '📍',
  room_changed:        '🔄',
  schedule_updated:    '📅',
  class_cancelled:     '❌',
  class_rescheduled:   '🔁',
  timetable_published: '📣',
  approval_required:   '⏳',
  general:             '🔔',
};

export default function NotificationBell() {
  const { unreadCount, setUnreadCount } = useSocket() || { unreadCount: 0, setUnreadCount: () => {} };
  const [open,    setOpen]    = useState(false);
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  // Poll unread count every 30s as fallback
  useEffect(() => {
    const fetchCount = () =>
      api.get('/notifications/unread-count')
        .then((r) => setUnreadCount(r.data.count))
        .catch(() => {});
    fetchCount();
    const t = setInterval(fetchCount, 30000);
    return () => clearInterval(t);
  }, []);

  // Load notifications when panel opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get('/notifications?limit=15')
      .then((r) => { setNotifs(r.data.notifications || []); setUnreadCount(r.data.unread || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    setNotifs((n) => n.map((x) => x.id === id ? { ...x, is_read: true } : x));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    setNotifs((n) => n.map((x) => ({ ...x, is_read: true })));
    setUnreadCount(0);
  };

  return (
    <div className="notif-bell-wrapper" ref={panelRef}>
      <button
        className={`notif-bell-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-panel fade-in">
          <div className="notif-panel-header">
            <span className="notif-panel-title">Notifications</span>
            {unreadCount > 0 && (
              <button className="notif-mark-all" onClick={markAllRead}>
                ✓ Mark all read
              </button>
            )}
          </div>

          <div className="notif-list">
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                <div className="spinner" />
              </div>
            ) : notifs.length === 0 ? (
              <div className="notif-empty">
                <span>🎉</span>
                <p>All caught up!</p>
              </div>
            ) : (
              notifs.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                  onClick={() => !n.is_read && markRead(n.id)}
                >
                  <div className="notif-item-icon">{TYPE_ICONS[n.type] || '🔔'}</div>
                  <div className="notif-item-body">
                    <div className="notif-item-title">{n.title}</div>
                    <div className="notif-item-msg">{n.message}</div>
                    <div className="notif-item-time">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                  {!n.is_read && <div className="notif-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
