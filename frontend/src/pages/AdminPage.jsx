import { useState, useEffect } from 'react';
import api from '../services/api.js';
import toast from 'react-hot-toast';

const TABS = ['Users', 'Allocations', 'Logs', 'Usage'];

export default function AdminPage() {
  const [tab, setTab] = useState('Users');

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>⚙ Admin Panel</h1>
        <p>Manage users, allocations, and system data.</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2" style={{ marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map((t) => (
          <button
            key={t}
            className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '8px 8px 0 0', borderBottom: tab === t ? 'none' : undefined }}
            onClick={() => setTab(t)}
          >
            {t === 'Users' ? '👥' : t === 'Allocations' ? '✓' : t === 'Logs' ? '📋' : '📊'} {t}
          </button>
        ))}
      </div>

      {tab === 'Users'       && <UsersTab />}
      {tab === 'Allocations' && <AllocationsTab />}
      {tab === 'Logs'        && <LogsTab />}
      {tab === 'Usage'       && <UsageTab />}
    </div>
  );
}

/* ── Users Tab ───────────────────────────────────────────── */
function UsersTab() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/admin/users')
      .then((r) => setUsers(r.data.users || []))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (id) => {
    try {
      const r = await api.patch(`/admin/users/${id}/status`);
      toast.success(`User ${r.data.action}`);
      load();
    } catch { toast.error('Failed to update user.'); }
  };

  const changeRole = async (id, role) => {
    try {
      await api.patch(`/admin/users/${id}/role`, { role });
      toast.success('Role updated.');
      load();
    } catch { toast.error('Failed to change role.'); }
  };

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:60 }}><div className="spinner" style={{ width:40, height:40 }} /></div>;

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>#ID</th><th>Name</th><th>Email</th><th>Department</th>
            <th>Role</th><th>Status</th><th>Joined</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td><span className="mono" style={{ fontSize:12, color:'var(--text-dim)' }}>#{u.id}</span></td>
              <td style={{ fontWeight:500 }}>{u.name}</td>
              <td style={{ fontSize:13, color:'var(--text-muted)' }}>{u.email}</td>
              <td style={{ fontSize:13, color:'var(--text-muted)' }}>{u.department || '—'}</td>
              <td>
                <select
                  value={u.role}
                  onChange={(e) => changeRole(u.id, e.target.value)}
                  style={{
                    background:'var(--surface-2)', border:'1px solid var(--border)',
                    borderRadius:6, padding:'4px 8px', color:'var(--text)',
                    fontSize:12, cursor:'pointer',
                  }}
                >
                  <option value="student">student</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td>
                <span className={`badge ${u.is_active ? 'badge-success' : 'badge-error'}`}>
                  {u.is_active ? '● Active' : '○ Inactive'}
                </span>
              </td>
              <td style={{ fontSize:12, color:'var(--text-dim)' }}>
                {new Date(u.created_at).toLocaleDateString()}
              </td>
              <td>
                <button
                  className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`}
                  onClick={() => toggleStatus(u.id)}
                >
                  {u.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Allocations Tab ─────────────────────────────────────── */
function AllocationsTab() {
  const [allocs, setAllocs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [meta, setMeta]       = useState({});

  const load = (p = 1) => {
    setLoading(true);
    api.get(`/allocations?page=${p}&limit=20`)
      .then((r) => { setAllocs(r.data.data || []); setMeta(r.data.pagination || {}); setPage(p); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const deleteAlloc = async (id) => {
    if (!confirm('Delete this allocation? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/allocations/${id}`);
      toast.success('Allocation deleted.');
      load(page);
    } catch { toast.error('Failed to delete.'); }
  };

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:60 }}><div className="spinner" style={{ width:40, height:40 }} /></div>;

  return (
    <>
      <div style={{ marginBottom:12, fontSize:13, color:'var(--text-muted)' }}>{meta.total} total allocations</div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>#</th><th>Room</th><th>Lecture</th><th>Dept</th><th>Date</th><th>Time</th><th>User</th><th>Delete</th></tr>
          </thead>
          <tbody>
            {allocs.map((a) => (
              <tr key={a.id}>
                <td><span className="mono" style={{ fontSize:12, color:'var(--text-dim)' }}>#{a.id}</span></td>
                <td><span className="badge badge-accent">{a.room_number}</span></td>
                <td style={{ fontWeight:500, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.lecture_name}</td>
                <td style={{ fontSize:13, color:'var(--text-muted)' }}>{a.department}</td>
                <td><span className="mono" style={{ fontSize:13 }}>{new Date(a.booking_date).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })}</span></td>
                <td><span className="mono" style={{ fontSize:13, color:'var(--accent-light)' }}>{a.start_time?.slice(0,5)} – {a.end_time?.slice(0,5)}</span></td>
                <td style={{ fontSize:13, color:'var(--text-muted)' }}>{a.user_name || '—'}</td>
                <td><button className="btn btn-danger btn-sm" onClick={() => deleteAlloc(a.id)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {meta.pages > 1 && (
        <div className="flex gap-2 items-center" style={{ marginTop:16 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => load(page - 1)} disabled={page <= 1}>← Prev</button>
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>Page {page} / {meta.pages}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => load(page + 1)} disabled={page >= meta.pages}>Next →</button>
        </div>
      )}
    </>
  );
}

/* ── Logs Tab ────────────────────────────────────────────── */
function LogsTab() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');

  useEffect(() => {
    api.get('/allocations/logs?limit=100')
      .then((r) => setLogs(r.data.logs || []))
      .catch(() => toast.error('Failed to load logs'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter ? logs.filter((l) => l.type === filter) : logs;
  const typeMap  = { success:'badge-success', error:'badge-error', info:'badge-info', warning:'badge-warning' };
  const iconMap  = { success:'✓', error:'✕', info:'ℹ', warning:'⚠' };

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:60 }}><div className="spinner" style={{ width:40, height:40 }} /></div>;

  return (
    <div>
      <div className="flex gap-2" style={{ marginBottom:16 }}>
        {['', 'success', 'error', 'info', 'warning'].map((t) => (
          <button key={t} className={`btn btn-sm ${filter === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(t)}>
            {t || 'All'}
          </button>
        ))}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {filtered.map((log) => (
          <div key={log.id} style={{
            background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:10, padding:'12px 16px',
            display:'flex', gap:12, alignItems:'flex-start',
          }}>
            <span className={`badge ${typeMap[log.type]}`}>{iconMap[log.type]}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, color:'var(--text)' }}>{log.message}</div>
              <div style={{ fontSize:12, color:'var(--text-dim)', marginTop:4 }}>
                {new Date(log.timestamp).toLocaleString()}
                {log.user_name && <> · <span style={{ color:'var(--text-muted)' }}>{log.user_name}</span></>}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="empty-state"><div className="icon">📋</div><h3>No logs</h3></div>
        )}
      </div>
    </div>
  );
}

/* ── Usage Tab ───────────────────────────────────────────── */
function UsageTab() {
  const [usage, setUsage]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/allocations/usage')
      .then((r) => setUsage(r.data.usage || []))
      .catch(() => toast.error('Failed to load usage'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:60 }}><div className="spinner" style={{ width:40, height:40 }} /></div>;

  return (
    <div>
      {usage.length === 0 ? (
        <div className="empty-state"><div className="icon">📊</div><h3>No usage data yet</h3></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Department</th><th>Semester</th><th>Allocated</th><th>Limit</th><th>Usage</th></tr>
            </thead>
            <tbody>
              {usage.map((u) => {
                const pct = Math.round((u.allocated_count / u.max_limit) * 100);
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight:500 }}>{u.department}</td>
                    <td><span className="badge badge-info">{u.semester_label}</span></td>
                    <td><span className="mono" style={{ fontSize:14 }}>{u.allocated_count}</span></td>
                    <td style={{ color:'var(--text-muted)' }}>{u.max_limit}</td>
                    <td style={{ minWidth:180 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ flex:1, height:8, background:'var(--surface-2)', borderRadius:4, overflow:'hidden' }}>
                          <div style={{
                            height:'100%', borderRadius:4, transition:'width 0.8s ease',
                            width:`${pct}%`,
                            background: pct >= 90 ? 'var(--red)' : pct >= 70 ? 'var(--yellow)' : 'var(--accent)',
                          }} />
                        </div>
                        <span className="mono" style={{ fontSize:12, color:'var(--text-muted)', width:36 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
