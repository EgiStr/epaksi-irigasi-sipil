'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, Clock, PlayCircle, Filter, Download } from 'lucide-react'

// Helper function untuk mendapatkan info prioritas berdasarkan score (0-1)
const getPriorityConfig = (score) => {
  if (score >= 0.875) {
    return { bg: '#fee2e2', text: '#991b1b', label: 'Sangat Mendesak', range: '≥0.875' }
  } else if (score >= 0.625) {
    return { bg: '#fed7aa', text: '#9a3412', label: 'Mendesak', range: '0.625-0.874' }
  } else if (score >= 0.375) {
    return { bg: '#fef3c7', text: '#92400e', label: 'Sedang', range: '0.375-0.624' }
  } else if (score >= 0.125) {
    return { bg: '#dbeafe', text: '#1e40af', label: 'Rendah', range: '0.125-0.374' }
  } else {
    return { bg: '#f3f4f6', text: '#374151', label: 'Sangat Rendah', range: '<0.125' }
  }
}

const STATUS_CONFIG = {
  pending: { icon: Clock, label: 'Menunggu', color: '#6b7280' },
  approved: { icon: CheckCircle, label: 'Disetujui', color: '#3b82f6' },
  in_progress: { icon: PlayCircle, label: 'Dalam Pengerjaan', color: '#f59e0b' },
  completed: { icon: CheckCircle, label: 'Selesai', color: '#10b981' }
}

export default function PriorityManagement() {
  const [priorities, setPriorities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState({ status: 'all', priority: 'all' })

  useEffect(() => {
    fetchPriorities()
  }, [])

  const fetchPriorities = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/pai?includeFeature=true')
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data prioritas')
      }

      const data = await response.json()
      
      // Filter only PAI with priority scores
      const priorityData = data.data
        .filter(pai => pai.priorityScore !== null)
        .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
      
      setPriorities(priorityData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredPriorities = priorities.filter(item => {
    if (filter.status !== 'all' && item.priorityStatus !== filter.status) return false
    if (filter.priority !== 'all') {
      const score = item.priorityScore
      if (filter.priority === 'very_high' && score < 0.875) return false
      if (filter.priority === 'high' && (score < 0.625 || score >= 0.875)) return false
      if (filter.priority === 'medium' && (score < 0.375 || score >= 0.625)) return false
      if (filter.priority === 'low' && (score < 0.125 || score >= 0.375)) return false
      if (filter.priority === 'very_low' && score >= 0.125) return false
    }
    return true
  })

  const exportToCSV = () => {
    const headers = ['Feature ID', 'Nama', 'Tipe PAI', 'Skor Prioritas', 'Kategori Prioritas', 'Status', 'Catatan', 'Tanggal Update']
    const rows = filteredPriorities.map(item => [
      item.featureId,
      item.feature?.name || '-',
      item.paiType === 'saluran' ? 'Saluran' : 'Bangunan',
      item.priorityScore?.toFixed(2) || '-',
      getPriorityConfig(item.priorityScore).label,
      STATUS_CONFIG[item.priorityStatus]?.label || '-',
      (item.priorityNotes || '-').replace(/,/g, ';'),
      new Date(item.updatedAt).toLocaleDateString('id-ID')
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prioritas-perbaikan-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data prioritas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Prioritas Perbaikan</h1>
          <p className="text-gray-600">Daftar infrastruktur irigasi yang memerlukan perbaikan berdasarkan prioritas</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {[
            { min: 0.875, label: 'Sangat Mendesak', key: 'very_high' },
            { min: 0.625, max: 0.875, label: 'Mendesak', key: 'high' },
            { min: 0.375, max: 0.625, label: 'Sedang', key: 'medium' },
            { min: 0.125, max: 0.375, label: 'Rendah', key: 'low' },
            { max: 0.125, label: 'Sangat Rendah', key: 'very_low' }
          ].map(({ min, max, label, key }) => {
            const count = priorities.filter(p => {
              const score = p.priorityScore
              if (min !== undefined && max !== undefined) {
                return score >= min && score < max
              } else if (min !== undefined) {
                return score >= min
              } else {
                return score < max
              }
            }).length
            const config = getPriorityConfig(min !== undefined ? min : 0)
            return (
              <div key={key} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{label}</p>
                    <p className="text-2xl font-bold" style={{ color: config.text }}>{count}</p>
                  </div>
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: config.bg, color: config.text }}
                  >
                    {config.range}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <div className="flex-1 flex gap-4">
              <select
                value={filter.priority}
                onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Semua Prioritas</option>
                <option value="very_high">Sangat Mendesak (≥0.875)</option>
                <option value="high">Mendesak (0.625-0.874)</option>
                <option value="medium">Sedang (0.375-0.624)</option>
                <option value="low">Rendah (0.125-0.374)</option>
                <option value="very_low">Sangat Rendah (&lt;0.125)</option>
              </select>

              <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Menunggu</option>
                <option value="approved">Disetujui</option>
                <option value="in_progress">Dalam Pengerjaan</option>
                <option value="completed">Selesai</option>
              </select>
            </div>

            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prioritas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feature
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipe PAI
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Catatan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal Update
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPriorities.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    Tidak ada data prioritas
                  </td>
                </tr>
              ) : (
                filteredPriorities.map((item) => {
                  const priorityConfig = getPriorityConfig(item.priorityScore)
                  const statusConfig = STATUS_CONFIG[item.priorityStatus]
                  const StatusIcon = statusConfig?.icon

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs"
                            style={{ backgroundColor: priorityConfig.bg, color: priorityConfig.text }}
                          >
                            {item.priorityScore.toFixed(2)}
                          </div>
                          <div>
                            <div className="text-sm font-medium" style={{ color: priorityConfig.text }}>
                              {priorityConfig.label}
                            </div>
                            <div className="text-xs text-gray-500">
                              {priorityConfig.range}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{item.feature?.name || 'Tidak ada nama'}</div>
                          <div className="text-gray-500">{item.featureId}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {item.paiType === 'saluran' ? '🚰 Saluran' : '🏢 Bangunan'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {StatusIcon && <StatusIcon className="w-4 h-4" style={{ color: statusConfig.color }} />}
                          <span className="text-sm font-medium" style={{ color: statusConfig.color }}>
                            {statusConfig.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900 max-w-xs truncate">
                          {item.priorityNotes || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.updatedAt).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Total: {filteredPriorities.length} infrastruktur</p>
              <p className="text-sm text-blue-700 mt-1">
                Prioritaskan perbaikan berdasarkan tingkat urgensi untuk memastikan sistem irigasi berfungsi optimal
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
