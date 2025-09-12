'use client'

import { useState, useEffect } from 'react'
import FileUpload from '../../components/FileUpload'
import { RefreshCw, Database, Map, Layers } from 'lucide-react'

export default function Sprint1TestPage() {
  const [apiTests, setApiTests] = useState({})
  const [loading, setLoading] = useState(false)
  const [layers, setLayers] = useState(null)
  const [features, setFeatures] = useState(null)

  const runAPITest = async (testName, url, options = {}) => {
    try {
      setApiTests(prev => ({ ...prev, [testName]: { loading: true } }))
      
      const response = await fetch(url, options)
      const data = await response.json()
      
      setApiTests(prev => ({ 
        ...prev, 
        [testName]: { 
          success: response.ok, 
          status: response.status,
          data: response.ok ? data : null,
          error: response.ok ? null : data.error || 'Unknown error'
        }
      }))
    } catch (error) {
      setApiTests(prev => ({ 
        ...prev, 
        [testName]: { 
          success: false, 
          error: error.message 
        }
      }))
    }
  }

  const runAllTests = async () => {
    setLoading(true)
    
    // Test database connection
    await runAPITest('upload_stats', '/api/upload')
    
    // Test layers API
    await runAPITest('layers', '/api/layers')
    
    // Test features API (without bbox)
    await runAPITest('features_basic', '/api/features?limit=10')
    
    // Test features API with filters
    await runAPITest('features_filtered', '/api/features?limit=5&scheme=utama')
    
    // Test bbox query (example coordinates)
    await runAPITest('features_bbox', '/api/features?bbox=105.0,-6.0,107.0,-5.0&limit=100')
    
    setLoading(false)
  }

  const refreshData = async () => {
    // Refresh layers and features data
    try {
      const [layersRes, featuresRes] = await Promise.all([
        fetch('/api/layers'),
        fetch('/api/features?limit=50')
      ])
      
      if (layersRes.ok) {
        setLayers(await layersRes.json())
      }
      if (featuresRes.ok) {
        setFeatures(await featuresRes.json())
      }
    } catch (error) {
      console.error('Error refreshing data:', error)
    }
  }

  useEffect(() => {
    refreshData()
  }, [])

  const TestResult = ({ test, testName }) => {
    if (!test) return <div className="text-gray-400">Not tested</div>
    
    if (test.loading) {
      return <div className="flex items-center text-blue-600">
        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
        Testing...
      </div>
    }
    
    return (
      <div className={`p-3 rounded ${test.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className={`font-medium ${test.success ? 'text-green-800' : 'text-red-800'}`}>
          {test.success ? '✓ Success' : '✗ Failed'} 
          {test.status && ` (${test.status})`}
        </div>
        {test.error && (
          <div className="text-red-600 text-sm mt-1">{test.error}</div>
        )}
        {test.data && (
          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-gray-600">Show response</summary>
            <pre className="text-xs bg-gray-100 p-2 mt-1 rounded overflow-x-auto">
              {JSON.stringify(test.data, null, 2)}
            </pre>
          </details>
        )}
      </div>
    )
  }

  const handleUploadSuccess = (result) => {
    refreshData() // Refresh data after successful upload
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Sprint 1 Testing Dashboard
          </h1>
          <p className="text-gray-600">
            Test database migration, upload system, and API endpoints
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* File Upload Test */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Database className="h-5 w-5 mr-2" />
              File Upload Test
            </h2>
            <FileUpload 
              onUploadSuccess={handleUploadSuccess}
              onUploadError={(error) => console.error('Upload error:', error)}
            />
          </div>

          {/* API Tests */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Map className="h-5 w-5 mr-2" />
                API Endpoints Test
              </h2>
              <button
                onClick={runAllTests}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Run All Tests
              </button>
            </div>

            <div className="space-y-4">
              {[
                { key: 'upload_stats', name: 'GET /api/upload - Upload Statistics' },
                { key: 'layers', name: 'GET /api/layers - Layers API' },
                { key: 'features_basic', name: 'GET /api/features - Basic Features' },
                { key: 'features_filtered', name: 'GET /api/features - With Filters' },
                { key: 'features_bbox', name: 'GET /api/features - Spatial Query' }
              ].map(({ key, name }) => (
                <div key={key}>
                  <h3 className="font-medium text-gray-900 mb-2">{name}</h3>
                  <TestResult test={apiTests[key]} testName={key} />
                </div>
              ))}
            </div>
          </div>

          {/* Layers Overview */}
          {layers && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Layers className="h-5 w-5 mr-2" />
                Layers Overview
              </h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total Layers:</span> {layers.totalLayers}
                  </div>
                  <div>
                    <span className="font-medium">Total Features:</span> {layers.totalFeatures}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Categories:</h3>
                  <div className="space-y-1">
                    {layers.categories.map((category, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{category.category}</span>
                        <span className="text-gray-600">{category.totalFeatures} features</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Layer Details:</h3>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {layers.layers.map((layer, idx) => (
                      <div key={idx} className="text-sm border-b pb-1">
                        <div className="font-medium">{layer.sourceLayer}</div>
                        <div className="text-gray-600">
                          {layer.featureCount} features • {layer.category}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Features Sample */}
          {features && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">
                Features Sample
              </h2>
              <div className="text-sm text-gray-600 mb-3">
                Showing {features.features.length} of {features.features.length} features
              </div>
              
              <div className="max-h-60 overflow-y-auto space-y-2">
                {features.features.slice(0, 10).map((feature, idx) => (
                  <div key={idx} className="border-b pb-2">
                    <div className="font-medium text-sm">
                      {feature.properties.name || feature.properties.Name || `Feature ${idx + 1}`}
                    </div>
                    <div className="text-xs text-gray-600">
                      ID: {feature.id} • Layer: {feature.properties.sourceLayer}
                      {feature.properties.scheme && ` • Scheme: ${feature.properties.scheme}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Test Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">Sprint 1 Test Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Click "Run All Tests" to verify all API endpoints are working</li>
            <li>Upload a KML or GeoJSON file to test the upload functionality</li>
            <li>Check the layers overview to see if data was imported correctly</li>
            <li>Verify features can be queried with different filters</li>
            <li>Test spatial queries with bounding box parameters</li>
          </ol>
          
          <div className="mt-4 p-3 bg-white border border-blue-300 rounded">
            <h4 className="font-medium text-blue-900 mb-2">Expected Sprint 1 Deliverables:</h4>
            <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
              <li>✅ PostgreSQL + PostGIS database setup</li>
              <li>✅ KML/GeoJSON upload to database</li>
              <li>✅ Layer categorization and management</li>
              <li>✅ Features API with spatial filtering</li>
              <li>✅ Real-time map rendering from database</li>
              <li>✅ Progress tracking and error handling</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
