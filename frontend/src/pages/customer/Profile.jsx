import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Save, Camera, Lock, Shield, CheckCircle, AlertCircle, Eye, EyeOff, LogOut, User, Calendar, Mail, Phone, Globe } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function CustomerProfile() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState({ name: '', phone: '' });
  const [savingInfo, setSavingInfo] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
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
      login({ ...user, ...updated }, localStorage.getItem('accessToken'), localStorage.getItem('refreshToken'));
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
      login({ ...user, avatar: updated.avatar }, localStorage.getItem('accessToken'), localStorage.getItem('refreshToken'));
      toast.success('Avatar updated');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Upload failed');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (pwStrength < 4) { toast.error('Password does not meet all requirements'); return; }
    setSavingPw(true);
    try {
      await API.put('/users/me/password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed. Logging you out...');
      setTimeout(() => { logout(); navigate('/login'); }, 1500);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPw(false);
    }
  };

  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['', '#e05252', '#e0a052', '#52a0e0', '#52a052'];
  const isSocialOnly = !!(profile?.googleId || profile?.facebookId);

  if (loading) return (
    <DashboardLayout>
      <div className="dashboard-content"><div className="page-loading">Loading...</div></div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="dashboard-content">
        <motion.div className="dashboard-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="dashboard-title">My Profile</h1>
            <p className="dashboard-subtitle">Manage your account settings</p>
          </div>
        </motion.div>

        <div className="profile-layout">

          {/* ── LEFT COLUMN ── */}
          <div className="profile-left">

            {/* Personal Info */}
            <motion.div className="dashboard-card" style={{ marginBottom: '1.25rem' }}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="dashboard-card-header">
                <h2 className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={16} /> Personal Info
                </h2>
              </div>

              {/* Avatar row */}
              <div className="profile-avatar-section">
                <div className="profile-avatar-wrap">
                  <div className="profile-avatar">
                    {profile?.avatar
                      ? <img src={profile.avatar} alt={profile.name} />
                      : <span>{profile?.name?.[0]?.toUpperCase() || '?'}</span>}
                  </div>
                  <button className="profile-avatar-btn" onClick={() => fileRef.current?.click()} disabled={avatarUploading} title="Change photo">
                    {avatarUploading ? '…' : <Camera size={13} />}
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

              <form onSubmit={handleInfoSubmit}>
                <div className="input-group">
                  <label>Full Name</label>
                  <input className="input-field" value={info.name} onChange={e => setInfo(f => ({ ...f, name: e.target.value }))} placeholder="Your full name" />
                </div>
                <div className="input-group">
                  <label>Phone Number</label>
                  <input className="input-field" value={info.phone} onChange={e => setInfo(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
                </div>
                <div className="input-group" style={{ marginBottom: '1.25rem' }}>
                  <label>Email <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>(cannot be changed)</span></label>
                  <input className="input-field" value={profile?.email} disabled style={{ opacity: 0.55, cursor: 'not-allowed' }} />
                </div>
                <button type="submit" className="btn-primary" disabled={savingInfo}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <Save size={15} /> {savingInfo ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </motion.div>

            {/* Change Password */}
            <motion.div className="dashboard-card"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="dashboard-card-header">
                <h2 className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lock size={16} /> Change Password
                </h2>
              </div>

              {isSocialOnly ? (
                <div className="alert" style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)', color: '#1e40af', marginBottom: 0 }}>
                  <AlertCircle size={15} />
                  You signed in with {profile?.googleId ? 'Google' : 'Facebook'}. Password is managed by your social account.
                </div>
              ) : (
                <form onSubmit={handlePasswordSubmit}>
                  {[
                    { key: 'currentPassword', showKey: 'current', label: 'Current Password', placeholder: 'Enter current password' },
                    { key: 'newPassword', showKey: 'new', label: 'New Password', placeholder: 'Min 8 chars, uppercase, number, special' },
                    { key: 'confirmPassword', showKey: 'confirm', label: 'Confirm New Password', placeholder: 'Repeat new password' },
                  ].map(({ key, showKey, label, placeholder }) => (
                    <div className="input-group" key={key}>
                      <label>{label}</label>
                      <div className="input-wrapper">
                        <input
                          className="input-field"
                          type={showPw[showKey] ? 'text' : 'password'}
                          value={pwForm[key]}
                          onChange={e => {
                            setPwForm(f => ({ ...f, [key]: e.target.value }));
                            if (key === 'newPassword') setPwStrength(calcStrength(e.target.value));
                          }}
                          placeholder={placeholder}
                          required
                          style={key === 'confirmPassword' && pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword ? { borderColor: '#dc2626' } : {}}
                        />
                        <button type="button" className="input-eye"
                          onClick={() => setShowPw(s => ({ ...s, [showKey]: !s[showKey] }))}>
                          {showPw[showKey] ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {key === 'newPassword' && pwForm.newPassword && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <div className="password-strength">
                            {[1,2,3,4].map(i => <div key={i} className="strength-bar" style={{ background: i <= pwStrength ? strengthColors[pwStrength] : undefined }} />)}
                          </div>
                          <p style={{ fontSize: '0.72rem', color: strengthColors[pwStrength], marginTop: '0.25rem', fontWeight: 600 }}>{strengthLabels[pwStrength]}</p>
                        </div>
                      )}
                      {key === 'confirmPassword' && pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword && (
                        <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.3rem' }}>Passwords do not match</p>
                      )}
                    </div>
                  ))}

                  <button type="submit" className="btn-primary" disabled={savingPw}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    <Lock size={15} /> {savingPw ? 'Changing...' : 'Change Password'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="profile-right">

            {/* Account Summary */}
            <motion.div className="dashboard-card" style={{ marginBottom: '1.25rem' }}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="dashboard-card-header">
                <h2 className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={16} /> Account Summary
                </h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {[
                  { icon: <Calendar size={14} />, label: 'Member Since', value: new Date(profile?.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
                  { icon: <User size={14} />, label: 'Account Type', value: profile?.role },
                  { icon: <Mail size={14} />, label: 'Email', value: profile?.email },
                  { icon: <Phone size={14} />, label: 'Phone', value: profile?.phone || '—' },
                  { icon: <Globe size={14} />, label: 'Login Method', value: profile?.googleId ? 'Google OAuth' : profile?.facebookId ? 'Facebook OAuth' : 'Email & Password' },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="profile-summary-row">
                    <span className="profile-summary-label">{icon} {label}</span>
                    <span className="profile-summary-value">{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Password Requirements */}
            {!isSocialOnly && (
              <motion.div className="dashboard-card" style={{ marginBottom: '1.25rem' }}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <div className="dashboard-card-header">
                  <h2 className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Lock size={16} /> Password Requirements
                  </h2>
                </div>
                <div className="pw-requirements" style={{ padding: 0, background: 'none', border: 'none' }}>
                  {[
                    { label: 'At least 8 characters', ok: pwForm.newPassword.length >= 8 },
                    { label: 'One uppercase letter (A–Z)', ok: /[A-Z]/.test(pwForm.newPassword) },
                    { label: 'One number (0–9)', ok: /[0-9]/.test(pwForm.newPassword) },
                    { label: 'One special character (!@#$%^&*)', ok: /[!@#$%^&*]/.test(pwForm.newPassword) },
                  ].map(r => (
                    <div key={r.label} className={`pw-req ${r.ok ? 'pw-req--ok' : ''}`}>
                      <CheckCircle size={12} /> {r.label}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Session */}
            <motion.div className="dashboard-card"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="dashboard-card-header">
                <h2 className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <LogOut size={16} /> Session
                </h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
                Signing out will end your current session on this device.
              </p>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem', borderRadius: 8, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.06)', color: '#dc2626', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }}
              >
                <LogOut size={15} /> Sign Out
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
