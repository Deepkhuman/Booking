import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Store, Star, SlidersHorizontal, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import API from '../../api/axios';
import toast from 'react-hot-toast';

const BOOKING_TYPE_LABELS = {
  SLOT_BASED: 'Appointments', HOURLY: 'Hourly', DAILY: 'Daily', NO_BOOKING: 'Browse Only',
};

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'newest', label: 'Newest' },
  { value: 'reviews', label: 'Most Reviewed' },
];

function StarRating({ rating, count }) {
  if (!rating) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
      <Star size={11} fill="#f59e0b" color="#f59e0b" />
      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{rating}</span>
      {count > 0 && <span>({count})</span>}
    </span>
  );
}

export default function Explore() {
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('featured');
  const [bookingType, setBookingType] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');

  // debounced search
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const debounceRef = useRef(null);

  const [searchParams] = useSearchParams();

  // init category from URL param
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setCategory(cat);
  }, []);

  useEffect(() => {
    API.get('/categories').then(r => setCategories(r.data.data || [])).catch(() => {});
  }, []);

  // debounce search input
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      if (city) params.append('city', city);
      if (bookingType) params.append('bookingType', bookingType);
      const res = await API.get(`/vendors?${params}`);
      let data = res.data.data?.data || [];

      // client-side sort
      if (sort === 'rating') data = [...data].sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
      else if (sort === 'reviews') data = [...data].sort((a, b) => (b._count?.reviews || 0) - (a._count?.reviews || 0));
      else if (sort === 'newest') data = [...data].sort((a, b) => b.id - a.id);
      // 'featured' is default from backend

      setVendors(data);
      setMeta(res.data.data?.meta || {});
    } catch {
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [page, search, category, city, bookingType, sort]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, category, city, bookingType, sort]);

  const clearFilters = () => {
    setSearchInput(''); setSearch(''); setCategory('');
    setCity(''); setBookingType(''); setSort('featured'); setPage(1);
  };

  const hasFilters = search || category || city || bookingType || sort !== 'featured';

  return (
    <DashboardLayout>
      <div className="dashboard-content">
        <motion.div className="dashboard-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="dashboard-title">Explore</h1>
            <p className="dashboard-subtitle">{meta.total || 0} vendors available</p>
          </div>
        </motion.div>

        {/* Search + Filters */}
        <motion.div className="dashboard-card" style={{ marginBottom: '1.25rem', padding: '1rem 1.5rem' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {/* Search row */}
          <div className="explore-filters" style={{ marginBottom: '0.85rem' }}>
            <div className="input-wrapper" style={{ flex: 2 }}>
              <Search size={15} className="input-icon" />
              <input
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Search vendors, services, cities..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
            </div>
            <div className="input-wrapper" style={{ flex: 1 }}>
              <MapPin size={15} className="input-icon" />
              <input
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="City"
                value={city}
                onChange={e => setCity(e.target.value)}
              />
            </div>
            <select className="input-field" style={{ flex: 1 }} value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
          </div>

          {/* Filter pills row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <SlidersHorizontal size={13} style={{ color: 'var(--text-muted)' }} />
              {/* Booking type */}
              {['', 'SLOT_BASED', 'HOURLY', 'DAILY', 'NO_BOOKING'].map(t => (
                <button key={t} className={`filter-pill ${bookingType === t ? 'active' : ''}`} onClick={() => setBookingType(t)}>
                  {t === '' ? 'All Types' : BOOKING_TYPE_LABELS[t]}
                </button>
              ))}
              <span style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 0.25rem' }} />
              {/* Sort */}
              {SORT_OPTIONS.map(o => (
                <button key={o.value} className={`filter-pill ${sort === o.value ? 'active' : ''}`} onClick={() => setSort(o.value)}>
                  {o.label}
                </button>
              ))}
            </div>
            {hasFilters && (
              <button onClick={clearFilters} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--maroon)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                <X size={12} /> Clear all
              </button>
            )}
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
            {hasFilters && <button onClick={clearFilters} className="btn-primary" style={{ width: 'auto', padding: '0.65rem 1.5rem', marginTop: '1rem' }}>Clear Filters</button>}
          </div>
        ) : (
          <>
            <div className="vendor-grid">
              {vendors.map((v, i) => (
                <motion.div key={v.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Link to={`/customer-dashboard/vendor/${v.id}`} className="vendor-card">
                    <div className="vendor-card-cover">
                      {v.coverImage
                        ? <img src={v.coverImage} alt={v.businessName} />
                        : <div className="vendor-card-cover-placeholder"><Store size={32} /></div>}
                      {v.isSponsored && <span className="vendor-sponsored-badge">Sponsored</span>}
                      {!v.isSponsored && v.isFeatured && <span className="vendor-featured-badge">⭐ Featured</span>}
                    </div>
                    <div className="vendor-card-body">
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div className="vendor-logo">
                          {v.logo ? <img src={v.logo} alt="" /> : <span>{v.businessName[0]}</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 className="vendor-name">
                            {v.businessName}
                            {v.isVerified && <span style={{ color: '#2563eb', fontSize: '0.8rem', marginLeft: 4 }}>✓</span>}
                          </h3>
                          <p className="vendor-category">{v.category?.name}</p>
                        </div>
                      </div>
                      {v.description && <p className="vendor-desc">{v.description}</p>}
                      <div className="vendor-meta">
                        {v.city && <span><MapPin size={11} /> {v.city}</span>}
                        <span className="badge badge-default" style={{ fontSize: '0.7rem' }}>{BOOKING_TYPE_LABELS[v.bookingType]}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v._count?.services} services</span>
                        <StarRating rating={v.avgRating} count={v._count?.reviews} />
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
