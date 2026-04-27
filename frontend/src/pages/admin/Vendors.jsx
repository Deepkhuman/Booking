import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, CheckCircle, XCircle, ShieldOff, Trash2, Search } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import API from '../../api/axios';
import toast from 'react-hot-toast';

const STATUSES = ['ALL', 'PENDING', 'APPROVED', 'SUSPENDED', 'BLOCKED'];
const STATUS_COLORS = { PENDING: '#d97706', APPROVED: '#16a34a', SUSPENDED: '#d97706', BLOCKED: '#dc2626' };

export default function AdminVendors() {
  const [vendors, setVendors] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (status !== 'ALL') params.append('status', status);
      const res = await API.get(`/admin/vendors?${params}`);
      let data = res.data.data?.data || [];
      if (search) data = data.filter(v =>
        v.businessName?.toLowerCase().includes(search.toLowerCase()) ||
        v.city?.toLowerCase().includes(search.toLowerCase())
      );
      setVendors(data);
      setMeta(res.data.data?.meta || {});
    } catch {
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, search]);

  const action = async (id, type) => {
    try {
      await API.put(`/admin/vendors/${id}/${type}`);
      const map = { approve: 'APPROVED', suspend: 'SUSPENDED', block: 'BLOCKED', unblock: 'APPROVED' };
      setVendors(prev => prev.map(v => v.id === id ? { ...v, status: map[type] } : v));
      toast.success(`Vendor ${type}d`);
    } catch (e) {
      toast.error(e.response?.data?.message || `Failed to ${type}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Permanently delete this vendor?')) return;
    try {
      await API.delete(`/admin/vendors/${id}`);
      setVendors(prev => prev.filter(v => v.id !== id));
      toast.success('Vendor deleted');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <DashboardLayout>
      <div className="dashboard-content">
        <motion.div className="dashboard-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="dashboard-title">Vendors</h1>
            <p className="dashboard-subtitle">{meta.total || 0} total vendors</p>
          </div>
        </motion.div>

        <motion.div className="dashboard-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="dashboard-card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            <div className="filter-pills">
              {STATUSES.map(s => (
                <button key={s} className={`filter-pill ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>
                  {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); }} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                className="input-field"
                style={{ width: 200, padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                placeholder="Search name or city..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
              <button type="submit" className="filter-pill active" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Search size={13} /> Search
              </button>
            </form>
          </div>

          {loading ? <div className="page-loading">Loading...</div> : vendors.length === 0 ? (
            <div className="empty-state-sm"><Store size={32} style={{ color: 'var(--rose-light)' }} /><p>No vendors found</p></div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="dashboard-table">
                  <thead>
                    <tr><th>Business</th><th>Category</th><th>City</th><th>Type</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="popLayout">
                      {vendors.map(v => (
                        <motion.tr key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <td>
                            <span className="table-name">{v.businessName}</span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v.owner?.email}</div>
                          </td>
                          <td><span className="badge badge-default">{v.category?.name || '—'}</span></td>
                          <td style={{ fontSize: '0.82rem' }}>{v.city || '—'}</td>
                          <td><span className="badge badge-default" style={{ fontSize: '0.7rem' }}>{v.bookingType?.replace('_', ' ')}</span></td>
                          <td>
                            <span className="badge" style={{ background: `${STATUS_COLORS[v.status]}18`, color: STATUS_COLORS[v.status] }}>
                              {v.status}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              {v.status === 'PENDING' && (
                                <button className="action-btn approve" onClick={() => action(v.id, 'approve')}>
                                  <CheckCircle size={13} /> Approve
                                </button>
                              )}
                              {(v.status === 'APPROVED' || v.status === 'PENDING') && (
                                <button className="action-btn reject" onClick={() => action(v.id, 'suspend')}>
                                  <ShieldOff size={13} /> Suspend
                                </button>
                              )}
                              {v.status !== 'BLOCKED' && v.status !== 'PENDING' && (
                                <button className="action-btn reject" onClick={() => action(v.id, 'block')}>
                                  <XCircle size={13} /> Block
                                </button>
                              )}
                              {(v.status === 'SUSPENDED' || v.status === 'BLOCKED') && (
                                <button className="action-btn approve" onClick={() => action(v.id, 'unblock')}>
                                  <CheckCircle size={13} /> Unblock
                                </button>
                              )}
                              <button className="action-btn reject" onClick={() => handleDelete(v.id)}>
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
