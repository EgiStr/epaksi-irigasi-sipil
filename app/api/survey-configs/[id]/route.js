import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '../../../../lib/prisma';
import { hasPermission, PERMISSIONS } from '../../../../lib/permissions';

/**
 * GET /api/survey-configs/[id] - Get survey configuration by ID
 */
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session) {
      return NextResponse.json(
        { error: 'Akses ditolak. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user.role, PERMISSIONS.CONFIG_VIEW)) {
      return NextResponse.json(
        { error: 'Akses ditolak. Anda tidak memiliki izin untuk melihat konfigurasi survei.' },
        { status: 403 }
      );
    }

    const config = await prisma.config.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        scheme: true,
        json: true,
        active: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!config) {
      return NextResponse.json(
        { error: 'Konfigurasi survei tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json(config);

  } catch (error) {
    console.error('Error fetching survey config:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil konfigurasi survei', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/survey-configs/[id] - Update survey configuration (Admin only)
 */
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session || !hasPermission(session.user.role, PERMISSIONS.CONFIG_MANAGE)) {
      return NextResponse.json(
        { error: 'Akses ditolak. Anda tidak memiliki izin untuk mengelola konfigurasi survei.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { scheme, json, active, setAsActive } = body;

    // Check if config exists
    const existingConfig = await prisma.config.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingConfig) {
      return NextResponse.json(
        { error: 'Konfigurasi survei tidak ditemukan' },
        { status: 404 }
      );
    }

    // Validate scheme if provided
    if (scheme && !['utama', 'tersier'].includes(scheme)) {
      return NextResponse.json(
        { error: 'Scheme harus berupa "utama" atau "tersier"' },
        { status: 400 }
      );
    }

    // Validate JSON structure if provided
    if (json && (!json.version || !json.scheme || !json.categories || !json.grading)) {
      return NextResponse.json(
        { error: 'Format JSON konfigurasi tidak valid. Harus memiliki: version, scheme, categories, grading' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData = {};
    if (scheme) updateData.scheme = scheme;
    if (json) updateData.json = json;
    if (typeof active === 'boolean') updateData.active = active;

    // If setting as active (either through active flag or setAsActive flag)
    const shouldSetAsActive = active === true || setAsActive === true;
    if (shouldSetAsActive) {
      // Deactivate other configs for this scheme
      const schemeToUpdate = scheme || existingConfig.scheme;
      await prisma.config.updateMany({
        where: { 
          scheme: schemeToUpdate,
          id: { not: parseInt(id) }
        },
        data: { active: false }
      });
      updateData.active = true;
    }

    // Update the config
    const updatedConfig = await prisma.config.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        scheme: true,
        json: true,
        active: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json(updatedConfig);

  } catch (error) {
    console.error('Error updating survey config:', error);
    return NextResponse.json(
      { error: 'Gagal memperbarui konfigurasi survei', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/survey-configs/[id] - Delete survey configuration (Admin only)
 */
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session || !hasPermission(session.user.role, PERMISSIONS.CONFIG_MANAGE)) {
      return NextResponse.json(
        { error: 'Akses ditolak. Anda tidak memiliki izin untuk mengelola konfigurasi survei.' },
        { status: 403 }
      );
    }

    // Check if config exists
    const existingConfig = await prisma.config.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingConfig) {
      return NextResponse.json(
        { error: 'Konfigurasi survei tidak ditemukan' },
        { status: 404 }
      );
    }

    // Don't allow deletion of active configs
    if (existingConfig.active) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus konfigurasi yang sedang aktif. Nonaktifkan terlebih dahulu.' },
        { status: 400 }
      );
    }

    // Delete the config
    await prisma.config.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ 
      message: 'Konfigurasi survei berhasil dihapus',
      id: parseInt(id)
    });

  } catch (error) {
    console.error('Error deleting survey config:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus konfigurasi survei', details: error.message },
      { status: 500 }
    );
  }
}