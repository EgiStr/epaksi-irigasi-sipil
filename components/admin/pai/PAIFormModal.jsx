'use client'

import { useState, useEffect } from 'react'
import { X, Save, MapPin, Image, FileText } from 'lucide-react'
import PAIFormFields from '../../forms/PAIFormFields'
import PhotoManager from '../../forms/PhotoManager'
import { useSidebar } from '../../../contexts/SidebarContext'

export default function PAIFormModal({ 
  isOpen, 
  onClose, 
  feature, 
  onSave,
  initialData = null, // For editing existing PAI
  loading = false // Loading state for existing PAI
}) {
  const { setModalState } = useSidebar()
  const [paiType, setPaiType] = useState('saluran')
  const [formData, setFormData] = useState({})
  const [currentPaiId, setCurrentPaiId] = useState(null) // For PhotoManager
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [activeTab, setActiveTab] = useState('data') // 'data' | 'photos' | 'map'
  const [isClosing, setIsClosing] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false) // Track if editing existing PAI

  useEffect(() => {
    if (isOpen) {
      setModalState(true)
      document.body.classList.add('modal-open')
      if (initialData) {
        // Editing existing PAI
        setIsEditMode(true)
        console.log('Loading existing PAI data:', initialData)
        
        // Set paiType from initialData or from subsystem field
        const detectedPaiType = initialData.paiType || (initialData.paiData?.subsystem ? 'saluran' : 'bangunan')
        setPaiType(detectedPaiType)
        
        // Extract the actual PAI data
        const actualPaiData = initialData.paiData || initialData
        
        // Ensure we have a complete data structure
        const existingData = {
          // Base structure
          di: {
            name: '',
            area_ha: null,
            kode: ''
          },
          aset: {
            jenis: '',
            nama: '',
            nomenklatur: ''
          },
          // Complete structure to ensure all fields are available
          subsystem: '',
          teknis: {
            panjang_m: null,
            lebar_atas_m: null,
            lebar_bawah_m: null,
            tinggi_m: null,
            kemiringan: null,
            material: ''
          },
          operasional: {
            status: 'aktif',
            tahun_pembangunan: null,
            catatan: ''
          },
          koordinat: {
            latitude: null,
            longitude: null
          },
          catatan: '',
          bangunan: {
            hulu: '',
            hilir: ''
          },
          hidraulik: {
            luas_areal_ha: null,
            q_desain_m3s: null,
            panjang_m: null
          },
          pintu: {
            jumlah: null,
            lebar_m: null,
            tinggi_m: null,
            tenaga: '',
            bahan: ''
          },
          tahun_dibangun: null,
          dimensi_desain: {
            li_m: null,
            b_m: null,
            la_m: null,
            h_m: null,
            kemiringan: null
          },
          dimensi_nyata: {
            li_m: null,
            b_m: null,
            la_m: null,
            h_m: null
          },
          // Merge with existing data (actualPaiData contains the actual PAI data)
          ...actualPaiData,
        }
        
        console.log('Processed existing data:', existingData)
        setFormData(existingData)
        setCurrentPaiId(initialData.id) // Set PAI ID for PhotoManager
      } else {
        // Creating new PAI
        setIsEditMode(false)
        setCurrentPaiId(null)
        console.log('Creating new PAI for feature:', feature)
        resetForm()
      }
    } else {
      setModalState(false)
      document.body.classList.remove('modal-open')
    }

    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [isOpen, initialData, setModalState, feature])

  const resetForm = () => {
    setPaiType('saluran')
    
    // Complete data structure for new PAI
    const initialFormData = {
      di: {
        name: feature?.name || '',
        area_ha: null,
        kode: ''
      },
      aset: {
        jenis: '',
        nama: '',
        nomenklatur: ''
      },
      // Fields for saluran
      subsystem: '',
      teknis: {
        panjang_m: null,
        lebar_atas_m: null,
        lebar_bawah_m: null,
        tinggi_m: null,
        kemiringan: null,
        material: ''
      },
      // Fields for bangunan  
      operasional: {
        status: 'aktif',
        tahun_pembangunan: null,
        catatan: ''
      },
      // Koordinat
      koordinat: {
        latitude: null,
        longitude: null
      },
      // Shared fields
      catatan: '',
      bangunan: {
        hulu: '',
        hilir: ''
      },
      hidraulik: {
        luas_areal_ha: null,
        q_desain_m3s: null,
        panjang_m: null
      },
      pintu: {
        jumlah: null,
        lebar_m: null,
        tinggi_m: null,
        tenaga: '',
        bahan: ''
      },
      tahun_dibangun: null,
      dimensi_desain: {
        li_m: null,
        b_m: null,
        la_m: null,
        h_m: null,
        kemiringan: null
      },
      dimensi_nyata: {
        li_m: null,
        b_m: null,
        la_m: null,
        h_m: null
      },
      // Field for bangunan type
      saluran: {
        nama: ''
      }
    }
    
    console.log('Reset form with initial data:', initialFormData)
    setFormData(initialFormData)
    setCurrentPaiId(null)
    setErrors({})
    setActiveTab('data')
  }

  const handleClose = () => {
    if (isClosing) return
    
    setIsClosing(true)
    
    // Wait for animation to complete before actually closing
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 300)
  }

  const validateForm = () => {
    const newErrors = {}

    // Validate DI
    if (!formData.di?.name) {
      newErrors.di = { name: 'Nama daerah irigasi diperlukan' }
    }

    // Validate Aset
    if (!formData.aset?.jenis) {
      newErrors.aset = { jenis: 'Jenis aset diperlukan' }
    }
    if (!formData.aset?.nama) {
      if (!newErrors.aset) newErrors.aset = {}
      newErrors.aset.nama = 'Nama aset diperlukan'
    }

    // Validate based on PAI type
    if (paiType === 'saluran') {
      // Additional validation for saluran if needed
    } else if (paiType === 'bangunan') {
      // Additional validation for bangunan if needed
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      setActiveTab('data') // Switch to data tab to show errors
      return
    }

    setIsSubmitting(true)
    
    try {
      // Debug: Log form data before sending
      console.log('Form data before submit:', formData)
      console.log('PAI Type:', paiType)
      
      const paiData = {
        featureId: feature.featureId,
        paiType,
        paiData: formData
        // Photos are now managed separately via PhotoManager and stored in database
      }
      
      console.log('Final PAI data to be sent:', paiData)

      let savedPai;
      if (initialData) {
        // Update existing PAI
        console.log('Updating existing PAI with ID:', initialData.id)
        savedPai = await onSave({ ...paiData, id: initialData.id })
      } else {
        // Create new PAI
        console.log('Creating new PAI')
        savedPai = await onSave(paiData)
        
        // Set the PAI ID for PhotoManager after creation
        if (savedPai && savedPai.id) {
          setCurrentPaiId(savedPai.id)
        }
      }

      handleClose()
    } catch (error) {
      console.error('Error saving PAI:', error)
      alert('Gagal menyimpan PAI: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className={`pai-modal-overlay fixed inset-0 ${isClosing ? 'closing' : ''}`}
      style={{ zIndex: 1001 }}
      onClick={() => !isClosing && handleClose()}
    >
      {/* Modal positioned at center */}
      <div 
        className={`pai-modal-content fixed bg-white rounded-3xl shadow-2xl max-h-[80vh] flex flex-col ${isClosing ? 'closing' : ''}`}
        style={{ 
          zIndex: 1002,
          maxWidth: '1200px', 
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-3xl">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                {initialData ? 'Edit PAI' : 'Tambah PAI Baru'}
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                )}
              </h2>
              <p className="text-sm text-gray-600">
                Feature: {feature?.name || feature?.featureId}
                {initialData && (
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    PAI Existing
                  </span>
                )}
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
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* PAI Type Selector */}
          <div className="px-6 py-4 border-b bg-gray-50">
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setPaiType('saluran')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  paiType === 'saluran'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                🚰 Saluran
              </button>
              <button
                type="button"
                onClick={() => setPaiType('bangunan')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  paiType === 'bangunan'
                    ? 'bg-green-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                🏢 Bangunan
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="px-6 border-b">
            <div className="flex space-x-6">
              <button
                type="button"
                onClick={() => setActiveTab('data')}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'data'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📋 Data PAI
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
                📸 Foto
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Memuat data PAI existing...</p>
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'data' && (
                  <PAIFormFields
                    paiType={paiType}
                    formData={formData}
                    onChange={setFormData}
                    errors={errors}
                  />
                )}

                {activeTab === 'photos' && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        📸 Foto Dokumentasi PAI
                      </h3>
                      <p className="text-sm text-gray-600">
                        Unggah foto untuk mendokumentasikan kondisi {paiType} ini.
                        Foto akan membantu dalam verifikasi dan monitoring aset.
                      </p>
                    </div>
                    
                    {currentPaiId ? (
                      <PhotoManager
                        paiId={currentPaiId}
                        maxPhotos={10}
                        readOnly={false}
                      />
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">
                          📝 Simpan data PAI terlebih dahulu untuk mengupload foto
                        </p>
                        <p className="text-xs text-yellow-600 mt-1">
                          Foto akan tersedia setelah PAI berhasil disimpan ke database
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <div className="text-sm text-gray-500">
              {Object.keys(errors).length > 0 && (
                <span className="text-red-600">
                  ⚠️ Ada {Object.keys(errors).length} kesalahan yang perlu diperbaiki
                </span>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting || loading}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>
                  {loading 
                    ? 'Memuat...'
                    : isSubmitting 
                      ? 'Menyimpan...' 
                      : initialData 
                        ? 'Perbarui PAI' 
                        : 'Simpan PAI'
                  }
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}