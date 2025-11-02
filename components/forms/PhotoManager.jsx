'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Camera, Upload, X, AlertCircle, Loader2, Edit3, Save, XCircle } from 'lucide-react'
import usePhotos from '@/hooks/usePhotos'

export default function PhotoManager({ 
  paiId, 
  maxPhotos = 5,
  readOnly = false 
}) {
  const { photos, loading, error, uploadPhoto, deletePhoto, updateCaption } = usePhotos(paiId)
  const [dragActive, setDragActive] = useState(false)
  const [editingCaption, setEditingCaption] = useState(null)
  const [tempCaption, setTempCaption] = useState('')
  const fileInputRef = useRef(null)

  const handleFiles = async (files) => {
    const fileArray = Array.from(files)
    
    // Check if adding these files would exceed the limit
    if (photos.length + fileArray.length > maxPhotos) {
      throw new Error(`Maksimal ${maxPhotos} foto diperbolehkan`)
    }

    // Upload files one by one
    for (const file of fileArray) {
      try {
        await uploadPhoto(file, '')
      } catch (error) {
        console.error('Error uploading file:', file.name, error)
        // Continue with other files even if one fails
      }
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  const startEditCaption = (photo) => {
    setEditingCaption(photo.id)
    setTempCaption(photo.caption || '')
  }

  const saveCaption = async (photoId) => {
    try {
      await updateCaption(photoId, tempCaption)
      setEditingCaption(null)
      setTempCaption('')
    } catch (error) {
      console.error('Error updating caption:', error)
    }
  }

  const cancelEditCaption = () => {
    setEditingCaption(null)
    setTempCaption('')
  }

  if (!paiId) {
    return (
      <div className="text-center text-gray-500 text-sm p-4">
        PAI belum tersimpan. Simpan PAI terlebih dahulu untuk mengupload foto.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Upload Area - Only show if not read-only */}
      {!readOnly && (
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
            ${loading ? 'pointer-events-none opacity-50' : 'hover:border-blue-400 hover:bg-gray-50'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            disabled={loading}
          />
          
          {loading ? (
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-600">Mengupload foto...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <div className="flex space-x-2">
                <Camera className="h-8 w-8 text-gray-400" />
                <Upload className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">
                Klik atau drag & drop foto di sini
              </p>
              <p className="text-xs text-gray-500">
                JPG, PNG, WebP (Maks. 5MB per foto)
              </p>
              <p className="text-xs text-gray-500">
                {photos.length}/{maxPhotos} foto
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Photo Gallery */}
      {photos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="relative border rounded-lg overflow-hidden">
              {/* Photo Display */}
              <div className="relative">
                <Image
                  src={photo.url}
                  alt={photo.caption || 'Foto PAI'}
                  width={400}
                  height={300}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    e.target.src = '/api/placeholder/400/300'
                    e.target.alt = 'Foto tidak dapat dimuat'
                  }}
                />
                
                {/* Remove Button - Only show if not read-only */}
                {!readOnly && (
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    disabled={loading}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Caption Section */}
              <div className="p-3">
                {editingCaption === photo.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={tempCaption}
                      onChange={(e) => setTempCaption(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Tambahkan keterangan foto..."
                      autoFocus
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => saveCaption(photo.id)}
                        className="flex items-center space-x-1 px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                      >
                        <Save className="h-3 w-3" />
                        <span>Simpan</span>
                      </button>
                      <button
                        onClick={cancelEditCaption}
                        className="flex items-center space-x-1 px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                      >
                        <XCircle className="h-3 w-3" />
                        <span>Batal</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-700 flex-1">
                      {photo.caption || 'Belum ada keterangan'}
                    </p>
                    {!readOnly && (
                      <button
                        onClick={() => startEditCaption(photo)}
                        className="ml-2 p-1 text-gray-400 hover:text-blue-500"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
                
                {/* Metadata */}
                {photo.metadata && (
                  <div className="mt-2 text-xs text-gray-500">
                    <p>Ukuran: {(photo.metadata.size / 1024).toFixed(1)} KB</p>
                    <p>Diupload: {new Date(photo.createdAt).toLocaleString('id-ID')}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      {photos.length === 0 && (
        <div className="text-center text-gray-500 text-sm">
          {readOnly ? 'Belum ada foto' : 'Belum ada foto yang diupload'}
        </div>
      )}
    </div>
  )
}