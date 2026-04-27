import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, CalendarDays, MessageSquare, X } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import API from '../../api/axios';
import toast from 'react-hot-toast';

const STATUSES = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
const STATUS_COLORS = { PENDING: '#d97706', CONFIRMED: '#2563eb', COMPLETED: '#16a34a', CANCELLED: '#dc2626', NO_SHOW: '#6b7280' };

function ReplyModal({ review, onClose, onDone }) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.put(`/reviews/${review.id}/reply`, { vendorReply: text });
      toast.success('Reply posted');
      onDone(review.id, text);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reply');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" style={{ maxWidth: 440 }} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="dashboard-card-title">Reply to Review</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Customer said: "{review.comment || 'No comment'}"</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="input-group">
            <label>Your Reply *</label>
            <textarea className="input-field" rows={3} value={text} onChange={e => setText(e.target.value)} placeholder="Thank you for your feedback..." required />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-ghost" style={{ width: 'auto', padding: '0.65rem 1.25rem' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting} style={{ width: 'auto', padding: '0.65rem 1.5rem', marginTop: 0 }}>
              {submitting ? 'Posting...' : 'Post Reply'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function VendorBookings() {
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);

  const [replyReview, setReplyReview] = useState(null);
  const [replies, setReplies] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (status !== 'ALL') params.append('status', status);
      const res = await API.get(`/bookings/vendor?${params}`);
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

  const handleReplyDone = (reviewId, text) => setReplies(prev => ({ ...prev, [reviewId]: text }));

  const action = async (id, type) => {
    try {
      await API.put(`/bookings/${id}/${type}`);
      const map = { confirm: 'CONFIRMED', complete: 'COMPLETED', cancel: 'CANCELLED' };
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: map[type] } : b));
      toast.success(`Booking ${type}ed`);
    } catch (e) {
      toast.error(e.response?.data?.message || `Failed to ${type}`);
    }
  };

  const formatDate = (b) => {
    if (b.date) return `${b.date}${b.startTime ? ` at ${b.startTime}` : ''}`;
    if (b.checkIn) return `${new Date(b.checkIn).toLocaleDateString()} → ${new Date(b.checkOut).toLocaleDateString()}`;
    return '—';
  };

  return (
    <DashboardLayout>
      <div className="dashboard-content">
        <motion.div className="dashboard-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="dashboard-title">Bookings</h1>
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

          {loading ? (
            <div className="page-loading">Loading...</div>
          ) : bookings.length === 0 ? (
            <div className="empty-state-sm"><CalendarDays size={32} style={{ color: 'var(--rose-light)', marginBottom: '0.5rem' }} /><p>No bookings found</p></div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="dashboard-table">
                  <thead>
                    <tr><th>Customer</th><th>Service</th><th>Date / Time</th><th>Type</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="popLayout">
                      {bookings.map(b => (
                        <motion.tr key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <td>
                            <span className="table-name">{b.customer?.name || '—'}</span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.customer?.phone}</div>
                          </td>
                          <td>{b.service?.name}<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>₹{b.service?.price}</div></td>
                          <td style={{ fontSize: '0.82rem' }}>{formatDate(b)}</td>
                          <td><span className="badge badge-default" style={{ fontSize: '0.7rem' }}>{b.bookingType?.replace('_', ' ')}</span></td>
                          <td>
                            <span className="badge" style={{ background: `${STATUS_COLORS[b.status]}18`, color: STATUS_COLORS[b.status] }}>
                              {b.status}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              {b.status === 'PENDING' && (
                                <>
                                  <button className="action-btn approve" onClick={() => action(b.id, 'confirm')}><CheckCircle size={13} /> Confirm</button>
                                  <button className="action-btn reject" onClick={() => action(b.id, 'cancel')}><XCircle size={13} /> Cancel</button>
                                </>
                              )}
                              {b.status === 'CONFIRMED' && (
                                <>
                                  <button className="action-btn approve" onClick={() => action(b.id, 'complete')}><CheckCircle size={13} /> Complete</button>
                                  <button className="action-btn reject" onClick={() => action(b.id, 'cancel')}><XCircle size={13} /> Cancel</button>
                                </>
                              )}
                              {b.status === 'COMPLETED' && b.review && !b.review.vendorReply && !replies[b.review.id] && (
                                <button className="action-btn approve" onClick={() => setReplyReview(b.review)}>
                                  <MessageSquare size={13} /> Reply
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

              {/* Pagination */}
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
        {replyReview && <ReplyModal review={replyReview} onClose={() => setReplyReview(null)} onDone={handleReplyDone} />}
      </AnimatePresence>
    </DashboardLayout>
  );
}
