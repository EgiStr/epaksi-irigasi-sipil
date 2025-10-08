'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle, CheckCircle, Clock, PlayCircle, Flag } from 'lucide-react'
import { useSidebar } from '../contexts/SidebarContext'

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
  const { setModalState } = useSidebar()
  const [priorityScore, setPriorityScore] = useState(paiData?.priorityScore || null)
  const [priorityNotes, setPriorityNotes] = useState(paiData?.priorityNotes || '')
  const [priorityStatus, setPriorityStatus] = useState(paiData?.priorityStatus || 'pending')
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)
  const [error, setError] = useState(null)
  const [isClosing, setIsClosing] = useState(false)
  const [existingPAI, setExistingPAI] = useState(null)

  // Fetch existing PAI data when modal opens
  useEffect(() => {
    const fetchExistingPriority = async () => {
      if (!isOpen || !featureData?.featureId) return

      setFetchingData(true)
      setError(null)

      try {
        // Fetch PAI data for this feature
        const response = await fetch(`/api/pai?featureId=${featureData.featureId}&latest=true`)
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.pai) {
            setExistingPAI(data.pai)
            // Pre-fill form with existing data
            setPriorityScore(data.pai.priorityScore || null)
            setPriorityNotes(data.pai.priorityNotes || '')
            setPriorityStatus(data.pai.priorityStatus || 'pending')
          } else {
            // No existing PAI data
            setExistingPAI(null)
          }
        } else {
          console.warn('Failed to fetch PAI data:', response.status)
        }
      } catch (err) {
        console.error('Error fetching priority data:', err)
        // Don't show error to user, just log it
      } finally {
        setFetchingData(false)
      }
    }

    if (isOpen) {
      fetchExistingPriority()
    }
  }, [isOpen, featureData?.featureId])

  useEffect(() => {
    if (isOpen) {
      setModalState(true)
      document.body.classList.add('modal-open')
      
      // Also handle paiData prop if provided directly
      if (paiData) {
        setExistingPAI(paiData)
        setPriorityScore(paiData.priorityScore || null)
        setPriorityNotes(paiData.priorityNotes || '')
        setPriorityStatus(paiData.priorityStatus || 'pending')
      }
    } else {
      setModalState(false)
      document.body.classList.remove('modal-open')
      // Reset states when closed
      setExistingPAI(null)
      setPriorityScore(null)
      setPriorityNotes('')
      setPriorityStatus('pending')
      setError(null)
    }

    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [isOpen, paiData, setModalState])

  const handleClose = () => {
    if (isClosing) return
    
    setIsClosing(true)
    
    // Wait for animation to complete before actually closing
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 300)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!priorityScore) {
      setError('Silakan pilih skor prioritas')
      return
    }

    // Get PAI ID from existingPAI or paiData
    const currentPAI = existingPAI || paiData
    
    if (!currentPAI?.id) {
      setError('Data PAI tidak ditemukan. Pastikan sudah ada data PAI untuk feature ini.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/pai/${currentPAI.id}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priorityScore,
          priorityNotes,
          priorityStatus
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal menyimpan prioritas')
      }

      const result = await response.json()
      onSubmit?.(result)
      handleClose()
    } catch (err) {
      console.error('❌ Error saving priority:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const selectedPriority = PRIORITY_LEVELS.find(p => p.value === priorityScore)

  return (
    <div 
      className={`fixed inset-0 ${isClosing ? 'closing' : ''}`}
      style={{ zIndex: 1001 }}
      onClick={() => !isClosing && handleClose()}
    >
      {/* Modal positioned at center - Mengikuti pattern PAIFormModal */}
      <div 
        className={`fixed bg-white rounded-3xl shadow-2xl max-h-[85vh] flex flex-col ${isClosing ? 'closing' : ''}`}
        style={{ 
          zIndex: 1002,
          maxWidth: '900px', 
          width: 'calc(100% - 2rem)',
          left: '50%',
          top: '50%',
          transform: 'translateX(-50%) translateY(-50%)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle indicator */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50 rounded-t-3xl">
          <div className="flex items-center space-x-2">
            <Flag className="w-5 h-5 text-red-600" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  Skor Prioritas Perbaikan
                </h2>
                {existingPAI?.priorityScore && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full border border-blue-300">
                    Update
                  </span>
                )}
                {!existingPAI?.priorityScore && existingPAI && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full border border-green-300">
                    Baru
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {featureData?.name || featureData?.featureId}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white hover:bg-opacity-80 rounded-full transition-all duration-200 bg-white bg-opacity-50"
            title="Tutup modal"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4">
          {/* Loading State */}
          {fetchingData && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p className="text-sm text-blue-800">Memuat data prioritas...</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Informasi PAI */}
          {existingPAI && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Informasi PAI
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-blue-700">Tipe:</span>{' '}
                  <span className="font-medium">{existingPAI.paiType === 'saluran' ? '🚰 Saluran' : '🏢 Bangunan'}</span>
                </div>
                <div>
                  <span className="text-blue-700">Dibuat:</span>{' '}
                  <span className="font-medium">{new Date(existingPAI.createdAt).toLocaleDateString('id-ID')}</span>
                </div>
                <div>
                  <span className="text-blue-700">Terakhir Update:</span>{' '}
                  <span className="font-medium">{new Date(existingPAI.updatedAt).toLocaleDateString('id-ID')}</span>
                </div>
                {existingPAI.priorityScore && (
                  <div>
                    <span className="text-blue-700">Prioritas Saat Ini:</span>{' '}
                    <span className="font-semibold" style={{ color: PRIORITY_LEVELS.find(p => p.value === existingPAI.priorityScore)?.color }}>
                      {PRIORITY_LEVELS.find(p => p.value === existingPAI.priorityScore)?.label}
                    </span>
                  </div>
                )}
              </div>
              {existingPAI.priorityNotes && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <span className="text-blue-700 text-sm">Catatan Sebelumnya:</span>
                  <p className="text-sm text-gray-700 mt-1 italic">"{existingPAI.priorityNotes}"</p>
                </div>
              )}
            </div>
          )}

          {/* Warning if no PAI data */}
          {!existingPAI && !fetchingData && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-900">Belum ada data PAI</p>
                <p className="text-sm text-yellow-800 mt-1">
                  Silakan buat data PAI terlebih dahulu sebelum mengatur prioritas perbaikan.
                </p>
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
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50 rounded-b-3xl">
          <div className="text-sm">
            {!priorityScore ? (
              <span className="text-amber-600">
                ⚠️ Pilih tingkat prioritas untuk melanjutkan
              </span>
            ) : existingPAI?.priorityScore ? (
              <span className="text-blue-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Update prioritas yang sudah ada
              </span>
            ) : existingPAI ? (
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Tambah prioritas baru
              </span>
            ) : (
              <span className="text-gray-400">
                Memuat data...
              </span>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={loading || fetchingData}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={loading || fetchingData || !priorityScore || !existingPAI}
            >
              <Flag className="w-4 h-4" />
              <span>
                {loading ? 'Menyimpan...' : existingPAI?.priorityScore ? 'Update Prioritas' : 'Simpan Prioritas'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
