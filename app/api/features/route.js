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
    const format = searchParams.get('format') // 'geojson' (default) or 'management'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '5000')

    // Management format - for admin tables
    if (format === 'management') {
      const skip = (page - 1) * limit
      
      // Build where conditions
      const where = {}
      if (sourceLayer) {
        where.sourceLayer = sourceLayer
      }
      if (scheme) {
        where.scheme = scheme
      }

      // Get features with basic data for management
      const [features, totalCount] = await Promise.all([
        prisma.feature.findMany({
          where,
          select: {
            id: true,
            featureId: true,
            name: true,
            type: true,
            scheme: true,
            sourceLayer: true,
            props: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                surveys: true
              }
            }
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.feature.count({ where })
      ])

      return NextResponse.json({
        features: features.map(feature => ({
          id: feature.id,
          featureId: feature.featureId,
          name: feature.name,
          type: feature.type,
          scheme: feature.scheme,
          sourceLayer: feature.sourceLayer,
          props: feature.props,
          surveyCount: feature._count.surveys,
          createdAt: feature.createdAt,
          updatedAt: feature.updatedAt
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      })
    }

    // GeoJSON format - for mapping (existing logic)
    // Build where conditions for spatial queries
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

/**
 * POST /api/features - Create new feature
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !hasPermission(session.user.role, PERMISSIONS.FEATURE_MANAGE)) {
      return NextResponse.json(
        { error: 'Akses ditolak. Anda tidak memiliki izin untuk membuat data features.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, type, scheme, sourceLayer, props } = body

    // Validate required fields
    if (!sourceLayer) {
      return NextResponse.json(
        { error: 'Source layer wajib diisi' },
        { status: 400 }
      )
    }

    // Validate scheme if provided
    if (scheme && !['utama', 'tersier'].includes(scheme)) {
      return NextResponse.json(
        { error: 'Scheme harus berupa "utama" atau "tersier"' },
        { status: 400 }
      )
    }

    // Validate props is valid JSON object
    if (props && typeof props !== 'object') {
      return NextResponse.json(
        { error: 'Properties harus berupa object JSON yang valid' },
        { status: 400 }
      )
    }

    // Generate unique featureId
    const generateFeatureId = () => {
      const timestamp = Date.now().toString(36)
      const random = Math.random().toString(36).substring(2, 8)
      return `feat_${timestamp}_${random}`
    }

    let featureId = generateFeatureId()
    
    // Ensure featureId is unique
    let attempts = 0
    while (attempts < 5) {
      const existingFeature = await prisma.feature.findUnique({
        where: { featureId },
        select: { id: true }
      })
      
      if (!existingFeature) break
      
      featureId = generateFeatureId()
      attempts++
    }

    if (attempts >= 5) {
      return NextResponse.json(
        { error: 'Gagal menggenerate featureId yang unik' },
        { status: 500 }
      )
    }

    // Create feature
    const newFeature = await prisma.feature.create({
      data: {
        featureId,
        name: name || null,
        type: type || null,
        scheme: scheme || null,
        sourceLayer,
        props: props || null
      },
      select: {
        id: true,
        featureId: true,
        name: true,
        type: true,
        scheme: true,
        sourceLayer: true,
        props: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            surveys: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Feature berhasil dibuat',
      feature: {
        id: newFeature.id,
        featureId: newFeature.featureId,
        name: newFeature.name,
        type: newFeature.type,
        scheme: newFeature.scheme,
        sourceLayer: newFeature.sourceLayer,
        props: newFeature.props,
        surveyCount: newFeature._count.surveys,
        createdAt: newFeature.createdAt,
        updatedAt: newFeature.updatedAt
      }
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating feature:', error)
    return NextResponse.json(
      { error: 'Gagal membuat feature', details: error.message },
      { status: 500 }
    )
  }
}
