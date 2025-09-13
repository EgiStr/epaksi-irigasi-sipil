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
  const { type, k, min, max } = fieldConfig;
  
  // Handle null/undefined values
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  switch (type) {
    case 'boolean':
      // Boolean: 1 for true/yes, 0 for false/no
      return value === true || value === 'true' || value === 'ya' || value === 1 ? 1 : 0;
    
    case 'ordinal':
      // Ordinal scale: (value - 1) / (k - 1)
      const ordinalValue = parseInt(value);
      if (isNaN(ordinalValue) || ordinalValue < 1 || ordinalValue > k) {
        return 0;
      }
      return k === 1 ? 1 : (ordinalValue - 1) / (k - 1);
    
    case 'persentase':
      // Percentage: value / 100
      const percentValue = parseFloat(value);
      if (isNaN(percentValue)) {
        return 0;
      }
      return Math.min(Math.max(percentValue / 100, 0), 1);
    
    case 'numerik':
      // Numeric range: (value - min) / (max - min)
      const numericValue = parseFloat(value);
      if (isNaN(numericValue) || min === undefined || max === undefined) {
        return 0;
      }
      if (max === min) {
        return numericValue >= min ? 1 : 0;
      }
      const normalized = (numericValue - min) / (max - min);
      return Math.min(Math.max(normalized, 0), 1);
    
    default:
      console.warn(`Unknown field type: ${type}`);
      return 0;
  }
}

/**
 * Calculate sub-criteria score
 * @param {*} value - The input value
 * @param {Object} subConfig - Sub-criteria configuration
 * @returns {Object} - { normalizedValue, weightedScore, maxScore }
 */
export function calculateSubScore(value, subConfig) {
  const normalizedValue = normalizeValue(value, subConfig);
  const weightedScore = normalizedValue * subConfig.weight;
  const maxScore = subConfig.weight;
  
  return {
    normalizedValue,
    weightedScore,
    maxScore,
    field: subConfig.key,
    label: subConfig.label,
    weight: subConfig.weight
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

      // Validate by type
      switch (sub.type) {
        case 'ordinal':
          const ordinalValue = parseInt(value);
          if (isNaN(ordinalValue) || ordinalValue < 1 || ordinalValue > sub.k) {
            errors.push({
              field: fieldPath,
              message: `${sub.label} harus berupa angka antara 1-${sub.k}`,
              type: 'range'
            });
            isValid = false;
          }
          break;

        case 'persentase':
          const percentValue = parseFloat(value);
          if (isNaN(percentValue) || percentValue < 0 || percentValue > 100) {
            errors.push({
              field: fieldPath,
              message: `${sub.label} harus berupa angka antara 0-100`,
              type: 'range'
            });
            isValid = false;
          }
          break;

        case 'numerik':
          const numericValue = parseFloat(value);
          if (isNaN(numericValue)) {
            errors.push({
              field: fieldPath,
              message: `${sub.label} harus berupa angka`,
              type: 'type'
            });
            isValid = false;
          } else if (sub.min !== undefined && numericValue < sub.min) {
            warnings.push({
              field: fieldPath,
              message: `${sub.label} di bawah nilai minimum (${sub.min})`,
              type: 'warning'
            });
          } else if (sub.max !== undefined && numericValue > sub.max) {
            warnings.push({
              field: fieldPath,
              message: `${sub.label} di atas nilai maksimum (${sub.max})`,
              type: 'warning'
            });
          }
          break;

        case 'boolean':
          if (typeof value !== 'boolean' && !['true', 'false', 'ya', 'tidak', '1', '0'].includes(String(value).toLowerCase())) {
            errors.push({
              field: fieldPath,
              message: `${sub.label} harus berupa ya/tidak`,
              type: 'type'
            });
            isValid = false;
          }
          break;
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
