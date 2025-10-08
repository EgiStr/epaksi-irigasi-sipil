/**
 * Utility functions untuk PAI (Profil Aset Irigasi)
 */

/**
 * Konversi koordinat dari EPSG:4269 ke EPSG:4326
 * @param {Object} geoJSON - GeoJSON object
 * @returns {Object} GeoJSON dengan SRID 4326
 */
export function convertToEPSG4326(geoJSON) {
  if (!geoJSON || !geoJSON.coordinates) return geoJSON
  
  // Untuk development, kita anggap EPSG:4269 sama dengan EPSG:4326 (lon/lat)
  // Dalam production, ini harus menggunakan proj4 atau library transformasi koordinat yang tepat
  const converted = {
    ...geoJSON,
    crs: {
      type: 'name',
      properties: {
        name: 'EPSG:4326'
      }
    }
  }
  
  return converted
}

/**
 * Hitung panjang saluran dari LineString geometry
 * @param {Object} geoJSON - LineString GeoJSON
 * @returns {number} Panjang dalam meter
 */
export function calculateLineStringLength(geoJSON) {
  if (!geoJSON || geoJSON.type !== 'LineString' || !geoJSON.coordinates) {
    return 0
  }
  
  const coordinates = geoJSON.coordinates
  let totalLength = 0
  
  for (let i = 0; i < coordinates.length - 1; i++) {
    const point1 = coordinates[i]
    const point2 = coordinates[i + 1]
    
    // Gunakan formula Haversine untuk menghitung jarak antara dua titik lat/lon
    const distance = haversineDistance(
      point1[1], point1[0], // lat1, lon1
      point2[1], point2[0]  // lat2, lon2
    )
    
    totalLength += distance
  }
  
  return totalLength
}

/**
 * Formula Haversine untuk menghitung jarak antara dua titik koordinat
 * @param {number} lat1 - Latitude titik pertama
 * @param {number} lon1 - Longitude titik pertama  
 * @param {number} lat2 - Latitude titik kedua
 * @param {number} lon2 - Longitude titik kedua
 * @returns {number} Jarak dalam meter
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000 // Radius bumi dalam meter
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return distance
}

/**
 * Konversi derajat ke radian
 * @param {number} degrees - Nilai dalam derajat
 * @returns {number} Nilai dalam radian
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180)
}

/**
 * Validasi dan normalisasi data PAI
 * @param {string} paiType - Tipe PAI ('saluran' atau 'bangunan')
 * @param {Object} paiData - Data PAI
 * @param {Object} geoJSON - GeoJSON geometry
 * @returns {Object} Data PAI yang sudah dinormalisasi
 */
export function normalizePAIData(paiType, paiData, geoJSON) {
  const normalized = { ...paiData }
  
  // Untuk saluran, hitung panjang jika tidak ada
  if (paiType === 'saluran' && geoJSON && geoJSON.type === 'LineString') {
    const calculatedLength = calculateLineStringLength(geoJSON)
    
    // Update panjang di hidraulik jika belum ada
    if (!normalized.hidraulik?.panjang_m && calculatedLength > 0) {
      normalized.hidraulik = {
        ...normalized.hidraulik,
        panjang_m: Math.round(calculatedLength * 100) / 100 // 2 decimal places
      }
    }
  }
  
  return normalized
}

/**
 * Generate nama file foto berdasarkan PAI
 * @param {string} featureId - ID feature
 * @param {string} paiType - Tipe PAI
 * @param {number} index - Index foto
 * @returns {string} Nama file foto
 */
export function generatePhotoFilename(featureId, paiType, index) {
  const timestamp = Date.now()
  return `pai_${paiType}_${featureId}_${index}_${timestamp}`
}

/**
 * Validasi tipe file foto
 * @param {string} mimeType - MIME type file
 * @returns {boolean} Valid atau tidak
 */
export function isValidPhotoType(mimeType) {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  return allowedTypes.includes(mimeType.toLowerCase())
}

/**
 * Format data PAI untuk response API
 * @param {Object} paiRecord - Record PAI dari database
 * @returns {Object} Data PAI yang diformat
 */
export function formatPAIResponse(paiRecord) {
  return {
    id: paiRecord.id,
    featureId: paiRecord.featureId,
    paiType: paiRecord.paiType,
    paiData: paiRecord.paiData,
    photos: paiRecord.photos || [],
    paiPhotos: paiRecord.paiPhotos || [], // Include paiPhotos relation if exists
    lengthM: paiRecord.lengthM,
    geom: paiRecord.geom,
    // ✅ Include priority fields
    priorityScore: paiRecord.priorityScore,
    priorityNotes: paiRecord.priorityNotes,
    priorityStatus: paiRecord.priorityStatus,
    createdAt: paiRecord.createdAt,
    updatedAt: paiRecord.updatedAt,
    createdBy: paiRecord.createdBy,
    feature: paiRecord.feature ? {
      featureId: paiRecord.feature.featureId,
      name: paiRecord.feature.name,
      type: paiRecord.feature.type,
      scheme: paiRecord.feature.scheme
    } : null,
    user: paiRecord.user ? {
      id: paiRecord.user.id,
      name: paiRecord.user.name,
      email: paiRecord.user.email
    } : null
  }
}

/**
 * Build query filter untuk PAI
 * @param {Object} filters - Filter parameters
 * @returns {Object} Prisma where clause
 */
export function buildPAIFilters(filters) {
  const where = {}
  
  if (filters.featureId) {
    where.featureId = filters.featureId
  }
  
  if (filters.paiType) {
    where.paiType = filters.paiType
  }
  
  return where
}