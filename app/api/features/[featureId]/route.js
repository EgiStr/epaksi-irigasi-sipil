import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '../../../../lib/prisma'
import { hasPermission, PERMISSIONS } from '../../../../lib/permissions'

/**
 * GET /api/features/[featureId] - Ambil detail feature tunggal
 */
export async function GET(request, { params }) {
  try {
    const session = await getServerSession()
    
    if (!session || !hasPermission(session.user.role, PERMISSIONS.FEATURE_VIEW)) {
      return NextResponse.json(
        { error: 'Akses ditolak. Anda tidak memiliki izin untuk melihat data features.' },
        { status: 403 }
      )
    }

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
