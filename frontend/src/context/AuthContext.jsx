import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    if (stored && token) {
      // Check if token is expired
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          setUser(JSON.parse(stored));
        } else {
          localStorage.clear();
        }
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  const getDashboardPath = (role) => {
    if (role === 'VENDOR') return '/vendor-dashboard';
    if (role === 'ADMIN') return '/admin-dashboard';
    return '/customer-dashboard';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getDashboardPath }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
