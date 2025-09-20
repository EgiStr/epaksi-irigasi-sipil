import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { uploadFile, generateFilePath, validateImageFile } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'

export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file')
    const paiId = formData.get('paiId')
    const caption = formData.get('caption') || ''

    if (!file || !paiId) {
      return NextResponse.json(
        { error: 'File dan PAI ID diperlukan' },
        { status: 400 }
      )
    }

    // Validate file
    validateImageFile(file)

    // Get PAI to get featureId for path organization
    const pai = await prisma.pAI.findUnique({
      where: { id: paiId },
      select: { featureId: true, createdBy: true }
    })

    if (!pai) {
      return NextResponse.json(
        { error: 'PAI tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if user has permission to upload to this PAI
    if (pai.createdBy !== session.user.id && session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Tidak memiliki izin untuk mengupload foto ke PAI ini' },
        { status: 403 }
      )
    }

    // Generate unique file path
    const filePath = generateFilePath(file.name, session.user.id, pai.featureId)

    // Upload to Supabase Storage
    const { data, error } = await uploadFile(file, 'photos', filePath)

    if (error) {
      throw new Error(`Upload gagal: ${error.message}`)
    }

    // Get public URL
    const { getPublicUrl } = await import('@/lib/supabase')
    const publicUrl = getPublicUrl('photos', filePath)

    // Save photo record to database
    const photo = await prisma.photo.create({
      data: {
        paiId,
        url: publicUrl,
        path: filePath,
        caption,
        metadata: {
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          uploadedBy: session.user.id
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: photo.id,
        url: photo.url,
        path: photo.path,
        caption: photo.caption,
        metadata: photo.metadata
      }
    })

  } catch (error) {
    console.error('Error uploading photo:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal upload foto' },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get photo ID from URL
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('id')

    if (!photoId) {
      return NextResponse.json(
        { error: 'Photo ID diperlukan' },
        { status: 400 }
      )
    }

    // Get photo record
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        pai: {
          select: { createdBy: true }
        }
      }
    })

    if (!photo) {
      return NextResponse.json(
        { error: 'Foto tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check permissions
    if (photo.pai.createdBy !== session.user.id && session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Tidak memiliki izin untuk menghapus foto ini' },
        { status: 403 }
      )
    }

    // Delete from Supabase Storage
    const { deleteFile } = await import('@/lib/supabase')
    await deleteFile('photos', photo.path)

    // Delete from database
    await prisma.photo.delete({
      where: { id: photoId }
    })

    return NextResponse.json({
      success: true,
      message: 'Foto berhasil dihapus'
    })

  } catch (error) {
    console.error('Error deleting photo:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal menghapus foto' },
      { status: 500 }
    )
  }
}