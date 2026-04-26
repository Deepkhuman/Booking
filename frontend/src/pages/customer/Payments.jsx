import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, CheckCircle, XCircle, Clock, RefreshCw, IndianRupee } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  PENDING: '#d97706', SUCCESS: '#16a34a',
  FAILED: '#dc2626', REFUNDED: '#6b7280',
};
const STATUS_ICONS = {
  PENDING: <Clock size={13} />, SUCCESS: <CheckCircle size={13} />,
  FAILED: <XCircle size={13} />, REFUNDED: <RefreshCw size={13} />,
};

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) { resolve(true); return; }
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Payments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingIdFromUrl = searchParams.get('bookingId');

  const [history, setHistory] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [pendingBookings, setPendingBookings] = useState([]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get(`/payments/history?page=${page}&limit=10`);
      setHistory(res.data.data?.data || []);
      setMeta(res.data.data?.meta || {});
    } catch {
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadHistory();
    // load unpaid bookings
    API.get('/bookings/mine?limit=20')
      .then(r => {
        const unpaid = (r.data.data?.data || []).filter(b => b.paymentStatus === 'UNPAID' && b.status !== 'CANCELLED');
        setPendingBookings(unpaid);
      })
      .catch(() => {});
  }, [loadHistory]);

  // auto-trigger payment if bookingId in URL
  useEffect(() => {
    if (bookingIdFromUrl && pendingBookings.length > 0) {
      const booking = pendingBookings.find(b => b.id === Number(bookingIdFromUrl));
      if (booking) handlePay(booking);
    }
  }, [bookingIdFromUrl, pendingBookings]);

  const handlePay = async (booking) => {
    setPaying(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) { toast.error('Failed to load payment gateway'); return; }

      const res = await API.post('/payments/create-order', { bookingId: booking.id });
      const order = res.data.data;

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Plugin',
        description: `${order.service} at ${order.vendor}`,
        order_id: order.orderId,
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#6b2737' },
        handler: async (response) => {
          try {
            await API.post('/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              bookingId: booking.id,
            });
            toast.success('Payment successful! Booking confirmed.');
            loadHistory();
            setPendingBookings(prev => prev.filter(b => b.id !== booking.id));
            navigate('/customer-dashboard/bookings');
          } catch (e) {
            toast.error(e.response?.data?.message || 'Payment verification failed');
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.');
        setPaying(false);
      });
      rzp.open();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to initiate payment');
      setPaying(false);
    }
  };

  const handleRefund = async (bookingId) => {
    if (!confirm('Request a refund for this payment?')) return;
    try {
      await API.post(`/payments/refund/${bookingId}`, {});
      toast.success('Refund processed');
      loadHistory();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Refund failed');
    }
  };

  return (
    <DashboardLayout>
      <div className="dashboard-content">
        <motion.div className="dashboard-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="dashboard-title">Payments</h1>
            <p className="dashboard-subtitle">Manage your payments and transactions</p>
          </div>
        </motion.div>

        {/* Pending Payments */}
        {pendingBookings.length > 0 && (
          <motion.div className="dashboard-card" style={{ marginBottom: '1.25rem' }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="dashboard-card-header">
              <h2 className="dashboard-card-title">Pending Payments</h2>
              <span className="badge badge-warning">{pendingBookings.length} unpaid</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pendingBookings.map(b => (
                <div key={b.id} className="payment-pending-row">
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>{b.service?.name}</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {b.vendor?.businessName} · {b.date || (b.checkIn ? new Date(b.checkIn).toLocaleDateString() : '—')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--maroon)', fontSize: '1rem' }}>
                      ₹{b.service?.price}
                    </span>
                    <button
                      className="btn-primary"
                      disabled={paying}
                      onClick={() => handlePay(b)}
                      style={{ width: 'auto', padding: '0.5rem 1.25rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                    >
                      <CreditCard size={14} /> {paying ? 'Opening...' : 'Pay Now'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Payment History */}
        <motion.div className="dashboard-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="dashboard-card-header">
            <h2 className="dashboard-card-title">Payment History</h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{meta.total || 0} transactions</span>
          </div>

          {loading ? <div className="page-loading">Loading...</div> :
            history.length === 0 ? (
              <div className="empty-state-sm">
                <IndianRupee size={32} style={{ color: 'var(--rose-light)' }} />
                <p>No payment history yet</p>
              </div>
            ) : (
              <>
                <div className="table-wrapper">
                  <table className="dashboard-table">
                    <thead>
                      <tr><th>Service</th><th>Vendor</th><th>Amount</th><th>Status</th><th>Date</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      <AnimatePresence mode="popLayout">
                        {history.map(p => (
                          <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <td><span className="table-name">{p.booking?.service?.name}</span></td>
                            <td>{p.booking?.vendor?.businessName}</td>
                            <td style={{ fontWeight: 700, color: 'var(--maroon)' }}>₹{p.amount}</td>
                            <td>
                              <span className="badge" style={{ background: `${STATUS_COLORS[p.status]}18`, color: STATUS_COLORS[p.status], display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                {STATUS_ICONS[p.status]} {p.status}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td>
                              {p.status === 'SUCCESS' && (
                                <button className="action-btn reject" style={{ fontSize: '0.75rem' }} onClick={() => handleRefund(p.bookingId)}>
                                  <RefreshCw size={12} /> Refund
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
