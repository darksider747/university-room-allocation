import { useState, useEffect } from 'react';
import api from '../../services/api.js';
import toast from 'react-hot-toast';

function BarChart({ data, valueKey, labelKey, color = 'var(--accent)' }) {
  if (!data.length) return <div className="empty-state" style={{ padding: '20px 0' }}><p>No data yet.</p></div>;
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 120, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item[labelKey]}
          </span>
          <div style={{ flex: 1, height: 10, background: 'var(--surface-2)', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{
              width: `${(item[valueKey] / max) * 100}%`, height: '100%',
              background: color, borderRadius: 5, transition: 'width 0.8s ease',
            }} />
          </div>
          <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', width: 24, textAlign: 'right' }}>
            {item[valueKey]}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function HodAnalyticsPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/hod/analytics')
      .then((r) => setData(r.data))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div className="spinner" style={{ width: 48, height: 48 }} />
    </div>
  );

  if (!data) return null;

  const { stats, roomUtilization, facultyWorkload, topRooms } = data;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>📊 Department Analytics</h1>
        <p>{data.department?.name} · HOD Insights</p>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <div className="stat-card accent">
          <div className="stat-icon">📝</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total entries</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">📣</div>
          <div className="stat-value">{stats.published}</div>
          <div className="stat-label">Published</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-icon">📝</div>
          <div className="stat-value">{stats.drafts}</div>
          <div className="stat-label">Drafts</div>
        </div>
        <div className="stat-card" style={{ borderTop: stats.conflicts ? '3px solid var(--red)' : undefined }}>
          <div className="stat-icon">⚡</div>
          <div className="stat-value" style={{ color: stats.conflicts ? 'var(--red)' : undefined }}>{stats.conflicts}</div>
          <div className="stat-label">Conflicts detected</div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 20 }}>
        {/* Room Utilization */}
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>🏫 Room Utilization</h3>
          <BarChart data={roomUtilization} labelKey="room_number" valueKey="usage_count" color="var(--accent)" />
        </div>

        {/* Faculty Workload */}
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>👨‍🏫 Faculty Workload</h3>
          <BarChart data={facultyWorkload} labelKey="name" valueKey="classes_count" color="var(--green)" />
        </div>

        {/* Top Rooms */}
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>🏆 Most Used Rooms</h3>
          {topRooms.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}><p>No bookings yet.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topRooms.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', background: 'var(--surface-2)',
                  borderRadius: 10, border: '1px solid var(--border)',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: i === 0 ? 'var(--yellow-dim)' : 'var(--surface)',
                    border: `2px solid ${i === 0 ? 'var(--yellow)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    color: i === 0 ? 'var(--yellow)' : 'var(--text-muted)',
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.room_number}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.building}</div>
                  </div>
                  <span className="mono" style={{ fontSize: 14, color: 'var(--accent-light)' }}>
                    {r.bookings} bookings
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Schedule Health */}
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>✅ Schedule Health</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Published Rate', value: stats.total ? Math.round((stats.published / stats.total) * 100) : 0, color: 'var(--green)', suffix: '%' },
              { label: 'Draft Rate',     value: stats.total ? Math.round((stats.drafts    / stats.total) * 100) : 0, color: 'var(--yellow)', suffix: '%' },
              { label: 'Conflict Rate',  value: stats.total ? Math.round((stats.conflicts / stats.total) * 100) : 0, color: 'var(--red)', suffix: '%' },
            ].map(({ label, value, color, suffix }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span className="mono" style={{ color }}>{value}{suffix}</span>
                </div>
                <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.8s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
