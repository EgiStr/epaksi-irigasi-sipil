'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle, CheckCircle, Clock, PlayCircle } from 'lucide-react'

const PRIORITY_LEVELS = [
  { value: 5, label: 'Sangat Mendesak', color: '#ef4444', description: 'Kerusakan parah, perlu perbaikan segera' },
  { value: 4, label: 'Mendesak', color: '#f97316', description: 'Kerusakan signifikan, prioritas tinggi' },
  { value: 3, label: 'Sedang', color: '#f59e0b', description: 'Perlu perbaikan dalam waktu dekat' },
  { value: 2, label: 'Rendah', color: '#3b82f6', description: 'Dapat dijadwalkan untuk perbaikan rutin' },
  { value: 1, label: 'Sangat Rendah', color: '#6b7280', description: 'Perbaikan dapat ditunda' }
]

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Menunggu', icon: Clock, color: '#6b7280' },
  { value: 'approved', label: 'Disetujui', icon: CheckCircle, color: '#3b82f6' },
  { value: 'in_progress', label: 'Dalam Pengerjaan', icon: PlayCircle, color: '#f59e0b' },
  { value: 'completed', label: 'Selesai', icon: CheckCircle, color: '#10b981' }
]

export default function PriorityScoreModal({ isOpen, onClose, featureData, paiData, onSubmit }) {
  const [priorityScore, setPriorityScore] = useState(paiData?.priorityScore || null)
  const [priorityNotes, setPriorityNotes] = useState(paiData?.priorityNotes || '')
  const [priorityStatus, setPriorityStatus] = useState(paiData?.priorityStatus || 'pending')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen && paiData) {
      setPriorityScore(paiData.priorityScore || null)
      setPriorityNotes(paiData.priorityNotes || '')
      setPriorityStatus(paiData.priorityStatus || 'pending')
    }
  }, [isOpen, paiData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!priorityScore) {
      setError('Silakan pilih skor prioritas')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/pai/${paiData.id}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priorityScore,
          priorityNotes,
          priorityStatus
        })
      })

      if (!response.ok) {
        throw new Error('Gagal menyimpan prioritas')
      }

      const result = await response.json()
      onSubmit?.(result)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const selectedPriority = PRIORITY_LEVELS.find(p => p.value === priorityScore)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Skor Prioritas Perbaikan</h2>
            <p className="text-sm text-gray-600 mt-1">
              {featureData?.name || featureData?.featureId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Informasi PAI */}
          {paiData && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Informasi PAI</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-blue-700">Tipe:</span>{' '}
                  <span className="font-medium">{paiData.paiType === 'saluran' ? 'Saluran' : 'Bangunan'}</span>
                </div>
                <div>
                  <span className="text-blue-700">Terakhir Update:</span>{' '}
                  <span className="font-medium">{new Date(paiData.updatedAt).toLocaleDateString('id-ID')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Priority Score Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Pilih Tingkat Prioritas <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {PRIORITY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setPriorityScore(level.value)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    priorityScore === level.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: level.color }}
                      >
                        {level.value}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{level.label}</div>
                        <div className="text-sm text-gray-600">{level.description}</div>
                      </div>
                    </div>
                    {priorityScore === level.value && (
                      <CheckCircle className="w-6 h-6 text-blue-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Status Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Status Perbaikan
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((status) => {
                const Icon = status.icon
                return (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => setPriorityStatus(status.value)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      priorityStatus === status.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5" style={{ color: status.color }} />
                      <span className="font-medium text-gray-900">{status.label}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Priority Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catatan Prioritas (Opsional)
            </label>
            <textarea
              value={priorityNotes}
              onChange={(e) => setPriorityNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Jelaskan alasan prioritas, kondisi kerusakan, atau catatan penting lainnya..."
            />
          </div>

          {/* Summary */}
          {selectedPriority && (
            <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: `${selectedPriority.color}15` }}>
              <h3 className="font-semibold text-gray-900 mb-2">Ringkasan Prioritas</h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">Tingkat:</span>
                  <span className="font-semibold" style={{ color: selectedPriority.color }}>
                    {selectedPriority.label} (Skor: {selectedPriority.value})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">Status:</span>
                  <span className="font-semibold">
                    {STATUS_OPTIONS.find(s => s.value === priorityStatus)?.label}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !priorityScore}
            >
              {loading ? 'Menyimpan...' : paiData?.priorityScore ? 'Update Prioritas' : 'Simpan Prioritas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
