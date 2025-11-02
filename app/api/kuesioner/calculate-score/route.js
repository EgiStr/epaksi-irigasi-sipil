import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

import { calculateKuesionerScore } from '../../../../lib/kuesioner-scoring'

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
    
    // Calculate score using shared utility
    const result = await calculateKuesionerScore(scheme, values)
    
    // Return result
    return NextResponse.json(result)
    
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
