import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/owner-dashboard" element={<div style={{ padding: '2rem', fontFamily: 'Inter' }}>Owner Dashboard — Coming Soon</div>} />
        <Route path="/customer-dashboard" element={<div style={{ padding: '2rem', fontFamily: 'Inter' }}>Customer Dashboard — Coming Soon</div>} />
        <Route path="/admin-dashboard" element={<div style={{ padding: '2rem', fontFamily: 'Inter' }}>Admin Dashboard — Coming Soon</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
