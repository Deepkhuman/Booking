import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, ShieldOff, ShieldCheck, Search } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import API from '../../api/axios';
import toast from 'react-hot-toast';

const ROLES = ['ALL', 'CUSTOMER', 'VENDOR', 'ADMIN'];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [role, setRole] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.append('search', search);
      const res = await API.get(`/admin/users?${params}`);
      let data = res.data.data?.data || [];
      if (role !== 'ALL') data = data.filter(u => u.role === role);
      setUsers(data);
      setMeta(res.data.data?.meta || {});
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, role]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, role]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const toggleBlock = async (u) => {
    try {
      await API.put(`/admin/users/${u.id}/${u.isBlocked ? 'unblock' : 'block'}`);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, isBlocked: !x.isBlocked } : x));
      toast.success(u.isBlocked ? 'User unblocked' : 'User blocked');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  return (
    <DashboardLayout>
      <div className="dashboard-content">
        <motion.div className="dashboard-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="dashboard-title">Users</h1>
            <p className="dashboard-subtitle">{meta.total || 0} total users</p>
          </div>
        </motion.div>

        <motion.div className="dashboard-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="dashboard-card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            <div className="filter-pills">
              {ROLES.map(r => (
                <button key={r} className={`filter-pill ${role === r ? 'active' : ''}`} onClick={() => setRole(r)}>
                  {r === 'ALL' ? 'All' : r.charAt(0) + r.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                className="input-field"
                style={{ width: 200, padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                placeholder="Search name or email..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
              <button type="submit" className="filter-pill active" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Search size={13} /> Search
              </button>
            </form>
          </div>

          {loading ? <div className="page-loading">Loading...</div> : users.length === 0 ? (
            <div className="empty-state-sm"><Users size={32} style={{ color: 'var(--rose-light)' }} /><p>No users found</p></div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="dashboard-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Bookings</th><th>Verified</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td><span className="table-name">{u.name || '—'}</span></td>
                        <td style={{ fontSize: '0.82rem' }}>{u.email}</td>
                        <td><span className={`badge badge-${u.role === 'ADMIN' ? 'danger' : u.role === 'VENDOR' ? 'warning' : 'default'}`}>{u.role}</span></td>
                        <td>{u._count?.bookings || 0}</td>
                        <td>
                          <span className={`badge badge-${u.isEmailVerified ? 'success' : 'default'}`}>
                            {u.isEmailVerified ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${u.isBlocked ? 'danger' : 'success'}`}>
                            {u.isBlocked ? 'Blocked' : 'Active'}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`action-btn ${u.isBlocked ? 'approve' : 'reject'}`}
                            onClick={() => toggleBlock(u)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            {u.isBlocked ? <><ShieldCheck size={13} /> Unblock</> : <><ShieldOff size={13} /> Block</>}
                          </button>
                        </td>
                      </tr>
                    ))}
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
