import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

/**
 * GET /api/features/[featureId] - Ambil detail feature tunggal
 */
export async function GET(request, { params }) {
  try {
    const { featureId } = params

    // Raw SQL untuk mengambil feature dengan geometry sebagai GeoJSON
    const query = `
      SELECT 
        feature_id,
        name,
        type,
        scheme,
        source_layer,
        props,
        ST_AsGeoJSON(geom)::json as geometry,
        created_at,
        updated_at
      FROM features 
      WHERE feature_id = $1
    `

    const result = await prisma.$queryRawUnsafe(query, featureId)
    
    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Feature tidak ditemukan' },
        { status: 404 }
      )
    }

    const row = result[0]
    const feature = {
      type: 'Feature',
      id: row.feature_id,
      properties: {
        featureId: row.feature_id,
        name: row.name,
        type: row.type,
        scheme: row.scheme,
        sourceLayer: row.source_layer,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...(row.props || {})
      },
      geometry: row.geometry
    }

    return NextResponse.json(feature)
    
  } catch (error) {
    console.error('Error fetching feature:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil detail feature', details: error.message },
      { status: 500 }
    )
  }
}
