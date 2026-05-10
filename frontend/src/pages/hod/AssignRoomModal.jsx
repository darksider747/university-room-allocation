import { useState, useEffect } from 'react';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import './HodDashboard.css';

export default function AssignRoomModal({ entry, onClose, onSaved }) {
  const [rooms,    setRooms]    = useState([]);
  const [roomId,   setRoomId]   = useState(entry.room_id || '');
  const [reason,   setReason]   = useState('');
  const [saving,   setSaving]   = useState(false);
  const [aiRecs,   setAiRecs]   = useState([]);
  const [aiLoaded, setAiLoaded] = useState(false);
  const [conflict, setConflict] = useState(null);

  useEffect(() => {
    api.get('/rooms').then((r) => setRooms(r.data.rooms || []));
    // Auto-load AI recommendations for this slot
    const q = new URLSearchParams({
      dayOfWeek: entry.day_of_week,
      startTime: entry.start_time?.slice(0, 5) || '08:00',
      endTime:   entry.end_time?.slice(0, 5)   || '10:00',
      studentStrength: 40,
      excludeEntryId: entry.id,
    });
    api.get(`/hod/ai-recommend?${q}`)
      .then((r) => { setAiRecs(r.data.recommendations?.slice(0, 4) || []); setAiLoaded(true); })
      .catch(() => setAiLoaded(true));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!roomId) { toast.error('Please select a room.'); return; }
    setConflict(null);
    setSaving(true);
    try {
      await api.patch(`/hod/timetable/${entry.id}/room`, { roomId: parseInt(roomId), reason });
      toast.success('Room assigned! Students notified.');
      onSaved();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed.';
      if (err.response?.status === 409) setConflict(msg);
      else toast.error(msg);
    } finally { setSaving(false); }
  };

  const days = ['Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box fade-in" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h2>🏠 Assign Room — {entry.subject_name}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Entry Info */}
          <div style={{
            background: 'var(--surface-2)', borderRadius: 10,
            padding: '12px 16px', marginBottom: 20,
            display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13,
          }}>
            <span>📅 {days[entry.day_of_week]}</span>
            <span className="mono">🕐 {entry.start_time?.slice(0,5)}–{entry.end_time?.slice(0,5)}</span>
            <span>👥 {entry.section}</span>
            {entry.room_number && <span>📍 Current: <strong>{entry.room_number}</strong></span>}
          </div>

          {conflict && (
            <div style={{ background: 'var(--red-dim)', borderRadius: 10, padding: '12px 14px', color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>
              ⛔ {conflict}
            </div>
          )}

          {/* AI Suggestions */}
          {aiLoaded && aiRecs.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                🤖 AI Suggestions
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {aiRecs.map((rec) => (
                  <button
                    key={rec.room.id}
                    onClick={() => setRoomId(String(rec.room.id))}
                    style={{
                      background: roomId === String(rec.room.id) ? 'var(--accent-dim)' : 'var(--surface-2)',
                      border: `1px solid ${roomId === String(rec.room.id) ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
                      textAlign: 'left', transition: 'all 0.15s',
                      opacity: rec.is_available ? 1 : 0.5,
                    }}
                    disabled={!rec.is_available}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{rec.room.room_number}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rec.room.capacity} seats · {rec.room.room_type}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <span style={{ fontSize: 10, color: 'var(--green)' }}>Score: {rec.score}</span>
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 4,
                        background: rec.badge === 'Best Match' ? 'var(--green-dim)' : 'var(--blue-dim)',
                        color: rec.badge === 'Best Match' ? 'var(--green)' : 'var(--blue)',
                      }}>{rec.badge}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual Select */}
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Or select room manually</label>
              <select className="form-select" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                <option value="">Choose a room…</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.room_number} — {r.room_type} — {r.capacity} seats — {r.building}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Reason for change (optional)</label>
              <input className="form-input" placeholder="e.g. Lab equipment needed"
                value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="modal-footer" style={{ padding: 0 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving || !roomId}>
                {saving ? <><div className="spinner" /> Assigning…</> : '✓ Assign Room'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
