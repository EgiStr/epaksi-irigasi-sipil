'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle, CheckCircle, Clock, PlayCircle, Flag } from 'lucide-react'
import { useSidebar } from '../contexts/SidebarContext'

const PRIORITY_LEVELS = [
  { value: 1, label: 'Sangat Mendesak', color: '#ef4444', description: 'Kerusakan parah, perlu perbaikan segera' },
  { value: 0.75, label: 'Mendesak', color: '#f97316', description: 'Kerusakan signifikan, prioritas tinggi' },
  { value: 0.5, label: 'Sedang', color: '#f59e0b', description: 'Perlu perbaikan dalam waktu dekat' },
  { value: 0.25, label: 'Rendah', color: '#3b82f6', description: 'Dapat dijadwalkan untuk perbaikan rutin' },
  { value: 0, label: 'Sangat Rendah', color: '#6b7280', description: 'Perbaikan dapat ditunda' }
]

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Menunggu', icon: Clock, color: '#6b7280' },
  { value: 'approved', label: 'Disetujui', icon: CheckCircle, color: '#3b82f6' },
  { value: 'in_progress', label: 'Dalam Pengerjaan', icon: PlayCircle, color: '#f59e0b' },
  { value: 'completed', label: 'Selesai', icon: CheckCircle, color: '#10b981' }
]

// Helper function to get priority color based on score
const getPriorityColor = (score) => {
  if (score >= 0.875) return '#ef4444' // Red - Sangat Mendesak
  if (score >= 0.625) return '#f97316' // Orange - Mendesak
  if (score >= 0.375) return '#f59e0b' // Amber - Sedang
  if (score >= 0.125) return '#3b82f6' // Blue - Rendah
  return '#6b7280' // Gray - Sangat Rendah
}

// Helper function to get priority label based on score
const getPriorityLabel = (score) => {
  if (score >= 0.875) return 'Sangat Mendesak'
  if (score >= 0.625) return 'Mendesak'
  if (score >= 0.375) return 'Sedang'
  if (score >= 0.125) return 'Rendah'
  return 'Sangat Rendah'
}

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
                {existingPAI.priorityScore !== null && existingPAI.priorityScore !== undefined && (
                  <div>
                    <span className="text-blue-700">Prioritas Saat Ini:</span>{' '}
                    <span className="font-semibold" style={{ color: getPriorityColor(existingPAI.priorityScore) }}>
                      {existingPAI.priorityScore.toFixed(2)} - {getPriorityLabel(existingPAI.priorityScore)}
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
              Skor Prioritas Perbaikan (0-1) <span className="text-red-500">*</span>
            </label>
            <p className="text-sm text-gray-600 mb-4">
              Masukkan nilai desimal antara 0 (sangat rendah) hingga 1 (sangat mendesak).
              Contoh: 0.25, 0.5, 0.75, 1
            </p>
            
            {/* Number Input */}
            <div className="relative">
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={priorityScore !== null ? priorityScore : ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value)
                  if (e.target.value === '') {
                    setPriorityScore(null)
                  } else if (!isNaN(value) && value >= 0 && value <= 1) {
                    setPriorityScore(value)
                  }
                }}
                className="w-full px-4 py-3 text-lg font-semibold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <span className="text-sm">Max: 1.00</span>
              </div>
            </div>

            {/* Quick Select Buttons */}
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">Pilihan Cepat:</p>
              <div className="grid grid-cols-5 gap-2">
                {PRIORITY_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setPriorityScore(level.value)}
                    className={`p-2 rounded-lg border-2 transition-all text-center ${
                      priorityScore === level.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    title={level.description}
                  >
                    <div
                      className="w-6 h-6 mx-auto rounded-full flex items-center justify-center text-white text-xs font-bold mb-1"
                      style={{ backgroundColor: level.color }}
                    >
                      {level.value}
                    </div>
                    <div className="text-xs text-gray-700 font-medium truncate">{level.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Indicator */}
            {priorityScore !== null && (
              <div className="mt-4 p-4 rounded-lg border-2" style={{ 
                backgroundColor: `${getPriorityColor(priorityScore)}15`,
                borderColor: getPriorityColor(priorityScore)
              }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Tingkat Prioritas:</span>
                  <span className="text-lg font-bold" style={{ color: getPriorityColor(priorityScore) }}>
                    {getPriorityLabel(priorityScore)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full transition-all duration-300 rounded-full"
                    style={{ 
                      width: `${priorityScore * 100}%`,
                      backgroundColor: getPriorityColor(priorityScore)
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.0</span>
                  <span className="font-semibold" style={{ color: getPriorityColor(priorityScore) }}>
                    {priorityScore.toFixed(2)}
                  </span>
                  <span>1.0</span>
                </div>
              </div>
            )}
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
          {priorityScore !== null && (
            <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: `${getPriorityColor(priorityScore)}15` }}>
              <h3 className="font-semibold text-gray-900 mb-2">Ringkasan Prioritas</h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">Skor:</span>
                  <span className="font-semibold text-lg" style={{ color: getPriorityColor(priorityScore) }}>
                    {priorityScore.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">Tingkat:</span>
                  <span className="font-semibold" style={{ color: getPriorityColor(priorityScore) }}>
                    {getPriorityLabel(priorityScore)}
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
