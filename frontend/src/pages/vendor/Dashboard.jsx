import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Package, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import StatsCard from '../../components/dashboard/StatsCard';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  PENDING: '#d97706', CONFIRMED: '#2563eb',
  COMPLETED: '#16a34a', CANCELLED: '#dc2626', NO_SHOW: '#6b7280',
};

const STATUS_ICONS = {
  PENDING: <Clock size={13} />, CONFIRMED: <CheckCircle size={13} />,
  COMPLETED: <CheckCircle size={13} />, CANCELLED: <XCircle size={13} />,
};

export default function VendorDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, bookingsRes] = await Promise.all([
          API.get('/vendors/me').catch(() => ({ data: { data: null } })),
          API.get('/bookings/vendor?limit=5').catch(() => ({ data: { data: [] } })),
        ]);
        const p = profileRes.data.data;
        const b = bookingsRes.data.data?.data || [];
        setProfile(p);
        setBookings(b);
        if (b.length) {
          setStats({
            total: bookingsRes.data.data?.meta?.total || 0,
            pending: b.filter(x => x.status === 'PENDING').length,
            confirmed: b.filter(x => x.status === 'CONFIRMED').length,
            completed: b.filter(x => x.status === 'COMPLETED').length,
          });
        }
      } catch {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleConfirm = async (id) => {
    try {
      await API.put(`/bookings/${id}/confirm`);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'CONFIRMED' } : b));
      toast.success('Booking confirmed');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to confirm');
    }
  };

  const handleComplete = async (id) => {
    try {
      await API.put(`/bookings/${id}/complete`);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'COMPLETED' } : b));
      toast.success('Booking marked complete');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to complete');
    }
  };

  if (loading) return <DashboardLayout><div className="dashboard-content"><div className="page-loading">Loading...</div></div></DashboardLayout>;

  // No vendor profile yet
  if (!profile) return (
    <DashboardLayout>
      <div className="dashboard-content">
        <div className="empty-state">
          <AlertCircle size={48} style={{ color: 'var(--maroon)', marginBottom: '1rem' }} />
          <h2>Set up your vendor profile</h2>
          <p>You need to register your business before you can manage bookings and services.</p>
          <Link to="/vendor-dashboard/profile" className="btn-primary" style={{ display: 'inline-block', width: 'auto', marginTop: '1.5rem', padding: '0.75rem 2rem', textDecoration: 'none' }}>
            Register Your Business
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="dashboard-content">
        <motion.div className="dashboard-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="dashboard-title">{profile.businessName}</h1>
            <p className="dashboard-subtitle">
              Welcome back, {user?.name} 👋 &nbsp;
              <span className={`badge badge-${profile.status === 'APPROVED' ? 'success' : profile.status === 'PENDING' ? 'warning' : 'danger'}`}>
                {profile.status}
              </span>
            </p>
          </div>
          <div className="dashboard-date">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </motion.div>

        {profile.status === 'PENDING' && (
          <motion.div className="alert alert-warning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: '1.5rem', background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.2)', color: '#92400e' }}>
            <AlertCircle size={16} /> Your account is pending admin approval. You can set up your profile and services in the meantime.
          </motion.div>
        )}

        <div className="stats-grid">
          <StatsCard title="Total Bookings" value={stats.total} icon={<CalendarDays size={20} />} color="#6b2737" delay={0} />
          <StatsCard title="Pending" value={stats.pending} icon={<Clock size={20} />} color="#d97706" delay={0.1} />
          <StatsCard title="Confirmed" value={stats.confirmed} icon={<CheckCircle size={20} />} color="#2563eb" delay={0.2} />
          <StatsCard title="Completed" value={stats.completed} icon={<Package size={20} />} color="#16a34a" delay={0.3} />
        </div>

        <motion.div className="dashboard-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="dashboard-card-header">
            <h2 className="dashboard-card-title">Recent Bookings</h2>
            <Link to="/vendor-dashboard/bookings" className="filter-pill active" style={{ textDecoration: 'none' }}>View all</Link>
          </div>
          {bookings.length === 0 ? (
            <div className="empty-state-sm">No bookings yet</div>
          ) : (
            <div className="table-wrapper">
              <table className="dashboard-table">
                <thead><tr><th>Customer</th><th>Service</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id}>
                      <td><span className="table-name">{b.customer?.name || '—'}</span></td>
                      <td>{b.service?.name}</td>
                      <td style={{ fontSize: '0.82rem' }}>{b.date || (b.checkIn ? new Date(b.checkIn).toLocaleDateString() : '—')}</td>
                      <td>
                        <span className="badge" style={{ background: `${STATUS_COLORS[b.status]}18`, color: STATUS_COLORS[b.status], display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {STATUS_ICONS[b.status]} {b.status}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          {b.status === 'PENDING' && <button className="action-btn approve" onClick={() => handleConfirm(b.id)}><CheckCircle size={13} /> Confirm</button>}
                          {b.status === 'CONFIRMED' && <button className="action-btn approve" onClick={() => handleComplete(b.id)}><CheckCircle size={13} /> Complete</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
