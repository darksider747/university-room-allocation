import { useState, useEffect } from 'react';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext.jsx';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TYPE_COLORS = {
  classroom: 'var(--accent)',
  lab:       'var(--green)',
  smart:     'var(--blue)',
  seminar:   'var(--yellow)',
};

function ClassCard({ entry }) {
  const color = TYPE_COLORS[entry.room_type] || 'var(--accent)';
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: `1px solid var(--border)`,
      borderLeft: `4px solid ${color}`,
      borderRadius: 10,
      padding: '12px 14px',
      marginBottom: 8,
    }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 6 }}>
        {entry.subject_name}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
        <span className="mono" style={{ color }}>
          🕐 {entry.start_time?.slice(0,5)}–{entry.end_time?.slice(0,5)}
        </span>
        {entry.room_number ? (
          <span>📍 {entry.room_number}
            {entry.building && <span style={{ color: 'var(--text-dim)' }}> · {entry.building}</span>}
          </span>
        ) : (
          <span style={{ color: 'var(--yellow)' }}>⚠ Room TBA</span>
        )}
        {entry.faculty_name && <span>👤 {entry.faculty_name}</span>}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
          {entry.room_type}
        </span>
        {entry.has_projector && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>📽 Projector</span>}
        {entry.has_ac && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>❄ AC</span>}
      </div>
    </div>
  );
}

export default function StudentTimetablePage() {
  const [timetable,  setTimetable]  = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [viewDay,    setViewDay]    = useState(new Date().getDay() === 0 ? 1 : new Date().getDay() - 1);
  const { socket } = useSocket() || {};

  const load = () => {
    setLoading(true);
    api.get('/student/timetable')
      .then((r) => { setTimetable(r.data.timetable || []); })
      .catch(() => toast.error('Failed to load timetable'))
      .finally(() => setLoading(false));
    api.get('/student/enrollments')
      .then((r) => setEnrollments(r.data.enrollments || []))
      .catch(() => {});
  };

  useEffect(() => { load(); }, []);

  // Refresh on real-time notification
  useEffect(() => {
    if (!socket) return;
    const handler = (notif) => {
      if (['room_assigned','room_changed','schedule_updated','timetable_published'].includes(notif.type)) {
        load();
      }
    };
    socket.on('notification', handler);
    return () => socket.off('notification', handler);
  }, [socket]);

  // Flatten all published entries grouped by day
  const allEntries = timetable.flatMap((t) => t.entries);
  const byDay = DAYS.reduce((acc, _, i) => {
    acc[i] = allEntries.filter((e) => e.day_of_week === i);
    return acc;
  }, {});

  const today = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  return (
    <div className="fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>🗓 My Timetable</h1>
          <p>Published schedule · auto-updates in real-time</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}>↺ Refresh</button>
      </div>

      {/* Enrollment info */}
      {enrollments.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {enrollments.map((e) => (
            <div key={e.id} style={{
              padding: '6px 14px', background: 'var(--accent-dim)',
              border: '1px solid rgba(108,99,255,0.2)', borderRadius: 20,
              fontSize: 13, color: 'var(--accent-light)',
            }}>
              {e.dept_name} · {e.section} · {e.sem_label}
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <div className="spinner" style={{ width: 48, height: 48 }} />
        </div>
      ) : timetable.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          <h3>No timetable yet</h3>
          <p>Your department HOD hasn't published the timetable yet, or you're not enrolled in a section.</p>
        </div>
      ) : (
        <>
          {/* Day Selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
            {DAYS.slice(0, 6).map((day, i) => (
              <button
                key={i}
                className={`btn btn-sm ${viewDay === i ? 'btn-primary' : 'btn-secondary'}`}
                style={{ position: 'relative', flexShrink: 0 }}
                onClick={() => setViewDay(i)}
              >
                {day.slice(0, 3)}
                {i === today && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4, width: 8, height: 8,
                    borderRadius: '50%', background: 'var(--green)', border: '2px solid var(--bg)',
                  }} />
                )}
                {byDay[i].length > 0 && (
                  <span style={{
                    marginLeft: 4, fontSize: 11, background: 'rgba(255,255,255,0.15)',
                    borderRadius: 4, padding: '1px 4px',
                  }}>{byDay[i].length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Day View */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Selected Day */}
            <div>
              <div style={{
                fontSize: 11, fontWeight: 600, color: 'var(--text-dim)',
                textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14,
              }}>
                {DAYS[viewDay]}{viewDay === today ? ' · Today' : ''}
                {' · '}{byDay[viewDay].length} class{byDay[viewDay].length !== 1 ? 'es' : ''}
              </div>
              {byDay[viewDay].length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                  No classes on {DAYS[viewDay]}
                </div>
              ) : (
                byDay[viewDay]
                  .sort((a, b) => a.start_time.localeCompare(b.start_time))
                  .map((e) => <ClassCard key={e.id} entry={e} />)
              )}
            </div>

            {/* Weekly Overview mini */}
            <div>
              <div style={{
                fontSize: 11, fontWeight: 600, color: 'var(--text-dim)',
                textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14,
              }}>Weekly Overview</div>
              {DAYS.slice(0, 6).map((day, i) => (
                <div
                  key={i}
                  onClick={() => setViewDay(i)}
                  style={{
                    padding: '10px 14px', marginBottom: 6, cursor: 'pointer',
                    background: viewDay === i ? 'var(--accent-dim)' : 'var(--surface)',
                    border: `1px solid ${viewDay === i ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 10, transition: 'all 0.15s',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: viewDay === i ? 600 : 400, color: viewDay === i ? 'var(--accent-light)' : 'var(--text)' }}>
                    {day}{i === today ? ' 🟢' : ''}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    {byDay[i].length > 0 ? `${byDay[i].length} class${byDay[i].length > 1 ? 'es' : ''}` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
