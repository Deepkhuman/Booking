import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, ToggleLeft, ToggleRight, Search } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import API from '../../api/axios';
import toast from 'react-hot-toast';

export default function AdminServices() {
  const [vendors, setVendors] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [services, setServices] = useState({});
  const [loadingServices, setLoadingServices] = useState({});
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15, status: 'APPROVED' });
      const res = await API.get(`/admin/vendors?${params}`);
      let data = res.data.data?.data || [];
      if (search) data = data.filter(v => v.businessName?.toLowerCase().includes(search.toLowerCase()));
      setVendors(data);
      setMeta(res.data.data?.meta || {});
    } catch {
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  const loadServices = async (vendorId) => {
    if (services[vendorId]) { setExpanded(expanded === vendorId ? null : vendorId); return; }
    setLoadingServices(prev => ({ ...prev, [vendorId]: true }));
    try {
      const res = await API.get(`/services/vendor/${vendorId}`);
      setServices(prev => ({ ...prev, [vendorId]: res.data.data || [] }));
      setExpanded(vendorId);
    } catch {
      toast.error('Failed to load services');
    } finally {
      setLoadingServices(prev => ({ ...prev, [vendorId]: false }));
    }
  };

  const toggleService = async (vendorId, serviceId, isEnabled) => {
    try {
      await API.put(`/admin/services/${serviceId}/${isEnabled ? 'disable' : 'enable'}`);
      setServices(prev => ({
        ...prev,
        [vendorId]: prev[vendorId].map(s => s.id === serviceId ? { ...s, isEnabled: !isEnabled } : s),
      }));
      toast.success(`Service ${isEnabled ? 'disabled' : 'enabled'}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  return (
    <DashboardLayout>
      <div className="dashboard-content">
        <motion.div className="dashboard-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="dashboard-title">Services</h1>
            <p className="dashboard-subtitle">Enable or disable services per vendor</p>
          </div>
        </motion.div>

        <motion.div className="dashboard-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="dashboard-card-header">
            <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); }} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                className="input-field"
                style={{ width: 240, padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                placeholder="Search vendor..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
              <button type="submit" className="filter-pill active" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Search size={13} /> Search
              </button>
            </form>
          </div>

          {loading ? <div className="page-loading">Loading...</div> : vendors.length === 0 ? (
            <div className="empty-state-sm"><Package size={32} style={{ color: 'var(--rose-light)' }} /><p>No vendors found</p></div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {vendors.map(v => (
                  <div key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <button
                      onClick={() => loadServices(v.id)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="vendor-logo" style={{ width: 32, height: 32, fontSize: '0.85rem', borderRadius: 8 }}>
                          {v.logo ? <img src={v.logo} alt="" /> : <span>{v.businessName[0]}</span>}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>{v.businessName}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v.category?.name} · {v.city || '—'}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v._count?.services || 0} services</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--maroon)', fontWeight: 600 }}>
                          {loadingServices[v.id] ? 'Loading...' : expanded === v.id ? '▲ Hide' : '▼ Show'}
                        </span>
                      </div>
                    </button>

                    <AnimatePresence>
                      {expanded === v.id && services[v.id] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ padding: '0 0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {services[v.id].length === 0 ? (
                              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>No services</p>
                            ) : services[v.id].map(s => (
                              <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                <div>
                                  <p style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text)' }}>{s.name}</p>
                                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>₹{s.price}{s.duration ? ` · ${s.duration} min` : ''}</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <span className={`badge badge-${s.isEnabled ? 'success' : 'danger'}`}>
                                    {s.isEnabled ? 'Enabled' : 'Disabled'}
                                  </span>
                                  <button
                                    className={`action-btn ${s.isEnabled ? 'reject' : 'approve'}`}
                                    onClick={() => toggleService(v.id, s.id, s.isEnabled)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                  >
                                    {s.isEnabled ? <><ToggleLeft size={13} /> Disable</> : <><ToggleRight size={13} /> Enable</>}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
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
