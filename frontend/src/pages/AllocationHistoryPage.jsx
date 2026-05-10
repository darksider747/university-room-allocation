import { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between" style={{ marginTop: 20, padding: '0 4px' }}>
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Page {page} of {pages}</span>
      <div className="flex gap-2">
        <button className="btn btn-secondary btn-sm" onClick={() => onPage(page - 1)} disabled={page <= 1}>← Prev</button>
        <button className="btn btn-secondary btn-sm" onClick={() => onPage(page + 1)} disabled={page >= pages}>Next →</button>
      </div>
    </div>
  );
}

export default function AllocationHistoryPage() {
  const { user } = useAuth();
  const [data,    setData]    = useState([]);
  const [meta,    setMeta]    = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState('');

  const load = (p = 1) => {
    setLoading(true);
    api.get(`/allocations?page=${p}&limit=15`)
      .then((r) => {
        setData(r.data.data || []);
        setMeta(r.data.pagination || {});
        setPage(p);
      })
      .catch(() => toast.error('Failed to load allocations'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  const filtered = search
    ? data.filter((a) =>
        a.lecture_name.toLowerCase().includes(search.toLowerCase()) ||
        a.department.toLowerCase().includes(search.toLowerCase()) ||
        a.room_number.toLowerCase().includes(search.toLowerCase())
      )
    : data;

  return (
    <div className="fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>◷ {user?.role === 'admin' ? 'All Allocations' : 'My Bookings'}</h1>
          <p>
            {user?.role === 'admin'
              ? `${meta.total} total allocations in the system`
              : 'Your confirmed room allocations'}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => load(1)}>↺ Refresh</button>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <input
          className="form-input"
          placeholder="🔍 Search by lecture, department, or room…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          <h3>No allocations found</h3>
          <p>{search ? 'Try a different search term.' : 'No room allocations yet.'}</p>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#ID</th>
                  <th>Room</th>
                  <th>Lecture / Subject</th>
                  <th>Department</th>
                  <th>Date</th>
                  <th>Time Slot</th>
                  <th>Semester</th>
                  {user?.role === 'admin' && <th>Booked By</th>}
                  <th>Allocated At</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td><span className="mono" style={{ color: 'var(--text-dim)', fontSize: 12 }}>#{a.id}</span></td>
                    <td>
                      <span className="badge badge-accent">{a.room_number}</span>
                    </td>
                    <td style={{ fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.lecture_name}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{a.department}</td>
                    <td>
                      <span className="mono" style={{ fontSize: 13 }}>
                        {new Date(a.booking_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: 13, color: 'var(--accent-light)' }}>
                        {a.start_time?.slice(0, 5)} – {a.end_time?.slice(0, 5)}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{a.semester_label}</td>
                    {user?.role === 'admin' && (
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{a.user_name || '—'}</td>
                    )}
                    <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                      {new Date(a.allocated_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={meta.page} pages={meta.pages} onPage={load} />
        </>
      )}
    </div>
  );
}
