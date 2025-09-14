/**
 * Permission System for Sistem Pemetaan Irigasi Sipil
 * Defines role hierarchy and permission matrix
 */

// Role hierarchy (higher index = more permissions)
export const ROLE_HIERARCHY = {
   VIEWER: 0,
  SURVEYOR: 1,
  ADMIN: 2,
  SUPERADMIN: 3
}

// Available permissions
export const PERMISSIONS = {
  // User Management
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_EDIT: 'user:edit',
  USER_DELETE: 'user:delete',
  USER_ROLE_ASSIGN: 'user:role:assign',
  
  // Survey Management
  SURVEY_VIEW: 'survey:view',
  SURVEY_CREATE: 'survey:create',
  SURVEY_EDIT: 'survey:edit',
  SURVEY_DELETE: 'survey:delete',
  SURVEY_EXPORT: 'survey:export',
  SURVEY_MANAGE: 'survey:manage',
  
  // Feature Management
  FEATURE_VIEW: 'feature:view',
  FEATURE_CREATE: 'feature:create',
  FEATURE_EDIT: 'feature:edit',
  FEATURE_DELETE: 'feature:delete',
  FEATURE_UPLOAD: 'feature:upload',
  FEATURE_MANAGE: 'feature:manage',
  
  // Config Management
  CONFIG_VIEW: 'config:view',
  CONFIG_CREATE: 'config:create',
  CONFIG_EDIT: 'config:edit',
  CONFIG_DELETE: 'config:delete',
  CONFIG_ACTIVATE: 'config:activate',
  CONFIG_MANAGE: 'config:manage',
  
  // System Management
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_LOGS: 'system:logs',
  SYSTEM_AUDIT: 'system:audit',
  SYSTEM_BACKUP: 'system:backup',
  
  // Audit & Monitoring
  AUDIT_VIEW: 'audit:view',
  AUDIT_EXPORT: 'audit:export',
  
  // Dashboard & Reports
  DASHBOARD_VIEW: 'dashboard:view',
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
  ANALYTICS_VIEW: 'analytics:view',
  
  // Additional permissions
  SURVEY_CALCULATE: 'survey:calculate',
  IRIGASI_VIEW: 'irigasi:view',
  IRIGASI_MANAGE: 'irigasi:manage',
  LAYER_VIEW: 'layer:view',
  UPLOAD_FILE: 'upload:file'
}

// Role-based permission matrix
export const ROLE_PERMISSIONS = {
  VIEWER: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.FEATURE_VIEW,
    PERMISSIONS.SURVEY_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.IRIGASI_VIEW,
    PERMISSIONS.LAYER_VIEW
  ],
  
  SURVEYOR: [
    // Inherit VIEWER permissions
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.FEATURE_VIEW,
    PERMISSIONS.SURVEY_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.IRIGASI_VIEW,
    PERMISSIONS.LAYER_VIEW,
    PERMISSIONS.SURVEY_CREATE,
    PERMISSIONS.SURVEY_EDIT,
    PERMISSIONS.SURVEY_EXPORT,
    PERMISSIONS.SURVEY_CALCULATE,
    PERMISSIONS.FEATURE_CREATE,
    PERMISSIONS.FEATURE_EDIT,
    PERMISSIONS.UPLOAD_FILE
  ],
  
  ADMIN: [
    // Inherit SURVEYOR permissions
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.FEATURE_VIEW,
    PERMISSIONS.SURVEY_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.IRIGASI_VIEW,
    PERMISSIONS.LAYER_VIEW,
    PERMISSIONS.SURVEY_CREATE,
    PERMISSIONS.SURVEY_EDIT,
    PERMISSIONS.SURVEY_EXPORT,
    PERMISSIONS.SURVEY_CALCULATE,
    PERMISSIONS.FEATURE_CREATE,
    PERMISSIONS.FEATURE_EDIT,
    PERMISSIONS.UPLOAD_FILE,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_EDIT,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.SURVEY_DELETE,
    PERMISSIONS.SURVEY_MANAGE,
    PERMISSIONS.FEATURE_DELETE,
    PERMISSIONS.FEATURE_UPLOAD,
    PERMISSIONS.FEATURE_MANAGE,
    PERMISSIONS.CONFIG_VIEW,
    PERMISSIONS.CONFIG_CREATE,
    PERMISSIONS.CONFIG_EDIT,
    PERMISSIONS.CONFIG_DELETE,
    PERMISSIONS.CONFIG_ACTIVATE,
    PERMISSIONS.CONFIG_MANAGE,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.AUDIT_EXPORT,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.IRIGASI_MANAGE
  ],
  
  SUPERADMIN: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.FEATURE_VIEW,
    PERMISSIONS.SURVEY_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.IRIGASI_VIEW,
    PERMISSIONS.LAYER_VIEW,
    PERMISSIONS.SURVEY_CREATE,
    PERMISSIONS.SURVEY_EDIT,
    PERMISSIONS.SURVEY_EXPORT,
    PERMISSIONS.SURVEY_CALCULATE,
    PERMISSIONS.FEATURE_CREATE,
    PERMISSIONS.FEATURE_EDIT,
    PERMISSIONS.UPLOAD_FILE,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_EDIT,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.SURVEY_DELETE,
    PERMISSIONS.SURVEY_MANAGE,
    PERMISSIONS.FEATURE_DELETE,
    PERMISSIONS.FEATURE_UPLOAD,
    PERMISSIONS.FEATURE_MANAGE,
    PERMISSIONS.CONFIG_VIEW,
    PERMISSIONS.CONFIG_CREATE,
    PERMISSIONS.CONFIG_EDIT,
    PERMISSIONS.CONFIG_DELETE,
    PERMISSIONS.CONFIG_ACTIVATE,
    PERMISSIONS.CONFIG_MANAGE,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.AUDIT_EXPORT,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.IRIGASI_MANAGE,
    PERMISSIONS.USER_ROLE_ASSIGN,
    PERMISSIONS.SYSTEM_CONFIG,
    PERMISSIONS.SYSTEM_LOGS,
    PERMISSIONS.SYSTEM_AUDIT,
    PERMISSIONS.SYSTEM_BACKUP
  ]
}

/**
 * Check if a role has specific permission
 */
export function hasPermission(userRole, permission) {
  if (!userRole || !permission) return false
  
  const rolePermissions = ROLE_PERMISSIONS[userRole] || []
  return rolePermissions.includes(permission)
}

/**
 * Check if user can perform action on target user
 * Hierarchy: SUPERADMIN > ADMIN > SURVEYOR > VIEWER
 */
export function canManageUser(currentUserRole, targetUserRole) {
  const currentLevel = ROLE_HIERARCHY[currentUserRole] || -1
  const targetLevel = ROLE_HIERARCHY[targetUserRole] || -1
  
  // SUPERADMIN can manage any role including other SUPERADMINs
  if (currentUserRole === 'SUPERADMIN') return true
  
  // Other roles can only manage users with lower hierarchy level
  return currentLevel > targetLevel
}
/**
 * Get roles that current user can assign to others
 */
export function getAssignableRoles(currentUserRole) {
  const currentLevel = ROLE_HIERARCHY[currentUserRole] || -1
  
  return Object.keys(ROLE_HIERARCHY).filter(role => {
    const roleLevel = ROLE_HIERARCHY[role]
    
    // SUPERADMIN can assign any role
    if (currentUserRole === 'SUPERADMIN') return true
    
    // ADMIN can assign roles below them
    if (currentUserRole === 'ADMIN') return roleLevel < currentLevel
    
    // Others cannot assign roles
    return false
  })
}

/**
 * Get user-friendly role descriptions
 */
export const ROLE_DESCRIPTIONS = {
  SUPERADMIN: {
    name: 'Super Administrator',
    description: 'Akses penuh ke semua fitur sistem termasuk manajemen role',
    color: 'red',
    priority: 4
  },
  ADMIN: {
    name: 'Administrator',
    description: 'Mengelola pengguna, data, dan konfigurasi sistem',
    color: 'blue',
    priority: 3
  },
  SURVEYOR: {
    name: 'Surveyor',
    description: 'Melakukan survey irigasi dan mengelola data lapangan',
    color: 'green',
    priority: 2
  },
  VIEWER: {
    name: 'Viewer',
    description: 'Melihat data dan laporan tanpa dapat mengubah',
    color: 'gray',
    priority: 1
  }
}

/**
 * Check if current user can access specific route
 */
export function canAccessRoute(userRole, route) {
  const routePermissions = {
    '/': [PERMISSIONS.DASHBOARD_VIEW],
    '/peta': [PERMISSIONS.FEATURE_VIEW],
    '/tabel': [PERMISSIONS.FEATURE_VIEW],
    '/users': [PERMISSIONS.USER_VIEW],
    '/surveys': [PERMISSIONS.SURVEY_VIEW],
    '/analytics': [PERMISSIONS.ANALYTICS_VIEW],
    '/settings': [PERMISSIONS.SYSTEM_CONFIG]
  }
  
  const requiredPermissions = routePermissions[route] || []
  return requiredPermissions.every(permission => hasPermission(userRole, permission))
}
