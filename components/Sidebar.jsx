import React from 'react';
import { Home, Map, Table, Menu, X } from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar, activeMenu, onMenuChange }) => {
  const menuItems = [
    {
      id: 'home',
      label: 'Dashboard',
      icon: Home,
      path: '/'
    },
    {
      id: 'peta',
      label: 'Peta Irigasi',
      icon: Map,
      path: '/peta'
    },
    {
      id: 'tabel',
      label: 'Tabel Daerah Irigasi',
      icon: Table,
      path: '/tabel'
    }
  ];

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">🌊</div>
          {isOpen && (
            <div className="logo-text">
              <h3>Irigasi</h3>
              <span>Way Rarem</span>
            </div>
          )}
        </div>
        <button className="toggle-btn" onClick={toggleSidebar}>
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <li key={item.id} className="nav-item">
                <button
                  className={`nav-link ${activeMenu === item.id ? 'active' : ''}`}
                  onClick={() => onMenuChange(item.id)}
                  title={!isOpen ? item.label : ''}
                >
                  <IconComponent size={20} className="nav-icon" />
                  {isOpen && <span className="nav-label">{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        {isOpen && (
          <div className="user-info">
            <div className="user-avatar">👤</div>
            <div className="user-details">
              <span className="user-name">Admin</span>
              <span className="user-role">Super User</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
