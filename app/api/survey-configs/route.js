import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

/**
 * GET /api/survey-configs - Get active survey configurations
 * Query params:
 * - scheme: 'utama' | 'tersier' (optional, returns both if not specified)
 */
export async function GET(request) {
  try {
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

    if (configs.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada konfigurasi aktif ditemukan' },
        { status: 404 }
      );
    }

    // If single scheme requested, return the config directly
    if (scheme) {
      return NextResponse.json(configs[0]);
    }

    // Return all configs as object keyed by scheme
    const configsByScheme = configs.reduce((acc, config) => {
      acc[config.scheme] = config;
      return acc;
    }, {});

    return NextResponse.json(configsByScheme);

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
