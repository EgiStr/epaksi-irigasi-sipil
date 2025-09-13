import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

/**
 * GET /api/surveys/stats - Get survey statistics and summaries
 * Query params:
 * - scheme: filter by scheme (utama/tersier)
 * - sourceLayer: filter by source layer
 * - startDate, endDate: filter by date range
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const scheme = searchParams.get('scheme');
    const sourceLayer = searchParams.get('sourceLayer');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where conditions for surveys
    const surveyWhere = {};
    if (scheme) surveyWhere.scheme = scheme;
    if (startDate || endDate) {
      surveyWhere.createdAt = {};
      if (startDate) surveyWhere.createdAt.gte = new Date(startDate);
      if (endDate) surveyWhere.createdAt.lte = new Date(endDate);
    }

    // Build where conditions for features
    const featureWhere = {};
    if (sourceLayer) featureWhere.sourceLayer = sourceLayer;

    // Get basic survey statistics
    const totalSurveys = await prisma.survey.count({ where: surveyWhere });
    
    // Get quality class distribution
    const qualityDistribution = await prisma.survey.groupBy({
      by: ['scoreClass'],
      where: surveyWhere,
      _count: { scoreClass: true },
      orderBy: { scoreClass: 'asc' }
    });

    // Get scheme distribution
    const schemeDistribution = await prisma.survey.groupBy({
      by: ['scheme'],
      where: surveyWhere,
      _count: { scheme: true },
      _avg: { scoreTotal: true },
      orderBy: { scheme: 'asc' }
    });

    // Get source layer statistics
    let sourceLayerStats;
    if (sourceLayer) {
      sourceLayerStats = await prisma.$queryRaw`
        SELECT 
          f.source_layer,
          COUNT(s.id)::text as survey_count,
          AVG(s.score_total) as avg_score,
          COUNT(DISTINCT s.feature_id)::text as features_surveyed,
          COUNT(DISTINCT f.feature_id)::text as total_features,
          ROUND(
            (COUNT(DISTINCT s.feature_id)::numeric / NULLIF(COUNT(DISTINCT f.feature_id)::numeric, 0) * 100), 
            2
          ) as coverage_percentage
        FROM features f
        LEFT JOIN surveys s ON f.feature_id = s.feature_id
        WHERE f.source_layer = ${sourceLayer}
        GROUP BY f.source_layer
        ORDER BY f.source_layer
      `;
    } else {
      sourceLayerStats = await prisma.$queryRaw`
        SELECT 
          f.source_layer,
          COUNT(s.id)::text as survey_count,
          AVG(s.score_total) as avg_score,
          COUNT(DISTINCT s.feature_id)::text as features_surveyed,
          COUNT(DISTINCT f.feature_id)::text as total_features,
          ROUND(
            (COUNT(DISTINCT s.feature_id)::numeric / NULLIF(COUNT(DISTINCT f.feature_id)::numeric, 0) * 100), 
            2
          ) as coverage_percentage
        FROM features f
        LEFT JOIN surveys s ON f.feature_id = s.feature_id
        GROUP BY f.source_layer
        ORDER BY f.source_layer
      `;
    }

    // Get recent surveys with feature info
    const recentSurveys = await prisma.survey.findMany({
      where: surveyWhere,
      include: {
        feature: {
          select: {
            featureId: true,
            name: true,
            sourceLayer: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Get score distribution (histogram data)
    const scoreRanges = [
      { min: 0, max: 25, label: '0-25%' },
      { min: 25, max: 50, label: '25-50%' },
      { min: 50, max: 75, label: '50-75%' },
      { min: 75, max: 100, label: '75-100%' }
    ];

    const scoreDistribution = await Promise.all(
      scoreRanges.map(async (range) => {
        const count = await prisma.survey.count({
          where: {
            ...surveyWhere,
            scoreTotal: {
              gte: range.min,
              lt: range.max === 100 ? 101 : range.max // Include 100 in the last range
            }
          }
        });
        return { ...range, count };
      })
    );

    // Calculate overall statistics
    const overallStats = await prisma.survey.aggregate({
      where: surveyWhere,
      _avg: { scoreTotal: true },
      _min: { scoreTotal: true },
      _max: { scoreTotal: true },
      _count: { id: true }
    });

    // Get monthly trend (last 12 months)
    let monthlyTrend;
    if (scheme) {
      monthlyTrend = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*)::text as survey_count,
          AVG(score_total) as avg_score,
          scheme
        FROM surveys 
        WHERE created_at >= NOW() - INTERVAL '12 months'
        AND scheme = ${scheme}
        GROUP BY DATE_TRUNC('month', created_at), scheme
        ORDER BY month DESC, scheme
      `;
    } else {
      monthlyTrend = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*)::text as survey_count,
          AVG(score_total) as avg_score,
          scheme
        FROM surveys 
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at), scheme
        ORDER BY month DESC, scheme
      `;
    }

    return NextResponse.json({
      summary: {
        totalSurveys,
        averageScore: overallStats._avg.scoreTotal || 0,
        minScore: overallStats._min.scoreTotal || 0,
        maxScore: overallStats._max.scoreTotal || 0,
        lastUpdated: new Date().toISOString()
      },
      distributions: {
        qualityClass: qualityDistribution.map(item => ({
          grade: item.scoreClass,
          count: item._count.scoreClass,
          percentage: totalSurveys > 0 ? Math.round((item._count.scoreClass / totalSurveys) * 100) : 0
        })),
        scheme: schemeDistribution.map(item => ({
          scheme: item.scheme,
          count: item._count.scheme,
          averageScore: item._avg.scoreTotal || 0,
          percentage: totalSurveys > 0 ? Math.round((item._count.scheme / totalSurveys) * 100) : 0
        })),
        scoreRanges: scoreDistribution.map(item => ({
          ...item,
          percentage: totalSurveys > 0 ? Math.round((item.count / totalSurveys) * 100) : 0
        }))
      },
      sourceLayerStats: sourceLayerStats.map(item => ({
        sourceLayer: item.source_layer,
        surveyCount: parseInt(item.survey_count),
        avgScore: parseFloat(item.avg_score) || 0,
        featuresSurveyed: parseInt(item.features_surveyed),
        totalFeatures: parseInt(item.total_features),
        coveragePercentage: parseFloat(item.coverage_percentage) || 0
      })),
      recentSurveys: recentSurveys.map(survey => ({
        id: survey.id,
        featureId: survey.featureId,
        featureName: survey.feature?.name || 'Unnamed Feature',
        sourceLayer: survey.feature?.sourceLayer,
        scheme: survey.scheme,
        scoreTotal: survey.scoreTotal,
        scoreClass: survey.scoreClass,
        createdAt: survey.createdAt,
        surveyorName: survey.user?.name || 'System'
      })),
      trends: {
        monthly: monthlyTrend.map(item => ({
          month: item.month,
          scheme: item.scheme,
          surveyCount: parseInt(item.survey_count),
          avgScore: parseFloat(item.avg_score) || 0
        }))
      },
      filters: { scheme, sourceLayer, startDate, endDate }
    });

  } catch (error) {
    console.error('Error fetching survey statistics:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil statistik survei', details: error.message },
      { status: 500 }
    );
  }
}
