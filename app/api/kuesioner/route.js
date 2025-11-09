import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/route'
import { hasPermission, PERMISSIONS } from '../../../lib/permissions'
import { calculateKuesionerScore } from '../../../lib/kuesioner-scoring'
import { AuditLogger, getRequestInfo } from '../../../lib/audit'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/kuesioner - Get all kuesioner or filter by featureId, scheme, tahun
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const featureId = searchParams.get('featureId')
    const scheme = searchParams.get('scheme')
    const tahun = searchParams.get('tahun')

    const where = {}
    if (featureId) where.featureId = featureId
    if (scheme) where.scheme = scheme
    if (tahun) where.tahun = parseInt(tahun)

    const kuesionerList = await prisma.kuesioner.findMany({
      where,
      include: {
        feature: {
          select: {
            name: true,
            type: true,
            sourceLayer: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ kuesioner: kuesionerList })
  } catch (error) {
    console.error('Error fetching kuesioner:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data kuesioner' },
      { status: 500 }
    )
  }
}

// POST /api/kuesioner - Create new kuesioner
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    // Check permissions
    if (!hasPermission(session.user.role, PERMISSIONS.SURVEY_CREATE)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await request.json()
    const { featureId, scheme, tahun = 2025, values } = body

    // Validate required fields
    if (!featureId || !scheme || !values) {
      return NextResponse.json(
        { error: 'featureId, scheme, dan values wajib diisi' },
        { status: 400 }
      )
    }

    // Validate scheme
    const validSchemes = [
      'primer', 'sekunder', 'tersier', 'kuarter', // saluran
      'bendung-tetap', 'jembatan', 'gudang', 'perumahan', 'box-tersier', 
      'syphon', 'gorong-gorong', 'pelimpah-samping', 'terjunan', 
      'tempat-cuci', 'sadap', 'bagi-sadap', 'talang' // bangunan
    ];
    if (!validSchemes.includes(scheme)) {
      return NextResponse.json(
        { error: `scheme harus salah satu: ${validSchemes.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if feature exists
    const feature = await prisma.feature.findUnique({
      where: { featureId }
    })

    if (!feature) {
      return NextResponse.json(
        { error: 'Feature tidak ditemukan' },
        { status: 404 }
      )
    }

    // Calculate score using shared utility
    let scoreData = null
    try {
      scoreData = await calculateKuesionerScore(scheme, values)
    } catch (error) {
      console.error('Error calculating score:', error)
      return NextResponse.json(
        { error: 'Gagal menghitung skor kuesioner' },
        { status: 500 }
      )
    }

    // Check for existing kuesioner (update if exists)
    const existingKuesioner = await prisma.kuesioner.findUnique({
      where: {
        featureId_scheme_tahun: {
          featureId,
          scheme,
          tahun
        }
      }
    })

    let kuesioner
    const { ipAddress, userAgent } = getRequestInfo(request)

    if (existingKuesioner) {
      // Update existing
      kuesioner = await prisma.kuesioner.update({
        where: { id: existingKuesioner.id },
        data: {
          values,
          scoreTotal: scoreData?.score || null,
          scoreClass: scoreData?.qualityClass || null,
          scoreDetail: scoreData ? JSON.parse(JSON.stringify(scoreData)) : null,
          updatedAt: new Date()
        },
        include: {
          feature: {
            select: {
              name: true,
              type: true,
              sourceLayer: true
            }
          }
        }
      })

      // Audit log
      await AuditLogger.log({
        userId: session.user.id,
        action: 'KUESIONER_UPDATE',
        entityType: 'Kuesioner',
        entityId: kuesioner.id,
        oldValues: existingKuesioner,
        newValues: kuesioner,
        ipAddress,
        userAgent
      })
    } else {
      // Create new
      kuesioner = await prisma.kuesioner.create({
        data: {
          featureId,
          scheme,
          tahun,
          values,
          scoreTotal: scoreData?.score || null,
          scoreClass: scoreData?.qualityClass || null,
          scoreDetail: scoreData ? JSON.parse(JSON.stringify(scoreData)) : null,
          createdBy: session.user.id
        },
        include: {
          feature: {
            select: {
              name: true,
              type: true,
              sourceLayer: true
            }
          }
        }
      })

      // Audit log
      await AuditLogger.log({
        userId: session.user.id,
        action: 'KUESIONER_CREATE',
        entityType: 'Kuesioner',
        entityId: kuesioner.id,
        newValues: kuesioner,
        ipAddress,
        userAgent
      })
    }

    return NextResponse.json({
      message: existingKuesioner ? 'Kuesioner berhasil diperbarui' : 'Kuesioner berhasil dibuat',
      kuesioner
    })
  } catch (error) {
    console.error('Error creating/updating kuesioner:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal menyimpan kuesioner' },
      { status: 500 }
    )
  }
}

// PUT /api/kuesioner - Update existing kuesioner (alternative method)
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    // Check permissions
    if (!hasPermission(session.user.role, PERMISSIONS.SURVEY_EDIT)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await request.json()
    const { id, values } = body

    if (!id || !values) {
      return NextResponse.json(
        { error: 'id dan values wajib diisi' },
        { status: 400 }
      )
    }

    // Get existing kuesioner
    const existingKuesioner = await prisma.kuesioner.findUnique({
      where: { id }
    })

    if (!existingKuesioner) {
      return NextResponse.json(
        { error: 'Kuesioner tidak ditemukan' },
        { status: 404 }
      )
    }

    // Calculate score using shared utility
    const scoreData = await calculateKuesionerScore(existingKuesioner.scheme, values)

    // Update kuesioner
    const kuesioner = await prisma.kuesioner.update({
      where: { id },
      data: {
        values,
        scoreTotal: scoreData?.score || null,
        scoreClass: scoreData?.qualityClass || null,
        scoreDetail: scoreData ? JSON.parse(JSON.stringify(scoreData)) : null,
        updatedAt: new Date()
      },
      include: {
        feature: {
          select: {
            name: true,
            type: true,
            sourceLayer: true
          }
        }
      }
    })

    // Audit log
    const { ipAddress, userAgent } = getRequestInfo(request)
    await AuditLogger.log({
      userId: session.user.id,
      action: 'KUESIONER_UPDATE',
      entityType: 'Kuesioner',
      entityId: kuesioner.id,
      oldValues: existingKuesioner,
      newValues: kuesioner,
      ipAddress,
      userAgent
    })

    return NextResponse.json({
      message: 'Kuesioner berhasil diperbarui',
      kuesioner
    })
  } catch (error) {
    console.error('Error updating kuesioner:', error)
    return NextResponse.json(
      { error: 'Gagal memperbarui kuesioner' },
      { status: 500 }
    )
  }
}

// DELETE /api/kuesioner?id=xxx - Delete kuesioner
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    // Check permissions
    if (!hasPermission(session.user.role, PERMISSIONS.SURVEY_DELETE)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'id wajib diisi' },
        { status: 400 }
      )
    }

    // Get existing kuesioner for audit
    const existingKuesioner = await prisma.kuesioner.findUnique({
      where: { id }
    })

    if (!existingKuesioner) {
      return NextResponse.json(
        { error: 'Kuesioner tidak ditemukan' },
        { status: 404 }
      )
    }

    // Delete kuesioner
    await prisma.kuesioner.delete({
      where: { id }
    })

    // Audit log
    const { ipAddress, userAgent } = getRequestInfo(request)
    await AuditLogger.log({
      userId: session.user.id,
      action: 'KUESIONER_DELETE',
      entityType: 'Kuesioner',
      entityId: id,
      oldValues: existingKuesioner,
      ipAddress,
      userAgent
    })

    return NextResponse.json({
      message: 'Kuesioner berhasil dihapus'
    })
  } catch (error) {
    console.error('Error deleting kuesioner:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus kuesioner' },
      { status: 500 }
    )
  }
}
