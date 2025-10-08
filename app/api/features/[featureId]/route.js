import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '../../../../lib/prisma'
import { hasPermission, PERMISSIONS } from '../../../../lib/permissions'

/**
 * GET /api/features/[featureId] - Ambil detail feature tunggal
 * Supports both featureId (for GeoJSON) and database ID (for management)
 */
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !hasPermission(session.user.role, PERMISSIONS.FEATURE_VIEW)) {
      return NextResponse.json(
        { error: 'Akses ditolak. Anda tidak memiliki izin untuk melihat data features.' },
        { status: 403 }
      )
    }

    const { featureId } = await params
    const url = new URL(request.url)
    const format = url.searchParams.get('format') // 'geojson' (default) or 'management'

    // Check if featureId is a database ID (cuid pattern) or actual featureId
    const isDatabaseId = featureId.match(/^c[a-z0-9]{24}$/) // cuid pattern

    if (isDatabaseId) {
      // Handle database ID - for management interface
      const feature = await prisma.feature.findUnique({
        where: { id: featureId },
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

      if (!feature) {
        return NextResponse.json(
          { error: 'Feature tidak ditemukan' },
          { status: 404 }
        )
      }

      return NextResponse.json({
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
      })
    }

    // Handle featureId - for GeoJSON mapping
    // First try to get management format if requested
    if (format === 'management') {
      const feature = await prisma.feature.findUnique({
        where: { featureId },
        include: {
          surveys: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              config: {
                select: {
                  id: true,
                  scheme: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          pai: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              paiPhotos: {
                orderBy: {
                  createdAt: 'asc'
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      })

      if (!feature) {
        return NextResponse.json(
          { error: 'Feature tidak ditemukan' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        id: feature.id,
        featureId: feature.featureId,
        name: feature.name,
        type: feature.type,
        scheme: feature.scheme,
        sourceLayer: feature.sourceLayer,
        props: feature.props,
        surveys: feature.surveys,
        pai: feature.pai,
        createdAt: feature.createdAt,
        updatedAt: feature.updatedAt
      })
    }

    // Handle featureId - for GeoJSON mapping
    // Raw SQL untuk mengambil feature dengan geometry sebagai GeoJSON
    const query = `
      SELECT 
        id,
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

/**
 * PUT /api/features/[featureId] - Update feature (by database ID)
 */
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !hasPermission(session.user.role, PERMISSIONS.FEATURE_MANAGE)) {
      return NextResponse.json(
        { error: 'Akses ditolak. Anda tidak memiliki izin untuk mengubah data features.' },
        { status: 403 }
      )
    }

    const { featureId } = await params
    
    // Only allow updates via featureId (not database ID)
    const isDatabaseId = featureId.match(/^c[a-z0-9]{24}$/)
    if (isDatabaseId) {
      return NextResponse.json(
        { error: 'Update harus menggunakan featureId, bukan database ID' },
        { status: 400 }
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

    // Check if feature exists
    const existingFeature = await prisma.feature.findUnique({
      where: { featureId },
      select: { id: true, featureId: true }
    })

    if (!existingFeature) {
      return NextResponse.json(
        { error: 'Feature tidak ditemukan' },
        { status: 404 }
      )
    }

    // Update feature
    const updatedFeature = await prisma.feature.update({
      where: { featureId },
      data: {
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
      message: 'Feature berhasil diperbarui',
      feature: {
        id: updatedFeature.id,
        featureId: updatedFeature.featureId,
        name: updatedFeature.name,
        type: updatedFeature.type,
        scheme: updatedFeature.scheme,
        sourceLayer: updatedFeature.sourceLayer,
        props: updatedFeature.props,
        surveyCount: updatedFeature._count.surveys,
        createdAt: updatedFeature.createdAt,
        updatedAt: updatedFeature.updatedAt
      }
    })
    
  } catch (error) {
    console.error('Error updating feature:', error)
    return NextResponse.json(
      { error: 'Gagal mengubah feature', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/features/[featureId] - Delete feature (by database ID)
 */
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !hasPermission(session.user.role, PERMISSIONS.FEATURE_MANAGE)) {
      return NextResponse.json(
        { error: 'Akses ditolak. Anda tidak memiliki izin untuk menghapus data features.' },
        { status: 403 }
      )
    }

    const { featureId } = await params
    
    // Only allow deletes via featureId (not database ID)
    const isDatabaseId = featureId.match(/^c[a-z0-9]{24}$/)
    if (isDatabaseId) {
      return NextResponse.json(
        { error: 'Hapus harus menggunakan featureId, bukan database ID' },
        { status: 400 }
      )
    }

    // Check if feature exists
    const existingFeature = await prisma.feature.findUnique({
      where: { featureId },
      select: { 
        id: true, 
        featureId: true,
        _count: {
          select: {
            surveys: true
          }
        }
      }
    })

    if (!existingFeature) {
      return NextResponse.json(
        { error: 'Feature tidak ditemukan' },
        { status: 404 }
      )
    }

    // Delete related surveys first (cascade)
    if (existingFeature._count.surveys > 0) {
      await prisma.survey.deleteMany({
        where: { featureId: existingFeature.featureId }
      })
    }

    // Delete the feature
    await prisma.feature.delete({
      where: { featureId }
    })

    return NextResponse.json({
      message: 'Feature berhasil dihapus',
      deletedFeatureId: existingFeature.featureId,
      deletedSurveys: existingFeature._count.surveys
    })
    
  } catch (error) {
    console.error('Error deleting feature:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus feature', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/features/[featureId] - Update feature data (terutama scheme)
 * Endpoint untuk surveyor update scheme feature sebelum melakukan survey IKSI
 */
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !hasPermission(session.user.role, PERMISSIONS.FEATURE_EDIT)) {
      return NextResponse.json(
        { error: 'Akses ditolak. Anda tidak memiliki izin untuk mengubah data features.' },
        { status: 403 }
      )
    }

    const { featureId } = await params
    const body = await request.json()
    
    // Validate scheme value
    if (body.scheme && !['utama', 'tersier'].includes(body.scheme)) {
      return NextResponse.json(
        { error: 'Scheme tidak valid. Harus "utama" atau "tersier".' },
        { status: 400 }
      )
    }

    // Check if feature exists
    const existingFeature = await prisma.feature.findUnique({
      where: { featureId },
      select: {
        id: true,
        featureId: true,
        name: true,
        scheme: true
      }
    })

    if (!existingFeature) {
      return NextResponse.json(
        { error: 'Feature tidak ditemukan' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData = {}
    if (body.scheme !== undefined) updateData.scheme = body.scheme
    if (body.name !== undefined) updateData.name = body.name
    if (body.type !== undefined) updateData.type = body.type

    // Update feature
    const updatedFeature = await prisma.feature.update({
      where: { featureId },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      select: {
        id: true,
        featureId: true,
        name: true,
        type: true,
        scheme: true,
        sourceLayer: true,
        updatedAt: true
      }
    })

    // Log audit trail
    const { AuditLogger } = await import('../../../../lib/audit')
    await AuditLogger.log({
      userId: session.user.id,
      action: 'UPDATE',
      entityType: 'Feature',
      entityId: updatedFeature.featureId,
      oldValues: { scheme: existingFeature.scheme },
      newValues: { scheme: updatedFeature.scheme },
      details: `Updated scheme from "${existingFeature.scheme || 'null'}" to "${updatedFeature.scheme}"`
    })

    return NextResponse.json({
      message: 'Feature berhasil diupdate',
      feature: updatedFeature,
      changes: {
        scheme: {
          from: existingFeature.scheme,
          to: updatedFeature.scheme
        }
      }
    })
    
  } catch (error) {
    console.error('Error updating feature:', error)
    return NextResponse.json(
      { error: 'Gagal mengupdate feature', details: error.message },
      { status: 500 }
    )
  }
}
