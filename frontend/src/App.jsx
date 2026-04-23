import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import ThreeBackground from './components/ThreeBackground';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import SocialCallback from './pages/SocialCallback';
import AdminDashboard from './pages/admin/Dashboard';
import { useLocation } from 'react-router-dom';
import { memo } from 'react';

const MemoBackground = memo(ThreeBackground);

function BackgroundWrapper() {
  const location = useLocation();
  const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
  const isAuthPage = authRoutes.includes(location.pathname);
  return isAuthPage ? <MemoBackground /> : null;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <BackgroundWrapper />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Guest only routes */}
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
          <Route path="/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/social-callback" element={<SocialCallback />} />

          {/* Protected routes */}
          <Route path="/customer-dashboard" element={
            <ProtectedRoute roles={['CUSTOMER']}>
              <div style={{ padding: '2rem', fontFamily: 'Inter' }}>Customer Dashboard — Coming Soon</div>
            </ProtectedRoute>
          } />
          <Route path="/vendor-dashboard" element={
            <ProtectedRoute roles={['VENDOR']}>
              <div style={{ padding: '2rem', fontFamily: 'Inter' }}>Vendor Dashboard — Coming Soon</div>
            </ProtectedRoute>
          } />
          <Route path="/admin-dashboard" element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/dashboard" element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
