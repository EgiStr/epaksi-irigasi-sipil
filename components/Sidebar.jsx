'use client'

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Map, 
  Table, 
  Menu, 
  X, 
  Users, 
  Shield, 
  BarChart3, 
  Settings,
  Database,
  FileText,
  Activity,
  Layers
} from 'lucide-react';
import { hasPermission, PERMISSIONS } from '../lib/permissions';

const Sidebar = ({ isOpen, toggleSidebar, onMenuChange }) => {
  const { data: session } = useSession();
  const pathname = usePathname();
  
  const allMenuItems = [
    {
      id: 'home',
      label: 'Dashboard',
      icon: Home,
      path: '/',
      permission: PERMISSIONS.DASHBOARD_VIEW
    },
    {
      id: 'peta',
      label: 'Peta Irigasi',
      icon: Map,
      path: '/peta',
      permission: PERMISSIONS.FEATURE_VIEW
    },
    // Admin Menu Section
    {
      id: 'admin-users',
      label: 'User Management',
      icon: Users,
      path: '/admin/users',
      permission: PERMISSIONS.USER_VIEW,
      isAdmin: true
    },
    {
      id: 'admin-configs',
      label: 'Config Management',
      icon: Settings,
      path: '/admin/configs',
      permission: PERMISSIONS.CONFIG_MANAGE,
      isAdmin: true
    },
    {
      id: 'admin-features',
      label: 'Feature Management',
      icon: Layers,
      path: '/admin/features',
      permission: PERMISSIONS.FEATURE_MANAGE,
      isAdmin: true
    },
    {
      id: 'admin-surveys',
      label: 'Survey Management',
      icon: FileText,
      path: '/admin/surveys',
      permission: PERMISSIONS.SURVEY_MANAGE,
      isAdmin: true
    },
    {
      id: 'admin-pai',
      label: 'PAI Management',
      icon: Database,
      path: '/admin/pai',
      permission: PERMISSIONS.SURVEY_MANAGE, // Same permission as surveys for now
      isAdmin: true
    },
    {
      id: 'admin-audit',
      label: 'Audit Logs',
      icon: Activity,
      path: '/admin/audit-logs',
      permission: PERMISSIONS.AUDIT_VIEW,
      isAdmin: true
    },
    {
      id: 'admin-settings',
      label: 'System Settings',
      icon: Database,
      path: '/admin/settings',
      permission: PERMISSIONS.SYSTEM_CONFIG,
      isAdmin: true
    },
    {
      id: 'admin-analytics',
      label: 'Analytics & Reports',
      icon: BarChart3,
      path: '/admin/analytics',
      permission: PERMISSIONS.ANALYTICS_VIEW,
      isAdmin: true
    }
  ];

  // Filter menu items berdasarkan user permissions
  const filteredMenuItems = allMenuItems.filter(item => 
    !session?.user?.role || hasPermission(session.user.role, item.permission)
  );

  // Group menu items
  const regularMenuItems = filteredMenuItems.filter(item => !item.isAdmin);
  const adminMenuItems = filteredMenuItems.filter(item => item.isAdmin);

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">
            <Image 
              src="/vite.svg" 
              alt="Logo Irigasi" 
              width={48} 
              height={48}
              className="logo-svg"
            />
          </div>
          {isOpen && (
            <div className="logo-text">
              <h3>EPAKSI</h3>
            </div>
          )}
        </div>
        <button className="toggle-btn" onClick={toggleSidebar}>
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-list">
          {/* Regular Menu Items */}
          {regularMenuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = pathname === item.path;
            
            return (
              <li key={item.id} className="nav-item">
                <Link 
                  href={item.path}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  title={!isOpen ? item.label : ''}
                >
                  <IconComponent size={20} className="nav-icon" />
                  {isOpen && <span className="nav-label">{item.label}</span>}
                </Link>
              </li>
            );
          })}
          
          {/* Admin Section */}
          {adminMenuItems.length > 0 && (
            <>
              {isOpen && (
                <li className="nav-divider">
                  <div className="nav-section-title">
                    <Shield size={16} className="section-icon" />
                    Admin Panel
                  </div>
                </li>
              )}
              {adminMenuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = pathname === item.path;
                
                return (
                  <li key={item.id} className="nav-item admin-item">
                    <Link 
                      href={item.path}
                      className={`nav-link ${isActive ? 'active' : ''}`}
                      title={!isOpen ? item.label : ''}
                    >
                      <IconComponent size={20} className="nav-icon" />
                      {isOpen && <span className="nav-label">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </>
          )}
        </ul>
      </nav>

      <div className="sidebar-footer">
        {isOpen && session && (
          <div className="user-info">
            <div className="user-avatar">
              {session.user.name ? session.user.name.charAt(0).toUpperCase() : '👤'}
            </div>
            <div className="user-details">
              <span className="user-name">{session.user.name || 'Administrator'}</span>
              <span className="user-role">
                <Shield className="inline w-3 h-3 mr-1" />
                {session.user.role}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
