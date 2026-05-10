import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import RoleBanner from '../components/shared/RoleBanner.jsx';

function StatCard({ icon, value, label, color }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function ActivityDot({ type }) {
  const map = { success: 'badge-success', error: 'badge-error', info: 'badge-info', warning: 'badge-warning' };
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  return <span className={`badge ${map[type] || 'badge-info'}`}>{icons[type] || 'ℹ'}</span>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/allocations/dashboard')
      .then((r) => setStats(r.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}>
      <div className="spinner" style={{ width:40, height:40 }} />
    </div>
  );

  const s = stats?.stats || {};

  return (
    <div className="fade-in">
      <RoleBanner />
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1>Dashboard</h1>
          <p>System overview and recent activity</p>
        </div>
        <div className="flex gap-2">
          <Link to="/book" className="btn btn-primary">＋ New Booking</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom:32 }}>
        <StatCard icon="⬡" value={s.totalRooms}       label="Total Rooms"        color="accent" />
        <StatCard icon="✓" value={s.totalAllocations} label="Total Allocations"  color="green"  />
        <StatCard icon="☰" value={s.pendingQueue}     label="Pending in Queue"   color="yellow" />
        <StatCard icon="◷" value={s.todayAllocations} label="Booked Today"       color="blue"   />
      </div>

      <div className="grid-2" style={{ marginBottom:32 }}>
        {/* Department Usage */}
        <div className="card">
          <h3 style={{ marginBottom:16 }}>🏢 Department Usage</h3>
          {stats?.departmentUsage?.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {stats.departmentUsage.slice(0,6).map((d) => (
                <div key={d.department} style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:13, color:'var(--text-muted)', width:160, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.department}</span>
                  <div style={{ flex:1, height:8, background:'var(--surface-2)', borderRadius:4, overflow:'hidden' }}>
                    <div style={{
                      height:'100%',
                      width: `${Math.min(100, (d.total_bookings / 16) * 100)}%`,
                      background:'var(--accent)',
                      borderRadius:4,
                      transition:'width 1s ease',
                    }} />
                  </div>
                  <span className="mono" style={{ fontSize:12, color:'var(--text-dim)', width:30, textAlign:'right' }}>{d.total_bookings}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding:'30px 0' }}>
              <div className="icon">📊</div>
              <p>No usage data yet</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 style={{ marginBottom:16 }}>📋 Recent Activity</h3>
          {stats?.recentActivity?.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {stats.recentActivity.map((log) => (
                <div key={log.id} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <ActivityDot type={log.type} />
                  <div>
                    <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.4 }}>{log.message}</div>
                    <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding:'30px 0' }}>
              <div className="icon">🔔</div>
              <p>No recent activity</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 style={{ marginBottom:16 }}>⚡ Quick Actions</h3>
        <div className="flex gap-3" style={{ flexWrap:'wrap' }}>
          <Link to="/book"    className="btn btn-secondary">📅 Book a Room</Link>
          <Link to="/queue"   className="btn btn-secondary">☰ View Queue</Link>
          <Link to="/history" className="btn btn-secondary">◷ My Bookings</Link>
          <Link to="/rooms"   className="btn btn-secondary">⬡ Room List</Link>
          {user?.role === 'admin' && (
            <Link to="/admin" className="btn btn-secondary" style={{ borderColor:'var(--yellow)', color:'var(--yellow)' }}>⚙ Admin Panel</Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Role banner exported for DashboardPage internal use ──────
// (appended; actual banner rendered below via RoleBanner component)
