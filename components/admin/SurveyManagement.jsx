'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Search,
  Filter,
  Eye,
  BarChart3,
  Calendar,
  User,
  FileText
} from 'lucide-react'

const SurveyManagement = () => {
  const { data: session } = useSession()
  const [surveys, setSurveys] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterScheme, setFilterScheme] = useState('all')
  const [filterScoreClass, setFilterScoreClass] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [selectedSurvey, setSelectedSurvey] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  useEffect(() => {
    fetchSurveys()
  }, [currentPage, filterScheme, filterScoreClass, dateFilter])

  const fetchSurveys = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        ...(filterScheme !== 'all' && { scheme: filterScheme }),
        ...(filterScoreClass !== 'all' && { scoreClass: filterScoreClass }),
        ...(dateFilter && { startDate: dateFilter })
      })

      const response = await fetch(`/api/surveys?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSurveys(data.surveys || data)
      } else {
        throw new Error('Failed to fetch surveys')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus survey ini?')) return

    try {
      const response = await fetch(`/api/surveys/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchSurveys()
        alert('Survey berhasil dihapus')
      } else {
        throw new Error('Failed to delete survey')
      }
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const handleRecalculateScore = async (id) => {
    try {
      const response = await fetch('/api/surveys/calculate-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyId: id })
      })

      if (response.ok) {
        await fetchSurveys()
        alert('Score berhasil dihitung ulang')
      } else {
        throw new Error('Failed to recalculate score')
      }
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const handleViewDetail = (survey) => {
    setSelectedSurvey(survey)
    setIsDetailModalOpen(true)
  }

  const exportSurveys = () => {
    const params = new URLSearchParams({
      format: 'export',
      ...(filterScheme !== 'all' && { scheme: filterScheme }),
      ...(filterScoreClass !== 'all' && { scoreClass: filterScoreClass }),
      ...(dateFilter && { startDate: dateFilter })
    })
    
    window.open(`/api/surveys?${params}`, '_blank')
  }

  const filteredSurveys = surveys.filter(survey => {
    const matchesSearch = 
      survey.featureId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (survey.feature?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (survey.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  const uniqueSchemes = [...new Set(surveys.map(s => s.scheme).filter(Boolean))]
  const scoreClasses = ['A', 'B', 'C', 'D']

  const getScoreClassColor = (scoreClass) => {
    switch (scoreClass) {
      case 'A': return 'bg-green-100 text-green-800'
      case 'B': return 'bg-blue-100 text-blue-800'
      case 'C': return 'bg-yellow-100 text-yellow-800'
      case 'D': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

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
              placeholder="Cari survey..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={filterScheme}
              onChange={(e) => setFilterScheme(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">Semua Scheme</option>
              {uniqueSchemes.map(scheme => (
                <option key={scheme} value={scheme}>{scheme}</option>
              ))}
            </select>

            <select
              value={filterScoreClass}
              onChange={(e) => setFilterScoreClass(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">Semua Score</option>
              {scoreClasses.map(score => (
                <option key={score} value={score}>Score {score}</option>
              ))}
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>
        </div>

        <button
          onClick={exportSurveys}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Data
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Surveys</p>
              <p className="text-xl font-semibold text-gray-900">{surveys.length}</p>
            </div>
          </div>
        </div>
        
        {scoreClasses.map(scoreClass => {
          const count = surveys.filter(s => s.scoreClass === scoreClass).length
          return (
            <div key={scoreClass} className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  scoreClass === 'A' ? 'bg-green-100' :
                  scoreClass === 'B' ? 'bg-blue-100' :
                  scoreClass === 'C' ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <BarChart3 className={`w-6 h-6 ${
                    scoreClass === 'A' ? 'text-green-600' :
                    scoreClass === 'B' ? 'text-blue-600' :
                    scoreClass === 'C' ? 'text-yellow-600' : 'text-red-600'
                  }`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Score {scoreClass}</p>
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

      {/* Surveys Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feature ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scheme
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSurveys.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    {searchTerm || filterScheme !== 'all' || filterScoreClass !== 'all' || dateFilter
                      ? 'Tidak ada survey yang sesuai filter' 
                      : 'Belum ada survey'}
                  </td>
                </tr>
              ) : (
                filteredSurveys.map((survey) => (
                  <tr key={survey.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 font-mono">
                        {survey.featureId}
                      </div>
                      {survey.feature?.name && (
                        <div className="text-xs text-gray-500">
                          {survey.feature.name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        survey.scheme === 'utama' ? 'bg-green-100 text-green-800' :
                        survey.scheme === 'tersier' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {survey.scheme}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {survey.scoreTotal ? survey.scoreTotal.toFixed(2) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreClassColor(survey.scoreClass)}`}>
                        {survey.scoreClass || 'Unrated'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div className="text-sm text-gray-900">
                          {survey.user?.name || survey.user?.email || 'Unknown'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(survey.createdAt).toLocaleDateString('id-ID')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetail(survey)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                          title="Lihat detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRecalculateScore(survey.id)}
                          className="text-green-600 hover:text-green-900 p-1 rounded transition-colors"
                          title="Hitung ulang score"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(survey.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                          title="Hapus survey"
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

      {/* Survey Detail Modal */}
      {isDetailModalOpen && selectedSurvey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Detail Survey - {selectedSurvey.featureId}
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
                <h4 className="font-semibold text-gray-900">Informasi Dasar</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Feature ID:</span>
                    <div className="font-mono text-sm">{selectedSurvey.featureId}</div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Scheme:</span>
                    <div className="text-sm">{selectedSurvey.scheme}</div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Score Total:</span>
                    <div className="text-sm">{selectedSurvey.scoreTotal?.toFixed(2) || '-'}</div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Score Class:</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreClassColor(selectedSurvey.scoreClass)}`}>
                      {selectedSurvey.scoreClass || 'Unrated'}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Created By:</span>
                    <div className="text-sm">{selectedSurvey.user?.name || selectedSurvey.user?.email}</div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Created At:</span>
                    <div className="text-sm">{new Date(selectedSurvey.createdAt).toLocaleString('id-ID')}</div>
                  </div>
                </div>
              </div>

              {/* Survey Values */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Data Survey</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto">
                    {JSON.stringify(selectedSurvey.values, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Score Detail */}
              {selectedSurvey.scoreDetail && (
                <div className="md:col-span-2 space-y-4">
                  <h4 className="font-semibold text-gray-900">Detail Scoring</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto">
                      {JSON.stringify(selectedSurvey.scoreDetail, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
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

export default SurveyManagement
