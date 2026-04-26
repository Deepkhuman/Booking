import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Camera, Lock, Shield, CheckCircle, AlertCircle, Eye, EyeOff, LogOut } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Section = ({ title, icon, children, delay = 0 }) => (
  <motion.div className="dashboard-card" style={{ marginBottom: '1.25rem' }}
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
    <div className="dashboard-card-header" style={{ marginBottom: '1.5rem' }}>
      <h2 className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {icon} {title}
      </h2>
    </div>
    {children}
  </motion.div>
);

export default function CustomerProfile() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // personal info form
  const [info, setInfo] = useState({ name: '', phone: '' });
  const [savingInfo, setSavingInfo] = useState(false);

  // avatar
  const [avatarUploading, setAvatarUploading] = useState(false);

  // password form
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [savingPw, setSavingPw] = useState(false);
  const [pwStrength, setPwStrength] = useState(0);

  useEffect(() => {
    API.get('/users/me')
      .then(r => {
        const u = r.data.data;
        setProfile(u);
        setInfo({ name: u.name || '', phone: u.phone || '' });
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const calcStrength = (pw) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[!@#$%^&*]/.test(pw)) s++;
    return s;
  };

  const handleInfoSubmit = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    try {
      const res = await API.put('/users/me', info);
      const updated = res.data.data;
      setProfile(p => ({ ...p, ...updated }));
      const token = localStorage.getItem('accessToken');
      const refresh = localStorage.getItem('refreshToken');
      login({ ...user, ...updated }, token, refresh);
      toast.success('Profile updated');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally {
      setSavingInfo(false);
    }
  };

  const handleAvatarUpload = async (file) => {
    if (!file) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await API.post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const updated = res.data.data;
      setProfile(p => ({ ...p, avatar: updated.avatar }));
      const token = localStorage.getItem('accessToken');
      const refresh = localStorage.getItem('refreshToken');
      login({ ...user, avatar: updated.avatar }, token, refresh);
      toast.success('Avatar updated');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Upload failed');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (pwStrength < 4) {
      toast.error('Password does not meet requirements');
      return;
    }
    setSavingPw(true);
    try {
      await API.put('/users/me/password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success('Password changed. Please log in again.');
      setTimeout(() => { logout(); navigate('/login'); }, 1500);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPw(false);
    }
  };

  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['', '#e05252', '#e0a052', '#52a0e0', '#52a052'];

  if (loading) return (
    <DashboardLayout>
      <div className="dashboard-content"><div className="page-loading">Loading...</div></div>
    </DashboardLayout>
  );

  const isSocialOnly = !!(profile?.googleId || profile?.facebookId) && !profile?.password;

  return (
    <DashboardLayout>
      <div className="dashboard-content" style={{ maxWidth: 640 }}>
        <motion.div className="dashboard-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="dashboard-title">My Profile</h1>
            <p className="dashboard-subtitle">Manage your account settings</p>
          </div>
        </motion.div>

        {/* ── Avatar & Identity ── */}
        <Section title="Personal Info" icon={<Shield size={16} />} delay={0.1}>
          {/* Avatar */}
          <div className="profile-avatar-section">
            <div className="profile-avatar-wrap">
              <div className="profile-avatar">
                {profile?.avatar
                  ? <img src={profile.avatar} alt={profile.name} />
                  : <span>{profile?.name?.[0]?.toUpperCase() || '?'}</span>}
              </div>
              <button
                className="profile-avatar-btn"
                onClick={() => fileRef.current?.click()}
                disabled={avatarUploading}
                title="Change photo"
              >
                {avatarUploading ? '...' : <Camera size={14} />}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => handleAvatarUpload(e.target.files?.[0])} />
            </div>
            <div>
              <p className="profile-name">{profile?.name || 'Your Name'}</p>
              <p className="profile-email">{profile?.email}</p>
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <span className="badge badge-default">{profile?.role}</span>
                {profile?.isEmailVerified
                  ? <span className="badge badge-success"><CheckCircle size={10} style={{ display: 'inline', marginRight: 3 }} />Verified</span>
                  : <span className="badge badge-danger"><AlertCircle size={10} style={{ display: 'inline', marginRight: 3 }} />Unverified</span>}
                {profile?.googleId && <span className="badge" style={{ background: '#e8f0fe', color: '#1a73e8' }}>Google</span>}
                {profile?.facebookId && <span className="badge" style={{ background: '#e7f0ff', color: '#1877f2' }}>Facebook</span>}
              </div>
            </div>
          </div>

          <div className="profile-divider" />

          {/* Info form */}
          <form onSubmit={handleInfoSubmit}>
            <div className="form-grid-2">
              <div className="input-group">
                <label>Full Name</label>
                <input className="input-field" value={info.name} onChange={e => setInfo(f => ({ ...f, name: e.target.value }))} placeholder="Your full name" />
              </div>
              <div className="input-group">
                <label>Phone Number</label>
                <input className="input-field" value={info.phone} onChange={e => setInfo(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
              </div>
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>Email <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>(cannot be changed)</span></label>
              <input className="input-field" value={profile?.email} disabled style={{ opacity: 0.55, cursor: 'not-allowed' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button type="submit" className="btn-primary" disabled={savingInfo}
                style={{ width: 'auto', padding: '0.65rem 1.5rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Save size={15} /> {savingInfo ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Section>

        {/* ── Account Info ── */}
        <Section title="Account Info" icon={<CheckCircle size={16} />} delay={0.2}>
          <div className="account-info-grid">
            <div className="account-info-item">
              <span className="account-info-label">Member Since</span>
              <span className="account-info-value">{new Date(profile?.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="account-info-item">
              <span className="account-info-label">Account Type</span>
              <span className="account-info-value">{profile?.role}</span>
            </div>
            <div className="account-info-item">
              <span className="account-info-label">Email Status</span>
              <span className="account-info-value" style={{ color: profile?.isEmailVerified ? '#16a34a' : '#dc2626' }}>
                {profile?.isEmailVerified ? '✓ Verified' : '✗ Not verified'}
              </span>
            </div>
            <div className="account-info-item">
              <span className="account-info-label">Login Method</span>
              <span className="account-info-value">
                {profile?.googleId ? 'Google' : profile?.facebookId ? 'Facebook' : 'Email & Password'}
              </span>
            </div>
          </div>
        </Section>

        {/* ── Change Password ── */}
        {!isSocialOnly && (
          <Section title="Change Password" icon={<Lock size={16} />} delay={0.3}>
            <form onSubmit={handlePasswordSubmit}>
              {/* Current password */}
              <div className="input-group">
                <label>Current Password</label>
                <div className="input-wrapper">
                  <input
                    className="input-field"
                    type={showPw.current ? 'text' : 'password'}
                    value={pwForm.currentPassword}
                    onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                    placeholder="Enter current password"
                    required
                  />
                  <button type="button" className="input-eye" onClick={() => setShowPw(s => ({ ...s, current: !s.current }))}>
                    {showPw.current ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div className="input-group">
                <label>New Password</label>
                <div className="input-wrapper">
                  <input
                    className="input-field"
                    type={showPw.new ? 'text' : 'password'}
                    value={pwForm.newPassword}
                    onChange={e => { setPwForm(f => ({ ...f, newPassword: e.target.value })); setPwStrength(calcStrength(e.target.value)); }}
                    placeholder="Min 8 chars, uppercase, number, special"
                    required
                  />
                  <button type="button" className="input-eye" onClick={() => setShowPw(s => ({ ...s, new: !s.new }))}>
                    {showPw.new ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {pwForm.newPassword && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div className="password-strength">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="strength-bar" style={{ background: i <= pwStrength ? strengthColors[pwStrength] : undefined }} />
                      ))}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: strengthColors[pwStrength], marginTop: '0.3rem', fontWeight: 500 }}>
                      {strengthLabels[pwStrength]}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="input-group">
                <label>Confirm New Password</label>
                <div className="input-wrapper">
                  <input
                    className="input-field"
                    type={showPw.confirm ? 'text' : 'password'}
                    value={pwForm.confirmPassword}
                    onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="Repeat new password"
                    required
                    style={{ borderColor: pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword ? '#dc2626' : undefined }}
                  />
                  <button type="button" className="input-eye" onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))}>
                    {showPw.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword && (
                  <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.3rem' }}>Passwords do not match</p>
                )}
              </div>

              {/* Requirements */}
              <div className="pw-requirements">
                {[
                  { label: 'At least 8 characters', ok: pwForm.newPassword.length >= 8 },
                  { label: 'One uppercase letter', ok: /[A-Z]/.test(pwForm.newPassword) },
                  { label: 'One number', ok: /[0-9]/.test(pwForm.newPassword) },
                  { label: 'One special character (!@#$%^&*)', ok: /[!@#$%^&*]/.test(pwForm.newPassword) },
                ].map(r => (
                  <div key={r.label} className={`pw-req ${r.ok ? 'pw-req--ok' : ''}`}>
                    <CheckCircle size={11} /> {r.label}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button type="submit" className="btn-primary" disabled={savingPw}
                  style={{ width: 'auto', padding: '0.65rem 1.5rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Lock size={15} /> {savingPw ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </Section>
        )}

        {isSocialOnly && (
          <Section title="Password" icon={<Lock size={16} />} delay={0.3}>
            <div className="alert" style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)', color: '#1e40af' }}>
              <AlertCircle size={15} />
              You signed in with {profile?.googleId ? 'Google' : 'Facebook'}. Password management is handled by your social account.
            </div>
          </Section>
        )}

        {/* ── Danger Zone ── */}
        <Section title="Session" icon={<LogOut size={16} />} delay={0.4}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Signing out will end your current session on this device.
          </p>
          <button
            className="action-btn reject"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            onClick={() => { logout(); navigate('/login'); }}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </Section>
      </div>
    </DashboardLayout>
  );
}
