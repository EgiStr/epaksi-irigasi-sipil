import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function PATCH(request, { params }) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const photoId = params.photoId
    const { caption } = await request.json()

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
        { error: 'Tidak memiliki izin untuk mengupdate foto ini' },
        { status: 403 }
      )
    }

    // Update caption
    const updatedPhoto = await prisma.photo.update({
      where: { id: photoId },
      data: { caption },
      select: {
        id: true,
        url: true,
        path: true,
        caption: true,
        metadata: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedPhoto
    })

  } catch (error) {
    console.error('Error updating photo caption:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal update caption foto' },
      { status: 500 }
    )
  }
}