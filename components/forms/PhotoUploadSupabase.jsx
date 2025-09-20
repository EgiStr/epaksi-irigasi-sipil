'use client'

import { useState, useRef } from 'react'
import { Camera, Upload, X, AlertCircle, Loader2 } from 'lucide-react'
import { uploadFile, getPublicUrl, generateFilePath, validateImageFile, deleteFile } from '@/lib/supabase'

export default function PhotoUpload({ 
  photos = [], 
  onChange, 
  maxPhotos = 5,
  userId,
  featureId 
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handleFiles = async (files) => {
    if (!userId || !featureId) {
      setError('User ID dan Feature ID diperlukan untuk upload')
      return
    }

    const fileArray = Array.from(files)
    
    // Check if adding these files would exceed the limit
    if (photos.length + fileArray.length > maxPhotos) {
      setError(`Maksimal ${maxPhotos} foto diperbolehkan`)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const uploadPromises = fileArray.map(async (file) => {
        // Validate file
        validateImageFile(file)
        
        // Generate unique file path
        const filePath = generateFilePath(file.name, userId, featureId)
        
        // Upload to Supabase Storage
        const { data, error } = await uploadFile(file, 'photos', filePath)
        
        if (error) {
          throw new Error(`Upload gagal: ${error.message}`)
        }

        // Get public URL
        const publicUrl = getPublicUrl('photos', filePath)

        return {
          id: Date.now() + Math.random(), // temporary ID
          url: publicUrl,
          path: filePath,
          caption: '',
          metadata: {
            name: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString()
          }
        }
      })

      const uploadedPhotos = await Promise.all(uploadPromises)
      const newPhotos = [...photos, ...uploadedPhotos]
      onChange(newPhotos)

    } catch (error) {
      console.error('Error uploading photos:', error)
      setError(error.message || 'Gagal upload foto')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCaptionChange = (photoId, caption) => {
    const updatedPhotos = photos.map(photo => 
      photo.id === photoId ? { ...photo, caption } : photo
    )
    onChange(updatedPhotos)
  }

  const handleRemovePhoto = async (photoToRemove) => {
    try {
      setIsLoading(true)
      
      // Delete from Supabase Storage if it has a path
      if (photoToRemove.path) {
        await deleteFile('photos', photoToRemove.path)
      }
      
      const updatedPhotos = photos.filter(photo => photo.id !== photoToRemove.id)
      onChange(updatedPhotos)
    } catch (error) {
      console.error('Error removing photo:', error)
      setError('Gagal menghapus foto')
    } finally {
      setIsLoading(false)
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

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${isLoading ? 'pointer-events-none opacity-50' : 'hover:border-blue-400 hover:bg-gray-50'}
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
          disabled={isLoading}
        />
        
        {isLoading ? (
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
                <img
                  src={photo.url}
                  alt={photo.caption || 'Foto PAI'}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    e.target.src = '/api/placeholder/400/300'
                    e.target.alt = 'Foto tidak dapat dimuat'
                  }}
                />
                
                {/* Remove Button */}
                <button
                  onClick={() => handleRemovePhoto(photo)}
                  disabled={isLoading}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Caption Input */}
              <div className="p-3">
                <input
                  type="text"
                  placeholder="Tambahkan keterangan foto..."
                  value={photo.caption}
                  onChange={(e) => handleCaptionChange(photo.id, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  disabled={isLoading}
                />
                
                {/* Metadata */}
                {photo.metadata && (
                  <div className="mt-2 text-xs text-gray-500">
                    <p>Ukuran: {(photo.metadata.size / 1024).toFixed(1)} KB</p>
                    <p>Diupload: {new Date(photo.metadata.uploadedAt).toLocaleString('id-ID')}</p>
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
          Belum ada foto yang diupload
        </div>
      )}
    </div>
  )
}