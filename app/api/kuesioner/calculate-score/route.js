import { NextResponse } from 'next/server'
import { calculateKuesionerScore } from '../../../../lib/kuesioner-scoring'

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
