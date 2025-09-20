'use client'

import { X, MapPin, Calendar, User, Image as ImageIcon } from 'lucide-react'
import PhotoManager from '../../forms/PhotoManager'

export default function PAIDetailModal({ 
  isOpen, 
  onClose, 
  pai
}) {
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
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-green-100 text-green-800'
  }

  const InfoRow = ({ label, value, unit = '' }) => (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-b-0">
      <span className="font-medium text-gray-600">{label}</span>
      <span className="text-gray-900">
        {value !== null && value !== undefined && value !== '' ? `${value}${unit}` : '-'}
      </span>
    </div>
  )

  const SectionCard = ({ title, icon, children, bgColor = 'bg-gray-50' }) => (
    <div className={`rounded-lg p-4 ${bgColor}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center space-x-2">
        <span>{icon}</span>
        <span>{title}</span>
      </h3>
      {children}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPaiTypeColor(pai.paiType)}`}>
              {formatPaiType(pai.paiType)}
            </span>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {pai.paiData?.aset?.nama || 'Detail PAI'}
              </h2>
              <p className="text-sm text-gray-500">
                Feature: {pai.feature?.name || pai.featureId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Informasi Daerah Irigasi */}
          <SectionCard title="Informasi Daerah Irigasi" icon="📍">
            <div className="space-y-1">
              <InfoRow label="Nama DI" value={pai.paiData?.di?.name} />
              <InfoRow label="Luas Area" value={pai.paiData?.di?.area_ha} unit=" Ha" />
              <InfoRow label="Kode DI" value={pai.paiData?.di?.kode} />
            </div>
          </SectionCard>

          {/* Informasi Aset */}
          <SectionCard title="Informasi Aset" icon="🏗️">
            <div className="space-y-1">
              <InfoRow label="Jenis Aset" value={pai.paiData?.aset?.jenis} />
              <InfoRow label="Nama Aset" value={pai.paiData?.aset?.nama} />
              <InfoRow label="Nomenklatur" value={pai.paiData?.aset?.nomenklatur} />
              <InfoRow label="Tahun Dibangun" value={pai.paiData?.tahun_dibangun} />
            </div>
          </SectionCard>

          {/* Data Spesifik berdasarkan Tipe */}
          {pai.paiType === 'saluran' && (
            <>
              {/* Informasi Saluran */}
              <SectionCard title="Informasi Saluran" icon="🚰" bgColor="bg-blue-50">
                <div className="space-y-1">
                  <InfoRow label="Subsistem" value={pai.paiData?.subsystem} />
                </div>
              </SectionCard>

              {/* Data Hidraulik */}
              <SectionCard title="Data Hidraulik" icon="💧" bgColor="bg-blue-50">
                <div className="space-y-1">
                  <InfoRow label="Debit Desain" value={pai.paiData?.hidraulik?.q_desain_m3s} unit=" m³/detik" />
                  <InfoRow label="Panjang" value={pai.lengthM ? Math.round(pai.lengthM * 100) / 100 : pai.paiData?.hidraulik?.panjang_m} unit=" m" />
                </div>
              </SectionCard>

              {/* Data Pintu */}
              {(pai.paiData?.pintu?.jumlah || pai.paiData?.pintu?.lebar_m || pai.paiData?.pintu?.tinggi_m) && (
                <SectionCard title="Data Pintu" icon="🚪" bgColor="bg-blue-50">
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
                <SectionCard title="Dimensi Saluran" icon="📏" bgColor="bg-blue-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pai.paiData?.dimensi_desain && (
                      <div>
                        <h4 className="font-medium text-gray-800 mb-2">Dimensi Desain</h4>
                        <div className="space-y-1 text-sm">
                          <InfoRow label="Li" value={pai.paiData.dimensi_desain.Li_m} unit=" m" />
                          <InfoRow label="b" value={pai.paiData.dimensi_desain.b_m} unit=" m" />
                          <InfoRow label="La" value={pai.paiData.dimensi_desain.La_m} unit=" m" />
                          <InfoRow label="H" value={pai.paiData.dimensi_desain.H_m} unit=" m" />
                          <InfoRow label="Kemiringan" value={pai.paiData.dimensi_desain.kemiringan} />
                        </div>
                      </div>
                    )}
                    
                    {pai.paiData?.dimensi_nyata && (
                      <div>
                        <h4 className="font-medium text-gray-800 mb-2">Dimensi Nyata</h4>
                        <div className="space-y-1 text-sm">
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

          {/* Catatan */}
          {pai.paiData?.catatan && (
            <SectionCard title="Catatan" icon="📝">
              <p className="text-gray-700 whitespace-pre-wrap">{pai.paiData.catatan}</p>
            </SectionCard>
          )}

          {/* Foto Dokumentasi */}
          <SectionCard title="Foto Dokumentasi" icon="📸">
            <PhotoManager
              paiId={pai.id}
              maxPhotos={10}
              readOnly={true}
            />
          </SectionCard>

          {/* Metadata */}
          <SectionCard title="Informasi Metadata" icon="ℹ️">
            <div className="space-y-1">
              <InfoRow label="Dibuat Tanggal" value={formatDate(pai.createdAt)} />
              <InfoRow label="Terakhir Diperbarui" value={formatDate(pai.updatedAt)} />
              <InfoRow label="Dibuat oleh" value={pai.user?.name} />
              <InfoRow label="Email" value={pai.user?.email} />
            </div>
          </SectionCard>
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