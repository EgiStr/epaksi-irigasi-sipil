// Shared scoring utilities for kuesioner calculations
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Load kuesioner configuration from database
export async function loadKuesionerConfig(scheme) {
  try {
    // Load from database like survey configs
    const config = await prisma.config.findFirst({
      where: {
        scheme: scheme,
        active: true
      }
    })

    if (!config) {
      throw new Error(`Konfigurasi kuesioner untuk scheme '${scheme}' tidak ditemukan atau tidak aktif`)
    }

    return config.json
  } catch (error) {
    console.error('Error loading kuesioner config from database:', error)
    throw new Error(`Config file not found for scheme: ${scheme}`)
  }
}

// Calculate score for a field (lowest level)
export function calculateFieldScore(value, weight) {
  if (!value || isNaN(value)) return 0
  const numValue = parseFloat(value)
  // Value is already 1-100, so we just apply the weight
  return (numValue * weight) / 100
}

// Calculate score for a sub-category (contains fields)
export function calculateSubScore(sub, values) {
  if (!sub.subs || sub.subs.length === 0) return 0

  let totalScore = 0
  const details = {}

  for (const field of sub.subs) {
    const value = values[field.key]
    const fieldScore = calculateFieldScore(value, field.weight)
    totalScore += fieldScore

    details[field.key] = {
      value: value || 0,
      weight: field.weight,
      score: fieldScore
    }
  }

  return { score: totalScore, details }
}

// Calculate score for a category (contains subs)
export function calculateCategoryScore(category, values) {
  if (!category.subs || category.subs.length === 0) return { score: 0, weight: category.weight, weightedScore: 0, subs: {} }

  let categoryScore = 0
  const subDetails = {}

  for (const sub of category.subs) {
    if (sub.subs && sub.subs.length > 0) {
      // Sub has fields - calculate from fields
      const subResult = calculateSubScore(sub, values)
      const weightedSubScore = (subResult.score * sub.weight) / 100
      categoryScore += weightedSubScore
      subDetails[sub.key] = {
        label: sub.label,
        score: subResult.score,
        weight: sub.weight,
        weightedScore: weightedSubScore,
        fields: subResult.details
      }
    } else {
      // Sub is a direct field
      const value = values[sub.key]
      const fieldScore = calculateFieldScore(value, sub.weight)
      categoryScore += fieldScore
      subDetails[sub.key] = {
        label: sub.label,
        value: value || 0,
        weight: sub.weight,
        score: fieldScore
      }
    }
  }

  // Apply category weight
  const finalCategoryScore = (categoryScore * category.weight) / 100

  return {
    score: categoryScore,
    weight: category.weight,
    weightedScore: finalCategoryScore,
    subs: subDetails
  }
}

// Determine quality class based on score
export function determineQualityClass(score, grading) {
  if (!grading) {
    // Default grading with new 4-level system
    if (score >= 80) return 'BAIK_SEKALI'
    if (score >= 70) return 'BAIK'
    if (score >= 55) return 'KURANG'
    return 'JELEK'
  }

  // Check grading in order of specificity (highest score first)
  const grades = Object.entries(grading).sort(([,a], [,b]) => (b.min || 0) - (a.min || 0))

  for (const [grade, criteria] of grades) {
    if (score >= (criteria.min || 0)) {
      return grade
    }
  }

  return 'JELEK' // Default fallback
}

// Main calculation function
export async function calculateKuesionerScore(scheme, values) {
  // Validate scheme
  const validSchemes = [
    'primer', 'sekunder', 'tersier', 'kuarter', // saluran
    'bendung-tetap', 'jembatan', 'gudang', 'perumahan', 'box-tersier', 'box-kuarter',
    'syphon', 'gorong-gorong', 'gorong-gorong-silang', 'pelimpah-samping', 'terjunan',
    'tempat-cuci', 'sadap', 'bagi-sadap', 'talang', 'pengukur-debit' // bangunan
  ];

  if (!validSchemes.includes(scheme)) {
    throw new Error(`scheme harus salah satu: ${validSchemes.join(', ')}`)
  }

  // Load config
  const config = await loadKuesionerConfig(scheme)

  if (!config || !config.categories) {
    throw new Error('Konfigurasi kuesioner tidak valid')
  }

  // Calculate scores for each category
  let totalScore = 0
  const categoryScores = {}

  for (const category of config.categories) {
    const categoryResult = calculateCategoryScore(category, values)
    totalScore += categoryResult.weightedScore

    categoryScores[category.key] = {
      label: category.label,
      score: categoryResult.score,
      weight: categoryResult.weight,
      weightedScore: categoryResult.weightedScore,
      subs: categoryResult.subs
    }
  }

  // Determine quality class
  const qualityClass = determineQualityClass(totalScore, config.grading)

  return {
    score: parseFloat(totalScore.toFixed(2)),
    qualityClass,
    categoryScores,
    grading: config.grading
  }
}