import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import API from '../../api/axios';
import toast from 'react-hot-toast';

const ACTION_COLORS = {
  APPROVE: '#16a34a', SUSPEND: '#d97706', BLOCK: '#dc2626', UNBLOCK: '#2563eb',
  DELETE: '#dc2626', ENABLE_SERVICE: '#16a34a', DISABLE_SERVICE: '#d97706',
  HIDE_REVIEW: '#6b7280', SHOW_REVIEW: '#2563eb', BLOCK_USER: '#dc2626', UNBLOCK_USER: '#2563eb',
};

export default function AdminAuditLog() {
  const [actions, setActions] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get(`/admin/actions?page=${page}&limit=20`);
      setActions(res.data.data?.data || []);
      setMeta(res.data.data?.meta || {});
    } catch {
      toast.error('Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <DashboardLayout>
      <div className="dashboard-content">
        <motion.div className="dashboard-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="dashboard-title">Audit Log</h1>
            <p className="dashboard-subtitle">{meta.total || 0} total actions</p>
          </div>
        </motion.div>

        <motion.div className="dashboard-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {loading ? <div className="page-loading">Loading...</div> : actions.length === 0 ? (
            <div className="empty-state-sm"><ClipboardList size={32} style={{ color: 'var(--rose-light)' }} /><p>No actions yet</p></div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="dashboard-table">
                  <thead><tr><th>Action</th><th>Target Type</th><th>Target ID</th><th>Admin ID</th><th>Reason</th><th>Date</th></tr></thead>
                  <tbody>
                    {actions.map(a => (
                      <tr key={a.id}>
                        <td>
                          <span className="badge" style={{ background: `${ACTION_COLORS[a.action] || '#6b7280'}18`, color: ACTION_COLORS[a.action] || '#6b7280' }}>
                            {a.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td><span className="badge badge-default">{a.targetType}</span></td>
                        <td style={{ fontSize: '0.82rem' }}>#{a.targetId}</td>
                        <td style={{ fontSize: '0.82rem' }}>#{a.adminId}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{a.reason || '—'}</td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(a.createdAt).toLocaleString()}</td>
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
