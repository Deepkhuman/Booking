import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Store } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import API from '../../api/axios';
import toast from 'react-hot-toast';

const BOOKING_TYPES = ['SLOT_BASED', 'HOURLY', 'DAILY', 'NO_BOOKING'];

export default function VendorProfile() {
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    businessName: '', categoryId: '', description: '', phone: '',
    email: '', website: '', address: '', city: '', state: '',
    country: '', pincode: '', bookingType: 'SLOT_BASED',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [catRes, profileRes] = await Promise.all([
          API.get('/categories'),
          API.get('/vendors/me').catch(() => ({ data: { data: null } })),
        ]);
        setCategories(catRes.data.data || []);
        const p = profileRes.data.data;
        if (p) {
          setProfile(p);
          setForm({
            businessName: p.businessName || '',
            categoryId: p.categoryId || '',
            description: p.description || '',
            phone: p.phone || '',
            email: p.email || '',
            website: p.website || '',
            address: p.address || '',
            city: p.city || '',
            state: p.state || '',
            country: p.country || '',
            pincode: p.pincode || '',
            bookingType: p.bookingType || 'SLOT_BASED',
          });
        }
      } catch {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, categoryId: Number(form.categoryId) };
      if (profile) {
        const res = await API.put('/vendors/me', payload);
        setProfile(res.data.data);
        toast.success('Profile updated');
      } else {
        const res = await API.post('/vendors/register', payload);
        setProfile(res.data.data);
        toast.success('Vendor registered! Awaiting admin approval.');
      }
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
            <h1 className="dashboard-title">{profile ? 'Edit Profile' : 'Register Your Business'}</h1>
            <p className="dashboard-subtitle">{profile ? 'Update your business information' : 'Set up your vendor profile to start accepting bookings'}</p>
          </div>
          {profile && <span className={`badge badge-${profile.status === 'APPROVED' ? 'success' : profile.status === 'PENDING' ? 'warning' : 'danger'}`}>{profile.status}</span>}
        </motion.div>

        <motion.form className="dashboard-card" onSubmit={handleSubmit} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="form-section">
            <div className="form-section-title"><Store size={16} /> Business Info</div>
            <div className="form-grid-2">
              <div className="input-group">
                <label>Business Name *</label>
                <input className="input-field" value={form.businessName} onChange={e => set('businessName', e.target.value)} required placeholder="e.g. John's Barbershop" />
              </div>
              <div className="input-group">
                <label>Category *</label>
                <select className="input-field" value={form.categoryId} onChange={e => set('categoryId', e.target.value)} required>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label>Description</label>
                <textarea className="input-field" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Tell customers about your business..." />
              </div>
              <div className="input-group">
                <label>Booking Type *</label>
                <select className="input-field" value={form.bookingType} onChange={e => set('bookingType', e.target.value)}>
                  {BOOKING_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Phone</label>
                <input className="input-field" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <div className="input-group">
                <label>Business Email</label>
                <input className="input-field" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="business@example.com" />
              </div>
              <div className="input-group">
                <label>Website</label>
                <input className="input-field" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://yourwebsite.com" />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">📍 Location</div>
            <div className="form-grid-2">
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label>Address</label>
                <input className="input-field" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street address" />
              </div>
              <div className="input-group">
                <label>City</label>
                <input className="input-field" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Mumbai" />
              </div>
              <div className="input-group">
                <label>State</label>
                <input className="input-field" value={form.state} onChange={e => set('state', e.target.value)} placeholder="Maharashtra" />
              </div>
              <div className="input-group">
                <label>Country</label>
                <input className="input-field" value={form.country} onChange={e => set('country', e.target.value)} placeholder="India" />
              </div>
              <div className="input-group">
                <label>Pincode</label>
                <input className="input-field" value={form.pincode} onChange={e => set('pincode', e.target.value)} placeholder="400001" />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={saving} style={{ width: 'auto', padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Save size={16} /> {saving ? 'Saving...' : profile ? 'Save Changes' : 'Register Business'}
            </button>
          </div>
        </motion.form>
      </div>
    </DashboardLayout>
  );
}
