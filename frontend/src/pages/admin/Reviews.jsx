import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, EyeOff, Eye, Trash2 } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import API from '../../api/axios';
import toast from 'react-hot-toast';

function StarRow({ rating }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={11} fill={rating >= n ? '#f59e0b' : 'none'} color={rating >= n ? '#f59e0b' : '#d1d5db'} />
      ))}
    </span>
  );
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get(`/reviews/admin?page=${page}&limit=20`);
      setReviews(res.data.data?.data || []);
      setMeta(res.data.data?.meta || {});
    } catch {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const toggleVisibility = async (r) => {
    try {
      await API.put(`/reviews/${r.id}/${r.isVisible ? 'hide' : 'show'}`);
      setReviews(prev => prev.map(x => x.id === r.id ? { ...x, isVisible: !r.isVisible } : x));
      toast.success(r.isVisible ? 'Review hidden' : 'Review shown');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this review permanently?')) return;
    try {
      await API.delete(`/reviews/${id}`);
      setReviews(prev => prev.filter(r => r.id !== id));
      toast.success('Review deleted');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <DashboardLayout>
      <div className="dashboard-content">
        <motion.div className="dashboard-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="dashboard-title">Reviews</h1>
            <p className="dashboard-subtitle">{meta.total || 0} total reviews</p>
          </div>
        </motion.div>

        <motion.div className="dashboard-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {loading ? <div className="page-loading">Loading...</div> : reviews.length === 0 ? (
            <div className="empty-state-sm"><Star size={32} style={{ color: 'var(--rose-light)' }} /><p>No reviews yet</p></div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="dashboard-table">
                  <thead>
                    <tr><th>Customer</th><th>Vendor</th><th>Rating</th><th>Comment</th><th>Visible</th><th>Date</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="popLayout">
                      {reviews.map(r => (
                        <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          style={{ opacity: r.isVisible ? 1 : 0.5 }}>
                          <td><span className="table-name">{r.customer?.name || '—'}</span></td>
                          <td style={{ fontSize: '0.82rem' }}>{r.vendor?.businessName || '—'}</td>
                          <td><StarRow rating={r.rating} /></td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 200 }}>
                            <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {r.comment || '—'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge badge-${r.isVisible ? 'success' : 'danger'}`}>
                              {r.isVisible ? 'Visible' : 'Hidden'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                className={`action-btn ${r.isVisible ? 'reject' : 'approve'}`}
                                onClick={() => toggleVisibility(r)}
                                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                              >
                                {r.isVisible ? <><EyeOff size={13} /> Hide</> : <><Eye size={13} /> Show</>}
                              </button>
                              <button className="action-btn reject" onClick={() => handleDelete(r.id)}>
                                <Trash2 size={13} />
                              </button>
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
    </DashboardLayout>
  );
}
