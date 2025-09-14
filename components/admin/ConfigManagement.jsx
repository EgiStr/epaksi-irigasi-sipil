'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Upload, 
  Settings, 
  CheckCircle, 
  XCircle,
  Search,
  Filter
} from 'lucide-react'

const ConfigManagement = () => {
  const { data: session } = useSession()
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterScheme, setFilterScheme] = useState('all')

  // Form states
  const [formData, setFormData] = useState({
    scheme: '',
    json: '',
    active: false
  })

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/survey-configs')
      if (response.ok) {
        const data = await response.json()
        // Ensure data is always an array
        setConfigs(Array.isArray(data) ? data : [])
      } else {
        throw new Error('Failed to fetch configs')
      }
    } catch (err) {
      setError(err.message)
      setConfigs([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      let jsonData
      try {
        jsonData = JSON.parse(formData.json)
      } catch {
        alert('Format JSON tidak valid')
        return
      }

      const method = editingConfig ? 'PUT' : 'POST'
      const url = editingConfig ? `/api/survey-configs/${editingConfig.id}` : '/api/survey-configs'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheme: formData.scheme,
          json: jsonData,
          active: formData.active
        })
      })

      if (response.ok) {
        await fetchConfigs()
        setIsModalOpen(false)
        resetForm()
        alert(editingConfig ? 'Config berhasil diupdate' : 'Config berhasil dibuat')
      } else {
        throw new Error('Failed to save config')
      }
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const handleEdit = (config) => {
    setEditingConfig(config)
    setFormData({
      scheme: config.scheme,
      json: JSON.stringify(config.json, null, 2),
      active: config.active
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus config ini?')) return

    try {
      const response = await fetch(`/api/survey-configs/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchConfigs()
        alert('Config berhasil dihapus')
      } else {
        throw new Error('Failed to delete config')
      }
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const handleActivate = async (id) => {
    try {
      const response = await fetch('/api/survey-configs/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configId: id })
      })

      if (response.ok) {
        await fetchConfigs()
        alert('Config berhasil diaktifkan')
      } else {
        throw new Error('Failed to activate config')
      }
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const resetForm = () => {
    setFormData({ scheme: '', json: '', active: false })
    setEditingConfig(null)
  }

  // Ensure configs is always an array before filtering
  const safeConfigs = Array.isArray(configs) ? configs : []
  
  const filteredConfigs = safeConfigs.filter(config => {
    const matchesSearch = config.scheme.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterScheme === 'all' || config.scheme === filterScheme
    return matchesSearch && matchesFilter
  })

  const uniqueSchemes = [...new Set(safeConfigs.map(c => c.scheme))]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-medium">Error</h3>
        <p className="text-red-600 mt-1">{error}</p>
        <button
          onClick={fetchConfigs}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari config..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={filterScheme}
              onChange={(e) => setFilterScheme(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">Semua Scheme</option>
              {uniqueSchemes.map(scheme => (
                <option key={scheme} value={scheme}>{scheme}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            resetForm()
            setIsModalOpen(true)
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Config
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Configs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scheme
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredConfigs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    {searchTerm || filterScheme !== 'all' ? 'Tidak ada config yang sesuai filter' : 'Belum ada config'}
                  </td>
                </tr>
              ) : (
                filteredConfigs.map((config) => (
                  <tr key={config.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{config.scheme}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        config.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {config.active ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(config.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(config.updatedAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {!config.active && (
                          <button
                            onClick={() => handleActivate(config.id)}
                            className="text-green-600 hover:text-green-900 p-1 rounded transition-colors"
                            title="Aktifkan config"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(config)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                          title="Edit config"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(config.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                          title="Hapus config"
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

      {/* Modal for Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingConfig ? 'Edit Config' : 'Tambah Config Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheme
                </label>
                <select
                  value={formData.scheme}
                  onChange={(e) => setFormData({...formData, scheme: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Pilih Scheme</option>
                  <option value="utama">Utama</option>
                  <option value="tersier">Tersier</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  JSON Configuration
                </label>
                <textarea
                  value={formData.json}
                  onChange={(e) => setFormData({...formData, json: e.target.value})}
                  required
                  rows={12}
                  placeholder='{"questions": [{"id": "q1", "text": "Kondisi saluran", "type": "number", "weight": 1}]}'
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format JSON valid diperlukan
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({...formData, active: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="active" className="text-sm text-gray-700">
                  Aktifkan config ini
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingConfig ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ConfigManagement
