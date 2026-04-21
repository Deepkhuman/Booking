import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import API from '../api/axios';
import ThreeBackground from '../components/ThreeBackground';

function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 6) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*]/.test(password)) score++;
  return score;
}

import Logo from '../components/Logo';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CUSTOMER' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(form.password);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', '#e05252', '#e0a052', '#52a052', '#2d7a2d'][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/auth/register', form);
      toast.success('Account created! Please check your email to verify.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'Inter, sans-serif', fontSize: '0.88rem' } }} />
      <ThreeBackground />

      {/* Left Panel */}
      <div className="auth-left">
        <motion.div
          className="auth-left-content"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <span className="auth-left-badge">✦ Join thousands of users</span>
          <h1 className="auth-left-title">
            Your perfect <span className="gradient-text">booking</span> experience starts here.
          </h1>
          <p className="auth-left-subtitle">
            Create your account and start discovering premium services tailored just for you.
          </p>
        </motion.div>
      </div>

      {/* Right Panel */}
      <motion.div
        className="auth-right"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div style={{ marginBottom: '3rem' }}>
          <Logo size="md" />
        </div>

        <h2 className="auth-title">Create account</h2>
        <p className="auth-subtitle">Join us today. It's free and takes less than a minute.</p>

        {/* Role Toggle */}
        <div className="input-group">
          <label>I am a</label>
          <div className="role-toggle">
            <button type="button" className={`role-btn ${form.role === 'CUSTOMER' ? 'active' : ''}`} onClick={() => setForm({ ...form, role: 'CUSTOMER' })}>
              Customer
            </button>
            <button type="button" className={`role-btn ${form.role === 'OWNER' ? 'active' : ''}`} onClick={() => setForm({ ...form, role: 'OWNER' })}>
              Shop Owner
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Full Name</label>
            <div className="input-wrapper">
              <User className="input-icon" />
              <input type="text" className="input-field" placeholder="John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
          </div>

          <div className="input-group">
            <label>Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" />
              <input type="email" className="input-field" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="Min 6 chars, 1 uppercase, 1 number, 1 special"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                style={{ paddingRight: '2.75rem' }}
              />
              <span className="input-eye" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff /> : <Eye />}
              </span>
            </div>
            {form.password && (
              <div style={{ marginTop: '0.5rem' }}>
                <div className="password-strength">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="strength-bar" style={{ background: i <= strength ? strengthColor : undefined }} />
                  ))}
                </div>
                <span style={{ fontSize: '0.75rem', color: strengthColor, marginTop: '0.25rem', display: 'block' }}>{strengthLabel}</span>
              </div>
            )}
          </div>

          <motion.button type="submit" className="btn-primary" disabled={loading} whileTap={{ scale: 0.98 }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </motion.button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
