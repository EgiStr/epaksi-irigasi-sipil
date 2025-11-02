'use client'

import { useState, useEffect } from 'react'
import { Eye, Plus, Calendar, Image as ImageIcon } from 'lucide-react'

export default function PAIPopup({ 
  feature, 
  onViewDetail, 
  onCreatePAI,
  onClose 
}) {
  const [pai, setPai] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPAI = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/pai?featureId=${feature.featureId}&latest=true`)
        if (response.ok) {
          const data = await response.json()
          setPai(data.pai)
        }
      } catch (error) {
        console.error('Error fetching PAI:', error)
      } finally {
        setLoading(false)
      }
    }

    if (feature?.featureId) {
      fetchPAI()
    }
  }, [feature])

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow-lg min-w-[300px]">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          <div className="h-3 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg min-w-[300px] max-w-[400px]">
      {/* Header */}
      <div className="mb-3">
        <h3 className="font-semibold text-gray-900 text-lg">
          {feature?.name || feature?.featureId}
        </h3>
        <p className="text-sm text-gray-500">
          {feature?.type} • {feature?.scheme}
        </p>
      </div>

      {/* PAI Content */}
      {pai ? (
        <div className="space-y-3">
          {/* PAI Type Badge */}
          <div className="flex items-center justify-between">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaiTypeColor(pai.paiType)}`}>
              {formatPaiType(pai.paiType)}
            </span>
            <div className="flex items-center text-xs text-gray-500">
              <Calendar className="w-3 h-3 mr-1" />
              {formatDate(pai.createdAt)}
            </div>
          </div>

          {/* PAI Summary */}
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-gray-700">
                {pai.paiData?.aset?.nama}
              </p>
              <p className="text-xs text-gray-500">
                {pai.paiData?.aset?.jenis} • {pai.paiData?.aset?.nomenklatur}
              </p>
            </div>

            {/* Type-specific info */}
            {pai.paiType === 'saluran' ? (
              <div className="text-xs text-gray-600 space-y-1">
                {pai.paiData?.hidraulik?.q_desain_m3s && (
                  <div>Debit: {pai.paiData.hidraulik.q_desain_m3s} m³/s</div>
                )}
                {pai.lengthM && (
                  <div>Panjang: {Math.round(pai.lengthM)} m</div>
                )}
                {pai.paiData?.tahun_dibangun && (
                  <div>Tahun: {pai.paiData.tahun_dibangun}</div>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-600">
                {pai.paiData?.saluran?.nama && (
                  <div>Saluran: {pai.paiData.saluran.nama}</div>
                )}
              </div>
            )}

            {/* Photos indicator */}
            {pai.photos && pai.photos.length > 0 && (
              <div className="flex items-center text-xs text-gray-500">
                <ImageIcon className="w-3 h-3 mr-1" />
                {pai.photos.length} foto
              </div>
            )}

            {/* Notes preview */}
            {pai.paiData?.catatan && (
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <p className="line-clamp-2">{pai.paiData.catatan}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-2 pt-2 border-t">
            <button
              onClick={() => onViewDetail(pai)}
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center justify-center space-x-1"
            >
              <Eye className="w-3 h-3" />
              <span>Lihat Detail</span>
            </button>
          </div>
        </div>
      ) : (
        // No PAI found
        <div className="text-center py-4">
          <div className="text-gray-400 mb-3">
            <ImageIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Belum ada data PAI</p>
          </div>
          
          <button
            onClick={() => onCreatePAI(feature)}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center justify-center space-x-1 w-full"
          >
            <Plus className="w-3 h-3" />
            <span>Tambah PAI</span>
          </button>
        </div>
      )}

      {/* Feature Info (always show) */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div>Feature ID: {feature?.featureId}</div>
          {feature?.props?.asal_data && (
            <div>Sumber: {feature.props.asal_data}</div>
          )}
        </div>
      </div>
    </div>
  )
}