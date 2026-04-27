import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, XCircle, Star, X } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import API from '../../api/axios';
import toast from 'react-hot-toast';

const STATUSES = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
const STATUS_COLORS = { PENDING: '#d97706', CONFIRMED: '#2563eb', COMPLETED: '#16a34a', CANCELLED: '#dc2626' };

function ReviewModal({ booking, onClose, onDone }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post('/reviews', { bookingId: booking.id, rating, comment });
      toast.success('Review submitted!');
      onDone(booking.id);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" style={{ maxWidth: 440 }} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="dashboard-card-title">Review — {booking.vendor?.businessName}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="input-group">
            <label>Rating *</label>
            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.25rem' }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <Star size={26} fill={(hover || rating) >= n ? '#f59e0b' : 'none'} color={(hover || rating) >= n ? '#f59e0b' : '#d1d5db'} />
                </button>
              ))}
            </div>
          </div>
          <div className="input-group">
            <label>Comment (optional)</label>
            <textarea className="input-field" rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="Share your experience..." />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-ghost" style={{ width: 'auto', padding: '0.65rem 1.25rem' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting} style={{ width: 'auto', padding: '0.65rem 1.5rem', marginTop: 0 }}>
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function CustomerBookings() {
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewed, setReviewed] = useState(new Set());

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

  const markReviewed = (id) => setReviewed(prev => new Set([...prev, id]));

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
                            <div className="table-actions">
                              {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                                <button className="action-btn reject" onClick={() => handleCancel(b.id)}>
                                  <XCircle size={13} /> Cancel
                                </button>
                              )}
                              {b.status === 'COMPLETED' && !reviewed.has(b.id) && !b.review && (
                                <button className="action-btn approve" onClick={() => setReviewBooking(b)}>
                                  <Star size={13} /> Review
                                </button>
                              )}
                            </div>
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

      <AnimatePresence>
        {reviewBooking && <ReviewModal booking={reviewBooking} onClose={() => setReviewBooking(null)} onDone={markReviewed} />}
      </AnimatePresence>
    </DashboardLayout>
  );
}
