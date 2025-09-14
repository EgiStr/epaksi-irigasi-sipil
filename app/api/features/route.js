import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '../../../lib/prisma'
import { hasPermission, PERMISSIONS } from '../../../lib/permissions'

/**
 * GET /api/features - Ambil features dengan filter spatial dan layer
 * Query params:
 * - source_layer: filter berdasarkan layer
 * - bbox: bounding box (minx,miny,maxx,maxy)
 * - scheme: filter skema (utama/tersier)
 * - limit: maksimal hasil (default 5000)
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !hasPermission(session.user.role, PERMISSIONS.FEATURE_VIEW)) {
      return NextResponse.json(
        { error: 'Akses ditolak. Anda tidak memiliki izin untuk melihat data features.' },
        { status: 403 }
      )
    }
    const { searchParams } = new URL(request.url)
    const sourceLayer = searchParams.get('source_layer')
    const bbox = searchParams.get('bbox')
    const scheme = searchParams.get('scheme')
    const limit = parseInt(searchParams.get('limit') || '5000')

    // Build where conditions
    const where = {}
    if (sourceLayer) {
      where.sourceLayer = sourceLayer
    }
    if (scheme) {
      where.scheme = scheme
    }

    // For spatial queries, we'll use raw SQL with PostGIS
    let features
    if (bbox) {
      const [minx, miny, maxx, maxy] = bbox.split(',').map(Number)
      
      // Validate bbox
      if (isNaN(minx) || isNaN(miny) || isNaN(maxx) || isNaN(maxy)) {
        return NextResponse.json(
          { error: 'Format bbox tidak valid. Gunakan: minx,miny,maxx,maxy' },
          { status: 400 }
        )
      }

      // Raw SQL query with PostGIS for spatial filtering
      const whereClause = []
      const params = [minx, miny, maxx, maxy, limit]
      let paramIndex = 5

      if (sourceLayer) {
        whereClause.push(`source_layer = $${++paramIndex}`)
        params.push(sourceLayer)
      }
      if (scheme) {
        whereClause.push(`scheme = $${++paramIndex}`)
        params.push(scheme)
      }

      const whereSQL = whereClause.length > 0 ? `AND ${whereClause.join(' AND ')}` : ''

      const query = `
        SELECT 
          feature_id,
          name,
          type,
          scheme,
          source_layer,
          props,
          ST_AsGeoJSON(geom)::json as geometry,
          created_at
        FROM features 
        WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
        ${whereSQL}
        ORDER BY created_at DESC
        LIMIT $5
      `

      const result = await prisma.$queryRawUnsafe(query, ...params)
      
      // Convert to GeoJSON FeatureCollection
      const geoJsonFeatures = result.map(row => ({
        type: 'Feature',
        id: row.feature_id,
        properties: {
          featureId: row.feature_id,
          name: row.name,
          type: row.type,
          scheme: row.scheme,
          sourceLayer: row.source_layer,
          createdAt: row.created_at,
          ...(row.props || {})
        },
        geometry: row.geometry
      }))

      features = {
        type: 'FeatureCollection',
        features: geoJsonFeatures
      }
    } else {
      // Non-spatial query using raw SQL to include geometry
      const whereClause = []
      const params = [limit]
      let paramIndex = 1

      if (sourceLayer) {
        whereClause.push(`source_layer = $${++paramIndex}`)
        params.push(sourceLayer)
      }
      
      if (scheme) {
        whereClause.push(`scheme = $${++paramIndex}`)
        params.push(scheme)
      }

      const whereSQL = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : ''

      const query = `
        SELECT 
          feature_id,
          name,
          type,
          scheme,
          source_layer,
          props,
          ST_AsGeoJSON(geom)::json as geometry,
          created_at
        FROM features 
        ${whereSQL}
        ORDER BY created_at DESC
        LIMIT $1
      `

      const result = await prisma.$queryRawUnsafe(query, ...params)
      
      // Convert to GeoJSON FeatureCollection
      const geoJsonFeatures = result.map(row => ({
        type: 'Feature',
        id: row.feature_id,
        properties: {
          featureId: row.feature_id,
          name: row.name,
          type: row.type,
          scheme: row.scheme,
          sourceLayer: row.source_layer,
          createdAt: row.created_at,
          ...(row.props || {})
        },
        geometry: row.geometry
      }))

      features = {
        type: 'FeatureCollection',
        features: geoJsonFeatures
      }
    }

    return NextResponse.json(features)
    
  } catch (error) {
    console.error('Error fetching features:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data features', details: error.message },
      { status: 500 }
    )
  }
}
