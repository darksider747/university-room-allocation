import { useState, useEffect } from 'react';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import './HodDashboard.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function EntryFormModal({ defaultDay, semesterId, dept, onClose, onSaved }) {
  const [form, setForm] = useState({
    semesterId:  semesterId || '',
    roomId:      '',
    facultyId:   '',
    subjectName: '',
    section:     'A',
    dayOfWeek:   defaultDay ?? 0,
    startTime:   '08:00',
    endTime:     '10:00',
    notes:       '',
    isRecurring: true,
  });
  const [faculty,   setFaculty]   = useState([]);
  const [rooms,     setRooms]     = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [saving,    setSaving]    = useState(false);
  const [conflict,  setConflict]  = useState(null);

  useEffect(() => {
    api.get('/hod/department').then((r) => setFaculty(r.data.faculty || []));
    api.get('/rooms').then((r) => setRooms(r.data.rooms || []));
    api.get('/semesters').then((r) => setSemesters(r.data.semesters || []));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setConflict(null);
    if (form.endTime <= form.startTime) { toast.error('End time must be after start time.'); return; }
    setSaving(true);
    try {
      await api.post('/hod/timetable', {
        ...form,
        semesterId:  parseInt(form.semesterId),
        dayOfWeek:   parseInt(form.dayOfWeek),
        roomId:      form.roomId ? parseInt(form.roomId) : null,
        facultyId:   form.facultyId ? parseInt(form.facultyId) : null,
      });
      toast.success('Timetable entry created!');
      onSaved();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to create entry.';
      if (err.response?.status === 409) setConflict(msg);
      else toast.error(msg);
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box fade-in" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2>＋ New Timetable Entry</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {conflict && (
              <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 14px', color: 'var(--red)', fontSize: 13 }}>
                ⛔ {conflict}
              </div>
            )}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Subject Name *</label>
                <input className="form-input" placeholder="Data Structures" value={form.subjectName}
                  onChange={(e) => set('subjectName', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Section *</label>
                <input className="form-input" placeholder="CS-5A" value={form.section}
                  onChange={(e) => set('section', e.target.value)} required />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Day of Week *</label>
                <select className="form-select" value={form.dayOfWeek} onChange={(e) => set('dayOfWeek', parseInt(e.target.value))}>
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Semester *</label>
                <select className="form-select" value={form.semesterId} onChange={(e) => set('semesterId', e.target.value)} required>
                  <option value="">Select…</option>
                  {semesters.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Start Time *</label>
                <input type="time" className="form-input" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">End Time *</label>
                <input type="time" className="form-input" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Faculty (optional)</label>
              <select className="form-select" value={form.facultyId} onChange={(e) => set('facultyId', e.target.value)}>
                <option value="">Not assigned yet</option>
                {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Room (optional — assign now or later)</label>
              <select className="form-select" value={form.roomId} onChange={(e) => set('roomId', e.target.value)}>
                <option value="">Assign later</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.room_number} ({r.room_type}, {r.capacity} seats)
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" placeholder="Any special requirements…" value={form.notes}
                onChange={(e) => set('notes', e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><div className="spinner" /> Saving…</> : '＋ Create Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
