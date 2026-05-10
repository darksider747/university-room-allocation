import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import './AuthPages.css';

const DEPARTMENTS = [
  'Computer Science','Artificial Intelligence','Software Engineering',
  'Electrical Engineering','Mechanical Engineering','Business Administration',
  'Mathematics','Physics','Chemistry','Bioinformatics',
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ name:'', email:'', password:'', department:'' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Welcome aboard.');
      navigate('/dashboard');
    } catch (err) {
      const errs = err.response?.data?.errors;
      if (errs) {
        const map = {};
        errs.forEach((e) => { map[e.field] = e.message; });
        setErrors(map);
      } else {
        toast.error(err.response?.data?.error || 'Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-glow" style={{ '--gx': '70%', '--gy': '30%' }} />
        <div className="auth-grid" />
      </div>

      <div className="auth-card fade-in">
        <div className="auth-logo">
          <span>🏫</span>
          <div>
            <h2>UOM Room Allocation</h2>
            <p>University Management System</p>
          </div>
        </div>

        <h1 className="auth-title">Create Account</h1>
        <p className="auth-sub">Register to start booking rooms.</p>

        <form onSubmit={submit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input name="name" className={`form-input ${errors.name ? 'error' : ''}`}
              placeholder="Ali Hassan" value={form.name} onChange={handle} required />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input name="email" type="email" className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="you@uom.edu.pk" value={form.email} onChange={handle} required />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input name="password" type="password" className={`form-input ${errors.password ? 'error' : ''}`}
              placeholder="Min 8 chars, uppercase + number" value={form.password} onChange={handle} required />
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Department</label>
            <select name="department" className="form-select" value={form.department} onChange={handle}>
              <option value="">Select department…</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
            {loading ? <><div className="spinner" /> Creating account…</> : 'Create Account →'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
