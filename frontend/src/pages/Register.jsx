import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import API from '../api/axios';
import ThreeBackground from '../components/ThreeBackground';
import Logo from '../components/Logo';

function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 6) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*]/.test(password)) score++;
  return score;
}

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

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:3001/api/auth/google';
  };

  const handleFacebookLogin = () => {
    window.location.href = 'http://localhost:3001/api/auth/facebook';
  };

  return (
    <div className="auth-page">
      <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'Inter, sans-serif', fontSize: '0.88rem' } }} />
      <ThreeBackground />

      {/* Left Panel */}
      <div className="auth-left">
        <motion.div className="auth-left-content" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }}>
          <span className="auth-left-badge">✦ Join thousands of users</span>
          <h1 className="auth-left-title">Your perfect <span className="gradient-text">booking</span> experience starts here.</h1>
          <p className="auth-left-subtitle">Create your account and start discovering premium services tailored just for you.</p>
        </motion.div>
      </div>

      {/* Right Panel */}
      <motion.div className="auth-right" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--maroon), var(--rose), var(--maroon))' }} />

        <div style={{ marginBottom: '2rem' }}>
          <Logo size="md" />
        </div>

        <h2 className="auth-title">Create account</h2>
        <p className="auth-subtitle">Join us today. It's free and takes less than a minute.</p>

        {/* Social Login Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button onClick={handleGoogleLogin} className="social-btn">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <button onClick={handleFacebookLogin} className="social-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Continue with Facebook
          </button>
        </div>

        <div className="auth-divider"><span>or register with email</span></div>

        {/* Role Toggle */}
        <div className="input-group">
          <label>I am a</label>
          <div className="role-toggle">
            <button type="button" className={`role-btn ${form.role === 'CUSTOMER' ? 'active' : ''}`} onClick={() => setForm({ ...form, role: 'CUSTOMER' })}>Customer</button>
            <button type="button" className={`role-btn ${form.role === 'VENDOR' ? 'active' : ''}`} onClick={() => setForm({ ...form, role: 'VENDOR' })}>Vendor</button>
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
              <input type={showPassword ? 'text' : 'password'} className="input-field" placeholder="Min 6 chars, 1 uppercase, 1 number, 1 special" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required style={{ paddingRight: '2.75rem' }} />
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
