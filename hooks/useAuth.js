'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { hasPermission, PERMISSIONS, ROLE_HIERARCHY } from '../lib/permissions'

/**
 * Hook untuk mendapatkan session dan memastikan user memiliki permission yang diperlukan
 */
export function useRequireAuth(requiredPermission = null) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (!session) {
      router.push('/login')
      return
    }

    // Check if user has required permission
    if (requiredPermission && !hasPermission(session.user.role, requiredPermission)) {
      router.push('/?error=permission-denied')
      return
    }

  }, [session, status, router, requiredPermission])

  return {
    session,
    loading: status === 'loading',
    user: session?.user,
    isAuthenticated: !!session,
    role: session?.user?.role,
    isAdmin: session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERADMIN',
    isSuperAdmin: session?.user?.role === 'SUPERADMIN',
    isSurveyor: session?.user?.role === 'SURVEYOR',
    isViewer: session?.user?.role === 'VIEWER',
    hasPermission: (permission) => hasPermission(session?.user?.role, permission)
  }
}

/**
 * Hook untuk mengecek apakah user sudah login dan memiliki permission
 * Tidak akan redirect, hanya return status
 */
export function useAuthStatus() {
  const { data: session, status } = useSession()

  return {
    session,
    loading: status === 'loading',
    isAuthenticated: !!session,
    user: session?.user,
    role: session?.user?.role,
    isAdmin: session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERADMIN',
    isSuperAdmin: session?.user?.role === 'SUPERADMIN',
    isSurveyor: session?.user?.role === 'SURVEYOR',
    isViewer: session?.user?.role === 'VIEWER',
    hasPermission: (permission) => hasPermission(session?.user?.role, permission)
  }
}

/**
 * Hook untuk mengecek permission tertentu
 */
export function usePermission(permission) {
  const { data: session } = useSession()
  
  return {
    hasPermission: hasPermission(session?.user?.role, permission),
    role: session?.user?.role
  }
}

/**
 * Hook untuk admin-only areas
 */
export function useRequireAdmin() {
  return useRequireAuth(PERMISSIONS.USER_VIEW)
}

/**
 * Hook untuk super admin-only areas
 */
export function useRequireSuperAdmin() {
  return useRequireAuth(PERMISSIONS.USER_ROLE_ASSIGN)
}

/**
 * Utility function untuk mengecek role
 */
export function hasRole(session, role) {
  return session?.user?.role === role
}

/**
 * Utility function untuk mengecek apakah user adalah admin
 */
export function isAdmin(session) {
  return session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERADMIN'
}

/**
 * Utility function untuk mengecek apakah user adalah super admin
 */
export function isSuperAdmin(session) {
  return session?.user?.role === 'SUPERADMIN'
}

/**
 * Utility function untuk mengecek role hierarchy
 */
export function hasRoleLevel(userRole, requiredLevel) {
  const userLevel = ROLE_HIERARCHY[userRole] || -1
  const required = ROLE_HIERARCHY[requiredLevel] || 999
  
  return userLevel >= required
}
