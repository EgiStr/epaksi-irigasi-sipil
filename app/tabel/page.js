'use client'

import { useRequireAuth } from '../../hooks/useAuth'
import Layout from '../../components/Layout'
import TableDaerahIrigasi from '../../components/TableDaerahIrigasi'


export default function TabelPage() {
  const { loading } = useRequireAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <Layout>
      <div className="h-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">📊 Tabel Daerah Irigasi</h1>
          <p className="text-gray-600">Data detail infrastruktur irigasi Way Rarem</p>
        </div>
        <TableDaerahIrigasi />
      </div>
    </Layout>
  )
}
