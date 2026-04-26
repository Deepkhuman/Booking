import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Clock } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import API from '../../api/axios';
import toast from 'react-hot-toast';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const defaultSchedule = () => DAYS.map((_, i) => ({
  dayOfWeek: i,
  openTime: '09:00',
  closeTime: '18:00',
  slotDuration: 30,
  isClosed: i === 0, // Sunday closed by default
}));

export default function BusinessHours() {
  const [vendorId, setVendorId] = useState(null);
  const [schedules, setSchedules] = useState(defaultSchedule());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const profileRes = await API.get('/vendors/me');
        const vendor = profileRes.data.data;
        if (!vendor) { setLoading(false); return; }
        setVendorId(vendor.id);

        const hoursRes = await API.get(`/bookings/business-hours/${vendor.id}`);
        const existing = hoursRes.data.data || [];
        if (existing.length > 0) {
          setSchedules(defaultSchedule().map(def => {
            const found = existing.find(e => e.dayOfWeek === def.dayOfWeek);
            return found ? { ...def, ...found } : def;
          }));
        }
      } catch {
        toast.error('Failed to load business hours');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const update = (dayOfWeek, key, value) => {
    setSchedules(prev => prev.map(s => s.dayOfWeek === dayOfWeek ? { ...s, [key]: value } : s));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post('/bookings/business-hours', { schedules });
      toast.success('Business hours saved');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <DashboardLayout><div className="dashboard-content"><div className="page-loading">Loading...</div></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="dashboard-content">
        <motion.div className="dashboard-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="dashboard-title">Business Hours</h1>
            <p className="dashboard-subtitle">Set your weekly availability and slot duration</p>
          </div>
        </motion.div>

        <motion.form className="dashboard-card" onSubmit={handleSubmit} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="hours-grid">
            {schedules.map(s => (
              <div key={s.dayOfWeek} className={`hours-row ${s.isClosed ? 'hours-row--closed' : ''}`}>
                <div className="hours-day">
                  <label className="hours-toggle">
                    <input type="checkbox" checked={!s.isClosed} onChange={e => update(s.dayOfWeek, 'isClosed', !e.target.checked)} />
                    <span className="hours-toggle-slider" />
                  </label>
                  <span className="hours-day-name">{DAYS[s.dayOfWeek]}</span>
                </div>

                {s.isClosed ? (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Closed</span>
                ) : (
                  <div className="hours-fields">
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label>Open</label>
                      <input type="time" className="input-field input-field--sm" value={s.openTime} onChange={e => update(s.dayOfWeek, 'openTime', e.target.value)} />
                    </div>
                    <span style={{ color: 'var(--text-muted)', alignSelf: 'flex-end', paddingBottom: '0.5rem' }}>—</span>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label>Close</label>
                      <input type="time" className="input-field input-field--sm" value={s.closeTime} onChange={e => update(s.dayOfWeek, 'closeTime', e.target.value)} />
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label>Slot (min)</label>
                      <select className="input-field input-field--sm" value={s.slotDuration} onChange={e => update(s.dayOfWeek, 'slotDuration', Number(e.target.value))}>
                        {[15, 20, 30, 45, 60, 90, 120].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="submit" className="btn-primary" disabled={saving} style={{ width: 'auto', padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Hours'}
            </button>
          </div>
        </motion.form>
      </div>
    </DashboardLayout>
  );
}
