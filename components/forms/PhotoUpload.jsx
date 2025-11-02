'use client'

import { useState, useRef } from 'react'
import { X, Upload, ImageIcon } from 'lucide-react'

export default function PhotoUpload({ 
  photos = [], 
  onChange, 
  maxFiles = 10, 
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp','image/*'] 
}) {
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList)
    
    // Filter valid files
    const validFiles = files.filter(file => {
      if (!acceptedTypes.includes(file.type)) {
        alert(`File ${file.name} tidak didukung. Gunakan format: ${acceptedTypes.join(', ')}`)
        return false
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert(`File ${file.name} terlalu besar. Maksimal 5MB`)
        return false
      }
      return true
    })

    if (photos.length + validFiles.length > maxFiles) {
      alert(`Maksimal ${maxFiles} foto dapat diunggah`)
      return
    }

    // Convert files to photo objects with base64
    const newPhotos = await Promise.all(
      validFiles.map(async (file, index) => {
        const dataUri = await fileToBase64(file)
        return {
          id: `photo_${Date.now()}_${index}`,
          file,
          data_uri: dataUri,
          caption: '',
          name: file.name,
          size: file.size
        }
      })
    )

    onChange([...photos, ...newPhotos])
  }

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = error => reject(error)
    })
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

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const removePhoto = (photoId) => {
    onChange(photos.filter(photo => photo.id !== photoId))
  }

  const updateCaption = (photoId, caption) => {
    onChange(photos.map(photo => 
      photo.id === photoId ? { ...photo, caption } : photo
    ))
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          Unggah Foto PAI
        </p>
        <p className="text-sm text-gray-500 mb-2">
          Seret dan lepas foto di sini, atau klik untuk memilih
        </p>
        <p className="text-xs text-gray-400">
          Format: JPG, PNG, WebP • Maksimal: {maxFiles} foto • Ukuran: maksimal 5MB per foto
        </p>
      </div>

      {/* Photo Preview Grid */}
      {photos.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">
            Foto yang Diunggah ({photos.length}/{maxFiles})
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="border rounded-lg p-3 bg-white"
              >
                <div className="flex gap-3">
                  {/* Image Preview */}
                  <div className="flex-shrink-0">
                    {photo.data_uri ? (
                      <img
                        src={photo.data_uri}
                        alt={photo.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Photo Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {photo.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(photo.size)}
                        </p>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        className="ml-2 p-1 text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Caption Input */}
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Keterangan foto..."
                        value={photo.caption}
                        onChange={(e) => updateCaption(photo.id, e.target.value)}
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}