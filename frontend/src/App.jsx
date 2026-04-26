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
import VendorDashboard from './pages/vendor/Dashboard';
import VendorProfile from './pages/vendor/Profile';
import VendorServices from './pages/vendor/Services';
import VendorBookings from './pages/vendor/Bookings';
import BusinessHours from './pages/vendor/BusinessHours';
import CustomerDashboard from './pages/customer/Dashboard';
import Explore from './pages/customer/Explore';
import VendorDetail from './pages/customer/VendorDetail';
import CustomerBookings from './pages/customer/Bookings';
import CustomerProfile from './pages/customer/Profile';
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
          <Route path="/customer-dashboard" element={<ProtectedRoute roles={['CUSTOMER']}><CustomerDashboard /></ProtectedRoute>} />
          <Route path="/customer-dashboard/explore" element={<ProtectedRoute roles={['CUSTOMER']}><Explore /></ProtectedRoute>} />
          <Route path="/customer-dashboard/vendor/:id" element={<ProtectedRoute roles={['CUSTOMER']}><VendorDetail /></ProtectedRoute>} />
          <Route path="/customer-dashboard/bookings" element={<ProtectedRoute roles={['CUSTOMER']}><CustomerBookings /></ProtectedRoute>} />
          <Route path="/customer-dashboard/profile" element={<ProtectedRoute roles={['CUSTOMER']}><CustomerProfile /></ProtectedRoute>} />
          <Route path="/vendor-dashboard" element={<ProtectedRoute roles={['VENDOR']}><VendorDashboard /></ProtectedRoute>} />
          <Route path="/vendor-dashboard/profile" element={<ProtectedRoute roles={['VENDOR']}><VendorProfile /></ProtectedRoute>} />
          <Route path="/vendor-dashboard/services" element={<ProtectedRoute roles={['VENDOR']}><VendorServices /></ProtectedRoute>} />
          <Route path="/vendor-dashboard/bookings" element={<ProtectedRoute roles={['VENDOR']}><VendorBookings /></ProtectedRoute>} />
          <Route path="/vendor-dashboard/business-hours" element={<ProtectedRoute roles={['VENDOR']}><BusinessHours /></ProtectedRoute>} />
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
