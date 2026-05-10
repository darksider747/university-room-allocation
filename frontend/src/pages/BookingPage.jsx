import { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const DEPARTMENTS = [
  'Computer Science','Artificial Intelligence','Software Engineering',
  'Electrical Engineering','Mechanical Engineering','Business Administration',
  'Mathematics','Physics','Chemistry','Bioinformatics',
];

const today = new Date().toISOString().split('T')[0];

export default function BookingPage() {
  const { user } = useAuth();
  const [rooms, setRooms]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({});
  const [result, setResult]     = useState(null);

  const [form, setForm] = useState({
    department:     user?.department || '',
    semesterYear:   new Date().getFullYear(),
    semesterNumber: 1,
    lectureName:    '',
    date:           today,
    startTime:      '08:00',
    endTime:        '10:00',
    specificRoomId: '',
    notes:          '',
  });

  useEffect(() => {
    api.get('/rooms').then((r) => setRooms(r.data.rooms || [])).catch(() => {});
  }, []);

  const handle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: null });
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setResult(null);
    setLoading(true);
    try {
      const payload = {
        ...form,
        semesterYear:   parseInt(form.semesterYear),
        semesterNumber: parseInt(form.semesterNumber),
        specificRoomId: form.specificRoomId || null,
      };
      const res = await api.post('/queue', payload);
      setResult({ type: 'success', data: res.data });
      toast.success(`Added to queue at position #${res.data.queuePosition}`);
      setForm((f) => ({ ...f, lectureName:'', notes:'' }));
    } catch (err) {
      const errs = err.response?.data?.errors;
      if (errs) {
        const map = {};
        errs.forEach((e) => { map[e.field] = e.message; });
        setErrors(map);
      } else {
        toast.error(err.response?.data?.error || 'Booking failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>📅 Book a Room</h1>
        <p>Submit a room booking request. Requests are allocated in FIFO order.</p>
      </div>

      <div className="grid-2" style={{ alignItems:'start' }}>
        {/* Form */}
        <div className="card">
          <h3 style={{ marginBottom:20 }}>Booking Details</h3>
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>

            <div className="form-group">
              <label className="form-label">Department *</label>
              <select name="department" className={`form-select ${errors.department?'error':''}`} value={form.department} onChange={handle} required>
                <option value="">Select department…</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.department && <span className="form-error">{errors.department}</span>}
            </div>

            <div className="flex gap-3">
              <div className="form-group" style={{ flex:1 }}>
                <label className="form-label">Semester Year *</label>
                <input name="semesterYear" type="number" className={`form-input ${errors.semesterYear?'error':''}`}
                  min="2020" max="2035" value={form.semesterYear} onChange={handle} required />
                {errors.semesterYear && <span className="form-error">{errors.semesterYear}</span>}
              </div>
              <div className="form-group" style={{ flex:1 }}>
                <label className="form-label">Semester # (1–8) *</label>
                <select name="semesterNumber" className="form-select" value={form.semesterNumber} onChange={handle} required>
                  {[1,2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>Semester {n}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Lecture / Subject Name *</label>
              <input name="lectureName" className={`form-input ${errors.lectureName?'error':''}`}
                placeholder="e.g. Data Structures Lab" value={form.lectureName} onChange={handle} required />
              {errors.lectureName && <span className="form-error">{errors.lectureName}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Booking Date *</label>
              <input name="date" type="date" className={`form-input ${errors.date?'error':''}`}
                min={today} value={form.date} onChange={handle} required />
              {errors.date && <span className="form-error">{errors.date}</span>}
            </div>

            <div className="flex gap-3">
              <div className="form-group" style={{ flex:1 }}>
                <label className="form-label">Start Time *</label>
                <input name="startTime" type="time" className={`form-input ${errors.startTime?'error':''}`}
                  value={form.startTime} onChange={handle} required />
                {errors.startTime && <span className="form-error">{errors.startTime}</span>}
              </div>
              <div className="form-group" style={{ flex:1 }}>
                <label className="form-label">End Time *</label>
                <input name="endTime" type="time" className={`form-input ${errors.endTime?'error':''}`}
                  value={form.endTime} onChange={handle} required />
                {errors.endTime && <span className="form-error">{errors.endTime}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Preferred Room <span style={{ color:'var(--text-dim)' }}>(optional)</span></label>
              <select name="specificRoomId" className="form-select" value={form.specificRoomId} onChange={handle}>
                <option value="">Any available room (recommended)</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.room_number} — {r.building}, Floor {r.floor}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Notes <span style={{ color:'var(--text-dim)' }}>(optional)</span></label>
              <textarea name="notes" className="form-textarea" placeholder="Any additional info…"
                value={form.notes} onChange={handle} />
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop:4 }}>
              {loading ? <><div className="spinner" /> Submitting…</> : '📋 Add to Queue'}
            </button>
          </form>
        </div>

        {/* Info + Result Panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {result && (
            <div className="card" style={{ borderColor:'var(--green)', background:'var(--green-dim)' }}>
              <h3 style={{ color:'var(--green)', marginBottom:12 }}>✓ Request Queued!</h3>
              <div style={{ fontSize:14, color:'var(--text)', display:'flex', flexDirection:'column', gap:6 }}>
                <div>Queue Position: <strong className="mono">#{result.data.queuePosition}</strong></div>
                <div>Request ID: <strong className="mono">#{result.data.request?.id}</strong></div>
                <p style={{ marginTop:8, fontSize:13 }}>
                  Your request has been added. Ask an admin to process the queue, or wait for auto-processing.
                </p>
              </div>
            </div>
          )}

          <div className="card">
            <h3 style={{ marginBottom:12 }}>ℹ How It Works</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[
                ['1', 'Submit your booking request via this form.'],
                ['2', 'Your request enters the FIFO queue.'],
                ['3', 'An admin processes the queue — rooms are assigned in order.'],
                ['4', 'You get the first available room, or your preferred room if free.'],
                ['5', 'Check "My Bookings" to see confirmed allocations.'],
              ].map(([n, text]) => (
                <div key={n} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                  <div style={{
                    width:24, height:24, borderRadius:'50%',
                    background:'var(--accent-dim)', color:'var(--accent-light)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:12, fontWeight:700, flexShrink:0,
                  }}>{n}</div>
                  <p style={{ fontSize:13, lineHeight:1.5, margin:0 }}>{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ borderColor:'var(--yellow)', background:'var(--yellow-dim)' }}>
            <h3 style={{ color:'var(--yellow)', marginBottom:8 }}>⚠ Booking Rules</h3>
            <ul style={{ paddingLeft:16, display:'flex', flexDirection:'column', gap:6 }}>
              {[
                'Max 16 bookings per department per semester',
                'End time must be after start time',
                'Booking date cannot be in the past',
                'Conflicts are detected automatically',
              ].map((r, i) => (
                <li key={i} style={{ fontSize:13, color:'var(--text-muted)' }}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
