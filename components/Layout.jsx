'use client'

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, User } from 'lucide-react';
import Sidebar from './Sidebar';
import { useSidebar } from '../contexts/SidebarContext';
import './Layout.css';

const Layout = ({ children }) => {
  const { sidebarOpen, isModalOpen, toggleSidebar } = useSidebar();
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
          onClick={() => toggleSidebar()}
        />
      )}
      
      <Sidebar 
        isOpen={sidebarOpen} 
        toggleSidebar={toggleSidebar}
      />
      <div className={`main-content ${!sidebarOpen || isModalOpen ? 'sidebar-closed' : ''} ${isModalOpen ? 'modal-open' : ''}`}>
        <header className="header">
          <button 
            className="menu-toggle md:hidden"
            onClick={() => toggleSidebar()}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          
          {/* Desktop sidebar toggle - always visible when modal is open */}
          {isModalOpen && (
            <button 
              className="sidebar-toggle-btn hidden md:block"
              onClick={() => toggleSidebar()}
              title={sidebarOpen ? "Tutup Sidebar" : "Buka Sidebar"}
            >
              {sidebarOpen ? "◀" : "▶"}
            </button>
          )}
          
          <div className="header-title">
            <h1>SINTARA</h1>
            <p>Sistem Pengelolaan Irigasi Sinergi Unila - Itera</p>
          </div>
          
          {/* Admin Info & Logout */}
          <div className="header-actions">
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
