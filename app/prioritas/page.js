'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Filter, FileText, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'
import Layout from '../../components/Layout'
import { useRequireAuth } from '../../hooks/useAuth'

export default function PrioritasPenangananPage() {
  const { loading: authLoading } = useRequireAuth()
  const { data: session } = useSession()
  
  const [paiData, setPaiData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Filter & Sort states
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('priorityScore')
  const [sortOrder, setSortOrder] = useState('desc') // desc = tertinggi dulu
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterScore, setFilterScore] = useState('all')

  useEffect(() => {
    fetchPAIData()
  }, [])

  useEffect(() => {
    applyFiltersAndSort()
  }, [paiData, searchQuery, sortBy, sortOrder, filterStatus, filterScore])

  const fetchPAIData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/pai')
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data PAI')
      }
      
      const data = await response.json()
      setPaiData(data.pai || [])
    } catch (err) {
      console.error('Error fetching PAI data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const applyFiltersAndSort = () => {
    let result = [...paiData]

    // Filter berdasarkan search query
    if (searchQuery) {
      result = result.filter(item => {
        const searchLower = searchQuery.toLowerCase()
        return (
          item.feature?.name?.toLowerCase().includes(searchLower) ||
          item.paiData?.aset?.nama?.toLowerCase().includes(searchLower) ||
          item.paiData?.di?.name?.toLowerCase().includes(searchLower) ||
          item.priorityNotes?.toLowerCase().includes(searchLower)
        )
      })
    }

    // Filter berdasarkan status
    if (filterStatus !== 'all') {
      result = result.filter(item => item.priorityStatus === filterStatus)
    }

    // Filter berdasarkan score
    if (filterScore !== 'all') {
      result = result.filter(item => {
        const score = item.priorityScore
        if (!score && score !== 0) return false
        
        switch (filterScore) {
          case 'very_high':
            return score >= 0.875
          case 'high':
            return score >= 0.625 && score < 0.875
          case 'medium':
            return score >= 0.375 && score < 0.625
          case 'low':
            return score >= 0.125 && score < 0.375
          case 'very_low':
            return score < 0.125
          default:
            return true
        }
      })
    }

    // Sort
    result.sort((a, b) => {
      let aValue, bValue

      switch (sortBy) {
        case 'priorityScore':
          aValue = a.priorityScore || 0
          bValue = b.priorityScore || 0
          break
        case 'name':
          aValue = a.feature?.name || a.paiData?.aset?.nama || ''
          bValue = b.feature?.name || b.paiData?.aset?.nama || ''
          return sortOrder === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue)
        case 'status':
          aValue = a.priorityStatus || 'pending'
          bValue = b.priorityStatus || 'pending'
          return sortOrder === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue)
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime()
          bValue = new Date(b.updatedAt).getTime()
          break
        default:
          return 0
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
    })

    setFilteredData(result)
  }

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const getPriorityBadge = (score) => {
    if (!score && score !== 0) return { text: 'Belum Dinilai', color: 'bg-gray-100 text-gray-800', icon: '⚪' }
    
    if (score >= 0.875) {
      return { text: 'SANGAT MENDESAK', color: 'bg-red-100 text-red-800 border-red-300', icon: '🔴' }
    } else if (score >= 0.625) {
      return { text: 'MENDESAK', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: '🟠' }
    } else if (score >= 0.375) {
      return { text: 'SEDANG', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '🟡' }
    } else if (score >= 0.125) {
      return { text: 'RENDAH', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: '🔵' }
    } else {
      return { text: 'SANGAT RENDAH', color: 'bg-green-100 text-green-800 border-green-300', icon: '🟢' }
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return { text: 'Selesai', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4" /> }
      case 'in_progress':
        return { text: 'Dalam Proses', color: 'bg-blue-100 text-blue-800', icon: <Clock className="w-4 h-4" /> }
      case 'approved':
        return { text: 'Disetujui', color: 'bg-purple-100 text-purple-800', icon: <CheckCircle className="w-4 h-4" /> }
      case 'pending':
      default:
        return { text: 'Menunggu', color: 'bg-gray-100 text-gray-800', icon: <AlertTriangle className="w-4 h-4" /> }
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-4 h-4 opacity-40" />
    return sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
  }

  // Statistics
  const stats = {
    total: paiData.length,
    mendesak: paiData.filter(p => p.priorityScore >= 0.625).length, // >= 0.625 = Mendesak + Sangat Mendesak
    sedang: paiData.filter(p => p.priorityScore >= 0.375 && p.priorityScore < 0.625).length,
    rendah: paiData.filter(p => p.priorityScore && p.priorityScore < 0.375).length,
    belumDinilai: paiData.filter(p => !p.priorityScore && p.priorityScore !== 0).length,
    completed: paiData.filter(p => p.priorityStatus === 'completed').length,
    inProgress: paiData.filter(p => p.priorityStatus === 'in_progress').length,
  }

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="h-full">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="h-full">
        {/* Header */}
        <div className="dashboard-header mb-6">
          <div>
            <h2 className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
              Prioritas Penanganan Infrastruktur
            </h2>
            <p className="text-gray-600">
              Daftar infrastruktur berdasarkan tingkat urgensi perbaikan dan pemeliharaan
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-4 border-2 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Mendesak</p>
                <p className="text-3xl font-bold text-red-700">{stats.mendesak}</p>
                <p className="text-xs text-red-500 mt-1">≥0.625</p>
              </div>
              <div className="text-4xl">🔴</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border-2 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Sedang</p>
                <p className="text-3xl font-bold text-yellow-700">{stats.sedang}</p>
                <p className="text-xs text-yellow-500 mt-1">0.375-0.624</p>
              </div>
              <div className="text-4xl">🟡</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-4 border-2 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Rendah</p>
                <p className="text-3xl font-bold text-blue-700">{stats.rendah}</p>
                <p className="text-xs text-blue-500 mt-1">&lt;0.375</p>
              </div>
              <div className="text-4xl">🔵</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 border-2 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Selesai</p>
                <p className="text-3xl font-bold text-green-700">{stats.completed}</p>
                <p className="text-xs text-green-500 mt-1">Sudah Ditangani</p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                Cari Infrastruktur
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, lokasi, atau catatan..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="w-4 h-4 inline mr-1" />
                Status Perbaikan
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Menunggu</option>
                <option value="approved">Disetujui</option>
                <option value="in_progress">Dalam Proses</option>
                <option value="completed">Selesai</option>
              </select>
            </div>

            {/* Filter Score */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="w-4 h-4 inline mr-1" />
                Tingkat Prioritas
              </label>
              <select
                value={filterScore}
                onChange={(e) => setFilterScore(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Semua Prioritas</option>
                <option value="very_high">🔴 Sangat Mendesak (≥0.875)</option>
                <option value="high">🟠 Mendesak (0.625-0.874)</option>
                <option value="medium">🟡 Sedang (0.375-0.624)</option>
                <option value="low">🔵 Rendah (0.125-0.374)</option>
                <option value="very_low">🟢 Sangat Rendah (&lt;0.125)</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Menampilkan <span className="font-semibold text-gray-900">{filteredData.length}</span> dari{' '}
              <span className="font-semibold text-gray-900">{paiData.length}</span> total infrastruktur
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('priorityScore')}
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                    >
                      Ranking
                      <SortIcon field="priorityScore" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Prioritas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                    >
                      Nama Infrastruktur
                      <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Tipe
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                    >
                      Status
                      <SortIcon field="status" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Catatan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('updatedAt')}
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                    >
                      Terakhir Update
                      <SortIcon field="updatedAt" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Tidak ada data yang sesuai dengan filter</p>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, index) => {
                    const priorityBadge = getPriorityBadge(item.priorityScore)
                    const statusBadge = getStatusBadge(item.priorityStatus)
                    
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        {/* Ranking */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`
                              w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                              ${index < 3 ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg' :
                                index < 10 ? 'bg-gradient-to-br from-yellow-400 to-orange-400 text-white' :
                                'bg-gray-200 text-gray-700'}
                            `}>
                              {index + 1}
                            </div>
                          </div>
                        </td>

                        {/* Prioritas */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{priorityBadge.icon}</span>
                            <div>
                              <div className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${priorityBadge.color}`}>
                                {priorityBadge.text}
                              </div>
                              {(item.priorityScore !== null && item.priorityScore !== undefined) && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Skor: {item.priorityScore.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Nama */}
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            <div className="font-semibold text-gray-900">
                              {item.feature?.name || item.paiData?.aset?.nama || 'Tidak ada nama'}
                            </div>
                            {item.paiData?.di?.name && (
                              <div className="text-gray-500 text-xs mt-1">
                                📍 {item.paiData.di.name}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Tipe */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            item.paiType === 'saluran' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {item.paiType === 'saluran' ? '🌊 Saluran' : '🏗️ Bangunan'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                            {statusBadge.icon}
                            {statusBadge.text}
                          </div>
                        </td>

                        {/* Catatan */}
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-600 max-w-xs truncate">
                            {item.priorityNotes || <span className="italic text-gray-400">Tidak ada catatan</span>}
                          </div>
                        </td>

                        {/* Tanggal */}
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(item.updatedAt)}
                        </td>

                        {/* Aksi */}
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <a
                            href={`/features/${item.featureId}`}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                          >
                            <FileText className="w-3 h-3" />
                            Detail
                          </a>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Footer */}
        {filteredData.length > 0 && (
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-900">Ringkasan Prioritas:</span>
              </div>
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <div className="font-bold text-red-600 text-xl">{stats.mendesak}</div>
                  <div className="text-gray-600 text-xs">Mendesak</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-blue-600 text-xl">{stats.inProgress}</div>
                  <div className="text-gray-600 text-xs">Dalam Proses</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-green-600 text-xl">{stats.completed}</div>
                  <div className="text-gray-600 text-xs">Selesai</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
