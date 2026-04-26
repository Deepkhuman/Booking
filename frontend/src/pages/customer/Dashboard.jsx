import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, CheckCircle, Clock, XCircle, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import StatsCard from '../../components/dashboard/StatsCard';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import toast from 'react-hot-toast';

const STATUS_COLORS = { PENDING: '#d97706', CONFIRMED: '#2563eb', COMPLETED: '#16a34a', CANCELLED: '#dc2626' };

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/bookings/mine?limit=5')
      .then(res => {
        const data = res.data.data?.data || [];
        const meta = res.data.data?.meta || {};
        setBookings(data);
        setStats({
          total: meta.total || 0,
          pending: data.filter(b => b.status === 'PENDING').length,
          confirmed: data.filter(b => b.status === 'CONFIRMED').length,
          completed: data.filter(b => b.status === 'COMPLETED').length,
        });
      })
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (b) => {
    if (b.date) return `${b.date}${b.startTime ? ` · ${b.startTime}` : ''}`;
    if (b.checkIn) return `${new Date(b.checkIn).toLocaleDateString()} → ${new Date(b.checkOut).toLocaleDateString()}`;
    return '—';
  };

  return (
    <DashboardLayout>
      <div className="dashboard-content">
        <motion.div className="dashboard-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="dashboard-title">Welcome back 👋</h1>
            <p className="dashboard-subtitle">{user?.name} · {user?.email}</p>
          </div>
          <Link to="/customer-dashboard/explore" className="btn-primary" style={{ width: 'auto', padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0, textDecoration: 'none' }}>
            <Compass size={16} /> Explore Vendors
          </Link>
        </motion.div>

        <div className="stats-grid">
          <StatsCard title="Total Bookings" value={stats.total} icon={<CalendarDays size={20} />} color="#6b2737" delay={0} />
          <StatsCard title="Pending" value={stats.pending} icon={<Clock size={20} />} color="#d97706" delay={0.1} />
          <StatsCard title="Confirmed" value={stats.confirmed} icon={<CheckCircle size={20} />} color="#2563eb" delay={0.2} />
          <StatsCard title="Completed" value={stats.completed} icon={<CheckCircle size={20} />} color="#16a34a" delay={0.3} />
        </div>

        <motion.div className="dashboard-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="dashboard-card-header">
            <h2 className="dashboard-card-title">Recent Bookings</h2>
            <Link to="/customer-dashboard/bookings" className="filter-pill active" style={{ textDecoration: 'none' }}>View all</Link>
          </div>
          {loading ? <div className="page-loading">Loading...</div> : bookings.length === 0 ? (
            <div className="empty-state-sm">
              <CalendarDays size={32} style={{ color: 'var(--rose-light)' }} />
              <p>No bookings yet. <Link to="/customer-dashboard/explore" style={{ color: 'var(--maroon)' }}>Explore vendors</Link> to get started.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="dashboard-table">
                <thead><tr><th>Vendor</th><th>Service</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id}>
                      <td><span className="table-name">{b.vendor?.businessName}</span></td>
                      <td>{b.service?.name} · <span style={{ color: 'var(--maroon)', fontWeight: 600 }}>₹{b.service?.price}</span></td>
                      <td style={{ fontSize: '0.82rem' }}>{formatDate(b)}</td>
                      <td><span className="badge" style={{ background: `${STATUS_COLORS[b.status]}18`, color: STATUS_COLORS[b.status] }}>{b.status}</span></td>
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
