import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Upload, X, ImageIcon } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import API from '../../api/axios';
import toast from 'react-hot-toast';

const emptyForm = { name: '', description: '', price: '', duration: '' };

export default function VendorServices() {
  const [services, setServices] = useState([]);
  const [vendorId, setVendorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    const load = async () => {
      try {
        const profileRes = await API.get('/vendors/me');
        const vendor = profileRes.data.data;
        if (!vendor) { setLoading(false); return; }
        setVendorId(vendor.id);
        const svcRes = await API.get(`/services/vendor/${vendor.id}`);
        setServices(svcRes.data.data || []);
      } catch {
        toast.error('Failed to load services');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (s) => { setEditing(s); setForm({ name: s.name, description: s.description || '', price: s.price, duration: s.duration || '' }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price), duration: form.duration ? Number(form.duration) : undefined };
      if (editing) {
        const res = await API.put(`/services/${editing.id}`, payload);
        setServices(prev => prev.map(s => s.id === editing.id ? res.data.data : s));
        toast.success('Service updated');
      } else {
        const res = await API.post('/services', payload);
        setServices(prev => [...prev, res.data.data]);
        toast.success('Service created');
      }
      setShowModal(false);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this service?')) return;
    try {
      await API.delete(`/services/${id}`);
      setServices(prev => prev.filter(s => s.id !== id));
      toast.success('Service deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleImageUpload = async (serviceId, files) => {
    if (!files.length) return;
    setUploadingId(serviceId);
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('images', f));
      const res = await API.post(`/services/${serviceId}/images`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const newImages = res.data.data;
      setServices(prev => prev.map(s => s.id === serviceId ? { ...s, images: [...(s.images || []), ...newImages] } : s));
      toast.success('Images uploaded');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingId(null);
    }
  };

  const handleDeleteImage = async (serviceId, imageId) => {
    try {
      await API.delete(`/services/${serviceId}/images/${imageId}`);
      setServices(prev => prev.map(s => s.id === serviceId ? { ...s, images: s.images.filter(i => i.id !== imageId) } : s));
      toast.success('Image removed');
    } catch {
      toast.error('Failed to remove image');
    }
  };

  if (loading) return <DashboardLayout><div className="dashboard-content"><div className="page-loading">Loading...</div></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="dashboard-content">
        <motion.div className="dashboard-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="dashboard-title">Services</h1>
            <p className="dashboard-subtitle">Manage your service offerings</p>
          </div>
          <button className="btn-primary" onClick={openCreate} style={{ width: 'auto', padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
            <Plus size={16} /> Add Service
          </button>
        </motion.div>

        {services.length === 0 ? (
          <div className="empty-state">
            <ImageIcon size={48} style={{ color: 'var(--rose-light)', marginBottom: '1rem' }} />
            <h2>No services yet</h2>
            <p>Add your first service to start accepting bookings.</p>
            <button className="btn-primary" onClick={openCreate} style={{ width: 'auto', padding: '0.75rem 2rem', marginTop: '1.5rem' }}>Add Service</button>
          </div>
        ) : (
          <div className="services-grid">
            {services.map((s, i) => (
              <motion.div key={s.id} className="service-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                {/* Images */}
                <div className="service-images">
                  {s.images?.length > 0 ? (
                    <div className="service-image-row">
                      {s.images.map(img => (
                        <div key={img.id} className="service-image-thumb">
                          <img src={img.url} alt="" />
                          <button className="image-delete-btn" onClick={() => handleDeleteImage(s.id, img.id)}><X size={10} /></button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="service-image-placeholder"><ImageIcon size={24} /></div>
                  )}
                  {(s.images?.length || 0) < 5 && (
                    <label className="image-upload-btn" title="Upload images">
                      <Upload size={13} /> {uploadingId === s.id ? 'Uploading...' : 'Add photos'}
                      <input type="file" accept="image/*" multiple hidden onChange={e => handleImageUpload(s.id, e.target.files)} disabled={uploadingId === s.id} />
                    </label>
                  )}
                </div>

                {/* Info */}
                <div className="service-info">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 className="service-name">{s.name}</h3>
                      {s.description && <p className="service-desc">{s.description}</p>}
                    </div>
                    <div className="table-actions">
                      <button className="action-btn approve" onClick={() => openEdit(s)}><Pencil size={13} /></button>
                      <button className="action-btn reject" onClick={() => handleDelete(s.id)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="service-meta">
                    <span className="service-price">₹{s.price}</span>
                    {s.duration && <span className="service-duration">{s.duration} min</span>}
                    <span className={`badge ${s.isActive && s.isEnabled ? 'badge-success' : 'badge-danger'}`}>
                      {s.isActive && s.isEnabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)}>
              <motion.div className="modal" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="dashboard-card-title">{editing ? 'Edit Service' : 'New Service'}</h2>
                  <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="input-group">
                    <label>Service Name *</label>
                    <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Haircut" />
                  </div>
                  <div className="input-group">
                    <label>Description</label>
                    <textarea className="input-field" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description..." />
                  </div>
                  <div className="form-grid-2">
                    <div className="input-group">
                      <label>Price (₹) *</label>
                      <input className="input-field" type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required placeholder="200" />
                    </div>
                    <div className="input-group">
                      <label>Duration (mins)</label>
                      <input className="input-field" type="number" min="1" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="30" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button type="button" className="btn-ghost" style={{ width: 'auto', padding: '0.65rem 1.25rem' }} onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="btn-primary" disabled={saving} style={{ width: 'auto', padding: '0.65rem 1.5rem', marginTop: 0 }}>
                      {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Service'}
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
