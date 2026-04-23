import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { LogOut, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import Logo from '../Logo';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    API.get('/menu').then(({ data }) => setMenuItems(data.data)).catch(() => {});
  }, [user]);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await API.post('/auth/logout', { refreshToken });
    } catch {}
    logout();
    navigate('/login');
  };

  const getIcon = (iconName) => {
    const Icon = Icons[iconName];
    return Icon ? <Icon size={18} /> : <Icons.Circle size={18} />;
  };

  const SidebarContent = () => (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        {!collapsed && <Logo size="sm" />}
        <button className="sidebar-collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* User Info */}
      {!collapsed && (
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} />
            ) : (
              <span>{user?.name?.[0]?.toUpperCase()}</span>
            )}
          </div>
          <div className="sidebar-user-info">
            <p className="sidebar-user-name">{user?.name}</p>
            <p className="sidebar-user-role">{user?.role}</p>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            title={collapsed ? item.label : ''}
          >
            <span className="sidebar-item-icon">{getIcon(item.icon)}</span>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="sidebar-item-label"
              >
                {item.label}
              </motion.span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <button className="sidebar-logout" onClick={handleLogout}>
        <LogOut size={18} />
        {!collapsed && <span>Logout</span>}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button className="sidebar-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
        <Menu size={20} />
      </button>

      {/* Desktop sidebar */}
      <motion.div
        animate={{ width: collapsed ? '72px' : '240px' }}
        transition={{ duration: 0.2 }}
        className="sidebar-wrapper"
      >
        <SidebarContent />
      </motion.div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="sidebar-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="sidebar-mobile"
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
