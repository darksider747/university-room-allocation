import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const BANNERS = {
  hod: {
    emoji: '🏫',
    subtitle: 'Manage your department timetable, assign rooms, and track analytics.',
    links: [
      { to: '/hod',           label: '🗓 Timetable Manager', primary: true  },
      { to: '/hod/analytics', label: '📊 Analytics',         primary: false },
    ],
    gradient: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(59,130,246,0.1))',
  },
  faculty: {
    emoji: '👨‍🏫',
    subtitle: 'View your assigned classes and set your availability preferences.',
    links: [
      { to: '/faculty/schedule', label: '🗓 My Schedule',  primary: true  },
      { to: '/faculty/prefs',    label: '⚙ Availability', primary: false },
    ],
    gradient: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(59,130,246,0.08))',
  },
  student: {
    emoji: '🎓',
    subtitle: 'View your published timetable and receive real-time room change notifications.',
    links: [
      { to: '/student/timetable', label: '🗓 My Timetable',  primary: true  },
      { to: '/notifications',     label: '🔔 Notifications', primary: false },
    ],
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(108,99,255,0.08))',
  },
};

export default function RoleBanner() {
  const { user } = useAuth();
  const b = BANNERS[user?.role];
  if (!b) return null;

  return (
    <div style={{
      background: b.gradient,
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: '24px 28px',
      marginBottom: 24,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 20,
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 40 }}>{b.emoji}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>
            Welcome back, {user?.name}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
            {b.subtitle}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {b.links.map((l) => (
          <Link key={l.to} to={l.to} className={`btn ${l.primary ? 'btn-primary' : 'btn-secondary'}`}>
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
