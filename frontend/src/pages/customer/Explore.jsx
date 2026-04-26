import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import API from '../../api/axios';
import toast from 'react-hot-toast';

const BOOKING_TYPE_LABELS = { SLOT_BASED: 'Appointments', HOURLY: 'Hourly', DAILY: 'Daily', NO_BOOKING: 'Browse Only' };

export default function Explore() {
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      if (city) params.append('city', city);
      const res = await API.get(`/vendors?${params}`);
      setVendors(res.data.data?.data || []);
      setMeta(res.data.data?.meta || {});
    } catch {
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [page, search, category, city]);

  useEffect(() => {
    API.get('/categories').then(r => setCategories(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, category, city]);

  return (
    <DashboardLayout>
      <div className="dashboard-content">
        <motion.div className="dashboard-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="dashboard-title">Explore</h1>
            <p className="dashboard-subtitle">Find the best vendors near you</p>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div className="dashboard-card" style={{ marginBottom: '1.25rem', padding: '1rem 1.5rem' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="explore-filters">
            <div className="input-wrapper" style={{ flex: 2 }}>
              <Search size={15} className="input-icon" />
              <input className="input-field" style={{ paddingLeft: '2.5rem' }} placeholder="Search vendors, services, cities..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="input-field" style={{ flex: 1 }} value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
            <div className="input-wrapper" style={{ flex: 1 }}>
              <MapPin size={15} className="input-icon" />
              <input className="input-field" style={{ paddingLeft: '2.5rem' }} placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
            </div>
          </div>
        </motion.div>

        {/* Results */}
        {loading ? (
          <div className="page-loading">Loading vendors...</div>
        ) : vendors.length === 0 ? (
          <div className="empty-state">
            <Store size={48} style={{ color: 'var(--rose-light)', marginBottom: '1rem' }} />
            <h2>No vendors found</h2>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{meta.total} vendors found</p>
            <div className="vendor-grid">
              {vendors.map((v, i) => (
                <motion.div key={v.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Link to={`/customer-dashboard/vendor/${v.id}`} className="vendor-card">
                    <div className="vendor-card-cover">
                      {v.coverImage ? <img src={v.coverImage} alt={v.businessName} /> : <div className="vendor-card-cover-placeholder"><Store size={32} /></div>}
                      {v.isFeatured && <span className="vendor-featured-badge">⭐ Featured</span>}
                    </div>
                    <div className="vendor-card-body">
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div className="vendor-logo">
                          {v.logo ? <img src={v.logo} alt="" /> : <span>{v.businessName[0]}</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 className="vendor-name">{v.businessName} {v.isVerified && <span title="Verified">✓</span>}</h3>
                          <p className="vendor-category">{v.category?.name}</p>
                        </div>
                      </div>
                      {v.description && <p className="vendor-desc">{v.description}</p>}
                      <div className="vendor-meta">
                        {v.city && <span><MapPin size={11} /> {v.city}</span>}
                        <span className="badge badge-default" style={{ fontSize: '0.7rem' }}>{BOOKING_TYPE_LABELS[v.bookingType]}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v._count?.services} services</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {meta.totalPages > 1 && (
              <div className="pagination" style={{ marginTop: '2rem' }}>
                <button className="filter-pill" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Page {page} of {meta.totalPages}</span>
                <button className="filter-pill" disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
