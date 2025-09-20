import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { hasPermission, PERMISSIONS } from '../../../../lib/permissions';
import { calculateTotalScore } from '../../../../lib/scoring/engine.js';
import { prisma } from '../../../../lib/prisma.js';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !hasPermission(session.user.role, PERMISSIONS.SURVEY_CALCULATE)) {
      return NextResponse.json(
        { error: 'Akses ditolak. Anda tidak memiliki izin untuk menghitung skor survei.' },
        { status: 403 }
      )
    }

    const { surveyType, scheme, configId, values } = await request.json();

    // Validate input
    if (!values) {
      return NextResponse.json(
        { error: 'Values harus diisi' },
        { status: 400 }
      );
    }

    // Determine scheme from surveyType or use provided scheme
    const schemeToUse = scheme || surveyType;
    if (!schemeToUse) {
      return NextResponse.json(
        { error: 'Scheme atau surveyType harus diisi' },
        { status: 400 }
      );
    }

    // Validate scheme
    if (!['utama', 'tersier'].includes(schemeToUse)) {
      return NextResponse.json(
        { error: 'Scheme harus berupa "utama" atau "tersier"' },
        { status: 400 }
      );
    }

    let config;

    // Try to load config from database first
    if (configId) {
      config = await prisma.config.findUnique({
        where: { id: parseInt(configId) },
        select: { id: true, scheme: true, json: true, active: true }
      });
    } else {
      // Get active config for the scheme
      config = await prisma.config.findFirst({
        where: { scheme: schemeToUse, active: true },
        select: { id: true, scheme: true, json: true, active: true }
      });
    }

    // Fallback to file-based config if database config not found
    if (!config) {
      console.warn(`Database config not found for scheme: ${schemeToUse}, falling back to file config`);
      
      const configPath = path.join(process.cwd(), 'config', `survey-${schemeToUse}.json`);
      
      if (!fs.existsSync(configPath)) {
        return NextResponse.json(
          { error: `Konfigurasi survey ${schemeToUse} tidak ditemukan` },
          { status: 404 }
        );
      }

      const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      config = { json: fileConfig, scheme: schemeToUse, id: null };
    }

    // Calculate score with enhanced engine
    const result = calculateTotalScore(values, config.json);

    return NextResponse.json({
      score: result.totalScore,
      qualityClass: result.qualityClass,
      categoryScores: result.categoryScores,
      scoreDetail: result,
      scheme: config.scheme,
      configId: config.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error calculating score:', error);
    console.error('Stack trace:', error.stack);
    return NextResponse.json(
      { error: 'Gagal menghitung skor survey', details: error.message },
      { status: 500 }
    );
  }
}
