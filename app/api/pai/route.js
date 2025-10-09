import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { 
  createPAISchema, 
  updatePAISchema,
  queryPAISchema 
} from '@/lib/validations/pai-schema'
import { 
  convertToEPSG4326, 
  normalizePAIData, 
  calculateLineStringLength,
  formatPAIResponse,
  buildPAIFilters
} from '@/lib/pai/utils'

// GET /api/pai - List PAI dengan filter
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    
    // Prepare query params with proper defaults
    const queryParams = {
      featureId: searchParams.get('featureId'),
      paiType: searchParams.get('paiType'),
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      latest: searchParams.get('latest')
    }
    
    
    const queryResult = queryPAISchema.safeParse(queryParams)

    if (!queryResult.success) {
      return NextResponse.json({ 
        error: 'Parameter query tidak valid',
        details: queryResult.error.errors,
        received: queryParams
      }, { status: 400 })
    }

    const { featureId, paiType, page, limit, latest } = queryResult.data

    // Build where clause
    const where = buildPAIFilters({ featureId, paiType })

    // Get total count
    const total = await prisma.pAI.count({ where })

    // Build query options
    const queryOptions = {
      where,
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
      },
      orderBy: { createdAt: 'desc' }
    }

    let pai
    if (latest && featureId) {
      // Get latest PAI for specific feature
      pai = await prisma.pAI.findFirst(queryOptions)
      
      return NextResponse.json({
        pai: pai ? formatPAIResponse(pai) : null
      })
    } else {
      // Paginated list
      const skip = (page - 1) * limit
      queryOptions.skip = skip
      queryOptions.take = limit

      pai = await prisma.pAI.findMany(queryOptions)

      return NextResponse.json({
        pai: pai.map(formatPAIResponse),
        pagination: {
          page,
          totalPages: Math.ceil(total / limit),
          total,
          limit
        }
      })
    }

  } catch (error) {
    console.error('Error fetching PAI:', error)
    return NextResponse.json({ 
      error: 'Gagal mengambil data PAI',
      details: error.message
    }, { status: 500 })
  }
}

// POST /api/pai - Create PAI
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
    }

    // Check permissions
    const userRole = session.user.role
    if (!['SUPERADMIN', 'ADMIN', 'SURVEYOR'].includes(userRole)) {
      return NextResponse.json({ 
        error: 'Tidak memiliki izin untuk membuat PAI' 
      }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = createPAISchema.safeParse(body)
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.errors)
      return NextResponse.json({ 
        error: 'Data tidak valid',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { featureId, paiType, paiData, paiGeomGeoJSON, tahun } = validationResult.data

    // Default tahun ke tahun saat ini jika tidak diberikan
    const paiTahun = tahun || new Date().getFullYear()

    // Check if feature exists
    const feature = await prisma.feature.findUnique({
      where: { featureId }
    })

    if (!feature) {
      return NextResponse.json({ 
        error: 'Feature tidak ditemukan' 
      }, { status: 404 })
    }

    // Normalize PAI data (geometri akan diambil dari Feature)
    const normalizedPaiData = normalizePAIData(paiType, paiData, null)

    // Check if PAI exists for this feature and year
    const existingPAI = await prisma.pAI.findUnique({
      where: {
        featureId_tahun: {
          featureId,
          tahun: paiTahun
        }
      }
    })

    let pai
    if (existingPAI) {
      // Update existing PAI (same year)
      pai = await prisma.pAI.update({
        where: { id: existingPAI.id },
        data: {
          paiType,
          paiData: normalizedPaiData,
          updatedAt: new Date()
        },
        include: {
          feature: {
            select: {
              featureId: true,
              name: true,
              type: true,
              scheme: true,
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
        message: `PAI tahun ${paiTahun} berhasil diperbarui`,
        pai: formatPAIResponse(pai),
        isUpdate: true
      })
    } else {
      // Create new PAI record (different year or first time)
      pai = await prisma.pAI.create({
        data: {
          featureId,
          paiType,
          tahun: paiTahun,
          paiData: normalizedPaiData,
          photos: null, // Legacy field, photos now managed via PhotoManager
          createdBy: session.user.id
        },
        include: {
          feature: {
            select: {
              featureId: true,
              name: true,
              type: true,
              scheme: true,
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
        message: `PAI tahun ${paiTahun} berhasil dibuat`,
        pai: formatPAIResponse(pai),
        isUpdate: false
      }, { status: 201 })
    }

  } catch (error) {
    console.error('Error creating PAI:', error)
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: 'PAI sudah ada untuk feature ini' 
      }, { status: 409 })
    }

    return NextResponse.json({ 
      error: 'Gagal membuat PAI',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * PUT /api/pai
 * Update existing PAI
 */
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
    }

    // Check permissions
    const userRole = session.user.role
    if (!['SUPERADMIN', 'ADMIN', 'SURVEYOR'].includes(userRole)) {
      return NextResponse.json({ 
        error: 'Tidak memiliki izin untuk mengupdate PAI' 
      }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate request body - should include id for update
    const updateValidationResult = updatePAISchema.safeParse(body)
    if (!updateValidationResult.success) {
      console.error('Update validation failed:', updateValidationResult.error.errors)
      return NextResponse.json({ 
        error: 'Data tidak valid untuk update',
        details: updateValidationResult.error.errors
      }, { status: 400 })
    }

    const { id, featureId, paiType, paiData, paiGeomGeoJSON } = updateValidationResult.data

    // Check if PAI exists and user has permission to update
    const existingPAI = await prisma.pAI.findUnique({
      where: { id },
      include: { user: true }
    })

    if (!existingPAI) {
      return NextResponse.json({ 
        error: 'PAI tidak ditemukan' 
      }, { status: 404 })
    }

    // Check if user can update this PAI (owner or admin)
    if (existingPAI.createdBy !== session.user.id && !['SUPERADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ 
        error: 'Tidak memiliki izin untuk mengupdate PAI ini' 
      }, { status: 403 })
    }

    // Normalize PAI data (geometri akan diambil dari Feature)
    const normalizedData = normalizePAIData(paiData, paiType)

    // Update PAI (photos are now managed separately)
    const updatedPAI = await prisma.pAI.update({
      where: { id },
      data: {
        paiType,
        paiData: normalizedData,
        photos: null, // Legacy field, photos now managed via PhotoManager
        updatedAt: new Date()
        // Note: featureId and geom should not change in update
      },
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
      message: 'PAI berhasil diupdate',
      pai: formatPAIResponse(updatedPAI)
    }, { status: 200 })

  } catch (error) {
    console.error('Error updating PAI:', error)
    
    return NextResponse.json({ 
      error: 'Gagal mengupdate PAI',
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