'use client'

import { useState } from 'react'
import { X, MapPin, Calendar, User, Image as ImageIcon, FileText, Info } from 'lucide-react'
import PhotoManager from '../../forms/PhotoManager'

export default function PAIDetailModal({ 
  isOpen, 
  onClose, 
  pai
}) {
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'details' | 'photos' | 'metadata'

  if (!isOpen || !pai) return null

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
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
      ? 'bg-blue-500 text-white' 
      : 'bg-green-500 text-white'
  }

  const getPriorityBadge = (score) => {
    if (!score) return null
    
    const priorities = {
      5: { label: 'Sangat Mendesak', color: 'bg-red-600', icon: '🔴' },
      4: { label: 'Mendesak', color: 'bg-orange-500', icon: '🟠' },
      3: { label: 'Sedang', color: 'bg-yellow-500', icon: '🟡' },
      2: { label: 'Rendah', color: 'bg-blue-500', icon: '🔵' },
      1: { label: 'Sangat Rendah', color: 'bg-gray-400', icon: '⚪' }
    }
    
    const priority = priorities[score]
    if (!priority) return null
    
    return (
      <div className={`${priority.color} text-white px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1`}>
        <span>{priority.icon}</span>
        <span>{priority.label}</span>
      </div>
    )
  }

  const getPriorityStatusBadge = (status) => {
    if (!status) return null
    
    const statuses = {
      'pending': { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-800' },
      'approved': { label: 'Disetujui', color: 'bg-blue-100 text-blue-800' },
      'in_progress': { label: 'Dalam Proses', color: 'bg-purple-100 text-purple-800' },
      'completed': { label: 'Selesai', color: 'bg-green-100 text-green-800' }
    }
    
    const statusInfo = statuses[status]
    if (!statusInfo) return null
    
    return (
      <span className={`${statusInfo.color} px-3 py-1 rounded-full text-xs font-semibold`}>
        {statusInfo.label}
      </span>
    )
  }

  const InfoRow = ({ label, value, unit = '' }) => (
    <div className="flex justify-between py-2.5 border-b border-gray-100 last:border-b-0">
      <span className="font-medium text-gray-600 text-sm">{label}</span>
      <span className="text-gray-900 text-sm font-medium">
        {value !== null && value !== undefined && value !== '' ? `${value}${unit}` : '-'}
      </span>
    </div>
  )

  const SectionCard = ({ title, icon, children, bgColor = 'bg-white' }) => (
    <div className={`rounded-xl p-5 ${bgColor} border border-gray-200 shadow-sm`}>
      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center space-x-2">
        <span className="text-lg">{icon}</span>
        <span>{title}</span>
      </h3>
      {children}
    </div>
  )

  return (
    <div 
      className="fixed inset-0 bg-white/10 backdrop-blur-md flex items-center justify-center p-4"
      style={{ zIndex: 1001 }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl max-h-[85vh] flex flex-col"
        style={{ 
          zIndex: 1002,
          maxWidth: '1200px', 
          width: 'calc(100% - 2rem)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle indicator */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-3xl">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <span className={`inline-flex px-3 py-1.5 text-sm font-bold rounded-full ${getPaiTypeColor(pai.paiType)}`}>
                {formatPaiType(pai.paiType)}
              </span>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {pai.paiData?.aset?.nama || 'Detail PAI'}
                </h2>
                <p className="text-sm text-gray-600 mb-2">
                  📍 Feature: {pai.feature?.name || pai.featureId}
                </p>
                {/* Priority Badges */}
                {(pai.priorityScore || pai.priorityStatus) && (
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {getPriorityBadge(pai.priorityScore)}
                    {getPriorityStatusBadge(pai.priorityStatus)}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-80 rounded-full transition-all duration-200 bg-white bg-opacity-50"
              title="Tutup modal"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b">
          <div className="flex space-x-6">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📊 Ringkasan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📋 Detail Lengkap
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('photos')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'photos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📸 Foto ({pai.photos?.length || pai.paiPhotos?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('metadata')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'metadata'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              ℹ️ Metadata
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                {/* Priority Information */}
                {(pai.priorityScore || pai.priorityNotes) && (
                  <SectionCard title="Prioritas Perbaikan" icon="⚠️" bgColor="bg-red-50">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Tingkat Prioritas</span>
                        <div className="flex items-center space-x-2">
                          {getPriorityBadge(pai.priorityScore)}
                          <span className="text-sm text-gray-500">({pai.priorityScore}/5)</span>
                        </div>
                      </div>
                      {pai.priorityStatus && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Status Prioritas</span>
                          {getPriorityStatusBadge(pai.priorityStatus)}
                        </div>
                      )}
                      {pai.priorityNotes && (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-red-200">
                          <p className="text-sm font-medium text-gray-700 mb-1">💬 Catatan Prioritas:</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{pai.priorityNotes}</p>
                        </div>
                      )}
                    </div>
                  </SectionCard>
                )}

                {/* Key Information Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <SectionCard title="Informasi Daerah Irigasi" icon="📍">
                    <div className="space-y-1">
                      <InfoRow label="Nama DI" value={pai.paiData?.di?.name} />
                      <InfoRow label="Luas Area" value={pai.paiData?.di?.area_ha} unit=" Ha" />
                      <InfoRow label="Kode DI" value={pai.paiData?.di?.kode} />
                    </div>
                  </SectionCard>

                  <SectionCard title="Informasi Aset" icon="🏗️">
                    <div className="space-y-1">
                      <InfoRow label="Jenis Aset" value={pai.paiData?.aset?.jenis} />
                      <InfoRow label="Nama Aset" value={pai.paiData?.aset?.nama} />
                      <InfoRow label="Nomenklatur" value={pai.paiData?.aset?.nomenklatur} />
                      <InfoRow label="Tahun Dibangun" value={pai.paiData?.tahun_dibangun} />
                    </div>
                  </SectionCard>
                </div>

                {/* Quick Stats based on Type */}
                {pai.paiType === 'saluran' && (
                  <SectionCard title="Data Teknis Saluran" icon="💧" bgColor="bg-blue-50">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                        <p className="text-xs text-gray-600 mb-1">Debit Desain</p>
                        <p className="text-lg font-bold text-blue-600">
                          {pai.paiData?.hidraulik?.q_desain_m3s || '-'}
                        </p>
                        <p className="text-xs text-gray-500">m³/detik</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                        <p className="text-xs text-gray-600 mb-1">Panjang</p>
                        <p className="text-lg font-bold text-blue-600">
                          {pai.lengthM ? Math.round(pai.lengthM) : pai.paiData?.hidraulik?.panjang_m || '-'}
                        </p>
                        <p className="text-xs text-gray-500">meter</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                        <p className="text-xs text-gray-600 mb-1">Subsistem</p>
                        <p className="text-sm font-bold text-blue-600 truncate">
                          {pai.paiData?.subsystem || '-'}
                        </p>
                      </div>
                    </div>
                  </SectionCard>
                )}

                {pai.paiType === 'bangunan' && (
                  <SectionCard title="Informasi Bangunan" icon="🏢" bgColor="bg-green-50">
                    <div className="space-y-1">
                      <InfoRow label="Saluran Terkait" value={pai.paiData?.saluran?.nama} />
                    </div>
                  </SectionCard>
                )}

                {/* Catatan */}
                {pai.paiData?.catatan && (
                  <SectionCard title="Catatan" icon="📝">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{pai.paiData.catatan}</p>
                    </div>
                  </SectionCard>
                )}
              </>
            )}

            {/* Details Tab */}
            {activeTab === 'details' && (
              <>
                {pai.paiType === 'saluran' && (
                  <>
                    {/* Informasi Saluran */}
                    <SectionCard title="Informasi Saluran" icon="🚰" bgColor="bg-blue-50">
                      <div className="space-y-1">
                        <InfoRow label="Subsistem" value={pai.paiData?.subsystem} />
                      </div>
                    </SectionCard>

                    {/* Data Hidraulik */}
                    <SectionCard title="Data Hidraulik" icon="💧">
                      <div className="space-y-1">
                        <InfoRow label="Debit Desain" value={pai.paiData?.hidraulik?.q_desain_m3s} unit=" m³/detik" />
                        <InfoRow label="Panjang" value={pai.lengthM ? Math.round(pai.lengthM * 100) / 100 : pai.paiData?.hidraulik?.panjang_m} unit=" m" />
                        <InfoRow label="Luas Areal" value={pai.paiData?.hidraulik?.luas_areal_ha} unit=" Ha" />
                      </div>
                    </SectionCard>

                    {/* Data Pintu */}
                    {(pai.paiData?.pintu?.jumlah || pai.paiData?.pintu?.lebar_m || pai.paiData?.pintu?.tinggi_m) && (
                      <SectionCard title="Data Pintu" icon="🚪">
                        <div className="space-y-1">
                          <InfoRow label="Jumlah Pintu" value={pai.paiData?.pintu?.jumlah} unit=" buah" />
                          <InfoRow label="Lebar" value={pai.paiData?.pintu?.lebar_m} unit=" m" />
                          <InfoRow label="Tinggi" value={pai.paiData?.pintu?.tinggi_m} unit=" m" />
                          <InfoRow label="Tenaga Penggerak" value={pai.paiData?.pintu?.tenaga} />
                          <InfoRow label="Bahan" value={pai.paiData?.pintu?.bahan} />
                        </div>
                      </SectionCard>
                    )}

                    {/* Dimensi */}
                    {(pai.paiData?.dimensi_desain || pai.paiData?.dimensi_nyata) && (
                      <SectionCard title="Dimensi Saluran" icon="📏">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {pai.paiData?.dimensi_desain && (
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <h4 className="font-semibold text-gray-800 mb-3 text-sm">📐 Dimensi Desain</h4>
                              <div className="space-y-1">
                                <InfoRow label="Li" value={pai.paiData.dimensi_desain.Li_m} unit=" m" />
                                <InfoRow label="b" value={pai.paiData.dimensi_desain.b_m} unit=" m" />
                                <InfoRow label="La" value={pai.paiData.dimensi_desain.La_m} unit=" m" />
                                <InfoRow label="H" value={pai.paiData.dimensi_desain.H_m} unit=" m" />
                                <InfoRow label="Kemiringan" value={pai.paiData.dimensi_desain.kemiringan} />
                              </div>
                            </div>
                          )}
                          
                          {pai.paiData?.dimensi_nyata && (
                            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                              <h4 className="font-semibold text-gray-800 mb-3 text-sm">📏 Dimensi Nyata</h4>
                              <div className="space-y-1">
                                <InfoRow label="Li" value={pai.paiData.dimensi_nyata.Li_m} unit=" m" />
                                <InfoRow label="b" value={pai.paiData.dimensi_nyata.b_m} unit=" m" />
                                <InfoRow label="La" value={pai.paiData.dimensi_nyata.La_m} unit=" m" />
                                <InfoRow label="H" value={pai.paiData.dimensi_nyata.H_m} unit=" m" />
                              </div>
                            </div>
                          )}
                        </div>
                      </SectionCard>
                    )}
                  </>
                )}

                {pai.paiType === 'bangunan' && (
                  <SectionCard title="Informasi Bangunan" icon="🏢" bgColor="bg-green-50">
                    <div className="space-y-1">
                      <InfoRow label="Saluran Terkait" value={pai.paiData?.saluran?.nama} />
                    </div>
                  </SectionCard>
                )}
              </>
            )}

            {/* Photos Tab */}
            {activeTab === 'photos' && (
              <SectionCard title="Foto Dokumentasi" icon="�">
                <PhotoManager
                  paiId={pai.id}
                  maxPhotos={10}
                  readOnly={true}
                />
              </SectionCard>
            )}

            {/* Metadata Tab */}
            {activeTab === 'metadata' && (
              <>
                <SectionCard title="Informasi Sistem" icon="ℹ️">
                  <div className="space-y-1">
                    <InfoRow label="ID PAI" value={pai.id} />
                    <InfoRow label="Feature ID" value={pai.featureId} />
                    <InfoRow label="Tipe PAI" value={pai.paiType} />
                  </div>
                </SectionCard>

                <SectionCard title="Riwayat" icon="📅">
                  <div className="space-y-1">
                    <InfoRow label="Dibuat Tanggal" value={formatDate(pai.createdAt)} />
                    <InfoRow label="Terakhir Diperbarui" value={formatDate(pai.updatedAt)} />
                    <InfoRow label="Dibuat oleh" value={pai.user?.name} />
                    <InfoRow label="Email" value={pai.user?.email} />
                    <InfoRow label="Role" value={pai.user?.role} />
                  </div>
                </SectionCard>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}