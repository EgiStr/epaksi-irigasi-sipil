import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '../../../lib/prisma';
import { hasPermission, PERMISSIONS } from '../../../lib/permissions';

/**
 * GET /api/survey-configs - Get active survey configurations
 * Query params:
 * - scheme: 'utama' | 'tersier' (optional, returns both if not specified)
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
        { error: 'Akses ditolak. Anda tidak memiliki izin untuk melihat konfigurasi survei.' },
        { status: 403 }
      )
    }
    const { searchParams } = new URL(request.url);
    const scheme = searchParams.get('scheme');

    // Build where conditions
    const where = { active: true };
    if (scheme) {
      if (!['utama', 'tersier'].includes(scheme)) {
        return NextResponse.json(
          { error: 'Scheme harus berupa "utama" atau "tersier"' },
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
      orderBy: { scheme: 'asc' }
    });

    // Always return array for consistency
    return NextResponse.json(configs);

  } catch (error) {
    console.error('Error fetching survey configs:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil konfigurasi survei', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/survey-configs - Create new survey configuration (Admin only)
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    
    
    if (!session || !hasPermission(session.user.role, PERMISSIONS.CONFIG_MANAGE)) {
      return NextResponse.json(
        { error: 'Akses ditolak. Anda tidak memiliki izin untuk mengelola konfigurasi survei.' },
        { status: 403 }
      )
    }

    const body = await request.json();
    const { scheme, json, setAsActive = true } = body;

    // Validate required fields
    if (!scheme || !json) {
      return NextResponse.json(
        { error: 'Field "scheme" dan "json" wajib diisi' },
        { status: 400 }
      );
    }

    // Validate scheme
    if (!['utama', 'tersier'].includes(scheme)) {
      return NextResponse.json(
        { error: 'Scheme harus berupa "utama" atau "tersier"' },
        { status: 400 }
      );
    }

    // Validate JSON structure (basic validation)
    if (!json.version || !json.scheme || !json.categories || !json.grading) {
      return NextResponse.json(
        { error: 'Format JSON konfigurasi tidak valid. Harus memiliki: version, scheme, categories, grading' },
        { status: 400 }
      );
    }

    // If setting as active, deactivate other configs for this scheme
    if (setAsActive) {
      await prisma.config.updateMany({
        where: { scheme },
        data: { active: false }
      });
    }

    // Create new config
    const newConfig = await prisma.config.create({
      data: {
        scheme,
        json,
        active: setAsActive
      },
      select: {
        id: true,
        scheme: true,
        json: true,
        active: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json(newConfig);

  } catch (error) {
    console.error('Error creating survey config:', error);
    return NextResponse.json(
      { error: 'Gagal membuat konfigurasi survei', details: error.message },
      { status: 500 }
    );
  }
}
