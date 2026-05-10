import { useState, useEffect } from 'react';
import api from '../services/api.js';
import toast from 'react-hot-toast';

const today = new Date().toISOString().split('T')[0];
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

export default function RoomsPage() {
  const [rooms,    setRooms]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [schedLoading, setSchedLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ start: today, end: nextWeek });
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/rooms')
      .then((r) => setRooms(r.data.rooms || []))
      .catch(() => toast.error('Failed to load rooms'))
      .finally(() => setLoading(false));
  }, []);

  const viewSchedule = (room) => {
    setSelected(room);
    setSchedule([]);
    setSchedLoading(true);
    api.get(`/allocations/schedule?roomId=${room.id}&startDate=${dateRange.start}&endDate=${dateRange.end}`)
      .then((r) => setSchedule(r.data.bookings || []))
      .catch(() => toast.error('Failed to load schedule'))
      .finally(() => setSchedLoading(false));
  };

  const filtered = rooms.filter((r) =>
    !search || r.room_number.toLowerCase().includes(search.toLowerCase()) ||
    r.building.toLowerCase().includes(search.toLowerCase())
  );

  const groupedByFloor = filtered.reduce((acc, r) => {
    const key = `Floor ${r.floor}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>⬡ Rooms</h1>
        <p>{rooms.length} rooms available across {Object.keys(groupedByFloor).length} floors</p>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Room List */}
        <div>
          <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
            <input
              className="form-input"
              placeholder="🔍 Search rooms…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
              <div className="spinner" style={{ width: 36, height: 36 }} />
            </div>
          ) : (
            Object.entries(groupedByFloor).map(([floor, floorRooms]) => (
              <div key={floor} style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--text-dim)',
                  textTransform: 'uppercase', letterSpacing: 1.5,
                  marginBottom: 10, paddingLeft: 4
                }}>{floor} · {floorRooms.length} rooms</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {floorRooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => viewSchedule(room)}
                      style={{
                        background: selected?.id === room.id ? 'var(--accent-dim)' : 'var(--surface)',
                        border: `1px solid ${selected?.id === room.id ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 10,
                        padding: '12px 8px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'center',
                      }}
                      onMouseEnter={(e) => {
                        if (selected?.id !== room.id) e.currentTarget.style.borderColor = 'var(--border-light)';
                      }}
                      onMouseLeave={(e) => {
                        if (selected?.id !== room.id) e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                    >
                      <div style={{
                        fontSize: 13, fontWeight: 600,
                        color: selected?.id === room.id ? 'var(--accent-light)' : 'var(--text)'
                      }}>
                        {room.room_number.replace('Room ', 'R')}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                        cap {room.capacity}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Schedule Panel */}
        <div>
          {selected ? (
            <div className="card" style={{ position: 'sticky', top: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3>{selected.room_number}</h3>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {selected.building} · Floor {selected.floor} · Capacity {selected.capacity}
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>✕</button>
              </div>

              {/* Date Range */}
              <div className="flex gap-3" style={{ marginBottom: 16 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">From</label>
                  <input type="date" className="form-input"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">To</label>
                  <input type="date" className="form-input"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => viewSchedule(selected)}>
                    ↺
                  </button>
                </div>
              </div>

              {schedLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <div className="spinner" />
                </div>
              ) : schedule.length === 0 ? (
                <div className="empty-state" style={{ padding: '30px 0' }}>
                  <div className="icon">✅</div>
                  <h3>Room is free!</h3>
                  <p>No bookings in this date range.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                    {schedule.length} booking{schedule.length !== 1 ? 's' : ''} in range
                  </div>
                  {schedule.map((b) => (
                    <div key={b.id} style={{
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '12px 14px', borderLeft: '3px solid var(--accent)',
                    }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{b.lecture_name}</div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          📅 {new Date(b.booking_date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                        </span>
                        <span className="mono" style={{ fontSize: 12, color: 'var(--accent-light)' }}>
                          🕐 {b.start_time?.slice(0,5)} – {b.end_time?.slice(0,5)}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🏢 {b.department}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '60px 30px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⬡</div>
              <h3>Select a Room</h3>
              <p style={{ marginTop: 8 }}>Click any room on the left to view its schedule.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
