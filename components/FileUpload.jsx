'use client'

import { useState } from 'react'
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function FileUpload({ onUploadSuccess, onUploadError }) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)

  const handleFileUpload = async (file) => {
    if (!file) return

    setUploading(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        setUploadResult({
          success: true,
          data: result
        })
        onUploadSuccess?.(result)
      } else {
        setUploadResult({
          success: false,
          error: result.error || 'Upload gagal'
        })
        onUploadError?.(result.error)
      }
    } catch (error) {
      const errorMsg = 'Terjadi kesalahan saat upload'
      setUploadResult({
        success: false,
        error: errorMsg
      })
      onUploadError?.(errorMsg)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const validFile = files.find(file => 
      file.name.toLowerCase().endsWith('.kml') || 
      file.name.toLowerCase().endsWith('.geojson') ||
      file.name.toLowerCase().endsWith('.json')
    )
    
    if (validFile) {
      handleFileUpload(validFile)
    } else {
      setUploadResult({
        success: false,
        error: 'Format file tidak didukung. Gunakan KML atau GeoJSON.'
      })
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
        `}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !uploading && document.getElementById('fileInput').click()}
      >
        <input
          id="fileInput"
          type="file"
          accept=".kml,.geojson,.json"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        
        <div className="flex flex-col items-center space-y-4">
          {uploading ? (
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
          ) : (
            <Upload className="h-12 w-12 text-gray-400" />
          )}
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {uploading ? 'Mengupload file...' : 'Upload file KML atau GeoJSON'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Drag & drop file atau klik untuk memilih
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Format yang didukung: .kml, .geojson, .json
            </p>
          </div>
        </div>
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <div className={`mt-6 p-4 rounded-lg ${
          uploadResult.success 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start space-x-3">
            {uploadResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            )}
            
            <div className="flex-1">
              <h4 className={`font-medium ${
                uploadResult.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {uploadResult.success ? 'Upload berhasil!' : 'Upload gagal'}
              </h4>
              
              {uploadResult.success && uploadResult.data && (
                <div className="mt-2 text-sm text-green-700">
                  <p><strong>File:</strong> {uploadResult.data.fileName}</p>
                  <p><strong>Total features:</strong> {uploadResult.data.summary.totalFeatures}</p>
                  <p><strong>Berhasil diinsert:</strong> {uploadResult.data.summary.inserted}</p>
                  <p><strong>Diupdate:</strong> {uploadResult.data.summary.updated}</p>
                  <p><strong>Error:</strong> {uploadResult.data.summary.errors}</p>
                  {uploadResult.data.summary.layersCreated.length > 0 && (
                    <p><strong>Layers:</strong> {uploadResult.data.summary.layersCreated.join(', ')}</p>
                  )}
                </div>
              )}
              
              {!uploadResult.success && (
                <p className="mt-1 text-sm text-red-700">
                  {uploadResult.error}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
