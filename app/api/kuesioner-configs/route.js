import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '../../../lib/prisma';
import { hasPermission, PERMISSIONS } from '../../../lib/permissions';

/**
 * GET /api/kuesioner-configs - Get active kuesioner configurations
 * Query params:
 * - scheme: 'primer' | 'sekunder' | 'tersier' | 'kuarter' | 'bangunan' (optional)
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)


    if (!session) {
      return NextResponse.json(
        { error: 'Akses ditolak. Silakan login terlebih dahulu.' },
        { status: 401 }
      )
    }

    if (!session.user.role) {
      return NextResponse.json(
        { error: 'Akses ditolak. Role pengguna tidak ditemukan.' },
        { status: 403 }
      )
    }

    if (!hasPermission(session.user.role, PERMISSIONS.CONFIG_VIEW)) {
      return NextResponse.json(
        { error: 'Akses ditolak. Anda tidak memiliki izin untuk melihat konfigurasi kuesioner.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url);
    const scheme = searchParams.get('scheme');

    // Build where conditions
    const where = { active: true };
    if (scheme) {
      const validSchemes = [
        'primer', 'sekunder', 'tersier', 'kuarter', // saluran
        'bendung-tetap', 'jembatan', 'gudang', 'perumahan', 'box-tersier', 'box-kuarter',
        'syphon', 'gorong-gorong', 'gorong-gorong-silang', 'pelimpah-samping', 'terjunan',
        'tempat-cuci', 'sadap', 'bagi-sadap', 'talang', 'pengukur-debit' // bangunan
      ];
      if (!validSchemes.includes(scheme)) {
        return NextResponse.json(
          { error: `Scheme harus berupa salah satu: ${validSchemes.join(', ')}` },
          { status: 400 }
        );
      }
      where.scheme = scheme;
    }

    const configs = await prisma.config.findMany({
      where,
      select: {
        id: true,
        scheme: true,
        json: true,
        active: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: configs,
      count: configs.length
    });

  } catch (error) {
    console.error('Error fetching kuesioner configs:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil konfigurasi kuesioner', details: error.message },
      { status: 500 }
    );
  }
}