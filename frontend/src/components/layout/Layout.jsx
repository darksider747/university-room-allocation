import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import NotificationBell from '../notifications/NotificationBell.jsx';
import './Layout.css';

// Role-based nav configuration
const NAV_CONFIG = {
  super_admin: [
    { to: '/dashboard', icon: '⊞', label: 'Dashboard' },
    { to: '/admin',     icon: '⚙', label: 'Admin Panel', accent: 'yellow' },
    { to: '/rooms',     icon: '⬡', label: 'Rooms' },
    { to: '/queue',     icon: '☰', label: 'Queue' },
    { to: '/history',   icon: '◷', label: 'Allocations' },
  ],
  hod: [
    { to: '/dashboard',   icon: '⊞', label: 'Dashboard' },
    { to: '/hod',         icon: '🗓', label: 'Timetable', accent: 'accent' },
    { to: '/hod/rooms',   icon: '⬡', label: 'Room Finder' },
    { to: '/hod/analytics', icon: '📊', label: 'Analytics' },
    { to: '/rooms',       icon: '⬡', label: 'All Rooms' },
  ],
  faculty: [
    { to: '/dashboard',         icon: '⊞', label: 'Dashboard' },
    { to: '/faculty/schedule',  icon: '🗓', label: 'My Schedule' },
    { to: '/faculty/prefs',     icon: '⚙', label: 'Availability' },
  ],
  student: [
    { to: '/dashboard',          icon: '⊞', label: 'Dashboard' },
    { to: '/student/timetable',  icon: '🗓', label: 'My Timetable', accent: 'green' },
    { to: '/notifications',      icon: '🔔', label: 'Notifications' },
  ],
  admin: [
    { to: '/dashboard', icon: '⊞', label: 'Dashboard' },
    { to: '/admin',     icon: '⚙', label: 'Admin Panel', accent: 'yellow' },
    { to: '/book',      icon: '＋', label: 'Book Room' },
    { to: '/queue',     icon: '☰', label: 'Queue' },
    { to: '/history',   icon: '◷', label: 'My Bookings' },
    { to: '/rooms',     icon: '⬡', label: 'Rooms' },
  ],
};

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  hod:         'HOD',
  faculty:     'Faculty',
  student:     'Student',
  admin:       'Admin',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { connected }    = useSocket() || {};
  const navigate         = useNavigate();

  const role     = user?.role || 'student';
  const navItems = NAV_CONFIG[role] || NAV_CONFIG.student;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🏫</span>
            <div>
              <div className="logo-name">UOM</div>
              <div className="logo-sub">Room Allocation</div>
            </div>
          </div>
          {connected !== undefined && (
            <div className={`ws-dot ${connected ? 'online' : 'offline'}`} title={connected ? 'Live' : 'Offline'} />
          )}
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <span className="nav-section-label">{ROLE_LABELS[role]}</span>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''} ${item.accent ? `accent-${item.accent}` : ''}`
                }
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <NavLink to="/profile" className={({ isActive }) => `user-chip ${isActive ? 'active' : ''}`}>
            <div className="avatar">{user?.name?.charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className={`user-role ${role}`}>{ROLE_LABELS[role]}</div>
            </div>
          </NavLink>
          <button className="btn btn-secondary btn-sm logout-btn" onClick={handleLogout}>
            ↩ Logout
          </button>
        </div>
      </aside>

      <div className="main-wrapper">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-breadcrumb" />
          </div>
          <div className="topbar-right">
            <NotificationBell />
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
