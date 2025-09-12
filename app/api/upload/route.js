import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import * as togeojson from '@mapbox/togeojson'
import { DOMParser } from '@xmldom/xmldom'
import * as crypto from 'crypto'
import { 
  parseKMLDescription, 
  generateFeatureId, 
  detectScheme, 
  extractSourceLayer,
  extractDocumentId,
  extractAllDocumentIds,
  getFeatureDocumentId,
  validateGeoJSONFeature,
  simplifyGeometry
} from '../../../lib/kml-parser'

/**
 * POST /api/upload - Upload dan proses KML/GeoJSON files
 */
export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    
    if (!file || !file.size) {
      return NextResponse.json(
        { error: 'File tidak ditemukan' },
        { status: 400 }
      )
    }

    // Validate file type
    const fileName = file.name.toLowerCase()
    const isKML = fileName.endsWith('.kml')
    const isGeoJSON = fileName.endsWith('.geojson') || fileName.endsWith('.json')
    
    if (!isKML && !isGeoJSON) {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Gunakan KML atau GeoJSON.' },
        { status: 400 }
      )
    }

    // Read file content
    const fileContent = await file.text()
    let geoJSON
    let documentIds = []

    if (isKML) {
      // Parse KML to GeoJSON
      try {
        const parser = new DOMParser()
        const kmlDoc = parser.parseFromString(fileContent, 'text/xml')
        
        // Extract all Document IDs for multi-document KML files
        documentIds = extractAllDocumentIds(kmlDoc)
        console.info('Found document IDs:', documentIds.map(d => d.original))
        
        geoJSON = togeojson.kml(kmlDoc)
        
        // Store document info for later use
        geoJSON._documentIds = documentIds
        geoJSON._kmlDoc = kmlDoc
        
      } catch (error) {
        return NextResponse.json(
          { error: 'Gagal parsing file KML', details: error.message },
          { status: 400 }
        )
      }
    } else {
      // Parse GeoJSON
      try {
        geoJSON = JSON.parse(fileContent)
      } catch (error) {
        return NextResponse.json(
          { error: 'Format GeoJSON tidak valid', details: error.message },
          { status: 400 }
        )
      }
    }

    // Validate GeoJSON structure
    if (!geoJSON || geoJSON.type !== 'FeatureCollection' || !Array.isArray(geoJSON.features)) {
      return NextResponse.json(
        { error: 'GeoJSON harus berupa FeatureCollection dengan array features' },
        { status: 400 }
      )
    }

    // Create default source layer from filename
    const sourceLayerDefault = fileName.replace(/\.(kml|geojson|json)$/i, '')
    let insertedCount = 0
    let updatedCount = 0
    let errorCount = 0
    const errors = []
    const layersCreated = new Set()
    
    console.info(`Processing file: ${fileName}, found ${documentIds.length} document(s)`)
    if (documentIds.length > 0) {
      console.info('Document IDs:', documentIds.map(d => d.original).join(', '))
    }
    
    // Process all features and prepare bulk data
    const featuresToInsert = []
    const validFeatures = []
    const seenFeatureIds = new Set() // Track duplicate feature IDs

    for (let i = 0; i < geoJSON.features.length; i++) {
      const feature = geoJSON.features[i]
      
      try {
        // Validate feature
        const validFeature = validateGeoJSONFeature(feature)
        if (!validFeature) {
          errorCount++
          errors.push(`Feature ${i}: Invalid GeoJSON structure`)
          continue
        }

        const { geometry, properties = {} } = validFeature

        // Simplify geometry to prevent indexing issues
        const simplifiedGeometry = simplifyGeometry(geometry)

        // Parse KML description if exists
        let parsedProps = { ...properties }
        if (properties.description || properties.Description) {
          const description = properties.description || properties.Description
          const descriptionProps = parseKMLDescription(description)
          parsedProps = { ...parsedProps, ...descriptionProps }
        }

        // Generate stable feature ID with index to reduce collisions
        const featureId = generateFeatureId(validFeature, i)
        
        // Check for duplicate feature IDs within the same batch
        if (seenFeatureIds.has(featureId)) {
          console.warn(`Duplicate feature ID found: ${featureId}, skipping feature ${i}`)
          errorCount++
          errors.push(`Feature ${i}: Duplicate feature ID ${featureId}`)
          continue
        }
        seenFeatureIds.add(featureId)
        
        // Extract metadata
        const name = parsedProps.Name || parsedProps.name || `Feature ${i + 1}`
        const type = parsedProps.type || parsedProps.Type || null
        const scheme = detectScheme(parsedProps)
        
        // Determine source layer based on document structure
        let sourceLayer
        if (geoJSON._documentIds && geoJSON._kmlDoc) {
          // For KML files, determine which document this feature belongs to
          sourceLayer = getFeatureDocumentId(geoJSON._kmlDoc, i, geoJSON._documentIds)
        } else {
          // Fallback to feature-specific layer detection or filename
          sourceLayer = extractSourceLayer(validFeature, sourceLayerDefault)
        }
        
        layersCreated.add(sourceLayer)

        // Convert simplified geometry to GeoJSON string for PostGIS
        const geometryGeoJSON = JSON.stringify(simplifiedGeometry)

        featuresToInsert.push({
          id: crypto.randomUUID(), // Generate UUID for the id field
          featureId,
          name,
          type,
          scheme,
          sourceLayer,
          props: parsedProps,
          geometryGeoJSON
        })

        validFeatures.push({ index: i, featureId })

      } catch (error) {
        errorCount++
        errors.push(`Feature ${i}: ${error.message}`)
        console.error(`Error processing feature ${i}:`, error)
      }
    }

    // Perform bulk insert/update using raw SQL for better performance
    if (featuresToInsert.length > 0) {
      try {
        // Process in batches for very large datasets (batch size: 1000)
        const batchSize = 1000
        const totalBatches = Math.ceil(featuresToInsert.length / batchSize)
        
        console.info(`Processing ${featuresToInsert.length} features in ${totalBatches} batches...`)

        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
          const startIndex = batchIndex * batchSize
          const endIndex = Math.min(startIndex + batchSize, featuresToInsert.length)
          let batch = featuresToInsert.slice(startIndex, endIndex)

          // Additional deduplication within batch (just to be extra safe)
          const batchFeatureIds = new Set()
          batch = batch.filter(feature => {
            if (batchFeatureIds.has(feature.featureId)) {
              console.warn(`Removing duplicate in batch: ${feature.featureId}`)
              return false
            }
            batchFeatureIds.add(feature.featureId)
            return true
          })

          console.info(`Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} features)...`)

          // Create bulk insert query with ON CONFLICT for UPSERT
          const valuesClauses = []
          const params = []
          let paramIndex = 1

          for (const feature of batch) {
            valuesClauses.push(`(
              $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, 
              $${paramIndex++}, $${paramIndex++}::jsonb, 
              ST_Simplify(ST_Force2D(ST_GeomFromGeoJSON($${paramIndex++})), 0.0001), 
              NOW(), NOW()
            )`)
            
            params.push(
              feature.id,
              feature.featureId,
              feature.name,
              feature.type,
              feature.scheme,
              feature.sourceLayer,
              JSON.stringify(feature.props),
              feature.geometryGeoJSON
            )
          }

          const bulkUpsertQuery = `
            INSERT INTO features (
              id, feature_id, name, type, scheme, source_layer, props, geom, created_at, updated_at
            ) VALUES ${valuesClauses.join(', ')}
            ON CONFLICT (feature_id) 
            DO UPDATE SET
              name = EXCLUDED.name,
              type = EXCLUDED.type,
              scheme = EXCLUDED.scheme,
              source_layer = EXCLUDED.source_layer,
              props = EXCLUDED.props,
              geom = EXCLUDED.geom,
              updated_at = NOW()
            RETURNING 
              feature_id,
              (xmax = 0) AS inserted
          `

          const batchResults = await prisma.$queryRawUnsafe(bulkUpsertQuery, ...params)
          
          // Count insertions vs updates for this batch
          const batchInserted = batchResults.filter(r => r.inserted).length
          const batchUpdated = batchResults.length - batchInserted
          
          insertedCount += batchInserted
          updatedCount += batchUpdated

          console.info(`Batch ${batchIndex + 1} completed: ${batchInserted} inserted, ${batchUpdated} updated`)
        }

        console.info(`All batches completed: ${insertedCount} total inserted, ${updatedCount} total updated`)

      } catch (bulkError) {
        console.error('Bulk insert error:', bulkError)
        
        // Fallback to individual inserts if bulk fails
        console.info('Falling back to individual inserts...')
        insertedCount = 0
        updatedCount = 0
        
        for (let i = 0; i < featuresToInsert.length; i++) {
          const feature = featuresToInsert[i]
          
          try {
            const result = await prisma.feature.upsert({
              where: { featureId: feature.featureId },
              update: {
                name: feature.name,
                type: feature.type,
                scheme: feature.scheme,
                sourceLayer: feature.sourceLayer,
                props: feature.props,
              },
              create: {
                id: feature.id,
                featureId: feature.featureId,
                name: feature.name,
                type: feature.type,
                scheme: feature.scheme,
                sourceLayer: feature.sourceLayer,
                props: feature.props,
              }
            })

            // Update geometry separately with simplification
            await prisma.$executeRawUnsafe(`
              UPDATE features 
              SET geom = ST_Simplify(ST_Force2D(ST_GeomFromGeoJSON($1)), 0.0001)
              WHERE feature_id = $2
            `, feature.geometryGeoJSON, feature.featureId)

            insertedCount++
            
          } catch (individualError) {
            errorCount++
            errors.push(`Feature ${validFeatures[i]?.index || i}: ${individualError.message}`)
            console.error(`Individual insert error for ${feature.featureId}:`, individualError)
          }
        }
      }
    }

    // Prepare response
    const response = {
      success: true,
      summary: {
        totalFeatures: geoJSON.features.length,
        inserted: insertedCount,
        updated: updatedCount,
        errors: errorCount,
        layersCreated: Array.from(layersCreated)
      },
      fileName: file.name,
      fileSize: file.size,
      processingTime: new Date().toISOString()
    }

    if (errors.length > 0 && errors.length <= 10) {
      response.errors = errors.slice(0, 10) // Limit error messages
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { 
        error: 'Gagal memproses upload file', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/upload - Get upload statistics
 */
export async function GET() {
  try {
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_features,
        COUNT(DISTINCT source_layer) as total_layers,
        MIN(created_at) as first_upload,
        MAX(updated_at) as last_upload
      FROM features
    `

    // Convert BigInt values to regular numbers for JSON serialization
    const convertedStats = {
      total_features: Number(stats[0].total_features),
      total_layers: Number(stats[0].total_layers),
      first_upload: stats[0].first_upload,
      last_upload: stats[0].last_upload
    }

    return NextResponse.json({
      statistics: convertedStats,
      status: 'Upload system ready'
    })

  } catch (error) {
    console.error('Error getting upload stats:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil statistik upload' },
      { status: 500 }
    )
  }
}
