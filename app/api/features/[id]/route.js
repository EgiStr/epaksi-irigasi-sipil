import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '../../../../lib/prisma'
import { hasPermission, PERMISSIONS } from '../../../../lib/permissions'
import * as crypto from 'crypto'

/**
 * GET /api/features/[id] - Ambil detail feature berdasarkan database ID
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

    const { id } = params

    const feature = await prisma.feature.findUnique({
      where: { id },
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
    
  } catch (error) {
    console.error('Error fetching feature:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil detail feature', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/features/[id] - Update feature berdasarkan database ID
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

    const { id } = params
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
      where: { id },
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
      where: { id },
      data: {
        name: name || null,
        type: type || null,
        scheme: scheme || null,
        sourceLayer,
        props: props || null,
        updatedAt: new Date()
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
      message: 'Feature berhasil diupdate',
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
      { error: 'Gagal mengupdate feature', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/features/[id] - Hapus feature berdasarkan database ID
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

    const { id } = params

    // Check if feature exists and get survey count
    const existingFeature = await prisma.feature.findUnique({
      where: { id },
      select: {
        id: true,
        featureId: true,
        name: true,
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

    // Delete feature (surveys will be cascade deleted due to onDelete: Cascade in schema)
    await prisma.feature.delete({
      where: { id }
    })

    return NextResponse.json({
      message: `Feature "${existingFeature.name || existingFeature.featureId}" berhasil dihapus`,
      deletedFeature: {
        id: existingFeature.id,
        featureId: existingFeature.featureId,
        name: existingFeature.name,
        deletedSurveys: existingFeature._count.surveys
      }
    })
    
  } catch (error) {
    console.error('Error deleting feature:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus feature', details: error.message },
      { status: 500 }
    )
  }
}
