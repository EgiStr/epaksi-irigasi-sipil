import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET_KEY
  const authHeader = request.headers.get('authorization')

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { status: 'error', message: 'Tidak terautentikasi' },
      { status: 401 }
    )
  }

  try {
    const startTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const duration = Date.now() - startTime

    return NextResponse.json({
      status: 'success',
      message: 'Database is awake.',
      timestamp: new Date().toISOString(),
      responseTime: `${duration}ms`
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: 'Database connection failed.' },
      { status: 500 }
    )
  }
}
