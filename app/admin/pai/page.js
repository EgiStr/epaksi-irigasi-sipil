'use client'

import { useState, useEffect } from 'react'
import { Plus, FileText, Download } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Layout from '../../../components/Layout'
import PAITable from '../../../components/admin/pai/PAITable'
import PAIFormModal from '../../../components/admin/pai/PAIFormModal'
import PAIDetailModal from '../../../components/admin/pai/PAIDetailModal'

export default function PAIManagementPage() {
  const { data: session } = useSession()
  const [pai, setPai] = useState([])
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedFeature, setSelectedFeature] = useState(null)
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [editingPai, setEditingPai] = useState(null)
  const [viewingPai, setViewingPai] = useState(null)
  
  // Filter and pagination states
  const [filters, setFilters] = useState({})
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 20
  })

  useEffect(() => {
    fetchFeatures()
    fetchPAI()
  }, [filters, pagination.page])

  const fetchFeatures = async () => {
    try {
      const response = await fetch('/api/features')
      if (response.ok) {
        const data = await response.json()
        setFeatures(data.features || [])
      }
    } catch (error) {
      console.error('Error fetching features:', error)
    }
  }

  const fetchPAI = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...filters
      })

      const response = await fetch(`/api/pai?${params}`)
      if (response.ok) {
        const data = await response.json()
        setPai(data.pai || [])
        if (data.pagination) {
          setPagination(data.pagination)
        }
      } else {
        console.error('Failed to fetch PAI')
      }
    } catch (error) {
      console.error('Error fetching PAI:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePAI = (feature) => {
    setSelectedFeature(feature)
    setEditingPai(null)
    setIsFormModalOpen(true)
  }

  const handleEditPAI = (paiData) => {
    setSelectedFeature({ featureId: paiData.featureId, name: paiData.feature?.name })
    setEditingPai(paiData)
    setIsFormModalOpen(true)
  }

  const handleViewPAI = (paiData) => {
    setViewingPai(paiData)
    setIsDetailModalOpen(true)
  }

  const handleDeletePAI = async (paiId) => {
    try {
      const response = await fetch(`/api/pai/${paiId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchPAI() // Refresh data
        alert('PAI berhasil dihapus')
      } else {
        const errorData = await response.json()
        alert('Gagal menghapus PAI: ' + errorData.error)
      }
    } catch (error) {
      console.error('Error deleting PAI:', error)
      alert('Gagal menghapus PAI: ' + error.message)
    }
  }

  const handleSavePAI = async (paiData) => {
    try {
      const url = editingPai ? `/api/pai/${editingPai.id}` : '/api/pai'
      const method = editingPai ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paiData)
      })

      if (response.ok) {
        await fetchPAI() // Refresh data
        setIsFormModalOpen(false)
        alert(editingPai ? 'PAI berhasil diperbarui' : 'PAI berhasil dibuat')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal menyimpan PAI')
      }
    } catch (error) {
      console.error('Error saving PAI:', error)
      throw error // Re-throw to be handled by the modal
    }
  }

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }

  // Check if user has permission to create PAI
  const canCreatePAI = session?.user?.role && ['SUPERADMIN', 'ADMIN', 'SURVEYOR'].includes(session.user.role)

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Manajemen PAI (Profil Aset Irigasi)
            </h1>
            <p className="text-gray-600 mt-1">
              Kelola data profil aset irigasi untuk semua feature dalam sistem
            </p>
          </div>

        <div className="flex items-center space-x-3">
          {/* Export Button */}
          <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export Data</span>
          </button>

          {/* Add PAI Button */}
          {canCreatePAI && (
            <div className="relative">
              <select
                onChange={(e) => {
                  const featureId = e.target.value
                  if (featureId) {
                    const feature = features.find(f => f.featureId === featureId)
                    if (feature) {
                      handleCreatePAI(feature)
                    }
                  }
                  e.target.value = '' // Reset select
                }}
                className="pl-10 pr-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="">Tambah PAI untuk Feature...</option>
                {features.map((feature) => (
                  <option key={feature.featureId} value={feature.featureId}>
                    {feature.name || feature.featureId}
                  </option>
                ))}
              </select>
              <Plus className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total PAI</p>
              <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">PAI Saluran</p>
              <p className="text-2xl font-bold text-gray-900">
                {pai.filter(p => p.paiType === 'saluran').length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <span className="text-xl">🚰</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">PAI Bangunan</p>
              <p className="text-2xl font-bold text-gray-900">
                {pai.filter(p => p.paiType === 'bangunan').length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <span className="text-xl">🏢</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Features Tercakup</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(pai.map(p => p.featureId)).size}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <span className="text-xl">📍</span>
            </div>
          </div>
        </div>
      </div>

      {/* PAI Table */}
      <PAITable
        data={pai}
        loading={loading}
        pagination={pagination}
        filters={filters}
        onView={handleViewPAI}
        onEdit={handleEditPAI}
        onDelete={handleDeletePAI}
        onPageChange={handlePageChange}
        onFilterChange={handleFilterChange}
      />

      {/* Modals */}
      <PAIFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false)
          setEditingPai(null)
          setSelectedFeature(null)
        }}
        feature={selectedFeature}
        initialData={editingPai}
        onSave={handleSavePAI}
      />

      <PAIDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setViewingPai(null)
        }}
        pai={viewingPai}
      />
      </div>
    </Layout>
  )
}