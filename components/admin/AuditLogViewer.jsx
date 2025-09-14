'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Calendar,
  User,
  Activity,
  Search,
  Filter,
  Download,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  FileText,
  Settings
} from 'lucide-react'

const AuditLogViewer = () => {
  const { data: session } = useSession()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)
  const [selectedLog, setSelectedLog] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  useEffect(() => {
    fetchAuditLogs()
  }, [currentPage, filterAction, filterStatus, dateRange.start, dateRange.end])

  const fetchAuditLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        ...(filterAction !== 'all' && { action: filterAction }),
        ...(filterStatus !== 'all' && { status: filterStatus }),
        ...(dateRange.start && { startDate: dateRange.start }),
        ...(dateRange.end && { endDate: dateRange.end })
      })

      // Since we don't have actual audit logs API yet, we'll simulate some data
      // In real implementation, this would be: const response = await fetch(`/api/audit-logs?${params}`)
      
      // Simulated audit log data
      const simulatedLogs = [
        {
          id: '1',
          action: 'USER_LOGIN',
          entity: 'User',
          entityId: 'user123',
          userId: 'admin@example.com',
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          ipAddress: '192.168.1.100',
          status: 'SUCCESS',
          details: { loginMethod: 'email', sessionId: 'sess_abc123' },
          createdAt: new Date().toISOString(),
          user: { name: 'Admin User', email: 'admin@example.com' }
        },
        {
          id: '2',
          action: 'SURVEY_CREATE',
          entity: 'Survey',
          entityId: 'survey456',
          userId: 'surveyor@example.com',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          ipAddress: '192.168.1.101',
          status: 'SUCCESS',
          details: { featureId: 'FEAT001', scheme: 'utama', scoreTotal: 85.5 },
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          user: { name: 'Surveyor 1', email: 'surveyor@example.com' }
        },
        {
          id: '3',
          action: 'CONFIG_UPDATE',
          entity: 'Config',
          entityId: 'config789',
          userId: 'admin@example.com',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          ipAddress: '192.168.1.102',
          status: 'SUCCESS',
          details: { configType: 'survey-utama', version: '1.2', activated: true },
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          user: { name: 'Admin User', email: 'admin@example.com' }
        },
        {
          id: '4',
          action: 'FEATURE_DELETE',
          entity: 'Feature',
          entityId: 'feature101',
          userId: 'admin@example.com',
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
          ipAddress: '192.168.1.100',
          status: 'FAILED',
          details: { error: 'Feature has associated surveys', featureName: 'Canal Utama #1' },
          createdAt: new Date(Date.now() - 10800000).toISOString(),
          user: { name: 'Admin User', email: 'admin@example.com' }
        },
        {
          id: '5',
          action: 'USER_LOGOUT',
          entity: 'User',
          entityId: 'user123',
          userId: 'viewer@example.com',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
          ipAddress: '192.168.1.103',
          status: 'SUCCESS',
          details: { sessionDuration: 3600, logoutMethod: 'manual' },
          createdAt: new Date(Date.now() - 14400000).toISOString(),
          user: { name: 'Viewer User', email: 'viewer@example.com' }
        }
      ]

      setLogs(simulatedLogs)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = (log) => {
    setSelectedLog(log)
    setIsDetailModalOpen(true)
  }

  const exportLogs = () => {
    const params = new URLSearchParams({
      format: 'export',
      ...(filterAction !== 'all' && { action: filterAction }),
      ...(filterStatus !== 'all' && { status: filterStatus }),
      ...(dateRange.start && { startDate: dateRange.start }),
      ...(dateRange.end && { endDate: dateRange.end })
    })
    
    // In real implementation: window.open(`/api/audit-logs?${params}`, '_blank')
    alert('Export functionality akan segera tersedia')
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  const getActionIcon = (action) => {
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return User
    if (action.includes('CREATE') || action.includes('UPDATE')) return FileText
    if (action.includes('DELETE')) return XCircle
    if (action.includes('CONFIG')) return Settings
    return Activity
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS': return 'text-green-600'
      case 'FAILED': return 'text-red-600'
      case 'WARNING': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SUCCESS': return CheckCircle
      case 'FAILED': return XCircle
      case 'WARNING': return AlertCircle
      default: return Clock
    }
  }

  const uniqueActions = [...new Set(logs.map(log => log.action))]
  const statusOptions = ['SUCCESS', 'FAILED', 'WARNING']

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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari aktivitas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">Semua Aksi</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>
                  {action.replace(/_/g, ' ')}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">Semua Status</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="flex gap-2">
            <input
              type="date"
              placeholder="Dari tanggal"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
            <input
              type="date"
              placeholder="Sampai tanggal"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>
        </div>

        <button
          onClick={exportLogs}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Logs
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Aktivitas</p>
              <p className="text-xl font-semibold text-gray-900">{logs.length}</p>
            </div>
          </div>
        </div>
        
        {statusOptions.map(status => {
          const count = logs.filter(log => log.status === status).length
          const StatusIcon = getStatusIcon(status)
          return (
            <div key={status} className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  status === 'SUCCESS' ? 'bg-green-100' :
                  status === 'FAILED' ? 'bg-red-100' : 'bg-yellow-100'
                }`}>
                  <StatusIcon className={`w-6 h-6 ${
                    status === 'SUCCESS' ? 'text-green-600' :
                    status === 'FAILED' ? 'text-red-600' : 'text-yellow-600'
                  }`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{status}</p>
                  <p className="text-xl font-semibold text-gray-900">{count}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktivitas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pengguna
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Waktu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detail
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    {searchTerm || filterAction !== 'all' || filterStatus !== 'all' || dateRange.start || dateRange.end
                      ? 'Tidak ada log yang sesuai filter' 
                      : 'Belum ada log aktivitas'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const ActionIcon = getActionIcon(log.action)
                  const StatusIcon = getStatusIcon(log.status)
                  
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <ActionIcon className="w-5 h-5 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {log.action.replace(/_/g, ' ')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {log.entity}: {log.entityId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {log.user?.name || 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {log.user?.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`w-4 h-4 ${getStatusColor(log.status)}`} />
                          <span className={`text-sm font-medium ${getStatusColor(log.status)}`}>
                            {log.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-mono">
                          {log.ipAddress}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <div>
                            <div>{new Date(log.createdAt).toLocaleDateString('id-ID')}</div>
                            <div className="text-xs">{new Date(log.createdAt).toLocaleTimeString('id-ID')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewDetail(log)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                          title="Lihat detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      {isDetailModalOpen && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Detail Log - {selectedLog.action.replace(/_/g, ' ')}
              </h3>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Informasi Aktivitas</h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Action:</span>
                    <div className="text-sm">{selectedLog.action}</div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Entity:</span>
                    <div className="text-sm">{selectedLog.entity}</div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Entity ID:</span>
                    <div className="text-sm font-mono">{selectedLog.entityId}</div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Status:</span>
                    <div className={`text-sm font-medium ${getStatusColor(selectedLog.status)}`}>
                      {selectedLog.status}
                    </div>
                  </div>
                </div>
              </div>

              {/* User & Session Info */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Informasi Pengguna</h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">User:</span>
                    <div className="text-sm">{selectedLog.user?.name || 'Unknown'}</div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Email:</span>
                    <div className="text-sm">{selectedLog.user?.email}</div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">IP Address:</span>
                    <div className="text-sm font-mono">{selectedLog.ipAddress}</div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Timestamp:</span>
                    <div className="text-sm">{new Date(selectedLog.createdAt).toLocaleString('id-ID')}</div>
                  </div>
                </div>
              </div>

              {/* User Agent */}
              <div className="md:col-span-2 space-y-4">
                <h4 className="font-semibold text-gray-900">User Agent</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs font-mono text-gray-700 break-all">
                    {selectedLog.userAgent}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="md:col-span-2 space-y-4">
                <h4 className="font-semibold text-gray-900">Detail Aktivitas</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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

export default AuditLogViewer
