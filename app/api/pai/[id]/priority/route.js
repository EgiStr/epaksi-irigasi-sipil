import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { prisma } from '../../../../../lib/prisma'
import { hasPermission, PERMISSIONS } from '../../../../../lib/permissions'
import { AuditLogger } from '../../../../../lib/audit'

/**
 * PATCH /api/pai/[id]/priority - Update skor prioritas PAI
 */
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !hasPermission(session.user.role, PERMISSIONS.SURVEY_CREATE)) {
      return NextResponse.json(
        { error: 'Akses ditolak. Anda tidak memiliki izin untuk mengupdate prioritas.' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { priorityScore, priorityNotes, priorityStatus } = body

    // Validate priority score
    if (priorityScore && (priorityScore < 1 || priorityScore > 5)) {
      return NextResponse.json(
        { error: 'Skor prioritas harus antara 1-5' },
        { status: 400 }
      )
    }

    // Get existing PAI for audit log
    const existingPAI = await prisma.pAI.findUnique({
      where: { id }
    })

    if (!existingPAI) {
      return NextResponse.json(
        { error: 'Data PAI tidak ditemukan' },
        { status: 404 }
      )
    }

    // Update PAI with priority data
    const updatedPAI = await prisma.pAI.update({
      where: { id },
      data: {
        priorityScore,
        priorityNotes,
        priorityStatus: priorityStatus || 'pending',
        updatedAt: new Date()
      },
      include: {
        feature: {
          select: {
            name: true,
            featureId: true,
            sourceLayer: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // Create audit log
    await AuditLogger.log({
      userId: session.user.id,
      action: 'UPDATE_PRIORITY',
      entityType: 'PAI',
      entityId: id,
      oldValues: {
        priorityScore: existingPAI.priorityScore,
        priorityNotes: existingPAI.priorityNotes,
        priorityStatus: existingPAI.priorityStatus
      },
      newValues: {
        priorityScore,
        priorityNotes,
        priorityStatus
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json({
      success: true,
      data: updatedPAI,
      message: 'Prioritas berhasil diupdate'
    })

  } catch (error) {
    console.error('Error updating PAI priority:', error)
    return NextResponse.json(
      { error: 'Gagal mengupdate prioritas: ' + error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/pai/[id]/priority - Get priority info for PAI
 */
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !hasPermission(session.user.role, PERMISSIONS.FEATURE_VIEW)) {
      return NextResponse.json(
        { error: 'Akses ditolak' },
        { status: 403 }
      )
    }

    const { id } = await params

    const pai = await prisma.pAI.findUnique({
      where: { id },
      select: {
        id: true,
        priorityScore: true,
        priorityNotes: true,
        priorityStatus: true,
        updatedAt: true,
        feature: {
          select: {
            name: true,
            featureId: true
          }
        }
      }
    })

    if (!pai) {
      return NextResponse.json(
        { error: 'Data PAI tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json(pai)

  } catch (error) {
    console.error('Error fetching PAI priority:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data prioritas: ' + error.message },
      { status: 500 }
    )
  }
}
