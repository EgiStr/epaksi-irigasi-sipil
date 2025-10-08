'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Calendar, User, FileText, Image, Star } from 'lucide-react'
import Layout from '../../../components/Layout'
import { useRequireAuth } from '../../../hooks/useAuth'

export default function FeatureDetailPage() {
  const { loading: authLoading } = useRequireAuth()
  const params = useParams()
  const router = useRouter()
  const { featureId } = params

  const [feature, setFeature] = useState(null)
  const [pai, setPai] = useState(null)
  const [surveys, setSurveys] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (featureId) {
      fetchFeatureDetail()
    }
  }, [featureId])

  const fetchFeatureDetail = async () => {
    try {
      setLoading(true)
      
      // Fetch feature data with detailed management format
      const featureResponse = await fetch(`/api/features/${featureId}?format=management`)
      if (featureResponse.ok) {
        const featureData = await featureResponse.json()
        setFeature(featureData)
        setSurveys(featureData.surveys || [])
        setPai(featureData.pai && featureData.pai.length > 0 ? featureData.pai[0] : null)
      } else {
        throw new Error('Gagal mengambil data feature')
      }

    } catch (error) {
      console.error('Error fetching feature detail:', error)
      setError('Gagal memuat detail feature')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getScoreColor = (scoreClass) => {
    switch (scoreClass) {
      case 'A': return 'text-green-600 bg-green-100'
      case 'B': return 'text-blue-600 bg-blue-100'
      case 'C': return 'text-yellow-600 bg-yellow-100'
      case 'D': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const parseXMLDescription = (xmlString) => {
    if (!xmlString || typeof xmlString !== 'string') return null
    
    try {
      // Simple XML/HTML parser untuk extract key-value pairs
      const parser = new DOMParser()
      const doc = parser.parseFromString(xmlString, 'text/xml')
      
      // Check if it's valid XML
      if (doc.getElementsByTagName('parsererror').length > 0) {
        // Try as HTML
        const htmlDoc = parser.parseFromString(xmlString, 'text/html')
        return extractDataFromHTML(htmlDoc)
      } else {
        return extractDataFromXML(doc)
      }
    } catch (error) {
      console.error('Error parsing XML/HTML:', error)
      return null
    }
  }

  const extractDataFromXML = (doc) => {
    const data = {}
    const elements = doc.querySelectorAll('*')
    
    elements.forEach(element => {
      if (element.children.length === 0 && element.textContent.trim()) {
        data[element.tagName] = element.textContent.trim()
      }
    })
    
    return Object.keys(data).length > 0 ? data : null
  }

  const extractDataFromHTML = (doc) => {
    const data = {}
    
    // Try to extract from table structure
    const tables = doc.querySelectorAll('table')
    tables.forEach(table => {
      const rows = table.querySelectorAll('tr')
      rows.forEach(row => {
        const cells = row.querySelectorAll('td, th')
        if (cells.length >= 2) {
          const key = cells[0].textContent.trim()
          const value = cells[1].textContent.trim()
          if (key && value) {
            data[key] = value
          }
        }
      })
    })

    // Try to extract from div or span with specific patterns
    if (Object.keys(data).length === 0) {
      const text = doc.body ? doc.body.textContent : doc.textContent
      const lines = text.split('\n').filter(line => line.trim())
      
      lines.forEach(line => {
        const colonIndex = line.indexOf(':')
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim()
          const value = line.substring(colonIndex + 1).trim()
          if (key && value) {
            data[key] = value
          }
        }
      })
    }
    
    return Object.keys(data).length > 0 ? data : null
  }

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="h-full">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="h-full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="h-full">
        {/* Header Section */}
        <div className="dashboard-header">
          
          <h2>Detail Infrastruktur Irigasi</h2>
          <p className="flex items-center text-gray-600">
            <MapPin className="w-4 h-4 mr-2" />
            Feature ID: {featureId}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Feature Information */}
          <div className="content-card">
            <div className="card-header">
              <h3 className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Informasi Feature
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">Nama</span>
                  <span className="text-gray-900">{feature?.name || 'Tidak tersedia'}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">Tipe</span>
                  <span className="text-gray-900">{feature?.type || 'Tidak tersedia'}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">Skema</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    feature?.scheme === 'utama' ? 'bg-blue-100 text-blue-800' :
                    feature?.scheme === 'tersier' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {feature?.scheme || 'Tidak tersedia'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">Source Layer</span>
                  <span className="text-gray-900">{feature?.sourceLayer || 'Tidak tersedia'}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">Dibuat</span>
                  <span className="text-gray-900">{feature?.createdAt ? formatDate(feature.createdAt) : 'Tidak tersedia'}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">Diperbarui</span>
                  <span className="text-gray-900">{feature?.updatedAt ? formatDate(feature.updatedAt) : 'Tidak tersedia'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Survey Information */}
          <div className="content-card">
            <div className="card-header">
              <h3 className="flex items-center">
                <Star className="w-5 h-5 mr-2" />
                Hasil Penilaian Survey
              </h3>
              <span className="activity-count">{surveys.length} Survey</span>
            </div>
            <div className="p-6">
              {surveys.length > 0 ? (
                <div className="space-y-4">
                  {surveys.map((survey, index) => (
                    <div key={survey.id} className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-white">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-sm font-medium text-gray-600">Survey #{index + 1}</span>
                          <div className="text-sm text-gray-500">{formatDate(survey.createdAt)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-gray-900">
                            {survey.scoreTotal?.toFixed(1) || 'N/A'}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(survey.scoreClass)}`}>
                            Kelas {survey.scoreClass || 'N/A'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid gap-4 mb-3 text-sm">
                        <div className="flex justify-between">
                          <span className="font-bold text-gray-600">Skema :</span>
                          <span className="text-gray-900 font-semibold">{survey.scheme}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-gray-600">Surveyor :</span>
                          <span className="text-gray-900 font-semibold">{survey.user?.name || 'Tidak diketahui'}</span>
                        </div>
                      </div>

                      {/* Detail Skor */}
                      {survey.scoreDetail && (
                        <div className="mt-3 p-3 bg-white rounded-lg border">
                          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Detail Skor Penilaian</h4>
                          <div className="grid grid-cols-1 gap-2 text-xs">
                            {Object.entries(survey.scoreDetail).map(([key, value]) => (
                              <div key={key} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded border">
                                <span className="font-medium text-gray-700">
                                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                                <span className="text-gray-900 font-semibold">
                                  {typeof value === 'number' ? 
                                    value.toFixed(2) : 
                                    typeof value === 'object' && value !== null ? 
                                      `${Object.keys(value).length} items` : 
                                    String(value)
                                  }
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Belum ada data survey untuk feature ini</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PAI Information */}
        {pai && (
          <div className="mt-6 content-card">
            <div className="card-header">
              <h3 className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Data PAI ({pai.paiType})
              </h3>
              <span className="text-sm text-gray-600">
                Dibuat: {formatDate(pai.createdAt)} oleh {pai.user?.name}
              </span>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* DI Information */}
                {pai.paiData.di && (
                  <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg border">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                      Daerah Irigasi
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Nama:</span>
                        <span className="text-gray-900">{pai.paiData.di.name || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Kode:</span>
                        <span className="text-gray-900">{pai.paiData.di.kode || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Luas (Ha):</span>
                        <span className="text-gray-900">{pai.paiData.di.area_ha || '-'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Asset Information */}
                {pai.paiData.aset && (
                  <div className="bg-gradient-to-br from-green-50 to-white p-4 rounded-lg border">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-green-600" />
                      Aset
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Jenis:</span>
                        <span className="text-gray-900">{pai.paiData.aset.jenis || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Nama:</span>
                        <span className="text-gray-900">{pai.paiData.aset.nama || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Nomenklatur:</span>
                        <span className="text-gray-900">{pai.paiData.aset.nomenklatur || '-'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Technical Information */}
                {pai.paiData.teknis && (
                  <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-lg border">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-purple-600" />
                      Data Teknis
                    </h4>
                    <div className="space-y-3">
                      {pai.paiData.teknis.panjang_m && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">Panjang (m):</span>
                          <span className="text-gray-900">{pai.paiData.teknis.panjang_m}</span>
                        </div>
                      )}
                      {pai.paiData.teknis.lebar_atas_m && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">Lebar Atas (m):</span>
                          <span className="text-gray-900">{pai.paiData.teknis.lebar_atas_m}</span>
                        </div>
                      )}
                      {pai.paiData.teknis.lebar_bawah_m && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">Lebar Bawah (m):</span>
                          <span className="text-gray-900">{pai.paiData.teknis.lebar_bawah_m}</span>
                        </div>
                      )}
                      {pai.paiData.teknis.tinggi_m && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">Tinggi (m):</span>
                          <span className="text-gray-900">{pai.paiData.teknis.tinggi_m}</span>
                        </div>
                      )}
                      {pai.paiData.teknis.material && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">Material:</span>
                          <span className="text-gray-900">{pai.paiData.teknis.material}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Operational Information */}
                {pai.paiData.operasional && (
                  <div className="bg-gradient-to-br from-yellow-50 to-white p-4 rounded-lg border">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Star className="w-4 h-4 mr-2 text-yellow-600" />
                      Data Operasional
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Status:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          pai.paiData.operasional.status === 'aktif' ? 'bg-green-100 text-green-800' :
                          pai.paiData.operasional.status === 'tidak_aktif' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {pai.paiData.operasional.status || '-'}
                        </span>
                      </div>
                      {pai.paiData.operasional.tahun_pembangunan && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">Tahun Pembangunan:</span>
                          <span className="text-gray-900">{pai.paiData.operasional.tahun_pembangunan}</span>
                        </div>
                      )}
                      {pai.paiData.operasional.catatan && (
                        <div className="mt-3">
                          <span className="font-medium text-gray-600">Catatan:</span>
                          <p className="text-gray-900 mt-1 text-sm">{pai.paiData.operasional.catatan}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Photos */}
              {pai.paiPhotos && pai.paiPhotos.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <Image className="w-5 h-5 mr-2 text-blue-600" />
                    Foto PAI ({pai.paiPhotos.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {pai.paiPhotos.map((photo) => (
                      <div key={photo.id} className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                        <img
                          src={photo.url}
                          alt={photo.caption || 'Foto PAI'}
                          className="w-full h-32 object-cover"
                        />
                        {photo.caption && (
                          <div className="p-3">
                            <p className="text-xs text-gray-600">{photo.caption}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Feature Properties */}
        {feature?.props && (
          <div className="mt-6 content-card">
            <div className="card-header">
              <h3>Properties Feature</h3>
              <span className="activity-count">{Object.keys(feature.props).length} Properties</span>
            </div>
            <div className="p-6">
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(feature.props).map(([key, value]) => (
                      <tr key={key}>
                        <td className="font-medium text-gray-700">{key}</td>
                        <td className="text-gray-900">
                          {value === null || value === undefined ? (
                            <span className="text-gray-400 italic">null</span>
                          ) : key.toLowerCase().includes('description') && typeof value === 'string' ? (
                            // Special handling for Description field (XML/HTML content)
                            <div>
                              {(() => {
                                const parsedData = parseXMLDescription(value)
                                if (parsedData) {
                                  return (
                                    <details className="inline">
                                      <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                        Lihat Deskripsi ({Object.keys(parsedData).length} field)
                                      </summary>
                                      <div className="mt-2 p-2 bg-gray-100 rounded">
                                        <table className="w-full text-xs border border-gray-300">
                                          <thead>
                                            <tr className="bg-gray-50">
                                              <th className="px-2 py-1 text-left font-medium border-b">Field</th>
                                              <th className="px-2 py-1 text-left font-medium border-b">Value</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {Object.entries(parsedData).map(([subKey, subValue]) => (
                                              <tr key={subKey} className="border-b last:border-b-0">
                                                <td className="px-2 py-1 font-medium text-gray-700">{subKey}</td>
                                                <td className="px-2 py-1 text-gray-900">{String(subValue)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </details>
                                  )
                                } else {
                                  return (
                                    <details className="inline">
                                      <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                        {value.length > 100 ? `${value.substring(0, 100)}...` : 'Lihat Content'}
                                      </summary>
                                      <div className="mt-2 p-2 bg-gray-100 rounded text-xs max-h-32 overflow-auto">
                                        {value}
                                      </div>
                                    </details>
                                  )
                                }
                              })()}
                            </div>
                          ) : typeof value === 'object' ? (
                            <details className="inline">
                              <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                Lihat Object
                              </summary>
                              <div className="mt-2 p-2 bg-gray-100 rounded text-xs max-h-32 overflow-auto">
                                <table className="w-full text-xs">
                                  <tbody>
                                    {Object.entries(value).map(([subKey, subValue]) => (
                                      <tr key={subKey}>
                                        <td className="pr-2 font-medium">{subKey}:</td>
                                        <td>{String(subValue)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </details>
                          ) : typeof value === 'string' && value.length > 100 ? (
                            <details className="inline">
                              <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                {value.substring(0, 100)}...
                              </summary>
                              <div className="mt-2 p-2 bg-gray-100 rounded text-xs max-h-32 overflow-auto">
                                {value}
                              </div>
                            </details>
                          ) : (
                            String(value)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}