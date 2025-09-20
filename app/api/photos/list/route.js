import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const paiId = searchParams.get('paiId')

    if (!paiId) {
      return NextResponse.json(
        { error: 'PAI ID diperlukan' },
        { status: 400 }
      )
    }

    // Get photos for PAI
    const photos = await prisma.photo.findMany({
      where: { paiId },
      orderBy: { createdAt: 'desc' },
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
      photos
    })

  } catch (error) {
    console.error('Error fetching photos:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data foto' },
      { status: 500 }
    )
  }
}