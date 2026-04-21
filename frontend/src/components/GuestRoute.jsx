import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function GuestRoute({ children }) {
  const { user, loading, getDashboardPath } = useAuth();

  if (loading) return null;

  if (user) return <Navigate to={getDashboardPath(user.role)} replace />;

  return children;
}
