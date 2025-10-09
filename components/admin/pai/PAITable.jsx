'use client'

import { useState, useEffect } from 'react'
import { 
  Eye, 
  Edit, 
  Trash2, 
  Image, 
  Plus, 
  Filter,
  Download,
  Calendar
} from 'lucide-react'

export default function PAITable({ 
  data = [], 
  onView, 
  onEdit, 
  onDelete,
  loading = false,
  pagination = null,
  onPageChange,
  filters = {},
  onFilterChange
}) {
  const [selectedRows, setSelectedRows] = useState([])
  const [sortField, setSortField] = useState('priorityScore')
  const [sortDirection, setSortDirection] = useState('desc')

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPaiType = (type) => {
    return type === 'saluran' ? '🚰 Saluran' : '🏢 Bangunan'
  }

  const getPaiTypeColor = (type) => {
    return type === 'saluran' 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-green-100 text-green-800'
  }

  const getPriorityLabel = (score) => {
    if (!score) return { label: 'Belum Diatur', color: 'bg-gray-100 text-gray-600', icon: '⚪' }
    
    const priorities = {
      5: { label: 'Sangat Mendesak', color: 'bg-red-600 text-white', icon: '🔴' },
      4: { label: 'Mendesak', color: 'bg-orange-500 text-white', icon: '🟠' },
      3: { label: 'Sedang', color: 'bg-yellow-500 text-white', icon: '🟡' },
      2: { label: 'Rendah', color: 'bg-blue-500 text-white', icon: '🔵' },
      1: { label: 'Sangat Rendah', color: 'bg-gray-400 text-white', icon: '⚪' }
    }
    
    return priorities[score] || { label: 'Tidak Valid', color: 'bg-gray-100 text-gray-600', icon: '❓' }
  }

  const getPriorityStatusLabel = (status) => {
    const statuses = {
      'pending': { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-800' },
      'approved': { label: 'Disetujui', color: 'bg-blue-100 text-blue-800' },
      'in_progress': { label: 'Dalam Proses', color: 'bg-purple-100 text-purple-800' },
      'completed': { label: 'Selesai', color: 'bg-green-100 text-green-800' }
    }
    
    return statuses[status] || { label: 'Tidak Diketahui', color: 'bg-gray-100 text-gray-600' }
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRows(data.map(item => item.id))
    } else {
      setSelectedRows([])
    }
  }

  const handleSelectRow = (id, checked) => {
    if (checked) {
      setSelectedRows([...selectedRows, id])
    } else {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id))
    }
  }

  // Sort data based on priority score (highest first) and other fields
  const sortedData = [...data].sort((a, b) => {
    let aValue, bValue
    
    if (sortField === 'priorityScore') {
      // Sort by priority: treat null/undefined as lowest priority (0)
      aValue = a.priorityScore || 0
      bValue = b.priorityScore || 0
    } else if (sortField === 'feature.name') {
      aValue = a.feature?.name || a.featureId
      bValue = b.feature?.name || b.featureId
    } else if (sortField === 'createdAt') {
      aValue = new Date(a.createdAt).getTime()
      bValue = new Date(b.createdAt).getTime()
    } else {
      aValue = a[sortField]
      bValue = b[sortField]
    }
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Table Header with Actions */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Data PAI ({data.length})
          </h3>
          
          <div className="flex items-center space-x-3">
            {/* Filter Tipe PAI */}
            <select
              value={filters.paiType || ''}
              onChange={(e) => onFilterChange({ ...filters, paiType: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Semua Tipe</option>
              <option value="saluran">Saluran</option>
              <option value="bangunan">Bangunan</option>
            </select>

            {/* Bulk Actions */}
            {selectedRows.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {selectedRows.length} dipilih
                </span>
                <button
                  onClick={() => {
                    // Handle bulk delete
                    if (confirm(`Hapus ${selectedRows.length} PAI yang dipilih?`)) {
                      selectedRows.forEach(id => onDelete(id))
                      setSelectedRows([])
                    }
                  }}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  Hapus
                </button>
              </div>
            )}

            {/* Export */}
            <button className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedRows.length === data.length && data.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 focus:ring-blue-500"
                />
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('feature.name')}
              >
                Feature
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Tipe PAI
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Nama Aset
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Nomenklatur
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Tahun
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Detail
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Foto
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('createdAt')}
              >
                Tanggal Input
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    <Image className="mx-auto h-12 w-12 mb-4" />
                    <p className="text-lg font-medium">Belum ada data PAI</p>
                    <p className="text-sm">Mulai dengan menambahkan PAI untuk feature yang dipilih</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedData.map((pai) => {
                const priority = getPriorityLabel(pai.priorityScore)
                const priorityStatus = getPriorityStatusLabel(pai.priorityStatus)
                
                return (
                <tr key={pai.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(pai.id)}
                      onChange={(e) => handleSelectRow(pai.id, e.target.checked)}
                      className="rounded border-gray-300 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {pai.feature?.name || pai.featureId}
                      </div>
                      <div className="text-sm text-gray-500">
                        {pai.feature?.type} • {pai.feature?.scheme}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaiTypeColor(pai.paiType)}`}>
                      {formatPaiType(pai.paiType)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {pai.paiData?.aset?.nama || '-'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {pai.paiData?.aset?.jenis}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {pai.paiData?.aset?.nomenklatur || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {pai.paiData?.tahun_dibangun || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {pai.paiType === 'saluran' ? (
                      <div>
                        <div>Q: {pai.paiData?.hidraulik?.q_desain_m3s || '-'} m³/s</div>
                        <div>L: {pai.lengthM ? `${Math.round(pai.lengthM)}m` : '-'}</div>
                      </div>
                    ) : (
                      <div>
                        Saluran: {pai.paiData?.saluran?.nama || '-'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1">
                      <Image className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {pai.photos?.length || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(pai.createdAt)}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      oleh {pai.user?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onView(pai)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Lihat Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(pai)}
                        className="p-1 text-gray-400 hover:text-yellow-600"
                        title="Edit PAI"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Yakin ingin menghapus PAI ini?')) {
                            onDelete(pai.id)
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Hapus PAI"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Menampilkan {((pagination.page - 1) * pagination.limit) + 1} sampai {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} data
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              
              <div className="flex items-center space-x-1">
                {[...Array(pagination.totalPages)].map((_, i) => {
                  const pageNum = i + 1
                  const isCurrentPage = pageNum === pagination.page
                  const showPage = pageNum === 1 || 
                                   pageNum === pagination.totalPages || 
                                   Math.abs(pageNum - pagination.page) <= 2
                  
                  if (!showPage) {
                    if (pageNum === 2 && pagination.page > 4) {
                      return <span key={pageNum} className="px-2">...</span>
                    }
                    if (pageNum === pagination.totalPages - 1 && pagination.page < pagination.totalPages - 3) {
                      return <span key={pageNum} className="px-2">...</span>
                    }
                    return null
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`px-3 py-1 text-sm rounded ${
                        isCurrentPage
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              
              <button
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}