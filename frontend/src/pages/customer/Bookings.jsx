import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, XCircle } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import API from '../../api/axios';
import toast from 'react-hot-toast';

const STATUSES = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
const STATUS_COLORS = { PENDING: '#d97706', CONFIRMED: '#2563eb', COMPLETED: '#16a34a', CANCELLED: '#dc2626' };

export default function CustomerBookings() {
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (status !== 'ALL') params.append('status', status);
      const res = await API.get(`/bookings/mine?${params}`);
      setBookings(res.data.data?.data || []);
      setMeta(res.data.data?.meta || {});
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status]);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await API.put(`/bookings/${id}/cancel`);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'CANCELLED' } : b));
      toast.success('Booking cancelled');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to cancel');
    }
  };

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
            <h1 className="dashboard-title">My Bookings</h1>
            <p className="dashboard-subtitle">{meta.total || 0} total bookings</p>
          </div>
        </motion.div>

        <motion.div className="dashboard-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="dashboard-card-header">
            <div className="filter-pills">
              {STATUSES.map(s => (
                <button key={s} className={`filter-pill ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>
                  {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {loading ? <div className="page-loading">Loading...</div> : bookings.length === 0 ? (
            <div className="empty-state-sm">
              <CalendarDays size={32} style={{ color: 'var(--rose-light)' }} />
              <p>No bookings found</p>
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="dashboard-table">
                  <thead><tr><th>Vendor</th><th>Service</th><th>Date / Time</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    <AnimatePresence mode="popLayout">
                      {bookings.map(b => (
                        <motion.tr key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <td>
                            <span className="table-name">{b.vendor?.businessName}</span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.vendor?.city}</div>
                          </td>
                          <td>{b.service?.name}</td>
                          <td style={{ fontSize: '0.82rem' }}>{formatDate(b)}</td>
                          <td style={{ fontWeight: 600, color: 'var(--maroon)' }}>₹{b.service?.price}</td>
                          <td>
                            <span className="badge" style={{ background: `${STATUS_COLORS[b.status]}18`, color: STATUS_COLORS[b.status] }}>
                              {b.status}
                            </span>
                          </td>
                          <td>
                            {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                              <button className="action-btn reject" onClick={() => handleCancel(b.id)}>
                                <XCircle size={13} /> Cancel
                              </button>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {meta.totalPages > 1 && (
                <div className="pagination">
                  <button className="filter-pill" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Page {page} of {meta.totalPages}</span>
                  <button className="filter-pill" disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
