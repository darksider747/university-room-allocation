import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  const [profileForm, setProfileForm] = useState({ name: user?.name || '', department: user?.department || '' });
  const [pwForm, setPwForm]           = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving]           = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/auth/me', profileForm);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) {
      return toast.error('New passwords do not match.');
    }
    setSaving(true);
    try {
      await api.patch('/auth/me/password', {
        currentPassword: pwForm.currentPassword,
        newPassword:     pwForm.newPassword,
      });
      toast.success('Password changed!');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Password change failed.');
    } finally {
      setSaving(false);
    }
  };

  const DEPARTMENTS = [
    'Computer Science','Artificial Intelligence','Software Engineering',
    'Electrical Engineering','Mechanical Engineering','Business Administration',
    'Mathematics','Physics','Chemistry','Bioinformatics',
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>👤 My Profile</h1>
        <p>Manage your account settings and credentials.</p>
      </div>

      {/* Profile Summary Card */}
      <div className="card" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--accent-dim)', border: '3px solid var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 700, color: 'var(--accent-light)',
          flexShrink: 0,
        }}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 style={{ marginBottom: 4 }}>{user?.name}</h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{user?.email}</span>
            <span className={`badge ${user?.role === 'admin' ? 'badge-warning' : 'badge-info'}`}>
              {user?.role}
            </span>
            {user?.department && (
              <span className="badge badge-accent">{user.department}</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2" style={{ marginBottom: 20 }}>
        {['profile', 'password'].map((t) => (
          <button
            key={t}
            className={`btn btn-sm ${activeTab === t ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(t)}
          >
            {t === 'profile' ? '✏ Edit Profile' : '🔒 Change Password'}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 480 }}>
        {activeTab === 'profile' && (
          <div className="card fade-in">
            <h3 style={{ marginBottom: 20 }}>Edit Profile</h3>
            <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email <span style={{ color: 'var(--text-dim)' }}>(read-only)</span></label>
                <input className="form-input" value={user?.email} disabled style={{ opacity: 0.6 }} />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select
                  className="form-select"
                  value={profileForm.department}
                  onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                >
                  <option value="">Select department…</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><div className="spinner" /> Saving…</> : '✓ Save Changes'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="card fade-in">
            <h3 style={{ marginBottom: 20 }}>Change Password</h3>
            <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password" className="form-input"
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password" className="form-input"
                  placeholder="Min 8 chars, uppercase + number"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password" className="form-input"
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><div className="spinner" /> Updating…</> : '🔒 Update Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
