import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api/axios';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CUSTOMER'
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await API.post('/auth/register', formData);
      localStorage.setItem('userInfo', JSON.stringify(response.data));
      
      if (response.data.role === 'OWNER') {
        navigate('/owner-dashboard');
      } else {
        navigate('/customer-dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box glass-panel">
        <div className="auth-header">
          <h2 className="gradient-text">Create Account</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Join the elite booking platform today.
          </p>
        </div>

        {error && <div className="error-badge">{error}</div>}

        <form onSubmit={handleSubmit}>
          
          <div className="input-group">
            <label>Select Account Type</label>
            <div className="role-toggle">
              <button 
                type="button" 
                className={`role-btn ${formData.role === 'CUSTOMER' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, role: 'CUSTOMER'})}
              >
                Customer
              </button>
              <button 
                type="button" 
                className={`role-btn ${formData.role === 'OWNER' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, role: 'OWNER'})}
              >
                Shop Owner
              </button>
            </div>
          </div>

          <div className="input-group">
            <label>Full Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>

          <div className="input-group">
            <label>Email Address</label>
            <input 
              type="email" 
              className="input-field" 
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
