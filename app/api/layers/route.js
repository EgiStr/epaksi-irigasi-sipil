import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

/**
 * GET /api/layers - Ambil daftar layer dengan statistik
 */
export async function GET() {
  try {
    // Query untuk mendapatkan statistik per layer
    const query = `
      SELECT 
        source_layer,
        COUNT(*) as feature_count,
        COUNT(CASE WHEN scheme = 'utama' THEN 1 END) as utama_count,
        COUNT(CASE WHEN scheme = 'tersier' THEN 1 END) as tersier_count,
        COUNT(CASE WHEN scheme IS NULL THEN 1 END) as unclassified_count,
        MIN(created_at) as first_created,
        MAX(created_at) as last_updated
      FROM features 
      GROUP BY source_layer
      ORDER BY source_layer
    `

    const layers = await prisma.$queryRawUnsafe(query)

    // Standardize layer categories berdasarkan naming convention
    const layersWithCategories = layers.map(layer => {
      let category = 'Other'
      const layerName = layer.source_layer.toLowerCase()
      
      if (layerName.includes('batas') || layerName.includes('wilayah')) {
        category = 'Batas Wilayah'
      } else if (layerName.includes('bangunan') || layerName.includes('infrastruktur')) {
        category = 'Bangunan_Irigasi WR'
      } else if (layerName.includes('saluran') || layerName.includes('channel')) {
        category = 'Saluran Irigasi'
      } else if (layerName.includes('pemukiman') || layerName.includes('settlement')) {
        category = 'Pemukiman'
      } else if (layerName.includes('jalan') || layerName.includes('road')) {
        category = 'Jaringan Jalan'
      }

      return {
        sourceLayer: layer.source_layer,
        category,
        featureCount: Number(layer.feature_count),
        schemeDistribution: {
          utama: Number(layer.utama_count),
          tersier: Number(layer.tersier_count),
          unclassified: Number(layer.unclassified_count)
        },
        firstCreated: layer.first_created,
        lastUpdated: layer.last_updated
      }
    })

    // Group by category
    const groupedByCategory = layersWithCategories.reduce((acc, layer) => {
      const category = layer.category
      if (!acc[category]) {
        acc[category] = {
          category,
          layers: [],
          totalFeatures: 0
        }
      }
      acc[category].layers.push(layer)
      acc[category].totalFeatures += layer.featureCount
      return acc
    }, {})

    const summary = {
      totalLayers: layers.length,
      totalFeatures: layers.reduce((sum, layer) => sum + Number(layer.feature_count), 0),
      categories: Object.values(groupedByCategory),
      layers: layersWithCategories
    }

    return NextResponse.json(summary)
    
  } catch (error) {
    console.error('Error fetching layers:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data layers', details: error.message },
      { status: 500 }
    )
  }
}
