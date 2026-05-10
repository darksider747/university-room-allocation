import { useState } from 'react';
import api from '../../services/api.js';
import './HodDashboard.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TYPES = ['classroom', 'lab', 'smart', 'seminar', 'auditorium'];

function ScoreBar({ score, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          width: `${score}%`, height: '100%', borderRadius: 3,
          background: score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--accent)' : score >= 40 ? 'var(--yellow)' : 'var(--red)',
          transition: 'width 0.6s ease',
        }} />
      </div>
      <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', width: 28 }}>{score}</span>
    </div>
  );
}

function RoomCard({ rec, onSelect }) {
  const badgeColor = {
    'Best Match':      { bg: 'var(--green-dim)',  color: 'var(--green)'  },
    'Good Fit':        { bg: 'var(--blue-dim)',   color: 'var(--blue)'   },
    'Acceptable':      { bg: 'var(--yellow-dim)', color: 'var(--yellow)' },
    'Not Recommended': { bg: 'var(--red-dim)',    color: 'var(--red)'    },
  }[rec.badge] || {};

  return (
    <div style={{
      background: 'var(--surface-2)',
      border: `1px solid ${rec.is_available ? 'var(--border)' : 'var(--red-dim)'}`,
      borderRadius: 12,
      padding: '16px',
      opacity: rec.is_available ? 1 : 0.6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{rec.room.room_number}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {rec.room.building} · Floor {rec.room.floor} · {rec.room.capacity} seats
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
            {rec.room.room_type}{rec.room.lab_type ? ` · ${rec.room.lab_type}` : ''}
            {rec.room.has_projector ? ' · 📽 Projector' : ''}
            {rec.room.has_ac ? ' · ❄ AC' : ''}
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: badgeColor.bg, color: badgeColor.color }}>
          {rec.badge}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
          <span style={{ color: 'var(--text-dim)' }}>Match Score</span>
          <ScoreBar score={rec.score} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
          <span style={{ color: 'var(--text-dim)' }}>Conflict Risk</span>
          <ScoreBar score={rec.conflict_probability} />
        </div>
      </div>

      {rec.reasons.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {rec.reasons.slice(0, 2).map((r, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--green)', display: 'flex', gap: 4, marginBottom: 2 }}>
              <span>✓</span><span>{r}</span>
            </div>
          ))}
          {rec.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--yellow)', display: 'flex', gap: 4, marginBottom: 2 }}>
              <span>⚠</span><span>{w}</span>
            </div>
          ))}
        </div>
      )}

      <button
        className="btn btn-primary btn-sm"
        style={{ width: '100%' }}
        disabled={!rec.is_available}
        onClick={() => onSelect(rec.room.id)}
      >
        {rec.is_available ? '✓ Use This Room' : '⛔ Unavailable'}
      </button>
    </div>
  );
}

export default function AiRecommendModal({ onClose, onSelect }) {
  const [params, setParams] = useState({
    studentStrength: 40, requiredType: 'classroom', labType: '',
    dayOfWeek: 0, startTime: '08:00', endTime: '10:00',
  });
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        studentStrength: params.studentStrength,
        requiredType:    params.requiredType,
        dayOfWeek:       params.dayOfWeek,
        startTime:       params.startTime,
        endTime:         params.endTime,
        ...(params.labType && { labType: params.labType }),
      });
      const r = await api.get(`/hod/ai-recommend?${q}`);
      setResults(r.data.recommendations || []);
      setSearched(true);
    } catch { setResults([]); }
    finally { setLoading(false); }
  };

  const set = (k, v) => setParams((p) => ({ ...p, [k]: v }));

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box fade-in" style={{ maxWidth: 860 }}>
        <div className="modal-header">
          <h2>🤖 AI Room Recommendations</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label">Day of Week</label>
              <select className="form-select" value={params.dayOfWeek} onChange={(e) => set('dayOfWeek', parseInt(e.target.value))}>
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input type="time" className="form-input" value={params.startTime} onChange={(e) => set('startTime', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">End Time</label>
              <input type="time" className="form-input" value={params.endTime} onChange={(e) => set('endTime', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Student Strength</label>
              <input type="number" className="form-input" value={params.studentStrength} min={1} max={500} onChange={(e) => set('studentStrength', parseInt(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Room Type Required</label>
              <select className="form-select" value={params.requiredType} onChange={(e) => set('requiredType', e.target.value)}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Lab Type (if lab)</label>
              <input className="form-input" placeholder="e.g. CS Lab" value={params.labType} onChange={(e) => set('labType', e.target.value)} />
            </div>
          </div>

          <button className="btn btn-primary" onClick={search} disabled={loading} style={{ marginBottom: 24 }}>
            {loading ? <><div className="spinner" /> Analysing…</> : '🤖 Get Recommendations'}
          </button>

          {/* Results */}
          {searched && (
            results.length === 0 ? (
              <div className="empty-state"><div className="icon">🏫</div><h3>No rooms found</h3><p>Try adjusting your filters.</p></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {results.map((rec, i) => (
                  <RoomCard
                    key={rec.room.id}
                    rec={rec}
                    onSelect={(roomId) => onSelect(roomId, { dayOfWeek: params.dayOfWeek, ...params })}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
