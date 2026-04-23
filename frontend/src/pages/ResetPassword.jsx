import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import API from '../api/axios';

import Logo from '../components/Logo';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await API.post('/auth/reset-password', { token, password: form.password });
      toast.success('Password reset successfully!');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'Inter, sans-serif', fontSize: '0.88rem' } }} />

      <div className="auth-left">
        <motion.div className="auth-left-content" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
          <span className="auth-left-badge">✦ Secure Reset</span>
          <h1 className="auth-left-title">Set a new <span className="gradient-text">password</span></h1>
          <p className="auth-left-subtitle">Choose a strong password to keep your account secure.</p>
        </motion.div>
      </div>

      <motion.div className="auth-right" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
        <div style={{ marginBottom: '3rem' }}>
          <Logo size="md" />
        </div>

        <h2 className="auth-title">New password</h2>
        <p className="auth-subtitle">Must include uppercase, number and special character.</p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>New Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                style={{ paddingRight: '2.75rem' }}
              />
              <span className="input-eye" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff /> : <Eye />}
              </span>
            </div>
          </div>

          <div className="input-group">
            <label>Confirm Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="••••••••"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                required
              />
            </div>
          </div>

          <motion.button type="submit" className="btn-primary" disabled={loading} whileTap={{ scale: 0.98 }}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </motion.button>
        </form>

        <p className="auth-footer">
          <Link to="/login">Back to Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
}
