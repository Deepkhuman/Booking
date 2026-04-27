import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Store, CalendarDays, CreditCard, Clock, CheckCircle, XCircle } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import StatsCard from '../../components/dashboard/StatsCard';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import toast from 'react-hot-toast';

const CHART_COLORS = ['#6b2737', '#c4717e', '#e8b4bb', '#8b3a4a', '#d4a0a8', '#a05060'];
const BOOKING_BAR_COLORS = { confirmed: '#6b2737', pending: '#e8b4bb', cancelled: '#d4a0a8' };

const CustomTooltip = ({ active, payload, label, prefix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fffcfa', border: '1px solid rgba(139,69,69,0.12)', borderRadius: 10, padding: '0.6rem 0.9rem', fontSize: '0.82rem', boxShadow: '0 8px 24px rgba(107,39,55,0.1)' }}>
      <p style={{ color: '#a08080', marginBottom: 4, fontWeight: 600 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {prefix}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</p>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [pendingVendors, setPendingVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeBookingBars, setActiveBookingBars] = useState(['confirmed', 'pending', 'cancelled']);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, vendorsRes] = await Promise.all([
          API.get('/admin/dashboard'),
          API.get('/admin/vendors?status=PENDING&limit=10'),
        ]);
        setStats(statsRes.data.data);
        setPendingVendors(vendorsRes.data.data?.data || []);
      } catch {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleApprove = async (id) => {
    try {
      await API.put(`/admin/vendors/${id}/approve`);
      setPendingVendors(prev => prev.filter(v => v.id !== id));
      toast.success('Vendor approved');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const handleReject = async (id) => {
    try {
      await API.put(`/admin/vendors/${id}/suspend`);
      setPendingVendors(prev => prev.filter(v => v.id !== id));
      toast.success('Vendor suspended');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const toggleBar = (key) =>
    setActiveBookingBars(prev =>
      prev.includes(key) ? (prev.length > 1 ? prev.filter(k => k !== key) : prev) : [...prev, key]
    );

  // build booking chart from recent bookings
  const bookingChartData = useMemo(() => {
    if (!stats?.recentBookings) return [];
    const days = {};
    stats.recentBookings.forEach(b => {
      const day = new Date(b.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
      if (!days[day]) days[day] = { day, confirmed: 0, pending: 0, cancelled: 0 };
      const key = b.status === 'CONFIRMED' || b.status === 'COMPLETED' ? 'confirmed'
        : b.status === 'CANCELLED' ? 'cancelled' : 'pending';
      days[day][key]++;
    });
    return Object.values(days);
  }, [stats]);

  const categoryChartData = useMemo(() =>
    (stats?.vendorsByCategory || []).map((c, i) => ({ ...c, color: CHART_COLORS[i % CHART_COLORS.length] })),
    [stats]
  );

  if (loading) return <DashboardLayout><div className="dashboard-content"><div className="page-loading">Loading...</div></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="dashboard-content">
        <motion.div className="dashboard-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="dashboard-title">Dashboard</h1>
            <p className="dashboard-subtitle">Welcome back, {user?.name} 👋</p>
          </div>
          <div className="dashboard-date">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </motion.div>

        <div className="stats-grid">
          <StatsCard title="Total Users" value={(stats?.totalUsers || 0).toLocaleString()} icon={<Users size={20} />} color="#2563eb" delay={0} />
          <StatsCard title="Total Vendors" value={(stats?.totalVendors || 0).toLocaleString()} icon={<Store size={20} />} color="#6b2737" delay={0.1} />
          <StatsCard title="Total Bookings" value={(stats?.totalBookings || 0).toLocaleString()} icon={<CalendarDays size={20} />} color="#16a34a" delay={0.2} />
          <StatsCard title="Total Revenue" value={`₹${(stats?.totalRevenue || 0).toLocaleString()}`} icon={<CreditCard size={20} />} color="#d97706" delay={0.3} />
        </div>

        <div className="charts-grid">
          {/* Bookings chart */}
          <motion.div className="dashboard-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="dashboard-card-header">
              <h2 className="dashboard-card-title">Recent Bookings</h2>
              <div className="filter-pills">
                {['confirmed', 'pending', 'cancelled'].map(key => (
                  <button key={key} className={`filter-pill ${activeBookingBars.includes(key) ? 'active' : ''}`} onClick={() => toggleBar(key)}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bookingChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barSize={10} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,69,69,0.08)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#a08080' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#a08080' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                {activeBookingBars.includes('confirmed') && <Bar dataKey="confirmed" name="Confirmed" fill={BOOKING_BAR_COLORS.confirmed} radius={[4,4,0,0]} />}
                {activeBookingBars.includes('pending') && <Bar dataKey="pending" name="Pending" fill={BOOKING_BAR_COLORS.pending} radius={[4,4,0,0]} />}
                {activeBookingBars.includes('cancelled') && <Bar dataKey="cancelled" name="Cancelled" fill={BOOKING_BAR_COLORS.cancelled} radius={[4,4,0,0]} />}
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Vendors by category donut */}
          <motion.div className="dashboard-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <div className="dashboard-card-header">
              <h2 className="dashboard-card-title">Vendors by Category</h2>
            </div>
            {categoryChartData.length === 0 ? (
              <div className="empty-state-sm"><p>No data yet</p></div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={categoryChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="count" strokeWidth={0}>
                      {categoryChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [v, '']} contentStyle={{ fontSize: '0.8rem', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                  {categoryChartData.map(c => (
                    <div key={c.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{c.name}</span>
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>

          {/* Quick stats */}
          <motion.div className="dashboard-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <div className="dashboard-card-header"><h2 className="dashboard-card-title">Platform Health</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.5rem' }}>
              {[
                { label: 'Pending Approvals', value: stats?.pendingVendors || 0, color: '#d97706' },
                { label: 'Active Bookings', value: stats?.activeBookings || 0, color: '#2563eb' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'var(--surface)', borderRadius: 8 }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="dashboard-grid-2">
          {/* Pending Vendors */}
          <motion.div className="dashboard-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <div className="dashboard-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h2 className="dashboard-card-title">Pending Approvals</h2>
                <span className="badge badge-warning">{pendingVendors.length}</span>
              </div>
            </div>
            {pendingVendors.length === 0 ? (
              <div className="empty-state-sm"><CheckCircle size={28} style={{ color: '#16a34a' }} /><p>All caught up!</p></div>
            ) : (
              <div className="table-wrapper">
                <table className="dashboard-table">
                  <thead><tr><th>Business</th><th>Category</th><th>City</th><th>Actions</th></tr></thead>
                  <tbody>
                    <AnimatePresence mode="popLayout">
                      {pendingVendors.map(v => (
                        <motion.tr key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <td><span className="table-name">{v.businessName}</span></td>
                          <td><span className="badge badge-default">{v.category?.name}</span></td>
                          <td>{v.city || '—'}</td>
                          <td>
                            <div className="table-actions">
                              <button className="action-btn approve" onClick={() => handleApprove(v.id)}><CheckCircle size={13} /> Approve</button>
                              <button className="action-btn reject" onClick={() => handleReject(v.id)}><XCircle size={13} /> Suspend</button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* Recent Bookings */}
          <motion.div className="dashboard-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <div className="dashboard-card-header">
              <h2 className="dashboard-card-title">Recent Bookings</h2>
              <Clock size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
            {!stats?.recentBookings?.length ? (
              <div className="empty-state-sm"><p>No bookings yet</p></div>
            ) : (
              <div className="activity-feed">
                {stats.recentBookings.map(b => (
                  <div key={b.id} className="activity-item">
                    <div className="activity-dot" style={{ background: b.status === 'CONFIRMED' || b.status === 'COMPLETED' ? '#16a34a' : b.status === 'CANCELLED' ? '#dc2626' : '#d97706' }} />
                    <div className="activity-content">
                      <p className="activity-action">{b.customer?.name} → {b.vendor?.businessName}</p>
                      <p className="activity-name">{b.service?.name} · ₹{b.service?.price}</p>
                    </div>
                    <span className="activity-time">{new Date(b.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
