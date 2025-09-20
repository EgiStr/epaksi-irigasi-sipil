/**
 * Survey Scoring Engine - Weighted Sum Model (WSM)
 * 
 * This module implements the scoring calculation for irrigation assessment surveys
 * based on configurable weights and normalization functions.
 */

/**
 * Normalize a value based on its type
 * @param {*} value - The raw input value
 * @param {Object} fieldConfig - Field configuration from survey config
 * @returns {number} - Normalized value between 0 and 1
 */
export function normalizeValue(value, fieldConfig) {
  const { type, k, min, max, options } = fieldConfig;
  
  // Handle null/undefined values
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  // Convert value to appropriate type for processing
  const processedValue = preprocessValue(value, type);

  switch (type) {
    case 'boolean':
      // Boolean: 1 for true/yes, 0 for false/no
      // Support multiple boolean representations
      return isTruthyValue(processedValue) ? 1 : 0;
    
    case 'ordinal':
      // Ordinal scale: (value - 1) / (k - 1)
      // Support both numeric and string ordinal values
      const ordinalValue = parseOrdinalValue(processedValue, k, options);
      if (ordinalValue === null || ordinalValue < 1 || ordinalValue > k) {
        return 0;
      }
      return k === 1 ? 1 : (ordinalValue - 1) / (k - 1);
    
    case 'persentase':
    case 'percentage':
      // Percentage: value / 100
      // Handle both direct percentage and ratio inputs
      const percentValue = parsePercentageValue(processedValue);
      if (percentValue === null) {
        return 0;
      }
      return Math.min(Math.max(percentValue / 100, 0), 1);
    
    case 'numerik':
    case 'numeric':
      // Numeric range: (value - min) / (max - min)
      // Support auto-detection of min/max if not provided
      const numericValue = parseNumericValue(processedValue);
      if (numericValue === null) {
        return 0;
      }
      
      const { normalizedMin, normalizedMax } = resolveNumericRange(min, max, numericValue);
      if (normalizedMax === normalizedMin) {
        return numericValue >= normalizedMin ? 1 : 0;
      }
      
      const normalized = (numericValue - normalizedMin) / (normalizedMax - normalizedMin);
      return Math.min(Math.max(normalized, 0), 1);
    
    case 'likert':
      // Likert scale: specialized ordinal with common scales
      const likertValue = parseLikertValue(processedValue, k);
      if (likertValue === null) {
        return 0;
      }
      return k === 1 ? 1 : (likertValue - 1) / (k - 1);
    
    case 'binary':
      // Binary: 0 or 1 directly
      const binaryValue = parseBinaryValue(processedValue);
      return binaryValue === null ? 0 : binaryValue;
    
    case 'score':
      // Direct score: already normalized or needs normalization
      const scoreValue = parseScoreValue(processedValue, min, max);
      return scoreValue === null ? 0 : scoreValue;
    
    default:
      console.warn(`Unknown field type: ${type}, attempting auto-detection`);
      return autoDetectAndNormalize(processedValue, fieldConfig);
  }
}

/**
 * Preprocess value based on expected type
 * @param {*} value - Raw input value
 * @param {string} type - Expected field type
 * @returns {*} - Preprocessed value
 */
function preprocessValue(value, type) {
  if (value === null || value === undefined) return null;
  
  // Handle string inputs
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    
    // Handle empty strings
    if (trimmed === '') return null;
    
    // Handle numeric-like strings
    if (['numerik', 'numeric', 'persentase', 'percentage', 'ordinal', 'score'].includes(type)) {
      // Remove common non-numeric characters
      const cleaned = trimmed.replace(/[%,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? trimmed : parsed;
    }
    
    return trimmed;
  }
  
  return value;
}

/**
 * Check if value represents truthy boolean
 * @param {*} value - Value to check
 * @returns {boolean} - True if truthy
 */
function isTruthyValue(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const str = value.toLowerCase();
    return ['true', 'ya', 'yes', 'iya', 'benar', '1', 'on', 'aktif', 'active'].includes(str);
  }
  return false;
}

/**
 * Parse ordinal value with flexible input support
 * @param {*} value - Input value
 * @param {number} k - Maximum ordinal value
 * @param {Array} options - Optional ordinal options
 * @returns {number|null} - Parsed ordinal value
 */
function parseOrdinalValue(value, k, options) {
  if (typeof value === 'number') {
    return Math.round(value);
  }
  
  if (typeof value === 'string') {
    // Try numeric parsing first
    const numeric = parseInt(value);
    if (!isNaN(numeric)) {
      return numeric;
    }
    
    // Try mapping with options if provided
    if (options && Array.isArray(options)) {
      const index = options.findIndex(opt => 
        opt.toLowerCase() === value.toLowerCase() ||
        opt.toLowerCase().includes(value.toLowerCase())
      );
      return index >= 0 ? index + 1 : null;
    }
    
    // Common ordinal text mappings
    const ordinalMap = {
      'sangat buruk': 1, 'buruk': 2, 'cukup': 3, 'baik': 4, 'sangat baik': 5,
      'tidak pernah': 1, 'jarang': 2, 'kadang': 3, 'sering': 4, 'selalu': 5,
      'sangat tidak setuju': 1, 'tidak setuju': 2, 'netral': 3, 'setuju': 4, 'sangat setuju': 5
    };
    
    return ordinalMap[value] || null;
  }
  
  return null;
}

/**
 * Parse percentage value with flexible formats
 * @param {*} value - Input value
 * @returns {number|null} - Percentage value (0-100)
 */
function parsePercentageValue(value) {
  if (typeof value === 'number') {
    // If value is between 0-1, assume it's a ratio
    if (value >= 0 && value <= 1) {
      return value * 100;
    }
    // If value is between 0-100, assume it's already percentage
    return value;
  }
  
  if (typeof value === 'string') {
    const numeric = parseFloat(value.replace('%', ''));
    if (isNaN(numeric)) return null;
    
    // Auto-detect ratio vs percentage
    if (numeric >= 0 && numeric <= 1 && !value.includes('%')) {
      return numeric * 100;
    }
    return numeric;
  }
  
  return null;
}

/**
 * Parse numeric value with type checking
 * @param {*} value - Input value
 * @returns {number|null} - Parsed numeric value
 */
function parseNumericValue(value) {
  if (typeof value === 'number') {
    return isFinite(value) ? value : null;
  }
  
  if (typeof value === 'string') {
    const numeric = parseFloat(value);
    return isNaN(numeric) ? null : numeric;
  }
  
  return null;
}

/**
 * Resolve numeric range with auto-detection
 * @param {number} min - Configured minimum
 * @param {number} max - Configured maximum
 * @param {number} value - Current value
 * @returns {Object} - Resolved min and max
 */
function resolveNumericRange(min, max, value) {
  let normalizedMin = min;
  let normalizedMax = max;
  
  // Auto-detect range if not provided
  if (normalizedMin === undefined || normalizedMax === undefined) {
    if (value >= 0 && value <= 100) {
      // Assume percentage-like range
      normalizedMin = normalizedMin ?? 0;
      normalizedMax = normalizedMax ?? 100;
    } else if (value >= 1 && value <= 10) {
      // Assume 1-10 scale
      normalizedMin = normalizedMin ?? 1;
      normalizedMax = normalizedMax ?? 10;
    } else {
      // Use value as reference point
      normalizedMin = normalizedMin ?? 0;
      normalizedMax = normalizedMax ?? Math.max(value, normalizedMin + 1);
    }
  }
  
  return { normalizedMin, normalizedMax };
}

/**
 * Parse Likert scale value
 * @param {*} value - Input value
 * @param {number} k - Scale size (e.g., 5 for 1-5 scale)
 * @returns {number|null} - Likert value
 */
function parseLikertValue(value, k = 5) {
  // Standard Likert mappings
  const likertMappings = {
    5: {
      'sangat tidak setuju': 1, 'tidak setuju': 2, 'netral': 3, 'setuju': 4, 'sangat setuju': 5,
      'sangat buruk': 1, 'buruk': 2, 'cukup': 3, 'baik': 4, 'sangat baik': 5
    },
    7: {
      'sangat tidak setuju': 1, 'tidak setuju': 2, 'agak tidak setuju': 3, 'netral': 4, 
      'agak setuju': 5, 'setuju': 6, 'sangat setuju': 7
    }
  };
  
  if (typeof value === 'number') {
    return Math.round(value);
  }
  
  if (typeof value === 'string') {
    const mapping = likertMappings[k] || likertMappings[5];
    return mapping[value.toLowerCase()] || parseInt(value) || null;
  }
  
  return null;
}

/**
 * Parse binary value (0 or 1)
 * @param {*} value - Input value
 * @returns {number|null} - 0, 1, or null
 */
function parseBinaryValue(value) {
  if (typeof value === 'number') {
    return value > 0 ? 1 : 0;
  }
  
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  
  if (typeof value === 'string') {
    const numeric = parseFloat(value);
    if (!isNaN(numeric)) {
      return numeric > 0 ? 1 : 0;
    }
    
    return isTruthyValue(value) ? 1 : 0;
  }
  
  return null;
}

/**
 * Parse score value with normalization
 * @param {*} value - Input value
 * @param {number} min - Minimum score
 * @param {number} max - Maximum score
 * @returns {number|null} - Normalized score (0-1)
 */
function parseScoreValue(value, min = 0, max = 100) {
  const numeric = parseNumericValue(value);
  if (numeric === null) return null;
  
  // If already normalized (0-1), return as is
  if (numeric >= 0 && numeric <= 1 && min === 0 && max === 1) {
    return numeric;
  }
  
  // Normalize to 0-1 range
  if (max === min) {
    return numeric >= min ? 1 : 0;
  }
  
  return Math.min(Math.max((numeric - min) / (max - min), 0), 1);
}

/**
 * Auto-detect field type and normalize
 * @param {*} value - Input value
 * @param {Object} fieldConfig - Field configuration
 * @returns {number} - Normalized value
 */
function autoDetectAndNormalize(value, fieldConfig) {
  // Try different normalization strategies
  
  // Boolean detection
  if (typeof value === 'boolean' || 
      (typeof value === 'string' && ['true', 'false', 'ya', 'tidak', 'yes', 'no'].includes(value.toLowerCase()))) {
    return isTruthyValue(value) ? 1 : 0;
  }
  
  // Numeric detection
  const numeric = parseNumericValue(value);
  if (numeric !== null) {
    // Auto-detect range based on value
    if (numeric >= 0 && numeric <= 1) {
      return numeric; // Already normalized
    } else if (numeric >= 0 && numeric <= 100) {
      return numeric / 100; // Percentage
    } else if (numeric >= 1 && numeric <= 10) {
      return (numeric - 1) / 9; // 1-10 scale
    } else if (numeric >= 1 && numeric <= 5) {
      return (numeric - 1) / 4; // 1-5 Likert scale
    } else {
      console.warn(`Unable to auto-normalize numeric value: ${numeric}`);
      return Math.min(Math.max(numeric / 100, 0), 1); // Fallback to percentage
    }
  }
  
  // String ordinal detection
  if (typeof value === 'string') {
    const ordinalMappings = {
      'sangat buruk': 0, 'buruk': 0.25, 'cukup': 0.5, 'baik': 0.75, 'sangat baik': 1,
      'tidak pernah': 0, 'jarang': 0.25, 'kadang': 0.5, 'sering': 0.75, 'selalu': 1,
      'sangat tidak setuju': 0, 'tidak setuju': 0.25, 'netral': 0.5, 'setuju': 0.75, 'sangat setuju': 1,
      'tidak ada': 0, 'kurang': 0.33, 'cukup': 0.66, 'baik': 1,
      'rendah': 0.25, 'sedang': 0.5, 'tinggi': 0.75
    };
    
    const mapped = ordinalMappings[value.toLowerCase()];
    if (mapped !== undefined) {
      return mapped;
    }
  }
  
  console.warn(`Unable to auto-detect and normalize value: ${value}`);
  return 0;
}

/**
 * Validate field configuration for robust normalization
 * @param {Object} fieldConfig - Field configuration
 * @returns {Object} - Validated and enhanced field config
 */
function validateAndEnhanceFieldConfig(fieldConfig) {
  const enhanced = { ...fieldConfig };
  
  // Set default values based on type
  switch (enhanced.type) {
    case 'boolean':
    case 'binary':
      enhanced.min = 0;
      enhanced.max = 1;
      break;
      
    case 'ordinal':
    case 'likert':
      enhanced.k = enhanced.k || 5;
      enhanced.min = 1;
      enhanced.max = enhanced.k;
      break;
      
    case 'persentase':
    case 'percentage':
      enhanced.min = enhanced.min ?? 0;
      enhanced.max = enhanced.max ?? 100;
      break;
      
    case 'numerik':
    case 'numeric':
      // Auto-detect range if not provided
      if (enhanced.min === undefined && enhanced.max === undefined) {
        enhanced.min = 0;
        enhanced.max = 100; // Default assumption
      }
      break;
      
    case 'score':
      enhanced.min = enhanced.min ?? 0;
      enhanced.max = enhanced.max ?? 1;
      break;
  }
  
  return enhanced;
}

/**
 * Enhanced normalize value with robust type handling
 * @param {*} value - The raw input value
 * @param {Object} fieldConfig - Field configuration from survey config
 * @returns {number} - Normalized value between 0 and 1
 */
export function normalizeValueRobust(value, fieldConfig) {
  // Enhance field config with defaults
  const enhancedConfig = validateAndEnhanceFieldConfig(fieldConfig);
  
  // Handle null/undefined values
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  // Convert value to appropriate type for processing
  const processedValue = preprocessValue(value, enhancedConfig.type);

  try {
    switch (enhancedConfig.type) {
      case 'boolean':
        return isTruthyValue(processedValue) ? 1 : 0;
      
      case 'ordinal':
        const ordinalValue = parseOrdinalValue(processedValue, enhancedConfig.k, enhancedConfig.options);
        if (ordinalValue === null || ordinalValue < 1 || ordinalValue > enhancedConfig.k) {
          return 0;
        }
        return enhancedConfig.k === 1 ? 1 : (ordinalValue - 1) / (enhancedConfig.k - 1);
      
      case 'persentase':
      case 'percentage':
        const percentValue = parsePercentageValue(processedValue);
        if (percentValue === null) {
          return 0;
        }
        return Math.min(Math.max(percentValue / 100, 0), 1);
      
      case 'numerik':
      case 'numeric':
        const numericValue = parseNumericValue(processedValue);
        if (numericValue === null) {
          return 0;
        }
        
        const { normalizedMin, normalizedMax } = resolveNumericRange(
          enhancedConfig.min, 
          enhancedConfig.max, 
          numericValue
        );
        
        if (normalizedMax === normalizedMin) {
          return numericValue >= normalizedMin ? 1 : 0;
        }
        
        const normalized = (numericValue - normalizedMin) / (normalizedMax - normalizedMin);
        return Math.min(Math.max(normalized, 0), 1);
      
      case 'likert':
        const likertValue = parseLikertValue(processedValue, enhancedConfig.k);
        if (likertValue === null) {
          return 0;
        }
        return enhancedConfig.k === 1 ? 1 : (likertValue - 1) / (enhancedConfig.k - 1);
      
      case 'binary':
        const binaryValue = parseBinaryValue(processedValue);
        return binaryValue === null ? 0 : binaryValue;
      
      case 'score':
        const scoreValue = parseScoreValue(processedValue, enhancedConfig.min, enhancedConfig.max);
        return scoreValue === null ? 0 : scoreValue;
      
      default:
        console.warn(`Unknown field type: ${enhancedConfig.type}, attempting auto-detection`);
        return autoDetectAndNormalize(processedValue, enhancedConfig);
    }
  } catch (error) {
    console.error(`Error normalizing value ${value} with config:`, enhancedConfig, error);
    return autoDetectAndNormalize(processedValue, enhancedConfig);
  }
}

/**
 * Calculate sub-criteria score with robust normalization
 * @param {*} value - The input value
 * @param {Object} subConfig - Sub-criteria configuration
 * @returns {Object} - { normalizedValue, weightedScore, maxScore }
 */
export function calculateSubScore(value, subConfig) {
  // Use robust normalization
  const normalizedValue = normalizeValueRobust(value, subConfig);
  const weightedScore = normalizedValue * subConfig.weight;
  const maxScore = subConfig.weight;
  
  return {
    normalizedValue,
    weightedScore,
    maxScore,
    field: subConfig.key,
    label: subConfig.label,
    weight: subConfig.weight,
    originalValue: value,
    fieldType: subConfig.type
  };
}

/**
 * Calculate category score
 * @param {Object} values - Input values for the category
 * @param {Object} categoryConfig - Category configuration
 * @returns {Object} - Category score details
 */
export function calculateCategoryScore(values, categoryConfig) {
  const subScores = [];
  let totalWeightedScore = 0;
  let totalMaxScore = 0;
  let totalWeight = 0;

  // Calculate each sub-criteria score
  categoryConfig.subs.forEach(subConfig => {
    const value = values[subConfig.key];
    const subScore = calculateSubScore(value, subConfig);
    
    subScores.push(subScore);
    totalWeightedScore += subScore.weightedScore;
    totalMaxScore += subScore.maxScore;
    totalWeight += subConfig.weight;
  });

  // Calculate category score as percentage of max possible
  const categoryPercentage = totalMaxScore > 0 ? (totalWeightedScore / totalMaxScore) * 100 : 0;
  
  // Apply category weight
  const finalCategoryScore = (categoryPercentage / 100) * categoryConfig.weight;
  
  return {
    key: categoryConfig.key,
    label: categoryConfig.label,
    weight: categoryConfig.weight,
    subScores,
    totalWeightedScore,
    totalMaxScore,
    categoryPercentage,
    finalScore: finalCategoryScore,
    maxPossibleScore: categoryConfig.weight
  };
}

/**
 * Calculate total survey score
 * @param {Object} values - All input values
 * @param {Object} config - Survey configuration
 * @returns {Object} - Complete scoring results
 */
export function calculateTotalScore(values, config) {
  const categoryScores = [];
  const categoryScoresMap = {}; // Simple key-value for UI display
  let totalScore = 0;
  let maxPossibleScore = 0;

  // Calculate each category score
  config.categories.forEach(categoryConfig => {
    const categoryScore = calculateCategoryScore(values, categoryConfig);
    categoryScores.push(categoryScore);
    
    // Add to simple map for UI display
    categoryScoresMap[categoryScore.key] = categoryScore.finalScore;
    
    totalScore += categoryScore.finalScore;
    maxPossibleScore += categoryScore.maxPossibleScore;
  });

  // Calculate final percentage
  const finalPercentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
  
  // Determine quality class
  const qualityClass = determineQualityClass(finalPercentage, config.grading);
  
  return {
    scheme: config.scheme,
    title: config.title,
    totalScore: Math.round(finalPercentage * 100) / 100, // Round to 2 decimal places
    qualityClass: qualityClass.grade,
    qualityLabel: qualityClass.label,
    qualityColor: qualityClass.color,
    categoryScores: categoryScoresMap, // Simple object for UI
    categoryDetails: categoryScores, // Detailed array for analysis
    maxPossibleScore: 100,
    calculatedAt: new Date().toISOString(),
    configVersion: config.version
  };
}

/**
 * Determine quality class based on score and grading thresholds
 * @param {number} score - The calculated score (0-100)
 * @param {Object} grading - Grading configuration
 * @returns {Object} - Quality class information
 */
export function determineQualityClass(score, grading) {
  const grades = ['A', 'B', 'C', 'D'];
  
  for (const grade of grades) {
    const range = grading[grade];
    if (range && score >= range.min && score <= range.max) {
      return {
        grade,
        label: range.label,
        color: range.color,
        range: `${range.min}-${range.max}`
      };
    }
  }
  
  // Default to lowest grade if no match
  const defaultGrade = grading['D'] || { label: 'Tidak Terdefinisi', color: '#666666' };
  return {
    grade: 'D',
    label: defaultGrade.label,
    color: defaultGrade.color,
    range: 'N/A'
  };
}

/**
 * Validate survey values against configuration
 * @param {Object} values - Input values to validate
 * @param {Object} config - Survey configuration
 * @returns {Object} - Validation results
 */
export function validateSurveyValues(values, config) {
  const errors = [];
  const warnings = [];
  let isValid = true;

  config.categories.forEach(category => {
    category.subs.forEach(sub => {
      const value = values[sub.key];
      const fieldPath = `${category.key}.${sub.key}`;

      // Check required fields
      if (sub.required && (value === null || value === undefined || value === '')) {
        errors.push({
          field: fieldPath,
          message: `${sub.label} wajib diisi`,
          type: 'required'
        });
        isValid = false;
        return;
      }

      // Skip validation for empty optional fields
      if (!sub.required && (value === null || value === undefined || value === '')) {
        return;
      }

      // Validate by type with enhanced type support
      const validationResult = validateFieldByType(value, sub, fieldPath);
      
      if (validationResult.errors.length > 0) {
        errors.push(...validationResult.errors);
        isValid = false;
      }
      
      if (validationResult.warnings.length > 0) {
        warnings.push(...validationResult.warnings);
      }
    });
  });

  return {
    isValid,
    errors,
    warnings,
    summary: {
      totalFields: config.categories.reduce((sum, cat) => sum + cat.subs.length, 0),
      requiredFields: config.categories.reduce((sum, cat) => sum + cat.subs.filter(sub => sub.required).length, 0),
      filledFields: Object.keys(values).filter(key => values[key] !== null && values[key] !== undefined && values[key] !== '').length,
      errorCount: errors.length,
      warningCount: warnings.length
    }
  };
}

/**
 * Enhanced field validation by type
 * @param {*} value - Field value
 * @param {Object} fieldConfig - Field configuration
 * @param {string} fieldPath - Field path for error reporting
 * @returns {Object} - Validation result with errors and warnings
 */
function validateFieldByType(value, fieldConfig, fieldPath) {
  const errors = [];
  const warnings = [];
  const { type, min, max, k, options } = fieldConfig;

  try {
    const processedValue = preprocessValue(value, type);

    switch (type) {
      case 'boolean':
      case 'binary':
        if (!['boolean', 'string', 'number'].includes(typeof processedValue)) {
          errors.push({
            field: fieldPath,
            message: `${fieldConfig.label} harus berupa boolean atau dapat dikonversi ke boolean`,
            type: 'type_mismatch',
            receivedValue: value
          });
        }
        break;

      case 'ordinal':
      case 'likert':
        const ordinalValue = parseOrdinalValue(processedValue, k, options);
        if (ordinalValue === null) {
          errors.push({
            field: fieldPath,
            message: `${fieldConfig.label} harus berupa nilai ordinal yang valid`,
            type: 'invalid_ordinal',
            receivedValue: value
          });
        } else if (ordinalValue < 1 || ordinalValue > (k || 5)) {
          errors.push({
            field: fieldPath,
            message: `${fieldConfig.label} harus berada dalam rentang 1-${k || 5}`,
            type: 'out_of_range',
            receivedValue: value,
            expectedRange: `1-${k || 5}`
          });
        }
        break;

      case 'persentase':
      case 'percentage':
        const percentValue = parsePercentageValue(processedValue);
        if (percentValue === null) {
          errors.push({
            field: fieldPath,
            message: `${fieldConfig.label} harus berupa nilai persentase yang valid`,
            type: 'invalid_percentage',
            receivedValue: value
          });
        } else {
          const minPercent = min ?? 0;
          const maxPercent = max ?? 100;
          if (percentValue < minPercent || percentValue > maxPercent) {
            errors.push({
              field: fieldPath,
              message: `${fieldConfig.label} harus berada dalam rentang ${minPercent}%-${maxPercent}%`,
              type: 'out_of_range',
              receivedValue: value,
              expectedRange: `${minPercent}-${maxPercent}%`
            });
          }
        }
        break;

      case 'numerik':
      case 'numeric':
        const numericValue = parseNumericValue(processedValue);
        if (numericValue === null) {
          errors.push({
            field: fieldPath,
            message: `${fieldConfig.label} harus berupa nilai numerik yang valid`,
            type: 'invalid_numeric',
            receivedValue: value
          });
        } else if (min !== undefined && numericValue < min) {
          errors.push({
            field: fieldPath,
            message: `${fieldConfig.label} tidak boleh kurang dari ${min}`,
            type: 'below_minimum',
            receivedValue: value,
            minimum: min
          });
        } else if (max !== undefined && numericValue > max) {
          errors.push({
            field: fieldPath,
            message: `${fieldConfig.label} tidak boleh lebih dari ${max}`,
            type: 'above_maximum',
            receivedValue: value,
            maximum: max
          });
        }
        break;

      case 'score':
        const scoreValue = parseScoreValue(processedValue, min, max);
        if (scoreValue === null) {
          errors.push({
            field: fieldPath,
            message: `${fieldConfig.label} harus berupa nilai skor yang valid`,
            type: 'invalid_score',
            receivedValue: value
          });
        }
        break;

      default:
        // For unknown types, attempt auto-detection
        warnings.push({
          field: fieldPath,
          message: `Tipe field '${type}' tidak dikenal, menggunakan deteksi otomatis`,
          type: 'unknown_type',
          receivedValue: value
        });
        break;
    }
  } catch (error) {
    errors.push({
      field: fieldPath,
      message: `Error saat validasi: ${error.message}`,
      type: 'validation_error',
      receivedValue: value
    });
  }

  return { errors, warnings };
}

/**
 * Utility functions for field type management
 */

/**
 * Get supported field types with their descriptions
 * @returns {Object} - Mapping of field types to descriptions
 */
export function getSupportedFieldTypes() {
  return {
    'boolean': {
      description: 'Boolean (ya/tidak, true/false)',
      example: 'true, false, ya, tidak, 1, 0',
      normalization: '1 untuk true/ya, 0 untuk false/tidak'
    },
    'ordinal': {
      description: 'Skala ordinal (1-N)',
      example: '1, 2, 3, 4, 5 atau sangat buruk, buruk, cukup, baik, sangat baik',
      normalization: '(nilai - 1) / (maksimal - 1)',
      requiredParams: ['k (nilai maksimum)']
    },
    'persentase': {
      description: 'Persentase (0-100%)',
      example: '75, 85.5, 0, 100',
      normalization: 'nilai / 100'
    },
    'percentage': {
      description: 'Alias untuk persentase',
      example: '75%, 0.85 (rasio), 100',
      normalization: 'otomatis mendeteksi rasio vs persentase'
    },
    'numerik': {
      description: 'Nilai numerik dengan rentang',
      example: '5.5, 10, 15.2',
      normalization: '(nilai - min) / (max - min)',
      requiredParams: ['min (opsional)', 'max (opsional)']
    },
    'numeric': {
      description: 'Alias untuk numerik',
      example: 'Sama dengan numerik',
      normalization: 'Sama dengan numerik'
    },
    'likert': {
      description: 'Skala Likert standar',
      example: 'sangat tidak setuju, tidak setuju, netral, setuju, sangat setuju',
      normalization: 'Konversi ke skala numerik kemudian normalisasi ordinal',
      requiredParams: ['k (ukuran skala, default 5)']
    },
    'binary': {
      description: 'Nilai binary (0 atau 1)',
      example: '0, 1, false, true',
      normalization: '0 atau 1 langsung'
    },
    'score': {
      description: 'Skor langsung dengan normalisasi',
      example: '80 (dari 100), 0.8 (sudah dinormalisasi)',
      normalization: 'Normalisasi berdasarkan min-max atau langsung jika 0-1',
      requiredParams: ['min (default 0)', 'max (default 100)']
    }
  };
}

/**
 * Auto-detect field type based on value patterns
 * @param {Array} values - Array of sample values
 * @returns {Object} - Detected type and confidence
 */
export function autoDetectFieldType(values) {
  if (!values || values.length === 0) {
    return { type: 'numeric', confidence: 0 };
  }

  const nonEmptyValues = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonEmptyValues.length === 0) {
    return { type: 'numeric', confidence: 0 };
  }

  let booleanCount = 0;
  let numericCount = 0;
  let percentageCount = 0;
  let ordinalCount = 0;
  let minVal = Infinity;
  let maxVal = -Infinity;
  const uniqueValues = new Set();

  nonEmptyValues.forEach(value => {
    uniqueValues.add(value);
    
    // Check boolean patterns
    if (typeof value === 'boolean' || 
        (typeof value === 'string' && ['true', 'false', 'ya', 'tidak', 'yes', 'no'].includes(value.toLowerCase()))) {
      booleanCount++;
    }
    
    // Check numeric patterns
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
      numericCount++;
      minVal = Math.min(minVal, numericValue);
      maxVal = Math.max(maxVal, numericValue);
      
      // Check percentage patterns
      if ((numericValue >= 0 && numericValue <= 100) || 
          (typeof value === 'string' && value.includes('%'))) {
        percentageCount++;
      }
      
      // Check ordinal patterns (integers 1-10)
      if (Number.isInteger(numericValue) && numericValue >= 1 && numericValue <= 10) {
        ordinalCount++;
      }
    }
  });

  const total = nonEmptyValues.length;
  const uniqueCount = uniqueValues.size;

  // Detection logic with confidence scoring
  if (booleanCount / total >= 0.8) {
    return { 
      type: uniqueCount <= 2 ? 'boolean' : 'binary', 
      confidence: booleanCount / total,
      details: { uniqueValues: uniqueCount }
    };
  }

  if (numericCount / total >= 0.8) {
    // Determine numeric subtype
    if (ordinalCount / total >= 0.8 && uniqueCount <= 10 && minVal >= 1) {
      return { 
        type: 'ordinal', 
        confidence: ordinalCount / total,
        details: { k: maxVal, min: minVal, max: maxVal }
      };
    }
    
    if (percentageCount / total >= 0.6 || (minVal >= 0 && maxVal <= 100)) {
      return { 
        type: 'persentase', 
        confidence: percentageCount / total,
        details: { min: minVal, max: maxVal }
      };
    }
    
    return { 
      type: 'numerik', 
      confidence: numericCount / total,
      details: { min: minVal, max: maxVal }
    };
  }

  // Default to string/text handling as ordinal
  return { 
    type: 'ordinal', 
    confidence: 0.5,
    details: { k: uniqueCount, suggested: 'Consider manual type specification' }
  };
}

/**
 * Create field configuration with auto-detected parameters
 * @param {string} fieldKey - Field key
 * @param {string} label - Field label
 * @param {Array} sampleValues - Sample values for auto-detection
 * @param {Object} options - Additional options
 * @returns {Object} - Field configuration
 */
export function createFieldConfig(fieldKey, label, sampleValues = [], options = {}) {
  const detection = autoDetectFieldType(sampleValues);
  
  const config = {
    key: fieldKey,
    label: label,
    type: options.type || detection.type,
    required: options.required !== false,
    weight: options.weight || 1,
    description: options.description || `Auto-generated field configuration for ${label}`,
    ...detection.details
  };

  // Add type-specific configurations
  switch (config.type) {
    case 'ordinal':
    case 'likert':
      config.k = options.k || config.k || 5;
      if (options.options) config.options = options.options;
      break;
    
    case 'numerik':
    case 'numeric':
    case 'score':
      if (options.min !== undefined) config.min = options.min;
      if (options.max !== undefined) config.max = options.max;
      config.strict = options.strict || false;
      break;
    
    case 'persentase':
    case 'percentage':
      config.min = 0;
      config.max = 100;
      break;
  }

  return config;
}

/**
 * Validate and migrate legacy field configurations
 * @param {Object} fieldConfig - Existing field configuration
 * @returns {Object} - Updated field configuration
 */
export function migrateFieldConfig(fieldConfig) {
  const migrated = { ...fieldConfig };
  
  // Handle legacy type names
  const typeMapping = {
    'percent': 'persentase',
    'number': 'numerik',
    'scale': 'ordinal',
    'yesno': 'boolean'
  };
  
  if (typeMapping[migrated.type]) {
    migrated.type = typeMapping[migrated.type];
  }
  
  // Add missing required properties
  if (!migrated.required && migrated.required !== false) {
    migrated.required = true;
  }
  
  if (!migrated.weight) {
    migrated.weight = 1;
  }
  
  // Add type-specific defaults
  switch (migrated.type) {
    case 'ordinal':
      if (!migrated.k) migrated.k = 5;
      break;
    case 'persentase':
      migrated.min = 0;
      migrated.max = 100;
      break;
  }
  
  return migrated;
}
