import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '../../../lib/prisma';
import { hasPermission, PERMISSIONS } from '../../../lib/permissions';
import { calculateTotalScore, validateSurveyValues } from '../../../lib/scoring/engine';

/**
 * GET /api/surveys - Get surveys with optional filtering
 * Query params:
 * - featureId: filter by feature ID
 * - scheme: filter by scheme (utama/tersier)
 * - scoreClass: filter by quality class (A/B/C/D)
 * - startDate, endDate: filter by date range
 * - limit: max results (default 100)
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !hasPermission(session.user.role, PERMISSIONS.SURVEY_VIEW)) {
      return NextResponse.json(
        { error: 'Akses ditolak. Anda tidak memiliki izin untuk melihat data survei.' },
        { status: 403 }
      )
    }
    const { searchParams } = new URL(request.url);
    const featureId = searchParams.get('featureId');
    const scheme = searchParams.get('scheme');
    const scoreClass = searchParams.get('scoreClass');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Build where conditions
    const where = {};
    if (featureId) where.featureId = featureId;
    if (scheme) where.scheme = scheme;
    if (scoreClass) where.scoreClass = scoreClass;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const surveys = await prisma.survey.findMany({
      where,
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
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // Transform results
    const transformedSurveys = surveys.map(survey => ({
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
        version: survey.config.json?.version
      } : null
    }));

    return NextResponse.json({
      surveys: transformedSurveys,
      total: transformedSurveys.length,
      limit,
      filters: { featureId, scheme, scoreClass, startDate, endDate }
    });

  } catch (error) {
    console.error('Error fetching surveys:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data survei', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/surveys - Create new survey with automatic scoring
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !hasPermission(session.user.role, PERMISSIONS.SURVEY_MANAGE)) {
      return NextResponse.json(
        { error: 'Akses ditolak. Anda tidak memiliki izin untuk membuat data survei.' },
        { status: 403 }
      )
    }

    const body = await request.json();
    const { featureId, scheme, values, configId, tahun } = body;

    // Validate required fields
    if (!featureId || !scheme || !values) {
      return NextResponse.json(
        { error: 'Field "featureId", "scheme", dan "values" wajib diisi' },
        { status: 400 }
      );
    }

    // Default tahun ke tahun saat ini jika tidak diberikan
    const surveyTahun = tahun || new Date().getFullYear();

    // Validate scheme
    if (!['utama', 'tersier'].includes(scheme)) {
      return NextResponse.json(
        { error: 'Scheme harus berupa "utama" atau "tersier"' },
        { status: 400 }
      );
    }

    // Check if feature exists
    const feature = await prisma.feature.findUnique({
      where: { featureId },
      select: { featureId: true, name: true, sourceLayer: true }
    });

    if (!feature) {
      return NextResponse.json(
        { error: 'Feature tidak ditemukan' },
        { status: 404 }
      );
    }

    // Get active configuration for the scheme
    let config;
    if (configId) {
      config = await prisma.config.findUnique({
        where: { id: parseInt(configId) }
      });
    } else {
      config = await prisma.config.findFirst({
        where: { scheme, active: true }
      });
    }

    if (!config) {
      return NextResponse.json(
        { error: `Konfigurasi aktif untuk skema "${scheme}" tidak ditemukan` },
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

    // Calculate score
    const scoreResult = calculateTotalScore(values, config.json);

    

    let userId = session.user?.id;
    
    // Fallback: try to find user by email if ID not in session
    if (!userId && session.user?.email) {
      const userRecord = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });
      userId = userRecord?.id;
    }

    if (!userId) {
      console.error('Cannot determine user ID for survey creation');
      return NextResponse.json(
        { error: 'ID pengguna tidak ditemukan dalam session' },
        { status: 400 }
      );
    }

    // Create or update survey based on tahun
    // Logic: Same year → UPDATE, Different year → INSERT
    const existingSurvey = await prisma.survey.findUnique({
      where: { 
        featureId_scheme_tahun: {
          featureId, 
          scheme,
          tahun: surveyTahun
        }
      }
    });

    let survey;
    if (existingSurvey) {
      // Update existing survey (same year)
      survey = await prisma.survey.update({
        where: { id: existingSurvey.id },
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
    } else {
      // Create new survey (different year or first time)
      survey = await prisma.survey.create({
        data: {
          featureId,
          scheme,
          tahun: surveyTahun,
          values,
          scoreTotal: scoreResult.totalScore,
          scoreClass: scoreResult.qualityClass,
          scoreDetail: scoreResult,
          configId: config.id,
          createdBy: userId
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
    }

    // Return complete result
    return NextResponse.json({
      survey: {
        id: survey.id,
        featureId: survey.featureId,
        featureName: survey.feature?.name,
        sourceLayer: survey.feature?.sourceLayer,
        scheme: survey.scheme,
        tahun: survey.tahun || surveyTahun,
        scoreTotal: survey.scoreTotal,
        scoreClass: survey.scoreClass,
        scoreDetail: survey.scoreDetail,
        values: survey.values,
        createdAt: survey.createdAt,
        updatedAt: survey.updatedAt,
        isUpdate: !!existingSurvey,
        message: existingSurvey 
          ? `Survey tahun ${surveyTahun} berhasil diperbarui` 
          : `Survey tahun ${surveyTahun} berhasil dibuat`
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
    });

  } catch (error) {
    console.error('Error creating survey:', error);
    return NextResponse.json(
      { error: 'Gagal menyimpan survei', details: error.message },
      { status: 500 }
    );
  }
}
