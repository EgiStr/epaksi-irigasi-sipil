import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '../../../../lib/prisma';
import { hasPermission, PERMISSIONS } from '../../../../lib/permissions';

/**
 * POST /api/survey-configs/activate - Activate a specific configuration
 */
export async function POST(request) {
  try {
    const session = await getServerSession()
    
    if (!session || !hasPermission(session.user.role, PERMISSIONS.CONFIG_MANAGE)) {
      return NextResponse.json(
        { error: 'Akses ditolak. Anda tidak memiliki izin untuk mengaktifkan konfigurasi survei.' },
        { status: 403 }
      )
    }

    const body = await request.json();
    const { configId, scheme } = body;

    if (!configId) {
      return NextResponse.json(
        { error: 'Field "configId" wajib diisi' },
        { status: 400 }
      );
    }

    // Find the configuration to activate
    const configToActivate = await prisma.config.findUnique({
      where: { id: parseInt(configId) },
      select: { id: true, scheme: true, json: true }
    });

    if (!configToActivate) {
      return NextResponse.json(
        { error: 'Konfigurasi tidak ditemukan' },
        { status: 404 }
      );
    }

    // Deactivate all other configs for this scheme
    await prisma.config.updateMany({
      where: { 
        scheme: configToActivate.scheme,
        id: { not: configToActivate.id }
      },
      data: { active: false }
    });

    // Activate the selected config
    const activatedConfig = await prisma.config.update({
      where: { id: configToActivate.id },
      data: { active: true },
      select: {
        id: true,
        scheme: true,
        json: true,
        active: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      message: `Konfigurasi ${configToActivate.scheme} berhasil diaktifkan`,
      config: activatedConfig
    });

  } catch (error) {
    console.error('Error activating survey config:', error);
    return NextResponse.json(
      { error: 'Gagal mengaktifkan konfigurasi', details: error.message },
      { status: 500 }
    );
  }
}
