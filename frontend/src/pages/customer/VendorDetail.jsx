import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Globe, Clock, X, CheckCircle, Store, ArrowLeft, Star } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import API from '../../api/axios';
import toast from 'react-hot-toast';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function StarRow({ rating }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={13} fill={rating >= n ? '#f59e0b' : 'none'} color={rating >= n ? '#f59e0b' : '#d1d5db'} />
      ))}
    </span>
  );
}

export default function VendorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [showBooking, setShowBooking] = useState(false);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking] = useState({ date: '', startTime: '', endTime: '', checkIn: '', checkOut: '', quantity: 1, notes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    API.get(`/vendors/${id}`)
      .then(r => setVendor(r.data.data))
      .catch(() => toast.error('Vendor not found'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    API.get(`/reviews/vendor/${id}?limit=5`)
      .then(r => setReviews(r.data.data))
      .catch(() => {});
  }, [id]);

  const openBooking = (service) => {
    setSelectedService(service);
    setBooking({ date: '', startTime: '', endTime: '', checkIn: '', checkOut: '', quantity: 1, notes: '' });
    setSlots([]);
    setShowBooking(true);
  };

  const loadSlots = async (date) => {
    if (!date || vendor?.bookingType !== 'SLOT_BASED') return;
    setSlotsLoading(true);
    try {
      const res = await API.get(`/bookings/availability/${id}?date=${date}`);
      setSlots(res.data.data?.slots || []);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleDateChange = (date) => {
    setBooking(b => ({ ...b, date, startTime: '' }));
    loadSlots(date);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        vendorId: Number(id),
        serviceId: selectedService.id,
        bookingType: vendor.bookingType,
        notes: booking.notes,
      };
      if (vendor.bookingType === 'SLOT_BASED') { payload.date = booking.date; payload.startTime = booking.startTime; }
      if (vendor.bookingType === 'HOURLY') { payload.date = booking.date; payload.startTime = booking.startTime; payload.endTime = booking.endTime; }
      if (vendor.bookingType === 'DAILY') { payload.checkIn = booking.checkIn; payload.checkOut = booking.checkOut; }
      if (vendor.bookingType === 'NO_BOOKING') { payload.quantity = Number(booking.quantity); }

      const res = await API.post('/bookings', payload);
      toast.success('Booking created! Proceed to payment.');
      setShowBooking(false);
      navigate(`/customer-dashboard/payments?bookingId=${res.data.data?.id}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <DashboardLayout><div className="dashboard-content"><div className="page-loading">Loading...</div></div></DashboardLayout>;
  if (!vendor) return <DashboardLayout><div className="dashboard-content"><div className="empty-state"><h2>Vendor not found</h2></div></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="dashboard-content">
        <motion.div className="dashboard-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1rem', padding: 0 }}>
            <ArrowLeft size={15} /> Back
          </button>
        </motion.div>

        {/* Cover */}
        <motion.div className="vendor-detail-cover" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {vendor.coverImage ? <img src={vendor.coverImage} alt={vendor.businessName} /> : <div className="vendor-detail-cover-placeholder"><Store size={48} /></div>}
        </motion.div>

        <div className="vendor-detail-layout">
          {/* Left — Info */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <div className="dashboard-card" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div className="vendor-logo vendor-logo--lg">
                  {vendor.logo ? <img src={vendor.logo} alt="" /> : <span>{vendor.businessName[0]}</span>}
                </div>
                <div>
                  <h1 className="dashboard-title" style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>
                    {vendor.businessName} {vendor.isVerified && <span style={{ color: '#2563eb', fontSize: '0.9rem' }}>✓ Verified</span>}
                  </h1>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{vendor.category?.name}</p>
                  <span className={`badge badge-${vendor.bookingType === 'NO_BOOKING' ? 'default' : 'success'}`} style={{ marginTop: '0.4rem', display: 'inline-block' }}>
                    {vendor.bookingType?.replace('_', ' ')}
                  </span>
                </div>
              </div>
              {vendor.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1rem' }}>{vendor.description}</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {vendor.city && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={13} /> {[vendor.address, vendor.city, vendor.state].filter(Boolean).join(', ')}</span>}
                {vendor.phone && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Phone size={13} /> {vendor.phone}</span>}
                {vendor.website && <a href={vendor.website} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: 'var(--maroon)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Globe size={13} /> {vendor.website}</a>}
              </div>
            </div>

            {/* Business Hours */}
            {vendor.businessHours?.length > 0 && (
              <div className="dashboard-card">
                <div className="dashboard-card-header"><h2 className="dashboard-card-title"><Clock size={15} style={{ display: 'inline', marginRight: 6 }} />Business Hours</h2></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {vendor.businessHours.map(h => (
                    <div key={h.dayOfWeek} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 500, color: 'var(--text)' }}>{DAYS[h.dayOfWeek]}</span>
                      <span style={{ color: h.isClosed ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
                        {h.isClosed ? 'Closed' : `${h.openTime} – ${h.closeTime}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {reviews && (
              <motion.div className="dashboard-card" style={{ marginTop: '1.25rem' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div className="dashboard-card-header">
                  <h2 className="dashboard-card-title">
                    <Star size={15} style={{ display: 'inline', marginRight: 6, color: '#f59e0b' }} />
                    Reviews ({reviews.meta?.total || 0})
                    {reviews.stats?.averageRating > 0 && (
                      <span style={{ marginLeft: 8, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                        · {reviews.stats.averageRating} avg
                      </span>
                    )}
                  </h2>
                </div>
                {reviews.data?.length === 0 ? (
                  <div className="empty-state-sm"><p>No reviews yet</p></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {reviews.data.map(r => (
                      <div key={r.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{r.customer?.name}</span>
                          <StarRow rating={r.rating} />
                        </div>
                        {r.comment && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{r.comment}</p>}
                        {r.vendorReply && (
                          <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--surface)', borderRadius: 6, fontSize: '0.82rem', color: 'var(--text-muted)', borderLeft: '3px solid var(--maroon)' }}>
                            <strong style={{ color: 'var(--maroon)' }}>Vendor:</strong> {r.vendorReply}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>

          {/* Right — Services */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <div className="dashboard-card">
              <div className="dashboard-card-header"><h2 className="dashboard-card-title">Services ({vendor.services?.length})</h2></div>
              {vendor.services?.length === 0 ? (
                <div className="empty-state-sm"><p>No services listed yet</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {vendor.services.map(s => (
                    <div key={s.id} className="service-list-item">
                      <div>
                        <p className="service-name">{s.name}</p>
                        {s.description && <p className="service-desc" style={{ marginBottom: 0 }}>{s.description}</p>}
                        <div className="service-meta" style={{ marginTop: '0.4rem' }}>
                          <span className="service-price">₹{s.price}</span>
                          {s.duration && <span className="service-duration">{s.duration} min</span>}
                        </div>
                      </div>
                      {vendor.bookingType !== 'NO_BOOKING' && (
                        <button className="btn-primary" onClick={() => openBooking(s)} style={{ width: 'auto', padding: '0.5rem 1.25rem', marginTop: 0, flexShrink: 0 }}>
                          Book
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Booking Modal */}
        <AnimatePresence>
          {showBooking && selectedService && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBooking(false)}>
              <motion.div className="modal" style={{ maxWidth: 520 }} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <h2 className="dashboard-card-title">Book — {selectedService.name}</h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>₹{selectedService.price}{selectedService.duration ? ` · ${selectedService.duration} min` : ''}</p>
                  </div>
                  <button className="modal-close" onClick={() => setShowBooking(false)}><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                  {/* SLOT_BASED */}
                  {vendor.bookingType === 'SLOT_BASED' && (
                    <>
                      <div className="input-group">
                        <label>Select Date *</label>
                        <input type="date" className="input-field" min={new Date().toISOString().split('T')[0]} value={booking.date} onChange={e => handleDateChange(e.target.value)} required />
                      </div>
                      {booking.date && (
                        <div className="input-group">
                          <label>Select Time Slot *</label>
                          {slotsLoading ? <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading slots...</p> : (
                            <div className="slots-grid">
                              {slots.length === 0 ? <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No slots available</p> :
                                slots.map(s => (
                                  <button key={s.time} type="button" disabled={!s.available}
                                    className={`slot-btn ${!s.available ? 'slot-btn--taken' : ''} ${booking.startTime === s.time ? 'slot-btn--selected' : ''}`}
                                    onClick={() => setBooking(b => ({ ...b, startTime: s.time }))}>
                                    {s.time}
                                  </button>
                                ))
                              }
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* HOURLY */}
                  {vendor.bookingType === 'HOURLY' && (
                    <div className="form-grid-2">
                      <div className="input-group">
                        <label>Date *</label>
                        <input type="date" className="input-field" min={new Date().toISOString().split('T')[0]} value={booking.date} onChange={e => setBooking(b => ({ ...b, date: e.target.value }))} required />
                      </div>
                      <div />
                      <div className="input-group">
                        <label>Start Time *</label>
                        <input type="time" className="input-field" value={booking.startTime} onChange={e => setBooking(b => ({ ...b, startTime: e.target.value }))} required />
                      </div>
                      <div className="input-group">
                        <label>End Time *</label>
                        <input type="time" className="input-field" value={booking.endTime} onChange={e => setBooking(b => ({ ...b, endTime: e.target.value }))} required />
                      </div>
                    </div>
                  )}

                  {/* DAILY */}
                  {vendor.bookingType === 'DAILY' && (
                    <div className="form-grid-2">
                      <div className="input-group">
                        <label>Check In *</label>
                        <input type="date" className="input-field" min={new Date().toISOString().split('T')[0]} value={booking.checkIn} onChange={e => setBooking(b => ({ ...b, checkIn: e.target.value }))} required />
                      </div>
                      <div className="input-group">
                        <label>Check Out *</label>
                        <input type="date" className="input-field" min={booking.checkIn || new Date().toISOString().split('T')[0]} value={booking.checkOut} onChange={e => setBooking(b => ({ ...b, checkOut: e.target.value }))} required />
                      </div>
                    </div>
                  )}

                  {/* NO_BOOKING */}
                  {vendor.bookingType === 'NO_BOOKING' && (
                    <div className="input-group">
                      <label>Quantity</label>
                      <input type="number" className="input-field" min="1" value={booking.quantity} onChange={e => setBooking(b => ({ ...b, quantity: e.target.value }))} />
                    </div>
                  )}

                  <div className="input-group">
                    <label>Notes (optional)</label>
                    <textarea className="input-field" rows={2} value={booking.notes} onChange={e => setBooking(b => ({ ...b, notes: e.target.value }))} placeholder="Any special requests..." />
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn-ghost" style={{ width: 'auto', padding: '0.65rem 1.25rem' }} onClick={() => setShowBooking(false)}>Cancel</button>
                    <button type="submit" className="btn-primary" disabled={submitting} style={{ width: 'auto', padding: '0.65rem 1.5rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CheckCircle size={15} /> {submitting ? 'Booking...' : 'Confirm Booking'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
