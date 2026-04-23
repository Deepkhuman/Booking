import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Store, CalendarDays, CreditCard, Clock, CheckCircle, XCircle } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import StatsCard from '../../components/dashboard/StatsCard';
import { useAuth } from '../../context/AuthContext';

const mockStats = {
  totalUsers: 1240, totalVendors: 86, totalBookings: 3420, totalRevenue: 48200,
  usersTrend: 12, vendorsTrend: 8, bookingsTrend: 23, revenueTrend: 15,
};

const allRevenueData = {
  '7D': [
    { label: 'Mon', revenue: 5200 }, { label: 'Tue', revenue: 7800 },
    { label: 'Wed', revenue: 6100 }, { label: 'Thu', revenue: 9400 },
    { label: 'Fri', revenue: 11200 }, { label: 'Sat', revenue: 13600 },
    { label: 'Sun', revenue: 8900 },
  ],
  '1M': [
    { label: 'W1', revenue: 18400 }, { label: 'W2', revenue: 22100 },
    { label: 'W3', revenue: 19800 }, { label: 'W4', revenue: 26300 },
  ],
  '3M': [
    { label: 'Feb', revenue: 39600 }, { label: 'Mar', revenue: 44100 }, { label: 'Apr', revenue: 48200 },
  ],
  '6M': [
    { label: 'Nov', revenue: 28400 }, { label: 'Dec', revenue: 35200 },
    { label: 'Jan', revenue: 31800 }, { label: 'Feb', revenue: 39600 },
    { label: 'Mar', revenue: 44100 }, { label: 'Apr', revenue: 48200 },
  ],
};

const bookingsByDay = [
  { day: 'Mon', confirmed: 42, cancelled: 8, pending: 15 },
  { day: 'Tue', confirmed: 58, cancelled: 5, pending: 20 },
  { day: 'Wed', confirmed: 35, cancelled: 12, pending: 10 },
  { day: 'Thu', confirmed: 67, cancelled: 6, pending: 18 },
  { day: 'Fri', confirmed: 74, cancelled: 9, pending: 22 },
  { day: 'Sat', confirmed: 89, cancelled: 14, pending: 30 },
  { day: 'Sun', confirmed: 51, cancelled: 7, pending: 12 },
];

const categoryData = [
  { name: 'Hotels', value: 28, color: '#6b2737' },
  { name: 'Barbers', value: 22, color: '#c4717e' },
  { name: 'Gyms', value: 18, color: '#e8b4bb' },
  { name: 'Medical', value: 16, color: '#8b3a4a' },
  { name: 'Others', value: 16, color: '#d4a0a8' },
];

const mockPendingVendors = [
  { id: 1, businessName: "John's Barbershop", category: 'Barber', city: 'Mumbai', createdAt: '2026-04-20' },
  { id: 2, businessName: 'Grand Hotel', category: 'Hotel', city: 'Delhi', createdAt: '2026-04-19' },
  { id: 3, businessName: 'FitLife Gym', category: 'Gym', city: 'Bangalore', createdAt: '2026-04-18' },
  { id: 4, businessName: 'Dr. Smith Clinic', category: 'Medical', city: 'Chennai', createdAt: '2026-04-17' },
  { id: 5, businessName: 'Blade & Style', category: 'Barber', city: 'Pune', createdAt: '2026-04-16' },
  { id: 6, businessName: 'Sunrise Resort', category: 'Hotel', city: 'Goa', createdAt: '2026-04-15' },
];

const mockActivity = [
  { id: 1, action: 'New vendor registered', name: "John's Barbershop", time: '2 mins ago', type: 'vendor' },
  { id: 2, action: 'Booking confirmed', name: 'Booking #1234', time: '15 mins ago', type: 'booking' },
  { id: 3, action: 'New user registered', name: 'Rahul Sharma', time: '1 hour ago', type: 'user' },
  { id: 4, action: 'Payment received', name: '₹1,200 from Booking #1230', time: '2 hours ago', type: 'payment' },
  { id: 5, action: 'Vendor approved', name: 'Sunset Resort', time: '3 hours ago', type: 'vendor' },
  { id: 6, action: 'Booking cancelled', name: 'Booking #1228', time: '4 hours ago', type: 'booking' },
  { id: 7, action: 'New user registered', name: 'Priya Mehta', time: '5 hours ago', type: 'user' },
];

const BOOKING_BAR_COLORS = { confirmed: '#6b2737', pending: '#e8b4bb', cancelled: '#f3ede6' };
const ACTIVITY_COLORS = { vendor: '#6b2737', booking: '#2563eb', user: '#16a34a', payment: '#d97706' };

const FilterPills = ({ options, active, onChange }) => (
  <div className="filter-pills">
    {options.map((o) => (
      <button
        key={o.value}
        className={`filter-pill ${active === o.value ? 'active' : ''}`}
        onClick={() => onChange(o.value)}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const CustomTooltip = ({ active, payload, label, prefix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fffcfa', border: '1px solid rgba(139,69,69,0.12)', borderRadius: 10, padding: '0.6rem 0.9rem', fontSize: '0.82rem', boxShadow: '0 8px 24px rgba(107,39,55,0.1)' }}>
      <p style={{ color: '#a08080', marginBottom: 4, fontWeight: 600 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {prefix}{p.value.toLocaleString()}</p>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats] = useState(mockStats);

  // Revenue filter
  const [revenueRange, setRevenueRange] = useState('6M');

  // Bookings filter — multi-toggle
  const [activeBookingBars, setActiveBookingBars] = useState(['confirmed', 'pending', 'cancelled']);
  const toggleBar = (key) =>
    setActiveBookingBars((prev) =>
      prev.includes(key) ? (prev.length > 1 ? prev.filter((k) => k !== key) : prev) : [...prev, key]
    );

  // Vendor table filter
  const [vendorCategoryFilter, setVendorCategoryFilter] = useState('All');
  const vendorCategories = ['All', ...new Set(mockPendingVendors.map((v) => v.category))];
  const filteredVendors = useMemo(() =>
    vendorCategoryFilter === 'All' ? mockPendingVendors : mockPendingVendors.filter((v) => v.category === vendorCategoryFilter),
    [vendorCategoryFilter]
  );

  // Activity filter
  const [activityFilter, setActivityFilter] = useState('all');
  const filteredActivity = useMemo(() =>
    activityFilter === 'all' ? mockActivity : mockActivity.filter((a) => a.type === activityFilter),
    [activityFilter]
  );

  return (
    <DashboardLayout>
      <div className="dashboard-content">
        {/* Header */}
        <motion.div className="dashboard-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="dashboard-title">Dashboard</h1>
            <p className="dashboard-subtitle">Welcome back, {user?.name} 👋</p>
          </div>
          <div className="dashboard-date">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </motion.div>

        {/* Stats */}
        <div className="stats-grid">
          <StatsCard title="Total Users" value={stats.totalUsers.toLocaleString()} icon={<Users size={20} />} trend={stats.usersTrend} color="#2563eb" delay={0} />
          <StatsCard title="Total Vendors" value={stats.totalVendors.toLocaleString()} icon={<Store size={20} />} trend={stats.vendorsTrend} color="#6b2737" delay={0.1} />
          <StatsCard title="Total Bookings" value={stats.totalBookings.toLocaleString()} icon={<CalendarDays size={20} />} trend={stats.bookingsTrend} color="#16a34a" delay={0.2} />
          <StatsCard title="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} icon={<CreditCard size={20} />} trend={stats.revenueTrend} color="#d97706" delay={0.3} />
        </div>

        {/* Charts Row */}
        <div className="charts-grid">

          {/* Revenue — time range filter */}
          <motion.div className="dashboard-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="dashboard-card-header">
              <h2 className="dashboard-card-title">Revenue Trend</h2>
              <FilterPills
                options={[{ label: '7D', value: '7D' }, { label: '1M', value: '1M' }, { label: '3M', value: '3M' }, { label: '6M', value: '6M' }]}
                active={revenueRange}
                onChange={setRevenueRange}
              />
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={allRevenueData[revenueRange]} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6b2737" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6b2737" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,69,69,0.08)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#a08080' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#a08080' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip prefix="₹" />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6b2737" strokeWidth={2.5} fill="url(#revenueGrad)" dot={{ fill: '#6b2737', r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Bookings — status toggle filter */}
          <motion.div className="dashboard-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <div className="dashboard-card-header">
              <h2 className="dashboard-card-title">Bookings This Week</h2>
              <div className="filter-pills">
                {['confirmed', 'pending', 'cancelled'].map((key) => (
                  <button
                    key={key}
                    className={`filter-pill filter-pill--dot ${activeBookingBars.includes(key) ? 'active' : ''}`}
                    onClick={() => toggleBar(key)}
                    style={{ '--dot-color': BOOKING_BAR_COLORS[key] }}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bookingsByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barSize={8} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,69,69,0.08)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#a08080' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#a08080' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                {activeBookingBars.includes('confirmed') && <Bar dataKey="confirmed" name="Confirmed" fill="#6b2737" radius={[4, 4, 0, 0]} />}
                {activeBookingBars.includes('pending') && <Bar dataKey="pending" name="Pending" fill="#e8b4bb" radius={[4, 4, 0, 0]} />}
                {activeBookingBars.includes('cancelled') && <Bar dataKey="cancelled" name="Cancelled" fill="#d4a0a8" radius={[4, 4, 0, 0]} />}
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Category Donut */}
          <motion.div className="dashboard-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <div className="dashboard-card-header">
              <h2 className="dashboard-card-title">Vendors by Category</h2>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v}%`, '']} contentStyle={{ fontSize: '0.8rem', borderRadius: 8, border: '1px solid rgba(139,69,69,0.12)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
              {categoryData.map((c) => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{c.name}</span>
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.value}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="dashboard-grid-2">
          {/* Pending Vendors — category filter */}
          <motion.div className="dashboard-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <div className="dashboard-card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h2 className="dashboard-card-title">Pending Approvals</h2>
                <span className="badge badge-warning">{filteredVendors.length} pending</span>
              </div>
              <FilterPills
                options={vendorCategories.map((c) => ({ label: c, value: c }))}
                active={vendorCategoryFilter}
                onChange={setVendorCategoryFilter}
              />
            </div>
            <div className="table-wrapper">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Business</th><th>Category</th><th>City</th><th>Date</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {filteredVendors.map((vendor) => (
                      <motion.tr
                        key={vendor.id}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                      >
                        <td><span className="table-name">{vendor.businessName}</span></td>
                        <td><span className="badge badge-default">{vendor.category}</span></td>
                        <td>{vendor.city}</td>
                        <td>{vendor.createdAt}</td>
                        <td>
                          <div className="table-actions">
                            <button className="action-btn approve"><CheckCircle size={15} /> Approve</button>
                            <button className="action-btn reject"><XCircle size={15} /> Reject</button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Activity — type filter */}
          <motion.div className="dashboard-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <div className="dashboard-card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <h2 className="dashboard-card-title">Recent Activity</h2>
                <Clock size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
              <FilterPills
                options={[
                  { label: 'All', value: 'all' },
                  { label: 'Vendors', value: 'vendor' },
                  { label: 'Bookings', value: 'booking' },
                  { label: 'Users', value: 'user' },
                  { label: 'Payments', value: 'payment' },
                ]}
                active={activityFilter}
                onChange={setActivityFilter}
              />
            </div>
            <div className="activity-feed">
              <AnimatePresence mode="popLayout">
                {filteredActivity.map((item, i) => (
                  <motion.div
                    key={item.id}
                    className="activity-item"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="activity-dot" style={{ background: ACTIVITY_COLORS[item.type] }} />
                    <div className="activity-content">
                      <p className="activity-action">{item.action}</p>
                      <p className="activity-name">{item.name}</p>
                    </div>
                    <span className="activity-time">{item.time}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
