import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import API from '../api/axios';
import ThreeBackground from '../components/ThreeBackground';

import Logo from '../components/Logo';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Reset link sent if email exists!');
    } catch {
      toast.error('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'Inter, sans-serif', fontSize: '0.88rem' } }} />
      <ThreeBackground />

      <div className="auth-left">
        <motion.div className="auth-left-content" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
          <span className="auth-left-badge">✦ Account Recovery</span>
          <h1 className="auth-left-title">Forgot your <span className="gradient-text">password?</span></h1>
          <p className="auth-left-subtitle">No worries. Enter your email and we'll send you a secure reset link.</p>
        </motion.div>
      </div>

      <motion.div className="auth-right" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
        <div style={{ marginBottom: '3rem' }}>
          <Logo size="md" />
        </div>

        <h2 className="auth-title">Reset password</h2>
        <p className="auth-subtitle">We'll send a reset link to your email address.</p>

        {sent ? (
          <motion.div className="alert alert-success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            ✓ If that email exists in our system, a reset link has been sent. Check your inbox.
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" />
                <input type="email" className="input-field" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <motion.button type="submit" className="btn-primary" disabled={loading} whileTap={{ scale: 0.98 }}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </motion.button>
          </form>
        )}

        <p className="auth-footer" style={{ marginTop: '1.5rem' }}>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
