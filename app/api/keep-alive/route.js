import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const revalidate = 86400 // Revalidate every 24 hours

export async function GET() {
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
    console.error('[keep-alive] Database ping failed:', error.message)
    return NextResponse.json(
      { status: 'error', message: 'Database connection failed.' },
      { status: 500 }
    )
  }
}
