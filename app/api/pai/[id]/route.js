import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { updatePAISchema } from '@/lib/validations/pai-schema'
import { 
  convertToEPSG4326, 
  normalizePAIData, 
  calculateLineStringLength,
  formatPAIResponse
} from '@/lib/pai/utils'

// GET /api/pai/[id] - Get PAI detail
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
    }

    const { id } = await params

    const pai = await prisma.pAI.findUnique({
      where: { id },
      include: {
        feature: {
          select: {
            featureId: true,
            name: true,
            type: true,
            scheme: true,
            props: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!pai) {
      return NextResponse.json({ error: 'PAI tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({
      pai: formatPAIResponse(pai)
    })

  } catch (error) {
    console.error('Error fetching PAI detail:', error)
    return NextResponse.json({ 
      error: 'Gagal mengambil detail PAI',
      details: error.message
    }, { status: 500 })
  }
}

// PUT /api/pai/[id] - Update PAI
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
    }

    // Check permissions
    const userRole = session.user.role
    if (!['SUPERADMIN', 'ADMIN', 'SURVEYOR'].includes(userRole)) {
      return NextResponse.json({ 
        error: 'Tidak memiliki izin untuk mengubah PAI' 
      }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    // Validate request body
    const validationResult = updatePAISchema.safeParse({ id, ...body })
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Data tidak valid',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    // Check if PAI exists
    const existingPAI = await prisma.pAI.findUnique({
      where: { id },
      include: { feature: true }
    })

    if (!existingPAI) {
      return NextResponse.json({ error: 'PAI tidak ditemukan' }, { status: 404 })
    }

    // Check if user can edit this PAI (own records or admin)
    if (existingPAI.createdBy !== session.user.id && !['SUPERADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ 
        error: 'Tidak memiliki izin untuk mengubah PAI ini' 
      }, { status: 403 })
    }

    const { paiData, photos, paiGeomGeoJSON, ...otherFields } = validationResult.data

    // Build update data
    const updateData = {}

    // Update PAI data if provided
    if (paiData) {
      const normalizedPaiData = normalizePAIData(existingPAI.paiType, paiData, paiGeomGeoJSON)
      updateData.paiData = normalizedPaiData
    }

    // Update photos if provided
    if (photos !== undefined) {
      updateData.photos = photos
    }

    // Process geometry if provided
    if (paiGeomGeoJSON) {
      const normalizedGeom = convertToEPSG4326(paiGeomGeoJSON)
      updateData.geom = geoJSONToWKT(normalizedGeom)
      
      // Recalculate length for saluran
      if (existingPAI.paiType === 'saluran' && normalizedGeom.type === 'LineString') {
        updateData.lengthM = calculateLineStringLength(normalizedGeom)
      }
    }

    // Add other fields
    Object.assign(updateData, otherFields)

    // Update PAI record
    const updatedPAI = await prisma.pAI.update({
      where: { id },
      data: updateData,
      include: {
        feature: {
          select: {
            featureId: true,
            name: true,
            type: true,
            scheme: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'PAI berhasil diperbarui',
      pai: formatPAIResponse(updatedPAI)
    })

  } catch (error) {
    console.error('Error updating PAI:', error)
    return NextResponse.json({ 
      error: 'Gagal memperbarui PAI',
      details: error.message
    }, { status: 500 })
  }
}

// DELETE /api/pai/[id] - Delete PAI
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
    }

    // Check permissions
    const userRole = session.user.role
    if (!['SUPERADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ 
        error: 'Tidak memiliki izin untuk menghapus PAI' 
      }, { status: 403 })
    }

    const { id } = await params

    // Check if PAI exists
    const existingPAI = await prisma.pAI.findUnique({
      where: { id }
    })

    if (!existingPAI) {
      return NextResponse.json({ error: 'PAI tidak ditemukan' }, { status: 404 })
    }

    // Delete PAI
    await prisma.pAI.delete({
      where: { id }
    })

    return NextResponse.json({
      message: 'PAI berhasil dihapus',
      deletedId: id
    })

  } catch (error) {
    console.error('Error deleting PAI:', error)
    return NextResponse.json({ 
      error: 'Gagal menghapus PAI',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * Convert GeoJSON to WKT format for PostGIS
 * @param {Object} geoJSON - GeoJSON object
 * @returns {string} WKT string
 */
function geoJSONToWKT(geoJSON) {
  if (!geoJSON || !geoJSON.coordinates) return null

  const { type, coordinates } = geoJSON

  switch (type) {
    case 'Point':
      return `POINT(${coordinates[0]} ${coordinates[1]})`
    
    case 'LineString':
      const lineCoords = coordinates.map(coord => `${coord[0]} ${coord[1]}`).join(', ')
      return `LINESTRING(${lineCoords})`
    
    case 'Polygon':
      const polygonRings = coordinates.map(ring => {
        const ringCoords = ring.map(coord => `${coord[0]} ${coord[1]}`).join(', ')
        return `(${ringCoords})`
      }).join(', ')
      return `POLYGON(${polygonRings})`
    
    default:
      throw new Error(`Unsupported geometry type: ${type}`)
  }
}