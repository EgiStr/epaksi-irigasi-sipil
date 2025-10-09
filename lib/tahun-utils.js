/**
 * Helper functions untuk logika tahun pada PAI dan Survey (IKSI)
 * 
 * Logika Bisnis:
 * - Jika penilaian dilakukan pada tahun yang sama → UPDATE data existing
 * - Jika penilaian dilakukan pada tahun berbeda → INSERT data baru
 * - Setiap feature hanya bisa punya 1 PAI per tahun
 * - Setiap feature hanya bisa punya 1 Survey (IKSI) per scheme per tahun
 */

/**
 * Get current year
 * @returns {number} Current year (e.g., 2025)
 */
export function getCurrentYear() {
  return new Date().getFullYear()
}

/**
 * Check if tahun is same as current year
 * @param {number} tahun - Year to check
 * @returns {boolean} True if same year
 */
export function isSameYear(tahun) {
  return tahun === getCurrentYear()
}

/**
 * Get year from Date object or timestamp
 * @param {Date|string|number} date - Date to extract year from
 * @returns {number} Year
 */
export function getYearFromDate(date) {
  if (!date) return getCurrentYear()
  return new Date(date).getFullYear()
}

/**
 * Validate year range (2000-2100)
 * @param {number} tahun - Year to validate
 * @returns {{valid: boolean, error?: string}}
 */
export function validateTahun(tahun) {
  if (typeof tahun !== 'number') {
    return { valid: false, error: 'Tahun harus berupa angka' }
  }
  
  if (tahun < 2000 || tahun > 2100) {
    return { valid: false, error: 'Tahun harus antara 2000 dan 2100' }
  }
  
  return { valid: true }
}

/**
 * Check if should update (same year) or create (different year)
 * @param {number|null} existingTahun - Existing record's tahun
 * @param {number} newTahun - New penilaian's tahun
 * @returns {{action: 'update'|'create', reason: string}}
 */
export function determinePenilaianAction(existingTahun, newTahun) {
  if (!existingTahun) {
    return {
      action: 'create',
      reason: 'Belum ada penilaian sebelumnya'
    }
  }
  
  if (existingTahun === newTahun) {
    return {
      action: 'update',
      reason: `Penilaian tahun ${newTahun} sudah ada, akan diperbarui`
    }
  }
  
  return {
    action: 'create',
    reason: `Tahun berbeda (${existingTahun} → ${newTahun}), akan membuat penilaian baru`
  }
}

/**
 * Format tahun for display
 * @param {number} tahun - Year
 * @returns {string} Formatted year string (e.g., "Tahun 2025")
 */
export function formatTahunDisplay(tahun) {
  return `Tahun ${tahun}`
}

/**
 * Get years range for dropdown (last 5 years + current + next year)
 * @returns {Array<{value: number, label: string}>}
 */
export function getYearsDropdownOptions() {
  const currentYear = getCurrentYear()
  const years = []
  
  // Last 5 years
  for (let i = 5; i > 0; i--) {
    const year = currentYear - i
    years.push({ value: year, label: `${year}` })
  }
  
  // Current year (default selected)
  years.push({ 
    value: currentYear, 
    label: `${currentYear} (Tahun Ini)`,
    isDefault: true 
  })
  
  // Next year
  years.push({ 
    value: currentYear + 1, 
    label: `${currentYear + 1} (Tahun Depan)` 
  })
  
  return years
}

/**
 * Compare two tahun values
 * @param {number} tahun1 
 * @param {number} tahun2 
 * @returns {-1|0|1} -1 if tahun1 < tahun2, 0 if equal, 1 if tahun1 > tahun2
 */
export function compareTahun(tahun1, tahun2) {
  if (tahun1 < tahun2) return -1
  if (tahun1 > tahun2) return 1
  return 0
}

/**
 * Get penilaian history summary for a feature
 * @param {Array<{tahun: number, createdAt: Date}>} records - Survey or PAI records
 * @returns {{years: number[], latestYear: number, totalRecords: number}}
 */
export function getPenilaianHistorySummary(records) {
  if (!records || records.length === 0) {
    return {
      years: [],
      latestYear: null,
      totalRecords: 0
    }
  }
  
  const years = records.map(r => r.tahun).sort((a, b) => b - a)
  const uniqueYears = [...new Set(years)]
  
  return {
    years: uniqueYears,
    latestYear: uniqueYears[0],
    totalRecords: records.length
  }
}

/**
 * Check if tahun is in the past, present, or future
 * @param {number} tahun 
 * @returns {'past'|'present'|'future'}
 */
export function getTahunPeriod(tahun) {
  const currentYear = getCurrentYear()
  
  if (tahun < currentYear) return 'past'
  if (tahun === currentYear) return 'present'
  return 'future'
}

/**
 * Get badge color for tahun period
 * @param {number} tahun 
 * @returns {{bg: string, text: string, label: string}}
 */
export function getTahunBadgeColor(tahun) {
  const period = getTahunPeriod(tahun)
  
  switch (period) {
    case 'present':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        label: 'Tahun Ini'
      }
    case 'past':
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        label: 'Tahun Lalu'
      }
    case 'future':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        label: 'Tahun Depan'
      }
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        label: ''
      }
  }
}
