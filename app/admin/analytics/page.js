'use client'

import { useRequireAuth } from '../../../hooks/useAuth'
import Layout from '../../../components/Layout'
import AnalyticsDashboard from '../../../components/admin/AnalyticsDashboard'
import { PERMISSIONS } from '../../../lib/permissions'



export default function AnalyticsPage() {
  const { loading, session, isAuthenticated } = useRequireAuth(PERMISSIONS.ANALYTICS_VIEW)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Akses Ditolak</h1>
            <p className="text-gray-600">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="border-b border-gray-200 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
            <p className="text-gray-600 mt-2">
              Analisis data, laporan, dan insight sistem irigasi
            </p>
          </div>
          
          <AnalyticsDashboard />
        </div>
      </div>
    </Layout>
  )
}
