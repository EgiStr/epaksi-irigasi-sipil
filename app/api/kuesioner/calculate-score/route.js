import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Calculate kuesioner score based on hierarchical weights
 * Formula: Weighted Sum with nested categories
 * 
 * Structure:
 * - Main Category (e.g., S01, S21) -> weight (e.g., 10%)
 *   - Sub Category (e.g., S01_01) -> weight (e.g., 5%)
 *     - Field (e.g., S01_01_01) -> weight (e.g., 50%) + input value (1-100)
 * 
 * Calculation:
 * 1. Field Score = (input_value * field_weight) / 100
 * 2. Sub Category Score = Sum of all field scores
 * 3. Category Score = (sub_category_score * sub_weight) / sum_of_sub_weights
 * 4. Total Score = Sum of all weighted category scores
 */

// Load kuesioner configuration
async function loadKuesionerConfig(scheme) {
  try {
    // Read from file system directly (server-side)
    const configPath = join(process.cwd(), 'config', `kuesioner-${scheme}.json`)
    const fileContent = readFileSync(configPath, 'utf-8')
    const config = JSON.parse(fileContent)
    return config
  } catch (error) {
    console.error('Error loading kuesioner config:', error)
    throw new Error(`Config file not found for scheme: ${scheme}`)
  }
}

// Calculate score for a field (lowest level)
function calculateFieldScore(value, weight) {
  if (!value || isNaN(value)) return 0
  const numValue = parseFloat(value)
  // Value is already 1-100, so we just apply the weight
  return (numValue * weight) / 100
}

// Calculate score for a sub-category (contains fields)
function calculateSubScore(sub, values) {
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
  
  return {
    score: totalScore,
    details
  }
}

// Calculate score for a main category (contains sub-categories)
function calculateCategoryScore(category, values) {
  if (!category.subs || category.subs.length === 0) return 0
  
  let categoryScore = 0
  const subDetails = {}
  
  for (const sub of category.subs) {
    const subResult = calculateSubScore(sub, values)
    const weightedSubScore = (subResult.score * sub.weight) / 100
    categoryScore += weightedSubScore
    
    subDetails[sub.key] = {
      score: subResult.score,
      weight: sub.weight,
      weightedScore: weightedSubScore,
      details: subResult.details
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
function determineQualityClass(score, grading) {
  if (!grading) {
    // Default grading
    if (score >= 70) return 'BAIK'
    if (score >= 40) return 'SEDANG'
    return 'JELEK'
  }
  
  // Use config grading
  for (const [className, config] of Object.entries(grading)) {
    if (score >= config.min && score <= config.max) {
      return className
    }
  }
  
  return 'TIDAK TERDEFINISI'
}

// POST /api/kuesioner/calculate-score
export async function POST(request) {
  try {
    const body = await request.json()
    const { scheme, values } = body
    
    // Validate input
    if (!scheme || !values) {
      return NextResponse.json(
        { error: 'scheme dan values wajib diisi' },
        { status: 400 }
      )
    }
    
    // Validate scheme
    if (!['primer', 'sekunder', 'tersier', 'kuarter'].includes(scheme)) {
      return NextResponse.json(
        { error: 'scheme harus: primer, sekunder, tersier, atau kuarter' },
        { status: 400 }
      )
    }
    
    // Load config
    const config = await loadKuesionerConfig(scheme)
    
    if (!config || !config.categories) {
      return NextResponse.json(
        { error: 'Konfigurasi kuesioner tidak valid' },
        { status: 500 }
      )
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
    
    // Return result
    return NextResponse.json({
      score: parseFloat(totalScore.toFixed(2)),
      qualityClass,
      categoryScores,
      grading: config.grading
    })
    
  } catch (error) {
    console.error('Error calculating kuesioner score:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal menghitung skor' },
      { status: 500 }
    )
  }
}

// GET method not allowed
export async function GET() {
  return NextResponse.json(
    { error: 'Method GET tidak diizinkan. Gunakan POST.' },
    { status: 405 }
  )
}
