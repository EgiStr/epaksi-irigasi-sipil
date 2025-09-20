'use client'

import { useState, useEffect } from 'react'

export function usePhotos(paiId) {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch photos for a PAI
  const fetchPhotos = async () => {
    if (!paiId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/photos/list?paiId=${paiId}`)
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data foto')
      }

      const data = await response.json()
      setPhotos(data.photos || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Upload new photo
  const uploadPhoto = async (file, caption = '') => {
    if (!paiId) {
      throw new Error('PAI ID diperlukan')
    }

    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('paiId', paiId)
      formData.append('caption', caption)

      const response = await fetch('/api/photos', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal upload foto')
      }

      const data = await response.json()
      
      // Add new photo to state
      setPhotos(prev => [...prev, data.data])
      
      return data.data
    } catch (error) {
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Delete photo
  const deletePhoto = async (photoId) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/photos?id=${photoId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal menghapus foto')
      }

      // Remove photo from state
      setPhotos(prev => prev.filter(photo => photo.id !== photoId))
      
    } catch (error) {
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Update photo caption
  const updateCaption = async (photoId, caption) => {
    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ caption })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal update caption')
      }

      // Update photo in state
      setPhotos(prev => prev.map(photo => 
        photo.id === photoId ? { ...photo, caption } : photo
      ))

    } catch (error) {
      setError(error.message)
      throw error
    }
  }

  useEffect(() => {
    if (paiId) {
      fetchPhotos()
    }
  }, [paiId])

  return {
    photos,
    loading,
    error,
    uploadPhoto,
    deletePhoto,
    updateCaption,
    refreshPhotos: fetchPhotos
  }
}

export default usePhotos