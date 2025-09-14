'use client'

import React, { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, User } from 'lucide-react';
import Sidebar from './Sidebar';
import './Layout.css';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { data: session } = useSession();

  const handleLogout = async () => {
    if (confirm('Anda yakin ingin keluar dari sistem?')) {
      await signOut({ callbackUrl: '/login' });
    }
  };

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
          
          {/* Admin Info & Logout */}
          <div className="header-actions">
            <div className="header-badge">
              📍 Daerah Irigasi Way Rarem, Lampung
            </div>
            {session && (
              <div className="admin-info">
                <div className="user-info">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">{session.user.name || session.user.email}</span>
                  <span className="badge badge-admin">{session.user.role}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="logout-btn"
                  title="Keluar dari sistem"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="sr-only">Logout</span>
                </button>
              </div>
            )}
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
