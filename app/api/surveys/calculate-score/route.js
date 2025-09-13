import { NextResponse } from 'next/server';
import { calculateTotalScore } from '../../../../lib/scoring/engine.js';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
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
