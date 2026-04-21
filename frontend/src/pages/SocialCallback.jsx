import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function SocialCallback() {
  const [searchParams] = useSearchParams();
  const { login, getDashboardPath } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const userStr = searchParams.get('user');

    if (accessToken && refreshToken && userStr) {
      const user = JSON.parse(decodeURIComponent(userStr));
      login(user, accessToken, refreshToken);
      toast.success(`Welcome, ${user.name}!`);
      navigate(getDashboardPath(user.role), { replace: true });
    } else {
      toast.error('Social login failed. Please try again.');
      navigate('/login', { replace: true });
    }
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Inter', color: '#6b2737' }}>
      Completing login...
    </div>
  );
}
