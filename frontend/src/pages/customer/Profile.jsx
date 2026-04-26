import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, User, Camera } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import toast from 'react-hot-toast';

export default function CustomerProfile() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', avatar: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get('/users/me')
      .then(r => {
        const u = r.data.data;
        setForm({ name: u.name || '', phone: u.phone || '', avatar: u.avatar || '' });
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await API.put('/users/me', form);
      const updated = res.data.data;
      // update auth context so sidebar name updates
      const token = localStorage.getItem('accessToken');
      const refresh = localStorage.getItem('refreshToken');
      login(updated, token, refresh);
      toast.success('Profile updated');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (loading) return <DashboardLayout><div className="dashboard-content"><div className="page-loading">Loading...</div></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="dashboard-content">
        <motion.div className="dashboard-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="dashboard-title">My Profile</h1>
            <p className="dashboard-subtitle">Manage your personal information</p>
          </div>
        </motion.div>

        <div style={{ maxWidth: 560 }}>
          <motion.div className="dashboard-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ position: 'relative' }}>
                <div className="sidebar-avatar" style={{ width: 72, height: 72, fontSize: '1.5rem', borderRadius: 18 }}>
                  {form.avatar ? <img src={form.avatar} alt={form.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 18 }} /> : <span>{form.name?.[0]?.toUpperCase() || <User size={28} />}</span>}
                </div>
              </div>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.2rem' }}>{form.name || 'Your Name'}</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{user?.email}</p>
                <span className="badge badge-default" style={{ marginTop: '0.4rem', display: 'inline-block' }}>{user?.role}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Full Name</label>
                <input className="input-field" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your full name" />
              </div>
              <div className="input-group">
                <label>Phone Number</label>
                <input className="input-field" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <div className="input-group">
                <label>Avatar URL</label>
                <input className="input-field" value={form.avatar} onChange={e => set('avatar', e.target.value)} placeholder="https://example.com/avatar.jpg" />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>Paste an image URL or upload via Cloudinary</p>
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Email</label>
                <input className="input-field" value={user?.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="submit" className="btn-primary" disabled={saving} style={{ width: 'auto', padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
                  <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
