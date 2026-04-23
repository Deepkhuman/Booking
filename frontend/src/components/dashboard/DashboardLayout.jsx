import { Toaster } from 'react-hot-toast';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children }) {
  return (
    <div className="dashboard-layout">
      <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'Inter, sans-serif', fontSize: '0.88rem' } }} />
      <Sidebar />
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  );
}
