import { useState, useEffect } from 'react';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext.jsx';

const TYPE_META = {
  room_assigned:       { icon: '📍', color: 'var(--accent)',  label: 'Room Assigned'      },
  room_changed:        { icon: '🔄', color: 'var(--yellow)', label: 'Room Changed'        },
  schedule_updated:    { icon: '📅', color: 'var(--blue)',   label: 'Schedule Updated'    },
  class_cancelled:     { icon: '❌', color: 'var(--red)',    label: 'Class Cancelled'     },
  class_rescheduled:   { icon: '🔁', color: 'var(--yellow)', label: 'Class Rescheduled'  },
  timetable_published: { icon: '📣', color: 'var(--green)',  label: 'Timetable Published' },
  approval_required:   { icon: '⏳', color: 'var(--yellow)', label: 'Approval Required'  },
  general:             { icon: '🔔', color: 'var(--text-muted)', label: 'General'         },
};

const FILTERS = ['all', 'room_assigned', 'room_changed', 'class_cancelled', 'timetable_published'];

export default function NotificationsPage() {
  const [notifs,   setNotifs]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');
  const [unread,   setUnread]   = useState(0);
  const { setUnreadCount } = useSocket() || {};

  const load = () => {
    setLoading(true);
    api.get('/notifications?limit=100')
      .then((r) => {
        setNotifs(r.data.notifications || []);
        setUnread(r.data.unread || 0);
      })
      .catch(() => toast.error('Failed to load notifications'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    setNotifs((n) => n.map((x) => x.id === id ? { ...x, is_read: true } : x));
    setUnread((c) => Math.max(0, c - 1));
    setUnreadCount?.((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    setNotifs((n) => n.map((x) => ({ ...x, is_read: true })));
    setUnread(0);
    setUnreadCount?.(0);
    toast.success('All notifications marked as read.');
  };

  const deleteNotif = async (id) => {
    await api.delete(`/notifications/${id}`).catch(() => {});
    setNotifs((n) => n.filter((x) => x.id !== id));
  };

  const filtered = filter === 'all' ? notifs : notifs.filter((n) => n.type === filter);

  return (
    <div className="fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>🔔 Notifications</h1>
          <p>{unread} unread · {notifs.length} total</p>
        </div>
        {unread > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
            ✓ Mark all read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? '📋 All' : `${TYPE_META[f]?.icon} ${TYPE_META[f]?.label}`}
          </button>
        ))}
        <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={load}>
          ↺ Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🎉</div>
          <h3>No notifications</h3>
          <p>{filter === 'all' ? "You're all caught up!" : `No ${TYPE_META[filter]?.label} notifications.`}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 720 }}>
          {filtered.map((notif) => {
            const meta = TYPE_META[notif.type] || TYPE_META.general;
            return (
              <div
                key={notif.id}
                style={{
                  background: notif.is_read ? 'var(--surface)' : 'rgba(108,99,255,0.05)',
                  border: `1px solid ${notif.is_read ? 'var(--border)' : 'rgba(108,99,255,0.2)'}`,
                  borderRadius: 12,
                  padding: '16px',
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start',
                  transition: 'all 0.15s',
                  cursor: !notif.is_read ? 'pointer' : 'default',
                }}
                onClick={() => !notif.is_read && markRead(notif.id)}
              >
                {/* Icon */}
                <div style={{
                  width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                  background: notif.is_read ? 'var(--surface-2)' : `${meta.color}20`,
                  border: `1px solid ${notif.is_read ? 'var(--border)' : meta.color}40`,
                }}>
                  {meta.icon}
                </div>

                {/* Body */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                      {notif.title}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, marginLeft: 12 }}>
                      {!notif.is_read && (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
                      )}
                      <button
                        style={{
                          background: 'none', border: 'none',
                          color: 'var(--text-dim)', cursor: 'pointer',
                          fontSize: 14, padding: '2px 6px', borderRadius: 6,
                          transition: 'all 0.15s',
                        }}
                        onClick={(e) => { e.stopPropagation(); deleteNotif(notif.id); }}
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 8 }}>
                    {notif.message}
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                      background: `${meta.color}20`, color: meta.color,
                      textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>
                      {meta.label}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
