'use client'

import { useRequireAuth } from '../../../hooks/useAuth'
import Layout from '../../../components/Layout'
import SurveyManagement from '../../../components/admin/SurveyManagement'
import { PERMISSIONS } from '../../../lib/permissions'


export default function SurveysPage() {
  const { loading, session, isAuthenticated } = useRequireAuth(PERMISSIONS.SURVEY_MANAGE)

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
      <div className="h-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">📊 IKSI Management</h1>
          <p className="text-gray-600">Kelola data survey dan hasil scoring infrastruktur irigasi</p>
        </div>
        <SurveyManagement />
      </div>
    </Layout>
  )
}
