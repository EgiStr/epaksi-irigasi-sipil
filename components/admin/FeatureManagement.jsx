'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Upload, 
  Map, 
  Search,
  Filter,
  Eye,
  FileText,
  MapPin
} from 'lucide-react'
import FileUpload from '../FileUpload'

const FeatureManagement = () => {
  const { data: session } = useSession()
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [editingFeature, setEditingFeature] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterScheme, setFilterScheme] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [pagination, setPagination] = useState(null)

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    scheme: '',
    sourceLayer: '',
    props: '{}'
  })

  useEffect(() => {
    fetchFeatures()
  }, [currentPage])

  const fetchFeatures = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Use management format for admin table
      const response = await fetch(`/api/features?format=management&page=${currentPage}&limit=${itemsPerPage}`)
      
      if (response.ok) {
        const data = await response.json()
        
        // Validate response structure
        if (data.features && Array.isArray(data.features)) {
          setFeatures(data.features)
          setPagination(data.pagination)
        } else {
          console.error('Invalid response structure:', data)
          throw new Error('Format response tidak valid dari server')
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}: Gagal mengambil data features`)
      }
    } catch (err) {
      console.error('Error fetching features:', err)
      setError(err.message)
      setFeatures([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      let propsData
      try {
        propsData = JSON.parse(formData.props)
      } catch {
        alert('Format JSON properties tidak valid')
        return
      }

      const method = editingFeature ? 'PUT' : 'POST'
      const url = editingFeature ? `/api/features/${editingFeature.featureId}` : '/api/features'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          scheme: formData.scheme || null,
          sourceLayer: formData.sourceLayer,
          props: propsData
        })
      })

      if (response.ok) {
        await fetchFeatures()
        setIsModalOpen(false)
        resetForm()
        alert(editingFeature ? 'Feature berhasil diupdate' : 'Feature berhasil dibuat')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save feature')
      }
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const handleEdit = (feature) => {
    setEditingFeature(feature)
    setFormData({
      name: feature.name || '',
      type: feature.type || '',
      scheme: feature.scheme || '',
      sourceLayer: feature.sourceLayer || '',
      props: JSON.stringify(feature.props || {}, null, 2)
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus feature ini? Semua survey terkait juga akan dihapus.')) return

    try {
      const response = await fetch(`/api/features/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchFeatures()
        alert('Feature berhasil dihapus')
      } else {
        throw new Error('Failed to delete feature')
      }
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', type: '', scheme: '', sourceLayer: '', props: '{}' })
    setEditingFeature(null)
  }

  // Handle upload success
  const handleUploadSuccess = async (result) => {
    setIsUploadModalOpen(false)
    await fetchFeatures() // Refresh features list
    alert(`Upload berhasil! ${result.summary.inserted} features baru ditambahkan, ${result.summary.updated} features diupdate.`)
  }

  // Handle upload error  
  const handleUploadError = (error) => {
    alert(`Upload gagal: ${error}`)
  }

  // Ensure features is always an array before filtering
  const safeFeatures = Array.isArray(features) ? features : []
  
  const filteredFeatures = safeFeatures.filter(feature => {
    const matchesSearch = (feature.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         feature.featureId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (feature.sourceLayer || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || feature.type === filterType
    const matchesScheme = filterScheme === 'all' || feature.scheme === filterScheme
    return matchesSearch && matchesType && matchesScheme
  })

  const uniqueTypes = [...new Set(safeFeatures.map(f => f.type).filter(Boolean))]
  const uniqueSchemes = [...new Set(safeFeatures.map(f => f.scheme).filter(Boolean))]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:justify-between lg:items-center">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial sm:min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari feature..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
            >
              <option value="all">Semua Type</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={filterScheme}
              onChange={(e) => setFilterScheme(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
            >
              <option value="all">Semua Scheme</option>
              {uniqueSchemes.map(scheme => (
                <option key={scheme} value={scheme}>{scheme}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <button
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tambah Feature</span>
            <span className="sm:hidden">Tambah</span>
          </button>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload File</span>
            <span className="sm:hidden">Upload</span>
          </button>
          
          <button
            onClick={() => window.open('/api/features?format=export', '_blank')}
            className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <MapPin className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs lg:text-sm text-gray-600 truncate">Total Features</p>
              <p className="text-lg lg:text-xl font-semibold text-gray-900">
                {pagination?.total || features.length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
              <Map className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs lg:text-sm text-gray-600 truncate">Source Layers</p>
              <p className="text-lg lg:text-xl font-semibold text-gray-900">
                {new Set(features.map(f => f.sourceLayer)).size}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg flex-shrink-0">
              <FileText className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs lg:text-sm text-gray-600 truncate">Types</p>
              <p className="text-lg lg:text-xl font-semibold text-gray-900">{uniqueTypes.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
              <Filter className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs lg:text-sm text-gray-600 truncate">Current Page</p>
              <p className="text-lg lg:text-xl font-semibold text-gray-900">
                {filteredFeatures.length} of {pagination?.total || features.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Features Table/Cards */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Mobile/Tablet Card View */}
        <div className="block lg:hidden">
          <div className="space-y-4 p-4">
            {filteredFeatures.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm || filterType !== 'all' || filterScheme !== 'all' 
                  ? 'Tidak ada feature yang sesuai filter' 
                  : 'Belum ada feature'}
              </div>
            ) : (
              filteredFeatures.map((feature) => (
                <div key={feature.id} className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-mono text-sm font-medium text-gray-900 mb-1">
                        ID: {feature.featureId}
                      </div>
                      <div className="text-sm text-gray-900 mb-2">
                        <strong>Name:</strong> {feature.name || '-'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() => handleEdit(feature)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                        title="Edit feature"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(feature.featureId)}
                        className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                        title="Hapus feature"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <div className="mt-1">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {feature.type || '-'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Scheme:</span>
                      <div className="mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          feature.scheme === 'utama' ? 'bg-green-100 text-green-800' :
                          feature.scheme === 'tersier' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {feature.scheme || 'None'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    <span className="text-gray-600">Source Layer:</span>
                    <div className="mt-1 text-gray-900 break-words">
                      {feature.sourceLayer}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {feature.surveyCount || 0} survey{(feature.surveyCount || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="text-gray-500 text-xs">
                      {new Date(feature.updatedAt).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feature ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scheme
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source Layer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Surveys
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFeatures.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                    {searchTerm || filterType !== 'all' || filterScheme !== 'all' 
                      ? 'Tidak ada feature yang sesuai filter' 
                      : 'Belum ada feature'}
                  </td>
                </tr>
              ) : (
                filteredFeatures.map((feature) => (
                  <tr key={feature.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 font-mono">
                        {feature.featureId}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900 max-w-32 truncate" title={feature.name}>
                        {feature.name || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {feature.type || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        feature.scheme === 'utama' ? 'bg-green-100 text-green-800' :
                        feature.scheme === 'tersier' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {feature.scheme || 'None'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900 max-w-40 truncate" title={feature.sourceLayer}>
                        {feature.sourceLayer}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {feature.surveyCount || 0} survey{(feature.surveyCount || 0) !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="max-w-24 truncate" title={new Date(feature.updatedAt).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}>
                        {new Date(feature.updatedAt).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(feature)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                          title="Edit feature"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(feature.featureId)}
                          className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                          title="Hapus feature"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
              disabled={currentPage === pagination.totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span>
                {' '}to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, pagination.total)}
                </span>
                {' '}of{' '}
                <span className="font-medium">{pagination.total}</span>
                {' '}results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Page Numbers */}
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === pageNum
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                  disabled={currentPage === pagination.totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Create/Edit */}
      {isModalOpen && (
        <div className="feature-modal-overlay fixed inset-0" style={{ zIndex: 1001 }}>
          <div className="feature-modal-content fixed bg-white rounded-3xl shadow-2xl max-h-[80vh] flex flex-col" style={{ 
            zIndex: 1002,
            maxWidth: '800px', 
            width: 'calc(100% - 2rem)',
            left: '50%',
            top: '50%',
            transform: 'translateX(-50%) translateY(-50%)'
          }}>
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-3xl">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingFeature ? 'Edit Feature' : 'Tambah Feature Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white hover:bg-opacity-80 rounded-full transition-all duration-200 bg-white bg-opacity-50"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Feature
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Masukkan nama feature"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <input
                    type="text"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Masukkan type feature"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheme
                  </label>
                  <select
                    value={formData.scheme}
                    onChange={(e) => setFormData({...formData, scheme: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Pilih Scheme (Optional)</option>
                    <option value="utama">Utama</option>
                    <option value="tersier">Tersier</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source Layer *
                  </label>
                  <input
                    type="text"
                    value={formData.sourceLayer}
                    onChange={(e) => setFormData({...formData, sourceLayer: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Masukkan source layer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Properties (JSON)
                  </label>
                  <textarea
                    value={formData.props}
                    onChange={(e) => setFormData({...formData, props: e.target.value})}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder='{"key": "value"}'
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format JSON valid diperlukan
                  </p>
                </div>
              </form>
            </div>
            
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end gap-2 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingFeature ? 'Update' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="feature-modal-overlay fixed inset-0" style={{ zIndex: 1001 }}>
          <div className="feature-modal-content fixed bg-white rounded-3xl shadow-2xl max-h-[80vh] flex flex-col" style={{ 
            zIndex: 1002,
            maxWidth: '800px', 
            width: 'calc(100% - 2rem)',
            left: '50%',
            top: '50%',
            transform: 'translateX(-50%) translateY(-50%)'
          }}>
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-3xl">
              <h3 className="text-lg font-semibold text-gray-900">
                Upload Features dari File KML/GeoJSON
              </h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 hover:bg-white hover:bg-opacity-80 rounded-full transition-all duration-200 bg-white bg-opacity-50"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Upload file KML atau GeoJSON untuk menambahkan features secara bulk. 
                  File akan diproses dan features akan ditambahkan ke database.
                </p>
              </div>

              <FileUpload 
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            </div>

            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end gap-2 rounded-b-3xl">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FeatureManagement
