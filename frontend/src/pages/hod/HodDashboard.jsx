import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import AiRecommendModal from './AiRecommendModal.jsx';
import EntryFormModal from './EntryFormModal.jsx';
import AssignRoomModal from './AssignRoomModal.jsx';
import './HodDashboard.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const STATUS_COLOR = {
  draft:     { bg: 'var(--yellow-dim)', color: 'var(--yellow)',       border: 'rgba(245,158,11,0.2)' },
  approved:  { bg: 'var(--blue-dim)',   color: 'var(--blue)',         border: 'rgba(59,130,246,0.2)' },
  published: { bg: 'var(--green-dim)',  color: 'var(--green)',        border: 'rgba(34,197,94,0.2)'  },
  cancelled: { bg: 'var(--red-dim)',    color: 'var(--red)',          border: 'rgba(239,68,68,0.2)'  },
};

function StatusBadge({ status }) {
  const s = STATUS_COLOR[status] || STATUS_COLOR.draft;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px',
      borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      textTransform: 'capitalize',
    }}>{status}</span>
  );
}

function TimeSlot({ entry, onAssignRoom, onApprove, onCancel, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={`slot-card ${entry.status}`}
      style={{ borderLeft: `3px solid ${STATUS_COLOR[entry.status]?.color || 'var(--border)'}` }}
    >
      <div className="slot-header" onClick={() => setExpanded((e) => !e)}>
        <div className="slot-time mono">
          {entry.start_time?.slice(0, 5)}–{entry.end_time?.slice(0, 5)}
        </div>
        <div className="slot-main">
          <div className="slot-subject">{entry.subject_name}</div>
          <div className="slot-meta">
            <span className="slot-section">{entry.section}</span>
            {entry.room_number
              ? <span className="slot-room">📍 {entry.room_number}</span>
              : <span className="slot-no-room">⚠ No room</span>}
          </div>
        </div>
        <div className="slot-right">
          <StatusBadge status={entry.status} />
          <span style={{ color: 'var(--text-dim)', marginLeft: 8 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="slot-detail fade-in">
          <div className="slot-detail-row">
            <span>Faculty</span><span>{entry.faculty_name || '—'}</span>
          </div>
          <div className="slot-detail-row">
            <span>Room</span>
            <span>{entry.room_number || 'Not assigned'}
              {entry.room_type && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-dim)' }}>({entry.room_type})</span>}
            </span>
          </div>
          {entry.notes && (
            <div className="slot-detail-row"><span>Notes</span><span>{entry.notes}</span></div>
          )}
          <div className="slot-actions">
            {entry.status === 'draft' && (
              <>
                <button className="btn btn-secondary btn-sm" onClick={() => onAssignRoom(entry)}>
                  🏠 {entry.room_id ? 'Change Room' : 'Assign Room'}
                </button>
                {entry.room_id && (
                  <button className="btn btn-success btn-sm" onClick={() => onApprove(entry.id)}>
                    ✓ Approve
                  </button>
                )}
                <button className="btn btn-danger btn-sm" onClick={() => onDelete(entry.id)}>
                  🗑 Delete
                </button>
              </>
            )}
            {entry.status === 'approved' && (
              <button className="btn btn-secondary btn-sm" onClick={() => onAssignRoom(entry)}>
                🔄 Change Room
              </button>
            )}
            {['draft', 'approved', 'published'].includes(entry.status) && (
              <button className="btn btn-danger btn-sm" onClick={() => onCancel(entry.id)}>
                ❌ Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HodDashboard() {
  const [dept,       setDept]       = useState(null);
  const [entries,    setEntries]    = useState([]);
  const [semesters,  setSemesters]  = useState([]);
  const [semId,      setSemId]      = useState('');
  const [loading,    setLoading]    = useState(true);
  const [publishing, setPublishing] = useState(false);

  // Modals
  const [showForm,   setShowForm]   = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showAi,     setShowAi]     = useState(false);
  const [editEntry,  setEditEntry]  = useState(null);

  const loadDept = useCallback(() => {
    api.get('/hod/department').then((r) => setDept(r.data.department)).catch(() => {});
  }, []);

  const loadEntries = useCallback(() => {
    if (!semId) return;
    setLoading(true);
    api.get(`/hod/timetable?semesterId=${semId}`)
      .then((r) => setEntries(r.data.entries || []))
      .catch(() => toast.error('Failed to load timetable'))
      .finally(() => setLoading(false));
  }, [semId]);

  useEffect(() => {
    api.get('/semesters').then((r) => {
      const list = r.data.semesters || [];
      setSemesters(list);
      if (list.length) setSemId(String(list[list.length - 1].id));
    });
    loadDept();
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const approve = async (id) => {
    try {
      await api.patch(`/hod/timetable/${id}/approve`);
      toast.success('Entry approved!');
      loadEntries();
    } catch (err) { toast.error(err.response?.data?.error || 'Approval failed.'); }
  };

  const cancel = async (id) => {
    const reason = prompt('Reason for cancellation (optional):');
    try {
      await api.patch(`/hod/timetable/${id}/cancel`, { reason });
      toast.success('Entry cancelled and students notified.');
      loadEntries();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  };

  const deleteEntry = async (id) => {
    if (!confirm('Delete this draft entry?')) return;
    try {
      await api.delete(`/hod/timetable/${id}`);
      toast.success('Deleted.');
      loadEntries();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  };

  const publish = async () => {
    if (!confirm('Publish all approved entries? Students will be notified.')) return;
    setPublishing(true);
    try {
      const r = await api.post('/hod/timetable/publish', { semesterId: parseInt(semId) });
      toast.success(r.data.message);
      loadEntries();
    } catch (err) { toast.error(err.response?.data?.error || 'Publish failed.'); }
    finally { setPublishing(false); }
  };

  // Group entries by day
  const byDay = DAYS.reduce((acc, _, i) => {
    acc[i] = entries.filter((e) => e.day_of_week === i);
    return acc;
  }, {});

  const draftCount    = entries.filter((e) => e.status === 'draft').length;
  const approvedCount = entries.filter((e) => e.status === 'approved').length;
  const publishedCount= entries.filter((e) => e.status === 'published').length;
  const noRoomCount   = entries.filter((e) => !e.room_id && e.status !== 'cancelled').length;

  return (
    <div className="hod-dashboard fade-in">
      {/* Page Header */}
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>🗓 Timetable Management</h1>
          <p>{dept?.name || 'Loading department…'} · HOD Dashboard</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setShowAi(true)}>
            🤖 AI Room Finder
          </button>
          <button className="btn btn-primary" onClick={() => { setEditEntry(null); setShowForm(true); }}>
            ＋ Add Entry
          </button>
          {approvedCount > 0 && (
            <button className="btn btn-success" onClick={publish} disabled={publishing}>
              {publishing ? <><div className="spinner" /> Publishing…</> : '📣 Publish All'}
            </button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card yellow">
          <div className="stat-icon">📝</div>
          <div className="stat-value">{draftCount}</div>
          <div className="stat-label">Draft entries</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon">✓</div>
          <div className="stat-value">{approvedCount}</div>
          <div className="stat-label">Approved</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">📣</div>
          <div className="stat-value">{publishedCount}</div>
          <div className="stat-label">Published</div>
        </div>
        <div className="stat-card" style={{ borderTop: noRoomCount ? '3px solid var(--red)' : undefined }}>
          <div className="stat-icon">⚠</div>
          <div className="stat-value" style={{ color: noRoomCount ? 'var(--red)' : undefined }}>{noRoomCount}</div>
          <div className="stat-label">Need room assignment</div>
        </div>
      </div>

      {/* Semester Selector */}
      <div className="flex gap-3 items-center" style={{ marginBottom: 20 }}>
        <label className="form-label" style={{ whiteSpace: 'nowrap', margin: 0 }}>Semester:</label>
        <select
          className="form-select"
          style={{ maxWidth: 200 }}
          value={semId}
          onChange={(e) => setSemId(e.target.value)}
        >
          {semesters.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <button className="btn btn-secondary btn-sm" onClick={loadEntries}>↺ Refresh</button>
      </div>

      {/* Weekly Timetable Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <div className="spinner" style={{ width: 48, height: 48 }} />
        </div>
      ) : (
        <div className="timetable-grid">
          {DAYS.map((day, i) => (
            <div key={day} className="day-column">
              <div className="day-header">
                <span className="day-name">{day}</span>
                <span className="day-count">{byDay[i].length} class{byDay[i].length !== 1 ? 'es' : ''}</span>
              </div>
              <div className="day-slots">
                {byDay[i].length === 0 ? (
                  <div className="day-empty">No classes</div>
                ) : (
                  byDay[i]
                    .sort((a, b) => a.start_time.localeCompare(b.start_time))
                    .map((entry) => (
                      <TimeSlot
                        key={entry.id}
                        entry={entry}
                        onAssignRoom={(e) => { setEditEntry(e); setShowAssign(true); }}
                        onApprove={approve}
                        onCancel={cancel}
                        onDelete={deleteEntry}
                      />
                    ))
                )}
                <button
                  className="add-slot-btn"
                  onClick={() => { setEditEntry({ day_of_week: i }); setShowForm(true); }}
                >
                  ＋
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <EntryFormModal
          defaultDay={editEntry?.day_of_week}
          semesterId={semId}
          dept={dept}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadEntries(); }}
        />
      )}
      {showAssign && editEntry && (
        <AssignRoomModal
          entry={editEntry}
          onClose={() => setShowAssign(false)}
          onSaved={() => { setShowAssign(false); loadEntries(); }}
        />
      )}
      {showAi && (
        <AiRecommendModal
          onClose={() => setShowAi(false)}
          onSelect={(roomId, params) => {
            setShowAi(false);
            setEditEntry({ day_of_week: params.dayOfWeek, prefillRoomId: roomId });
            setShowForm(true);
          }}
        />
      )}
    </div>
  );
}
