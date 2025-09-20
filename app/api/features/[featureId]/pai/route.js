import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { formatPAIResponse } from '@/lib/pai/utils'

// GET /api/features/[featureId]/pai - Get PAI by Feature
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
    }

    const { featureId } = params

    // Check if feature exists
    const feature = await prisma.feature.findUnique({
      where: { featureId },
      select: {
        featureId: true,
        name: true,
        type: true,
        scheme: true,
        props: true
      }
    })

    if (!feature) {
      return NextResponse.json({ error: 'Feature tidak ditemukan' }, { status: 404 })
    }

    // Get all PAI for this feature
    const paiList = await prisma.pAI.findMany({
      where: { featureId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      feature,
      pai: paiList.map(formatPAIResponse)
    })

  } catch (error) {
    console.error('Error fetching PAI by feature:', error)
    return NextResponse.json({ 
      error: 'Gagal mengambil data PAI untuk feature',
      details: error.message
    }, { status: 500 })
  }
}