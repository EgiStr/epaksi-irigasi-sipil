import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { hasPermission, PERMISSIONS } from '../../../../lib/permissions';
import { calculateTotalScore } from '../../../../lib/scoring/engine.js';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const session = await getServerSession()
    
    if (!session || !hasPermission(session.user.role, PERMISSIONS.SURVEY_CALCULATE)) {
      return NextResponse.json(
        { error: 'Akses ditolak. Anda tidak memiliki izin untuk menghitung skor survei.' },
        { status: 403 }
      )
    }

    const { surveyType, values } = await request.json();

    // Validate input
    if (!surveyType || !values) {
      return NextResponse.json(
        { error: 'Survey type dan values harus diisi' },
        { status: 400 }
      );
    }

    // Load survey configuration
    const configPath = path.join(process.cwd(), 'config', `survey-${surveyType}.json`);
    
    if (!fs.existsSync(configPath)) {
      return NextResponse.json(
        { error: `Konfigurasi survey ${surveyType} tidak ditemukan` },
        { status: 404 }
      );
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    

    // Calculate score
    const result = calculateTotalScore(values, config);

    return NextResponse.json({
      score: result.totalScore,
      qualityClass: result.qualityClass,
      categoryScores: result.categoryScores,
      surveyType,
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
