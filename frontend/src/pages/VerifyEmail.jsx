import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from '../components/Logo';
import API from '../api/axios';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    API.get(`/auth/verify-email?token=${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="auth-page">

      <div className="auth-left">
        <motion.div className="auth-left-content" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
          <span className="auth-left-badge">✦ Email Verification</span>
          <h1 className="auth-left-title">Almost <span className="gradient-text">there!</span></h1>
          <p className="auth-left-subtitle">We're verifying your email address to activate your account.</p>
        </motion.div>
      </div>

      <motion.div className="auth-right" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
        <div style={{ marginBottom: '3rem' }}>
          <Logo size="md" />
        </div>

        {status === 'loading' && (
          <div>
            <h2 className="auth-title">Verifying...</h2>
            <p className="auth-subtitle">Please wait while we verify your email.</p>
          </div>
        )}

        {status === 'success' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="auth-title">Email verified ✓</h2>
            <p className="auth-subtitle" style={{ marginBottom: '2rem' }}>Your account is now active. You can sign in.</p>
            <Link to="/login" className="btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Go to Sign In
            </Link>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="auth-title">Link expired</h2>
            <p className="auth-subtitle" style={{ marginBottom: '2rem' }}>This verification link is invalid or has expired. Please register again.</p>
            <Link to="/register" className="btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Back to Register
            </Link>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
