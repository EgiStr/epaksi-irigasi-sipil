import React, { useState } from 'react';
import Sidebar from './Sidebar';
import './Layout.css';

const Layout = ({ children, activeMenu, onMenuChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="layout">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="sidebar-backdrop md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <Sidebar 
        isOpen={sidebarOpen} 
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activeMenu={activeMenu}
        onMenuChange={onMenuChange}
      />
      <div className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
        <header className="header">
          <button 
            className="menu-toggle md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div className="header-title">
            <h1>🌊 Sistem Informasi Irigasi Way Rarem</h1>
            <p>Visualisasi Interaktif Data Infrastruktur Irigasi</p>
          </div>
          <div className="header-badge">
            📍 Daerah Irigasi Way Rarem, Lampung
          </div>
        </header>
        
        <main className="content">
          {children}
        </main>
        
        <footer className="footer">
          <p className='font-bold'>Copyright © 2025</p>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
