import { Toaster } from 'react-hot-toast';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';

export default function DashboardLayout({ children }) {
  return (
    <div className="dashboard-layout">
      <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'Inter, sans-serif', fontSize: '0.88rem' } }} />
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          padding: '0.65rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <NotificationBell />
        </header>
        <main className="dashboard-main">
          {children}
        </main>
      </div>
    </div>
  );
}
