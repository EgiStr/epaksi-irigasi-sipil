import React from 'react';
import { BarChart3, Users, Settings } from 'lucide-react';
import { hasPermission, PERMISSIONS, ROLE_DESCRIPTIONS } from '../lib/permissions';

const AdminQuickActions = React.memo(({ session, onNavigate }) => {
  if (!session?.user?.role || 
      (!hasPermission(session.user.role, PERMISSIONS.USER_VIEW) && 
       !hasPermission(session.user.role, PERMISSIONS.SYSTEM_CONFIG))) {
    return null;
  }

  return (
    <div className="info-card">
      <h4>⚡ Aksi Cepat {ROLE_DESCRIPTIONS[session.user.role]?.name}</h4>
      <div className="admin-actions">
        {hasPermission(session.user.role, PERMISSIONS.USER_VIEW) && (
          <button
            onClick={() => onNavigate('users')}
            className="admin-action-btn"
            type="button"
          >
            <Users className="w-4 h-4" />
            <span>Kelola Pengguna</span>
          </button>
        )}
        {hasPermission(session.user.role, PERMISSIONS.ANALYTICS_VIEW) && (
          <button
            onClick={() => onNavigate('analytics')}
            className="admin-action-btn"
            type="button"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics & Reports</span>
          </button>
        )}
        {hasPermission(session.user.role, PERMISSIONS.SYSTEM_CONFIG) && (
          <button
            onClick={() => onNavigate('settings')}
            className="admin-action-btn"
            type="button"
          >
            <Settings className="w-4 h-4" />
            <span>System Settings</span>
          </button>
        )}
      </div>
    </div>
  );
});

AdminQuickActions.displayName = 'AdminQuickActions';

export default AdminQuickActions;
