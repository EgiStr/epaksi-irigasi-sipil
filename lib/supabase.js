import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
})

/**
 * Upload file to Supabase Storage
 * @param {File} file - File object to upload
 * @param {string} bucket - Storage bucket name
 * @param {string} path - File path in bucket
 * @returns {Promise<{data, error}>}
 */
export async function uploadFile(file, bucket = 'photos', path) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw error
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error uploading file:', error)
    return { data: null, error }
  }
}

/**
 * Get public URL for uploaded file
 * @param {string} bucket - Storage bucket name
 * @param {string} path - File path in bucket
 * @returns {string} Public URL
 */
export function getPublicUrl(bucket = 'photos', path) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  return data.publicUrl
}

/**
 * Delete file from Supabase Storage
 * @param {string} bucket - Storage bucket name
 * @param {string} path - File path in bucket
 * @returns {Promise<{data, error}>}
 */
export async function deleteFile(bucket = 'photos', path) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      throw error
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error deleting file:', error)
    return { data: null, error }
  }
}

/**
 * Generate unique file path for upload
 * @param {string} originalName - Original file name
 * @param {string} userId - User ID for folder organization
 * @param {string} featureId - Feature ID for organization
 * @returns {string} Unique file path
 */
export function generateFilePath(originalName, userId, featureId) {
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 15)
  const extension = originalName.split('.').pop()
  
  return `pai/${userId}/${featureId}/${timestamp}-${randomStr}.${extension}`
}

/**
 * Validate image file
 * @param {File} file - File to validate
 * @returns {boolean} Is valid image
 */
export function validateImageFile(file) {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const maxSize = 5 * 1024 * 1024 // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Tipe file tidak didukung. Gunakan JPEG, PNG, atau WebP.')
  }
  
  if (file.size > maxSize) {
    throw new Error('Ukuran file terlalu besar. Maksimal 5MB.')
  }
  
  return true
}