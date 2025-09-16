import React from 'react';
import { BarChart3, Users, Settings, Zap } from 'lucide-react';
import { hasPermission, PERMISSIONS, ROLE_DESCRIPTIONS } from '../lib/permissions';

const AdminQuickActions = React.memo(({ session, onNavigate }) => {
  if (!session?.user?.role || 
      (!hasPermission(session.user.role, PERMISSIONS.USER_VIEW) && 
       !hasPermission(session.user.role, PERMISSIONS.SYSTEM_CONFIG))) {
    return null;
  }

  const actions = [
    {
      id: 'users',
      label: 'Kelola Pengguna',
      icon: Users,
      permission: PERMISSIONS.USER_VIEW,
      color: 'bg-blue-500 hover:bg-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      id: 'analytics',
      label: 'Analytics & Reports',
      icon: BarChart3,
      permission: PERMISSIONS.ANALYTICS_VIEW,
      color: 'bg-green-500 hover:bg-green-600',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: Settings,
      permission: PERMISSIONS.SYSTEM_CONFIG,
      color: 'bg-purple-500 hover:bg-purple-600',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600'
    }
  ];

  const availableActions = actions.filter(action => 
    hasPermission(session.user.role, action.permission)
  );

  if (availableActions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-gradient-to-r from-orange-400 to-red-500 p-2 rounded-lg">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h4 className="text-lg font-semibold text-gray-900">
            Aksi Cepat {ROLE_DESCRIPTIONS[session.user.role]?.name}
          </h4>
          <p className="text-sm text-gray-500">
            Panel kontrol administrasi sistem
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableActions.map((action) => {
          const IconComponent = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onNavigate(action.id)}
              className="group relative bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              type="button"
            >
              <div className="flex items-center space-x-3">
                <div className={`${action.iconBg} p-3 rounded-lg group-hover:scale-110 transition-transform duration-200`}>
                  <IconComponent className={`w-5 h-5 ${action.iconColor}`} />
                </div>
                <div className="flex-1 text-left">
                  <h5 className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                    {action.label}
                  </h5>
                  <p className="text-xs text-gray-500 mt-1">
                    {action.id === 'users' && 'Manajemen user sistem'}
                    {action.id === 'analytics' && 'Laporan dan statistik'}
                    {action.id === 'settings' && 'Konfigurasi sistem'}
                  </p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 text-xs">→</span>
                  </div>
                </div>
              </div>
              
              {/* Subtle hover effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 opacity-0 group-hover:opacity-50 rounded-lg transition-opacity duration-200 -z-10"></div>
            </button>
          );
        })}
      </div>

      {/* Quick Stats or Additional Info */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Role: {session.user.role}</span>
          <span>Actions available: {availableActions.length}</span>
        </div>
      </div>
    </div>
  );
});

AdminQuickActions.displayName = 'AdminQuickActions';

export default AdminQuickActions;
