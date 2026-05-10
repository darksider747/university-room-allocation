import { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['pending', 'allocated', 'failed'];

export default function QueuePage() {
  const { user } = useAuth();
  const [queue,      setQueue]      = useState([]);
  const [meta,       setMeta]       = useState({});
  const [loading,    setLoading]    = useState(true);
  const [processing, setProcessing] = useState(false);
  const [status,     setStatus]     = useState('pending');

  const load = (s = status) => {
    setLoading(true);
    api.get(`/queue?status=${s}&limit=50`)
      .then((r) => { setQueue(r.data.data || []); setMeta(r.data.pagination || {}); })
      .catch(() => toast.error('Failed to load queue'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(status); }, [status]);

  const processNext = async () => {
    setProcessing(true);
    try {
      const res = await api.post('/process/next');
      if (res.data.processed === null) {
        toast('Queue is empty.', { icon: 'ℹ️' });
      } else if (res.data.success) {
        toast.success(res.data.message);
      } else {
        toast.error(res.data.message);
      }
      load(status);
    } catch (err) {
      toast.error('Failed to process queue.');
    } finally {
      setProcessing(false);
    }
  };

  const processAll = async () => {
    setProcessing(true);
    try {
      const res = await api.post('/process/all');
      const s = res.data.summary || {};
      toast.success(`Processed ${s.total}: ${s.succeeded} ✓  ${s.failed} ✗`);
      load(status);
    } catch (err) {
      toast.error('Failed to process queue.');
    } finally {
      setProcessing(false);
    }
  };

  const cancelRequest = async (id) => {
    if (!confirm('Cancel this booking request?')) return;
    try {
      await api.delete(`/queue/${id}`);
      toast.success('Request cancelled.');
      load(status);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel.');
    }
  };

  const statusBadge = (s) => {
    const map = { pending: 'badge-warning', allocated: 'badge-success', failed: 'badge-error' };
    const icons = { pending: '⏳', allocated: '✓', failed: '✕' };
    return <span className={`badge ${map[s]}`}>{icons[s]} {s}</span>;
  };

  return (
    <div className="fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>☰ Booking Queue</h1>
          <p>{meta.total ?? 0} requests · showing {status}</p>
        </div>

        {/* Admin Process Controls */}
        {user?.role === 'admin' && (
          <div className="flex gap-2">
            <button
              className="btn btn-success"
              onClick={processNext}
              disabled={processing || status !== 'pending'}
            >
              {processing ? <><div className="spinner" /> Processing…</> : '▶ Process Next'}
            </button>
            <button
              className="btn btn-primary"
              onClick={processAll}
              disabled={processing || status !== 'pending'}
            >
              {processing ? <><div className="spinner" /> Processing…</> : '⏩ Process All'}
            </button>
          </div>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex gap-2" style={{ marginBottom: 20 }}>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatus(s)}
          >
            {s === 'pending' ? '⏳' : s === 'allocated' ? '✓' : '✕'} {s}
          </button>
        ))}
        <button className="btn btn-secondary btn-sm" onClick={() => load(status)} style={{ marginLeft: 'auto' }}>
          ↺ Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      ) : queue.length === 0 ? (
        <div className="empty-state">
          <div className="icon">{status === 'pending' ? '🎉' : '📭'}</div>
          <h3>{status === 'pending' ? 'Queue is empty!' : `No ${status} requests`}</h3>
          <p>{status === 'pending' ? 'All requests have been processed.' : `No requests with status "${status}".`}</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Lecture / Subject</th>
                <th>Department</th>
                <th>Date</th>
                <th>Time Slot</th>
                <th>Semester</th>
                <th>Preferred Room</th>
                <th>Status</th>
                <th>Queued At</th>
                {status === 'pending' && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {queue.map((item, idx) => (
                <tr key={item.id}>
                  <td>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--text-dim)' }}>#{item.id}</div>
                    {status === 'pending' && (
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'var(--accent-dim)', color: 'var(--accent-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, marginTop: 4
                      }}>{idx + 1}</div>
                    )}
                  </td>
                  <td style={{ fontWeight: 500 }}>{item.lecture_name}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.department}</td>
                  <td>
                    <span className="mono" style={{ fontSize: 13 }}>
                      {new Date(item.booking_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: 13, color: 'var(--accent-light)' }}>
                      {item.start_time?.slice(0,5)} – {item.end_time?.slice(0,5)}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.semester_label}</td>
                  <td style={{ fontSize: 13 }}>
                    {item.specific_room_number
                      ? <span className="badge badge-accent">{item.specific_room_number}</span>
                      : <span style={{ color: 'var(--text-dim)' }}>Any</span>
                    }
                  </td>
                  <td>{statusBadge(item.status)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    {new Date(item.queued_at).toLocaleString()}
                  </td>
                  {status === 'pending' && (
                    <td>
                      {(user?.role === 'admin' || item.user_id === user?.id) && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => cancelRequest(item.id)}
                        >
                          ✕ Cancel
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
