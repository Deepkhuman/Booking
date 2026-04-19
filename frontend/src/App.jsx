import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root to login for now */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Public Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Temporary Stubs for Dashboards we will build next */}
        <Route path="/owner-dashboard" element={<div className="glass-panel" style={{margin:'2rem'}}><h2>Owner Dashboard Coming Next</h2></div>} />
        <Route path="/customer-dashboard" element={<div className="glass-panel" style={{margin:'2rem'}}><h2>Customer Dashboard Coming Next</h2></div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
