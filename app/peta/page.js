'use client'

import { useRequireAuth } from '../../hooks/useAuth'
import Layout from '../../components/Layout'
import IrigasiMap from '../../components/IrigasiMap'


export default function PetaPage() {
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
        <div style={{ 
          backgroundColor: 'white', 
          padding: '1.5rem', 
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
          height: 'calc(100vh - 200px)',
          minHeight: '600px'
        }}>
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900">🗺️ Peta Irigasi Way Rarem</h1>
            <p className="text-gray-600">Visualisasi interaktif data infrastruktur irigasi</p>
          </div>
          <IrigasiMap />
        </div>
      </div>
    </Layout>
  )
}
