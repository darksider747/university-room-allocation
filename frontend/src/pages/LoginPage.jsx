import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import './AuthPages.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed.';
      const errs = err.response?.data?.errors;
      if (errs) {
        const map = {};
        errs.forEach((e) => { map[e.field] = e.message; });
        setErrors(map);
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-glow" />
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

        <h1 className="auth-title">Sign In</h1>
        <p className="auth-sub">Welcome back. Enter your credentials to continue.</p>

        <form onSubmit={submit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              name="email" type="email" className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="you@uom.edu.pk" value={form.email} onChange={handle} required
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              name="password" type="password" className={`form-input ${errors.password ? 'error' : ''}`}
              placeholder="••••••••" value={form.password} onChange={handle} required
            />
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
            {loading ? <><div className="spinner" /> Signing in…</> : 'Sign In →'}
          </button>
        </form>

        <div className="auth-hint">
          <div className="hint-box">
            <span>🔑</span>
            <div>
              <strong>Demo:</strong> admin@uom.edu.pk / Admin@123<br />
              <span>Student:</span> ali@student.uom.edu.pk / Student@123
            </div>
          </div>
        </div>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
