import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '../../../../lib/prisma';
import { hasPermission, PERMISSIONS } from '../../../../lib/permissions';
import { calculateTotalScore, validateSurveyValues } from '../../../../lib/scoring/engine';
import { AuditLogger } from '../../../../lib/audit';

/**
 * GET /api/surveys/[id] - Get specific survey by ID
 */
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !hasPermission(session.user.role, PERMISSIONS.SURVEY_VIEW)) {
      return NextResponse.json(
        { error: 'Akses ditolak. Anda tidak memiliki izin untuk melihat data survei.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    
    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        feature: {
          select: {
            featureId: true,
            name: true,
            sourceLayer: true,
            scheme: true
          }
        },
        config: {
          select: {
            id: true,
            scheme: true,
            json: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!survey) {
      return NextResponse.json(
        { error: 'Survey tidak ditemukan' },
        { status: 404 }
      );
    }

    // Transform result
    const transformedSurvey = {
      id: survey.id,
      featureId: survey.featureId,
      featureName: survey.feature?.name || 'Unnamed Feature',
      sourceLayer: survey.feature?.sourceLayer,
      scheme: survey.scheme,
      scoreTotal: survey.scoreTotal,
      scoreClass: survey.scoreClass,
      values: survey.values,
      scoreDetail: survey.scoreDetail,
      createdAt: survey.createdAt,
      updatedAt: survey.updatedAt,
      createdBy: {
        id: survey.user?.id,
        name: survey.user?.name,
        email: survey.user?.email,
        role: survey.user?.role
      },
      config: survey.config ? {
        id: survey.config.id,
        title: survey.config.json?.title,
        version: survey.config.json?.version,
        json: survey.config.json
      } : null
    };

    return NextResponse.json(transformedSurvey);

  } catch (error) {
    console.error('Error fetching survey:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data survei', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/surveys/[id] - Update existing survey
 */
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !hasPermission(session.user.role, PERMISSIONS.SURVEY_MANAGE)) {
      return NextResponse.json(
        { error: 'Akses ditolak. Anda tidak memiliki izin untuk mengubah data survei.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { values, configId } = body;

    // Validate required fields
    if (!values) {
      return NextResponse.json(
        { error: 'Field "values" wajib diisi' },
        { status: 400 }
      );
    }

    // Check if survey exists
    const existingSurvey = await prisma.survey.findUnique({
      where: { id },
      include: {
        feature: true,
        config: true
      }
    });

    if (!existingSurvey) {
      return NextResponse.json(
        { error: 'Survey tidak ditemukan' },
        { status: 404 }
      );
    }

    // Get configuration
    let config;
    if (configId) {
      config = await prisma.config.findUnique({
        where: { id: parseInt(configId) }
      });
    } else {
      // Use the same config as existing survey
      config = existingSurvey.config;
    }

    if (!config) {
      return NextResponse.json(
        { error: 'Konfigurasi survei tidak ditemukan' },
        { status: 404 }
      );
    }

    // Validate survey values
    const validation = validateSurveyValues(values, config.json);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Validasi survei gagal', 
          validation: {
            errors: validation.errors,
            warnings: validation.warnings,
            summary: validation.summary
          }
        },
        { status: 400 }
      );
    }

    // Calculate new score
    const scoreResult = calculateTotalScore(values, config.json);

    // Store old values for audit
    const oldValues = {
      values: existingSurvey.values,
      scoreTotal: existingSurvey.scoreTotal,
      scoreClass: existingSurvey.scoreClass
    };

    // Update survey
    const updatedSurvey = await prisma.survey.update({
      where: { id },
      data: {
        values,
        scoreTotal: scoreResult.totalScore,
        scoreClass: scoreResult.qualityClass,
        scoreDetail: scoreResult,
        configId: config.id,
        updatedAt: new Date()
      },
      include: {
        feature: {
          select: { featureId: true, name: true, sourceLayer: true }
        },
        config: {
          select: { id: true, scheme: true, json: true }
        }
      }
    });

    // Audit log
    await AuditLogger.log({
      userId: session.user.id,
      action: 'UPDATE',
      entityType: 'Survey',
      entityId: updatedSurvey.id,
      oldValues,
      newValues: {
        values: updatedSurvey.values,
        scoreTotal: updatedSurvey.scoreTotal,
        scoreClass: updatedSurvey.scoreClass
      }
    });

    // Return complete result
    return NextResponse.json({
      survey: {
        id: updatedSurvey.id,
        featureId: updatedSurvey.featureId,
        featureName: updatedSurvey.feature?.name,
        sourceLayer: updatedSurvey.feature?.sourceLayer,
        scheme: updatedSurvey.scheme,
        scoreTotal: updatedSurvey.scoreTotal,
        scoreClass: updatedSurvey.scoreClass,
        scoreDetail: updatedSurvey.scoreDetail,
        values: updatedSurvey.values,
        createdAt: updatedSurvey.createdAt,
        updatedAt: updatedSurvey.updatedAt
      },
      scoring: scoreResult,
      validation: {
        isValid: validation.isValid,
        warnings: validation.warnings,
        summary: validation.summary
      },
      config: {
        id: config.id,
        title: config.json.title,
        version: config.json.version
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error updating survey:', error);
    return NextResponse.json(
      { error: 'Gagal memperbarui survey', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/surveys/[id] - Delete survey (soft delete with audit log)
 */
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !hasPermission(session.user.role, PERMISSIONS.SURVEY_MANAGE)) {
      return NextResponse.json(
        { error: 'Akses ditolak. Anda tidak memiliki izin untuk menghapus data survei.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    
    // Check if survey exists
    const existingSurvey = await prisma.survey.findUnique({
      where: { id },
      include: {
        feature: {
          select: { featureId: true, name: true }
        }
      }
    });

    if (!existingSurvey) {
      return NextResponse.json(
        { error: 'Survey tidak ditemukan' },
        { status: 404 }
      );
    }

    // Store data for audit
    const deletedData = {
      featureId: existingSurvey.featureId,
      featureName: existingSurvey.feature?.name,
      scheme: existingSurvey.scheme,
      values: existingSurvey.values,
      scoreTotal: existingSurvey.scoreTotal,
      scoreClass: existingSurvey.scoreClass
    };

    // Delete survey
    await prisma.survey.delete({
      where: { id }
    });

    // Audit log
    await AuditLogger.log({
      userId: session.user.id,
      action: 'DELETE',
      entityType: 'Survey',
      entityId: id,
      oldValues: deletedData,
      newValues: null
    });

    return NextResponse.json({
      success: true,
      message: 'Survey berhasil dihapus',
      deletedSurvey: {
        id,
        featureName: deletedData.featureName,
        featureId: deletedData.featureId
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error deleting survey:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus survey', details: error.message },
      { status: 500 }
    );
  }
}
