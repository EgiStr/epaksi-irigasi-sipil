import * as crypto from 'crypto'

/**
 * Utility untuk parsing KML dan konversi ke format yang bisa disimpan di database
 */

/**
 * Parse KML Description (HTML table) menjadi properties JSON
 * @param {string} description - HTML string dari KML description
 * @returns {object} - Properties object
 */
export function parseKMLDescription(description) {
  if (!description) return {}
  
  try {
    const props = {}
    
    // Parse HTML table dalam description
    const tableMatches = description.match(/<table[^>]*>(.*?)<\/table>/gis)
    if (tableMatches) {
      const tableContent = tableMatches[0]
      const rowMatches = tableContent.match(/<tr[^>]*>(.*?)<\/tr>/gis)
      
      if (rowMatches) {
        rowMatches.forEach(row => {
          const cellMatches = row.match(/<t[dh][^>]*>(.*?)<\/t[dh]>/gis)
          if (cellMatches && cellMatches.length >= 2) {
            const key = cellMatches[0].replace(/<[^>]*>/g, '').trim()
            const value = cellMatches[1].replace(/<[^>]*>/g, '').trim()
            if (key && value) {
              props[key] = value
            }
          }
        })
      }
    }
    
    // Fallback: parse key-value pairs dari text
    if (Object.keys(props).length === 0) {
      const lines = description.replace(/<[^>]*>/g, '').split('\n')
      lines.forEach(line => {
        const colonIndex = line.indexOf(':')
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim()
          const value = line.substring(colonIndex + 1).trim()
          if (key && value) {
            props[key] = value
          }
        }
      })
    }
    
    return props
  } catch (error) {
    console.error('Error parsing KML description:', error)
    return {}
  }
}

/**
 * Generate stable feature ID dari koordinat dan nama
 * @param {object} feature - GeoJSON feature
 * @param {number} index - Index of feature in the collection (optional)
 * @returns {string} - Stable feature ID
 */
export function generateFeatureId(feature, index = null) {
  try {
    const geometry = feature.geometry
    const properties = feature.properties || {}
    
    // Create hash dari koordinat, nama, dan context untuk stable ID
    const coordsString = JSON.stringify(geometry?.coordinates || [])
    const nameString = properties.Name || properties.name || ''
    const description = properties.description || properties.Description || ''
    const indexString = index !== null ? `-${index}` : ''
    
    // Use more context to reduce collisions
    const source = `${coordsString}-${nameString}-${description}${indexString}`
    
    return crypto.createHash('md5').update(source).digest('hex')
  } catch (error) {
    console.error('Error generating feature ID:', error)
    return crypto.randomUUID()
  }
}

/**
 * Deteksi scheme berdasarkan properties
 * @param {object} properties - Properties dari feature
 * @returns {string|null} - 'utama', 'tersier', atau null
 */
export function detectScheme(properties) {
  const text = JSON.stringify(properties).toLowerCase()
  
  if (text.includes('utama') || text.includes('primer') || text.includes('induk')) {
    return 'utama'
  }
  if (text.includes('tersier') || text.includes('tertiary')) {
    return 'tersier'
  }
  
  return null
}

/**
 * Extract all document IDs from KML Document elements
 * @param {Document} kmlDoc - Parsed KML document
 * @returns {Array} - Array of document IDs
 */
export function extractAllDocumentIds(kmlDoc) {
  try {
    const documentIds = []
    const documentElements = kmlDoc.getElementsByTagName('Document')
    
    for (let i = 0; i < documentElements.length; i++) {
      const doc = documentElements[i]
      const id = doc.getAttribute('id')
      if (id) {
        // Convert to lowercase and replace spaces/underscores for consistency
        const cleanId = id.toLowerCase().replace(/[_\s]+/g, '_')
        documentIds.push({
          index: i,
          id: cleanId,
          original: id,
          element: doc
        })
      }
    }
    
    // If no documents with IDs found, create default
    if (documentIds.length === 0) {
      documentIds.push({
        index: 0,
        id: 'default_layer',
        original: 'Default Layer',
        element: null
      })
    }
    
    return documentIds
  } catch (error) {
    console.error('Error extracting document IDs:', error)
    return [{
      index: 0,
      id: 'default_layer',
      original: 'Default Layer',
      element: null
    }]
  }
}

/**
 * Determine which document a feature belongs to by analyzing KML structure
 * @param {Document} kmlDoc - Parsed KML document
 * @param {number} featureIndex - Index of the feature
 * @param {Array} documentIds - Array of document information
 * @returns {string} - Document ID for this feature
 */
export function getFeatureDocumentId(kmlDoc, featureIndex, documentIds) {
  try {
    // Get all Placemark elements
    const placemarks = kmlDoc.getElementsByTagName('Placemark')
    
    if (featureIndex >= placemarks.length || featureIndex < 0) {
      return documentIds[0]?.id || 'default_layer'
    }
    
    const currentPlacemark = placemarks[featureIndex]
    
    // Walk up the DOM tree to find the parent Document
    let parent = currentPlacemark.parentNode
    while (parent && parent.tagName !== 'Document' && parent.tagName !== 'kml') {
      parent = parent.parentNode
    }
    
    if (parent && parent.tagName === 'Document') {
      const parentId = parent.getAttribute('id')
      if (parentId) {
        const cleanId = parentId.toLowerCase().replace(/[_\s]+/g, '_')
        return cleanId
      }
    }
    
    // Fallback: distribute features evenly across documents
    const docIndex = Math.floor(featureIndex / Math.ceil(placemarks.length / documentIds.length))
    return documentIds[Math.min(docIndex, documentIds.length - 1)]?.id || 'default_layer'
    
  } catch (error) {
    console.error('Error determining feature document:', error)
    return documentIds[0]?.id || 'default_layer'
  }
}

/**
 * Extract source layer from KML Document ID (legacy - for backward compatibility)
 * @param {Document} kmlDoc - Parsed KML document
 * @returns {string} - Document ID as source layer
 */
export function extractDocumentId(kmlDoc) {
  try {
    const documentIds = extractAllDocumentIds(kmlDoc)
    return documentIds[0]?.id || 'default_layer'
  } catch (error) {
    console.error('Error extracting document ID:', error)
    return 'default_layer'
  }
}

/**
 * Extract nama layer dari KML layerName atau properties
 * @param {object} feature - GeoJSON feature
 * @param {string} defaultLayer - Default layer name
 * @returns {string} - Layer name
 */
export function extractSourceLayer(feature, defaultLayer = 'imported') {
  const properties = feature.properties || {}
  
  // Cek berbagai kemungkinan field untuk layer name
  const possibleLayerFields = [
    'layerName', 'layer_name', 'Layer', 'category', 
    'type', 'jenis', 'klasifikasi'
  ]
  
  for (const field of possibleLayerFields) {
    if (properties[field]) {
      return properties[field].toString()
    }
  }
  
  return defaultLayer
}

/**
 * Konversi coordinates ke format PostGIS yang benar
 * @param {object} geometry - GeoJSON geometry
 * @returns {string} - WKT string untuk PostGIS
 */
export function geometryToWKT(geometry) {
  if (!geometry || !geometry.coordinates) return null
  
  try {
    const { type, coordinates } = geometry
    
    switch (type) {
      case 'Point':
        return `POINT(${coordinates[0]} ${coordinates[1]})`
        
      case 'LineString':
        const lineCoords = coordinates.map(coord => `${coord[0]} ${coord[1]}`).join(',')
        return `LINESTRING(${lineCoords})`
        
      case 'Polygon':
        const rings = coordinates.map(ring => {
          const ringCoords = ring.map(coord => `${coord[0]} ${coord[1]}`).join(',')
          return `(${ringCoords})`
        }).join(',')
        return `POLYGON(${rings})`
        
      case 'MultiPoint':
        const multiPointCoords = coordinates.map(coord => `(${coord[0]} ${coord[1]})`).join(',')
        return `MULTIPOINT(${multiPointCoords})`
        
      case 'MultiLineString':
        const multiLineCoords = coordinates.map(line => {
          const lineCoords = line.map(coord => `${coord[0]} ${coord[1]}`).join(',')
          return `(${lineCoords})`
        }).join(',')
        return `MULTILINESTRING(${multiLineCoords})`
        
      case 'MultiPolygon':
        const multiPolygonCoords = coordinates.map(polygon => {
          const rings = polygon.map(ring => {
            const ringCoords = ring.map(coord => `${coord[0]} ${coord[1]}`).join(',')
            return `(${ringCoords})`
          }).join(',')
          return `(${rings})`
        }).join(',')
        return `MULTIPOLYGON(${multiPolygonCoords})`
        
      default:
        console.warn(`Unsupported geometry type: ${type}`)
        return null
    }
  } catch (error) {
    console.error('Error converting geometry to WKT:', error)
    return null
  }
}

/**
 * Remove Z coordinates from geometry to make it 2D
 * @param {object} geometry - GeoJSON geometry
 * @returns {object} - 2D geometry
 */
export function force2D(geometry) {
  if (!geometry || !geometry.coordinates) return geometry
  
  const force2DCoords = (coords) => {
    if (typeof coords[0] === 'number') {
      // This is a coordinate pair/triple, return only x,y
      return [coords[0], coords[1]]
    }
    // This is an array of coordinates, recursively process
    return coords.map(force2DCoords)
  }
  
  return {
    ...geometry,
    coordinates: force2DCoords(geometry.coordinates)
  }
}

/**
 * Simplify geometry to reduce complexity for PostGIS indexing
 * @param {object} geometry - GeoJSON geometry
 * @returns {object} - Simplified geometry
 */
export function simplifyGeometry(geometry) {
  if (!geometry || !geometry.coordinates) return geometry
  
  const simplifyCoordinates = (coords, isRing = false) => {
    if (!Array.isArray(coords) || coords.length === 0) return coords
    
    // If it's a simple coordinate pair [lng, lat]
    if (typeof coords[0] === 'number') {
      return [Math.round(coords[0] * 1000000) / 1000000, Math.round(coords[1] * 1000000) / 1000000]
    }
    
    // If it's an array of coordinates
    if (Array.isArray(coords[0])) {
      let simplified = coords.map(coord => simplifyCoordinates(coord))
      
      // For rings and lines, apply Douglas-Peucker-like simplification
      if (simplified.length > 100) { // Only simplify if too many points
        const step = Math.max(1, Math.floor(simplified.length / 50)) // Keep max 50 points
        simplified = simplified.filter((_, index) => index % step === 0)
        
        // Always keep first and last points for rings/lines
        if (isRing && simplified.length > 2) {
          simplified[simplified.length - 1] = coords[coords.length - 1]
        }
      }
      
      return simplified
    }
    
    return coords
  }
  
  try {
    const { type, coordinates } = geometry
    
    switch (type) {
      case 'Point':
        return {
          ...geometry,
          coordinates: simplifyCoordinates(coordinates)
        }
        
      case 'LineString':
        return {
          ...geometry,
          coordinates: simplifyCoordinates(coordinates)
        }
        
      case 'Polygon':
        return {
          ...geometry,
          coordinates: coordinates.map((ring, index) => simplifyCoordinates(ring, true))
        }
        
      case 'MultiPoint':
        return {
          ...geometry,
          coordinates: coordinates.map(coord => simplifyCoordinates(coord))
        }
        
      case 'MultiLineString':
        return {
          ...geometry,
          coordinates: coordinates.map(line => simplifyCoordinates(line))
        }
        
      case 'MultiPolygon':
        return {
          ...geometry,
          coordinates: coordinates.map(polygon => 
            polygon.map((ring, index) => simplifyCoordinates(ring, true))
          )
        }
        
      default:
        return geometry
    }
  } catch (error) {
    console.error('Error simplifying geometry:', error)
    return geometry
  }
}

/**
 * Validate dan sanitize GeoJSON feature
 * @param {object} feature - GeoJSON feature
 * @returns {object} - Validated feature atau null jika invalid
 */
export function validateGeoJSONFeature(feature) {
  if (!feature || typeof feature !== 'object') return null
  if (feature.type !== 'Feature') return null
  if (!feature.geometry || !feature.geometry.coordinates) return null
  
  try {
    // Basic validation
    const { geometry, properties = {} } = feature
    
    // Validate coordinates
    const coords = geometry.coordinates
    if (!Array.isArray(coords)) return null
    
    // Ensure coordinates are numbers
    const validateCoords = (coords) => {
      if (typeof coords === 'number') return !isNaN(coords)
      if (Array.isArray(coords)) return coords.every(validateCoords)
      return false
    }
    
    if (!validateCoords(coords)) return null
    
    // Force geometry to 2D to avoid Z dimension issues
    const geometry2D = force2D(geometry)
    
    return {
      ...feature,
      geometry: geometry2D,
      properties: {
        ...properties,
        // Ensure Name field exists
        Name: properties.Name || properties.name || 'Unnamed Feature'
      }
    }
  } catch (error) {
    console.error('Error validating GeoJSON feature:', error)
    return null
  }
}
