import { useState, useEffect } from 'react';
import api from '../../services/api.js';
import toast from 'react-hot-toast';

const DAYS   = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const PREFS  = ['available','preferred','unavailable'];
const PREF_COLOR = {
  available:   { bg: 'var(--green-dim)',  color: 'var(--green)'  },
  preferred:   { bg: 'var(--blue-dim)',   color: 'var(--blue)'   },
  unavailable: { bg: 'var(--red-dim)',    color: 'var(--red)'    },
};

export default function FacultySchedulePage() {
  const [schedule, setSchedule]   = useState([]);
  const [prefs,    setPrefs]      = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [showPref, setShowPref]   = useState(false);
  const [prefForm, setPrefForm]   = useState({ dayOfWeek: 0, startTime: '08:00', endTime: '10:00', preference: 'unavailable', reason: '' });
  const [saving,   setSaving]     = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/faculty/schedule'),
      api.get('/faculty/preferences'),
    ])
      .then(([s, p]) => {
        setSchedule(s.data.schedule || []);
        setPrefs(p.data.preferences || []);
      })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const byDay = DAYS.reduce((acc, _, i) => {
    acc[i] = schedule.filter((e) => e.day_of_week === i);
    return acc;
  }, {});

  const submitPref = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await api.post('/faculty/preferences', prefForm);
      setPrefs((p) => {
        const existing = p.findIndex((x) =>
          x.day_of_week === prefForm.dayOfWeek &&
          x.start_time === prefForm.startTime &&
          x.end_time === prefForm.endTime
        );
        if (existing >= 0) { const n = [...p]; n[existing] = r.data.preference; return n; }
        return [...p, r.data.preference];
      });
      toast.success('Preference saved.');
      setShowPref(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed.');
    } finally { setSaving(false); }
  };

  const deletePref = async (id) => {
    await api.delete(`/faculty/preferences/${id}`).catch(() => {});
    setPrefs((p) => p.filter((x) => x.id !== id));
    toast.success('Preference removed.');
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </div>
  );

  return (
    <div className="fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>🗓 My Teaching Schedule</h1>
          <p>{schedule.length} assigned classes · {prefs.length} availability preferences set</p>
        </div>
        <button className="btn btn-secondary" onClick={() => setShowPref(true)}>
          + Mark Availability
        </button>
      </div>

      {/* Weekly timetable */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {DAYS.map((day, i) => (
          <div key={i} className="card" style={{ padding: 16 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: 'var(--text)',
              marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)',
            }}>{day}</div>

            {byDay[i].length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '8px 0' }}>No classes</div>
            ) : (
              byDay[i]
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .map((cls) => (
                  <div key={cls.id} style={{
                    background: 'var(--surface-2)', borderRadius: 8,
                    padding: '10px 12px', marginBottom: 8,
                    borderLeft: '3px solid var(--accent)',
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{cls.subject_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                      <span className="mono">{cls.start_time?.slice(0,5)}–{cls.end_time?.slice(0,5)}</span>
                      {cls.room_number && <span> · 📍 {cls.room_number}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                      {cls.section} · {cls.department_name}
                    </div>
                  </div>
                ))
            )}
          </div>
        ))}
      </div>

      {/* Preferences */}
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>⚙ Availability Preferences</h3>
        {prefs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            No preferences set. Mark your unavailable timings so HOD can schedule around them.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {prefs.map((p) => {
              const pc = PREF_COLOR[p.preference] || {};
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', background: 'var(--surface-2)',
                  borderRadius: 10, border: '1px solid var(--border)',
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                    background: pc.bg, color: pc.color, textTransform: 'capitalize',
                  }}>{p.preference}</span>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{DAYS[p.day_of_week]}</span>
                  <span className="mono" style={{ fontSize: 13, color: 'var(--accent-light)' }}>
                    {p.start_time?.slice(0,5)}–{p.end_time?.slice(0,5)}
                  </span>
                  {p.reason && <span style={{ fontSize: 12, color: 'var(--text-dim)', flex: 1 }}>{p.reason}</span>}
                  <button
                    className="btn btn-danger btn-sm"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => deletePref(p.id)}
                  >✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add preference modal */}
      {showPref && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowPref(false)}>
          <div className="modal-box fade-in" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>Mark Availability</h2>
              <button className="modal-close" onClick={() => setShowPref(false)}>✕</button>
            </div>
            <form onSubmit={submitPref}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Day</label>
                  <select className="form-select" value={prefForm.dayOfWeek}
                    onChange={(e) => setPrefForm({ ...prefForm, dayOfWeek: parseInt(e.target.value) })}>
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input type="time" className="form-input" value={prefForm.startTime}
                      onChange={(e) => setPrefForm({ ...prefForm, startTime: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input type="time" className="form-input" value={prefForm.endTime}
                      onChange={(e) => setPrefForm({ ...prefForm, endTime: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Preference</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {PREFS.map((p) => (
                      <button key={p} type="button"
                        onClick={() => setPrefForm({ ...prefForm, preference: p })}
                        style={{
                          flex: 1, padding: '8px 4px', border: '1px solid',
                          borderRadius: 8, cursor: 'pointer', fontSize: 12,
                          fontWeight: 600, textTransform: 'capitalize', transition: 'all 0.15s',
                          background: prefForm.preference === p ? PREF_COLOR[p].bg : 'var(--surface-2)',
                          borderColor: prefForm.preference === p ? PREF_COLOR[p].color : 'var(--border)',
                          color: prefForm.preference === p ? PREF_COLOR[p].color : 'var(--text-muted)',
                        }}
                      >{p}</button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Reason (optional)</label>
                  <input className="form-input" placeholder="e.g. Research meeting"
                    value={prefForm.reason}
                    onChange={(e) => setPrefForm({ ...prefForm, reason: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPref(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><div className="spinner" /> Saving…</> : '✓ Save Preference'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
