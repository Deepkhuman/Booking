import { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import API from '../../api/axios';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const socketRef = useRef(null);
  const dropdownRef = useRef(null);

  // load initial notifications
  useEffect(() => {
    API.get('/notifications?limit=15')
      .then(r => {
        setNotifications(r.data.data?.data || []);
        setUnread(r.data.data?.meta?.unread || 0);
      })
      .catch(() => {});
  }, []);

  // socket.io connection
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const socket = io('/notifications', {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('notification', (n) => {
      setNotifications(prev => [n, ...prev].slice(0, 15));
      setUnread(prev => prev + 1);
    });

    socketRef.current = socket;
    return () => socket.disconnect();
  }, []);

  // close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id) => {
    await API.put(`/notifications/${id}/read`).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await API.put('/notifications/read-all').catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnread(0);
  };

  const remove = async (e, id) => {
    e.stopPropagation();
    await API.delete(`/notifications/${id}`).catch(() => {});
    const n = notifications.find(n => n.id === id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (n && !n.isRead) setUnread(prev => Math.max(0, prev - 1));
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: 'var(--maroon)', color: '#fff',
            borderRadius: '50%', fontSize: '0.65rem', fontWeight: 700,
            width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              width: 340, maxHeight: 420, overflowY: 'auto',
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              zIndex: 1000,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Notifications</span>
              {unread > 0 && (
                <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--maroon)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No notifications yet
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markRead(n.id)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid var(--border)',
                    background: n.isRead ? 'transparent' : 'rgba(107,39,55,0.04)',
                    cursor: n.isRead ? 'default' : 'pointer',
                    display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.83rem', fontWeight: n.isRead ? 400 : 600, color: 'var(--text)' }}>{n.title}</p>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{n.message}</p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {!n.isRead && (
                      <button onClick={(e) => { e.stopPropagation(); markRead(n.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--maroon)', padding: 2 }}>
                        <Check size={13} />
                      </button>
                    )}
                    <button onClick={(e) => remove(e, n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
