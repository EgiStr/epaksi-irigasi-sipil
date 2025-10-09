'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Calendar, User, FileText, Image, Star, Download } from 'lucide-react'
import Layout from '../../../components/Layout'
import { useRequireAuth } from '../../../hooks/useAuth'

// Priority animations and styles
const priorityStyles = `
  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 0 20px rgba(251, 146, 60, 0.3);
    }
    50% {
      box-shadow: 0 0 30px rgba(251, 146, 60, 0.6);
    }
  }
  
  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .priority-card {
    animation: slide-in 0.5s ease-out;
  }
  
  .priority-score-badge {
    animation: pulse-glow 2s ease-in-out infinite;
  }
  
  .priority-stat-card {
    transition: all 0.3s ease;
  }
  
  .priority-stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`

export default function FeatureDetailPage() {
  const { loading: authLoading } = useRequireAuth()
  const params = useParams()
  const router = useRouter()
  const { featureId } = params

  const [feature, setFeature] = useState(null)
  const [pai, setPai] = useState(null)
  const [paiList, setPaiList] = useState([]) // All PAI records
  const [surveys, setSurveys] = useState([])
  const [allSurveys, setAllSurveys] = useState([]) // All surveys
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isExporting, setIsExporting] = useState(false)
  const contentRef = useRef(null)
  const exportAbortRef = useRef(false)
  
  // Filter states
  const [selectedSurveyYear, setSelectedSurveyYear] = useState('all')
  const [selectedPAIYear, setSelectedPAIYear] = useState('all')
  const [availableSurveyYears, setAvailableSurveyYears] = useState([])
  const [availablePAIYears, setAvailablePAIYears] = useState([])

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
        
        // Store all surveys and extract unique years
        const allSurveyData = featureData.surveys || []
        setAllSurveys(allSurveyData)
        setSurveys(allSurveyData)
        
        // Extract unique survey years (sorted desc)
        const surveyYears = [...new Set(allSurveyData.map(s => s.tahun || new Date(s.createdAt).getFullYear()))]
          .sort((a, b) => b - a)
        setAvailableSurveyYears(surveyYears)
        
        // Store all PAI and extract unique years
        const allPAIData = featureData.pai || []
        setPaiList(allPAIData)
        setPai(allPAIData.length > 0 ? allPAIData[0] : null)
        
        // Extract unique PAI years (sorted desc)
        const paiYears = [...new Set(allPAIData.map(p => p.tahun || new Date(p.createdAt).getFullYear()))]
          .sort((a, b) => b - a)
        setAvailablePAIYears(paiYears)
        
        // Default to latest year
        if (surveyYears.length > 0) setSelectedSurveyYear(surveyYears[0])
        if (paiYears.length > 0) setSelectedPAIYear(paiYears[0])
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

  // Filter surveys based on selected year
  useEffect(() => {
    if (selectedSurveyYear === 'all') {
      setSurveys(allSurveys)
    } else {
      const filtered = allSurveys.filter(s => 
        (s.tahun || new Date(s.createdAt).getFullYear()) === selectedSurveyYear
      )
      setSurveys(filtered)
    }
  }, [selectedSurveyYear, allSurveys])

  // Filter PAI based on selected year
  useEffect(() => {
    if (selectedPAIYear === 'all') {
      setPai(paiList.length > 0 ? paiList[0] : null)
    } else {
      const filtered = paiList.filter(p => 
        (p.tahun || new Date(p.createdAt).getFullYear()) === selectedPAIYear
      )
      setPai(filtered.length > 0 ? filtered[0] : null)
    }
  }, [selectedPAIYear, paiList])

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

  // Analisis nilai survey untuk statistik
  const analyzeSurveyValues = (values) => {
    if (!values || typeof values !== 'object') return null
    
    let booleanTrue = 0
    let booleanFalse = 0
    let numericValues = []
    let textValues = []
    
    Object.entries(values).forEach(([key, value]) => {
      if (typeof value === 'boolean') {
        value ? booleanTrue++ : booleanFalse++
      } else if (typeof value === 'number') {
        numericValues.push(value)
      } else if (typeof value === 'string') {
        textValues.push(value)
      }
    })
    
    const avgNumeric = numericValues.length > 0 
      ? (numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toFixed(2)
      : null
    
    return {
      total: Object.keys(values).length,
      booleanTrue,
      booleanFalse,
      numericCount: numericValues.length,
      avgNumeric,
      textCount: textValues.length
    }
  }

  // Export to PDF function using browser print
  const exportToPDF = async () => {
    try {
      setIsExporting(true)
      
      const element = contentRef.current
      if (!element) {
        throw new Error('Content element not found')
      }

      // Create a print-friendly version
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      
      if (!printWindow) {
        throw new Error('Pop-up blocker mencegah membuka jendela print. Silakan izinkan pop-up untuk situs ini.')
      }

      // Get all styles from current document
      const styles = Array.from(document.styleSheets)
        .map(styleSheet => {
          try {
            return Array.from(styleSheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n')
          } catch (e) {
            // Handle CORS issues with external stylesheets
            return ''
          }
        })
        .join('\n')

      // Clone the element content
      const clonedContent = element.cloneNode(true)
      
      // Remove buttons and interactive elements from clone
      const buttonsToRemove = clonedContent.querySelectorAll('button, .no-print')
      buttonsToRemove.forEach(btn => btn.remove())
      
      // Build the print document
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Detail Infrastruktur - ${feature?.name || featureId}</title>
            <style>
              /* Base styles */
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                line-height: 1.6;
                color: #1f2937;
                background: white;
                padding: 20px;
              }
              
              /* Print-specific styles */
              @media print {
                body {
                  padding: 0;
                  font-size: 9pt;
                }
                
                @page {
                  margin: 12mm;
                  size: A4 portrait;
                }
                
                /* CRITICAL: Remove all scroll containers */
                * {
                  overflow: visible !important;
                  max-height: none !important;
                  height: auto !important;
                }
                
                /* Remove scroll on survey values container */
                .space-y-2, .space-y-3, .space-y-4 {
                  overflow: visible !important;
                  max-height: none !important;
                }
                
                /* Prevent page breaks */
                h1, h2, h3, h4, h5, h6 {
                  page-break-after: avoid;
                  page-break-inside: avoid;
                  margin-top: 6pt;
                  margin-bottom: 3pt;
                }
                
                /* Allow page breaks for large sections */
                .survey-section, .pai-section, .space-y-4, .space-y-6 {
                  page-break-inside: auto;
                }
                
                /* Keep related content together */
                .info-grid > div,
                .parameter-item,
                .bg-white.p-4,
                .bg-gradient-to-br {
                  page-break-inside: avoid;
                  margin-bottom: 3pt;
                }
                
                table {
                  page-break-inside: auto;
                  width: 100%;
                }
                
                tr {
                  page-break-inside: avoid;
                  page-break-after: auto;
                }
                
                /* Hide unnecessary elements */
                button, .no-print, input, select, textarea {
                  display: none !important;
                }
                
                /* Ensure colors print */
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                
                /* Adjust spacing for print */
                .mb-2 { margin-bottom: 3pt !important; }
                .mb-3 { margin-bottom: 4pt !important; }
                .mb-4 { margin-bottom: 6pt !important; }
                .mb-6 { margin-bottom: 8pt !important; }
                .mt-2 { margin-top: 3pt !important; }
                .mt-4 { margin-top: 6pt !important; }
                .mt-6 { margin-top: 8pt !important; }
                
                .p-3 { padding: 5pt !important; }
                .p-4 { padding: 6pt !important; }
                .p-6 { padding: 8pt !important; }
                
                /* Grid adjustments - make 2-column into single column */
                .grid-cols-2, .md\\:grid-cols-2, .lg\\:grid-cols-2 {
                  grid-template-columns: 1fr !important;
                }
                
                .grid-cols-3, .md\\:grid-cols-3, .lg\\:grid-cols-3,
                .grid-cols-4, .md\\:grid-cols-4, .lg\\:grid-cols-4 {
                  grid-template-columns: repeat(2, 1fr) !important;
                }
                
                .grid {
                  gap: 4pt !important;
                  display: grid !important;
                }
                
                .grid > div {
                  width: 100%;
                  overflow: visible !important;
                  max-height: none !important;
                }
                
                /* Flex containers */
                .flex {
                  display: flex !important;
                }
                
                .flex-wrap {
                  flex-wrap: wrap !important;
                }
                
                /* Survey values container - FORCE display all */
                .space-y-2 > *,
                .space-y-3 > *,
                .space-y-4 > * {
                  display: block !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                  max-height: none !important;
                  overflow: visible !important;
                }
                
                /* Space utilities */
                .space-y-2 > * + * { margin-top: 3pt !important; }
                .space-y-3 > * + * { margin-top: 4pt !important; }
                .space-y-4 > * + * { margin-top: 5pt !important; }
                .space-y-6 > * + * { margin-top: 7pt !important; }
                
                /* Images */
                img {
                  max-width: 100%;
                  height: auto !important;
                  page-break-inside: avoid;
                }
                
                /* Borders and shadows */
                .border {
                  border: 0.5pt solid #d1d5db !important;
                }
                
                .shadow, .shadow-sm, .shadow-md, .shadow-lg {
                  box-shadow: none !important;
                }
                
                /* Rounded corners minimal */
                .rounded, .rounded-lg, .rounded-xl {
                  border-radius: 2pt !important;
                }
                
                /* Priority Section - Print Styles */
                .bg-gradient-to-br.from-orange-50 {
                  background: linear-gradient(135deg, #fff7ed 0%, #fef2f2 50%, #fdf2f8 100%) !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  border: 2pt solid #fed7aa !important;
                  page-break-inside: avoid !important;
                  margin-bottom: 8pt !important;
                }
                
                /* Priority Score Badge */
                .bg-gradient-to-br.from-red-600,
                .bg-gradient-to-br.from-orange-500,
                .bg-gradient-to-br.from-yellow-500,
                .bg-gradient-to-br.from-blue-500,
                .bg-gradient-to-br.from-green-500 {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  box-shadow: 0 2pt 4pt rgba(0,0,0,0.15) !important;
                }
                
                /* Priority containers */
                .bg-white\\/80 {
                  background-color: white !important;
                  border: 1pt solid #e5e7eb !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                
                /* Priority level badges */
                .bg-red-100 { 
                  background-color: #fee2e2 !important; 
                  border-color: #fca5a5 !important;
                  -webkit-print-color-adjust: exact !important;
                }
                .bg-orange-100 { 
                  background-color: #ffedd5 !important; 
                  border-color: #fdba74 !important;
                  -webkit-print-color-adjust: exact !important;
                }
                .bg-yellow-100 { 
                  background-color: #fef9c3 !important; 
                  border-color: #fde047 !important;
                  -webkit-print-color-adjust: exact !important;
                }
                .bg-blue-100 { 
                  background-color: #dbeafe !important; 
                  border-color: #93c5fd !important;
                  -webkit-print-color-adjust: exact !important;
                }
                .bg-green-100 { 
                  background-color: #dcfce7 !important; 
                  border-color: #86efac !important;
                  -webkit-print-color-adjust: exact !important;
                }
                .bg-purple-100 { 
                  background-color: #f3e8ff !important; 
                  border-color: #d8b4fe !important;
                  -webkit-print-color-adjust: exact !important;
                }
                
                /* Ensure text colors print */
                .text-red-800 { color: #991b1b !important; }
                .text-orange-800 { color: #9a3412 !important; }
                .text-yellow-800 { color: #854d0e !important; }
                .text-blue-800 { color: #1e40af !important; }
                .text-green-800 { color: #166534 !important; }
                .text-purple-800 { color: #6b21a8 !important; }
                
                /* Priority progress bar */
                .bg-gradient-to-r.from-green-500,
                .bg-gradient-to-r.from-blue-500,
                .bg-gradient-to-r.from-purple-500 {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                
                /* Backdrop blur fallback for print */
                .backdrop-blur-sm {
                  backdrop-filter: none !important;
                  background-color: rgba(255, 255, 255, 0.95) !important;
                }
                
                /* Priority section emojis - ensure visibility */
                .bg-gradient-to-br.from-orange-500.to-red-500 {
                  background: linear-gradient(135deg, #f97316 0%, #dc2626 100%) !important;
                  -webkit-print-color-adjust: exact !important;
                }
                
                /* SPACING FIX: Detail Inputan Penilaian */
                /* Increase gap between parameter label and value */
                .justify-between {
                  justify-content: space-between !important;
                  gap: 8pt !important;
                }
                
                /* Parameter items spacing */
                .flex.justify-between.items-start {
                  padding: 4pt 6pt !important;
                  margin-bottom: 2pt !important;
                }
                
                /* Ensure labels and values have proper spacing */
                .justify-between > span:first-child {
                  padding-right: 10pt !important;
                  max-width: 55% !important;
                }
                
                .justify-between > span:last-child {
                  padding-left: 5pt !important;
                  max-width: 40% !important;
                  text-align: right !important;
                }
              }
              
              /* Typography */
              h1 { 
                font-size: 16pt; 
                font-weight: bold; 
                margin-bottom: 8pt;
                color: #111827;
              }
              
              h2 { 
                font-size: 13pt; 
                font-weight: 600; 
                margin-top: 10pt;
                margin-bottom: 6pt;
                color: #1f2937;
                border-bottom: 1pt solid #e5e7eb;
                padding-bottom: 3pt;
              }
              
              h3 { 
                font-size: 11pt; 
                font-weight: 600; 
                margin-top: 8pt;
                margin-bottom: 4pt;
                color: #374151;
              }
              
              h4 { 
                font-size: 10pt; 
                font-weight: 600; 
                margin-top: 6pt;
                margin-bottom: 3pt;
                color: #4b5563;
              }
              
              p {
                margin-bottom: 4pt;
                line-height: 1.4;
              }
              
              /* Layout utilities */
              .flex {
                display: flex;
                gap: 6pt;
              }
              
              .flex-wrap {
                flex-wrap: wrap;
              }
              
              .justify-between {
                justify-content: space-between;
              }
              
              .items-center {
                align-items: center;
              }
              
              .grid {
                display: grid;
                gap: 6pt;
              }
              
              /* Text colors */
              .text-gray-500 { color: #6b7280; }
              .text-gray-600 { color: #4b5563; }
              .text-gray-700 { color: #374151; }
              .text-gray-800 { color: #1f2937; }
              .text-gray-900 { color: #111827; }
              .text-blue-600 { color: #2563eb; }
              .text-green-600 { color: #16a34a; }
              .text-yellow-600 { color: #ca8a04; }
              .text-red-600 { color: #dc2626; }
              
              /* Background colors */
              .bg-white { background-color: white; }
              .bg-gray-50 { background-color: #f9fafb; }
              .bg-blue-50 { background-color: #eff6ff; }
              .bg-green-50 { background-color: #f0fdf4; }
              .bg-yellow-50 { background-color: #fefce8; }
              .bg-red-50 { background-color: #fef2f2; }
              .bg-green-100 { background-color: #dcfce7; }
              .bg-yellow-100 { background-color: #fef9c3; }
              .bg-red-100 { background-color: #fee2e2; }
              
              /* Font weights */
              .font-medium { font-weight: 500; }
              .font-semibold { font-weight: 600; }
              .font-bold { font-weight: 700; }
              
              /* Text sizes */
              .text-xs { font-size: 7pt; }
              .text-sm { font-size: 8pt; }
              .text-base { font-size: 9pt; }
              .text-lg { font-size: 10pt; }
              .text-xl { font-size: 11pt; }
              .text-2xl { font-size: 13pt; }
              
              /* Custom styles for parameters */
              .parameter-item {
                padding: 5pt;
                margin-bottom: 3pt;
                border: 0.5pt solid #e5e7eb;
                border-radius: 2pt;
                background: white;
              }
              
              .parameter-label {
                font-weight: 600;
                color: #374151;
                margin-bottom: 2pt;
                font-size: 8pt;
              }
              
              .parameter-value {
                color: #1f2937;
                font-size: 8pt;
              }
              
              /* Badges */
              .badge, .px-3.py-1.rounded-full {
                display: inline-block;
                padding: 1pt 5pt;
                border-radius: 999pt;
                font-size: 7pt;
                font-weight: 500;
              }
              
              /* Photo grid */
              .photo-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 6pt;
                margin-top: 6pt;
              }
              
              @media print {
                .photo-grid {
                  grid-template-columns: repeat(2, 1fr);
                  gap: 4pt;
                }
              }
              
              .photo-item {
                border: 0.5pt solid #e5e7eb;
                border-radius: 2pt;
                overflow: hidden;
              }
              
              .photo-item img {
                width: 100%;
                height: auto;
                display: block;
              }
              
              /* Import existing styles */
              ${styles}
              
              /* Override for print */
              .print-content {
                max-width: 100%;
                margin: 0 auto;
              }
              
              /* Ensure colors print */
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
            </style>
          </head>
          <body>
            <div class="print-content">
              ${clonedContent.innerHTML}
            </div>
            <script>
              // Auto print when loaded
              window.onload = function() {
                // Wait for images to load
                const images = document.images;
                let loadedImages = 0;
                const totalImages = images.length;
                
                if (totalImages === 0) {
                  // No images, print immediately
                  setTimeout(() => window.print(), 500);
                } else {
                  // Wait for all images to load
                  Array.from(images).forEach(img => {
                    if (img.complete) {
                      loadedImages++;
                    } else {
                      img.addEventListener('load', () => {
                        loadedImages++;
                        if (loadedImages === totalImages) {
                          setTimeout(() => window.print(), 500);
                        }
                      });
                      img.addEventListener('error', () => {
                        loadedImages++;
                        if (loadedImages === totalImages) {
                          setTimeout(() => window.print(), 500);
                        }
                      });
                    }
                  });
                  
                  // If all images already loaded
                  if (loadedImages === totalImages) {
                    setTimeout(() => window.print(), 500);
                  }
                }
              };
              
              // Handle print events
              window.onafterprint = function() {
                setTimeout(() => window.close(), 100);
              };
            </script>
          </body>
        </html>
      `)
      
      printWindow.document.close()
      
      // Success notification
      setTimeout(() => {
        const successDiv = document.createElement('div')
        successDiv.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; 
                      background: #10b981; color: white; padding: 16px 24px; 
                      border-radius: 8px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); 
                      z-index: 9999; font-weight: 500; animation: slideIn 0.3s ease-out;">
            ✅ Jendela print dibuka! Pilih "Save as PDF" di dialog print untuk menyimpan.
          </div>
          <style>
            @keyframes slideIn {
              from { transform: translateX(400px); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          </style>
        `
        document.body.appendChild(successDiv)
        setTimeout(() => {
          if (document.body.contains(successDiv)) {
            document.body.removeChild(successDiv)
          }
        }, 6000)
      }, 100)
      
    } catch (error) {
      console.error('Error opening print dialog:', error)
      
      // Error notification
      const errorDiv = document.createElement('div')
      errorDiv.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; 
                    background: #ef4444; color: white; padding: 16px 24px; 
                    border-radius: 8px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3); 
                    z-index: 9999; font-weight: 500;">
          ❌ Gagal membuka print: ${error.message}
        </div>
      `
      document.body.appendChild(errorDiv)
      setTimeout(() => {
        if (document.body.contains(errorDiv)) {
          document.body.removeChild(errorDiv)
        }
      }, 5000)
    } finally {
      setIsExporting(false)
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
      {/* Inject priority styles */}
      <style jsx global>{priorityStyles}</style>
      
      <div className="h-full">
        {/* Header Section */}
        <div className="dashboard-header mb-4">
          <div>
            <h2>Detail Infrastruktur Irigasi</h2>
            <p className="flex items-center text-gray-600">
              <MapPin className="w-4 h-4 mr-2" />
              Feature ID: {featureId}
            </p>
          </div>
          
          {/* Print/Export Button */}
          <button
            onClick={exportToPDF}
            disabled={isExporting}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isExporting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
            }`}
            title="Cetak atau simpan sebagai PDF"
          >
            <Download className="w-5 h-5" />
            {isExporting ? 'Membuka...' : 'Cetak / Simpan PDF'}
          </button>
        </div>

        {/* Content to be exported - wrapped with ref */}
        <div ref={contentRef} className="bg-white p-6 rounded-lg">
          {/* PDF Header - only visible in PDF */}
          <div className="mb-6 pb-4 border-b-2 border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Detail Infrastruktur Irigasi</h1>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Feature ID: {featureId}</span>
              <span>Dicetak: {new Date().toLocaleDateString('id-ID', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</span>
            </div>
            {feature?.name && (
              <div className="mt-2 text-lg font-semibold text-gray-800">
                {feature.name}
              </div>
            )}
            {/* Filter info for PDF */}
            {(selectedSurveyYear !== 'all' || selectedPAIYear !== 'all') && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-blue-800">
                  📅 Filter Tahun Aktif:
                  {selectedSurveyYear !== 'all' && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 rounded">Survey: {selectedSurveyYear}</span>
                  )}
                  {selectedPAIYear !== 'all' && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 rounded">PAI: {selectedPAIYear}</span>
                  )}
                </div>
              </div>
            )}
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
              <div className="flex items-center gap-3">
                {availableSurveyYears.length > 0 && (
                  <div className="flex items-center gap-2 no-print">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <select
                      value={selectedSurveyYear}
                      onChange={(e) => setSelectedSurveyYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">Semua Tahun</option>
                      {availableSurveyYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                )}
                <span className="activity-count">{surveys.length} Survey</span>
              </div>
            </div>
            <div className="p-6">
              {surveys.length > 0 ? (
                <div className="space-y-4">
                  {surveys.map((survey, index) => (
                    <div key={survey.id} className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-white">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-600">Survey #{index + 1}</span>
                            {/* Tahun Badge */}
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {survey.tahun || new Date(survey.createdAt).getFullYear()}
                            </span>
                          </div>
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

                      {/* Detail Inputan Penilaian */}
                      {survey.values && Object.keys(survey.values).length > 0 && (
                        <div className="mt-3 p-4 bg-white rounded-lg border">
                          <h4 className="font-semibold text-gray-900 mb-3 text-sm flex items-center">
                            <FileText className="w-4 h-4 mr-2 text-blue-600" />
                            Detail Inputan Penilaian ({Object.keys(survey.values).length} Parameter)
                          </h4>
                          
                          {/* Summary Statistik */}
                          {(() => {
                            const stats = analyzeSurveyValues(survey.values);
                            if (stats) {
                              return (
                                <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                                  {stats.booleanTrue > 0 && (
                                    <div className="text-center">
                                      <div className="text-xl font-bold text-green-600">{stats.booleanTrue}</div>
                                      <div className="text-xs text-gray-600">✅ Ya</div>
                                    </div>
                                  )}
                                  {stats.booleanFalse > 0 && (
                                    <div className="text-center">
                                      <div className="text-xl font-bold text-red-600">{stats.booleanFalse}</div>
                                      <div className="text-xs text-gray-600">❌ Tidak</div>
                                    </div>
                                  )}
                                  {stats.numericCount > 0 && (
                                    <div className="text-center">
                                      <div className="text-xl font-bold text-blue-600">{stats.avgNumeric}</div>
                                      <div className="text-xs text-gray-600">📊 Rata-rata</div>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}
                          
                          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {Object.entries(survey.values).map(([key, value]) => {
                              // Format nilai berdasarkan tipe
                              let displayValue = value;
                              let valueColor = 'text-gray-900';
                              
                              if (typeof value === 'boolean') {
                                displayValue = value ? '✅ Ya' : '❌ Tidak';
                                valueColor = value ? 'text-green-600' : 'text-red-600';
                              } else if (typeof value === 'number') {
                                displayValue = value.toFixed(2);
                                valueColor = 'text-blue-600';
                              } else if (value === null || value === undefined) {
                                displayValue = '—';
                                valueColor = 'text-gray-400 italic';
                              } else if (typeof value === 'string') {
                                displayValue = value;
                                // Highlight untuk nilai kategorikal
                                if (['baik', 'sangat baik', 'excellent', 'ada'].includes(value.toLowerCase())) {
                                  valueColor = 'text-green-600 font-semibold';
                                } else if (['buruk', 'rusak', 'tidak ada', 'tidak'].includes(value.toLowerCase())) {
                                  valueColor = 'text-red-600 font-semibold';
                                } else if (['sedang', 'cukup'].includes(value.toLowerCase())) {
                                  valueColor = 'text-yellow-600 font-semibold';
                                }
                              }
                              
                              return (
                                <div key={key} className="flex justify-between items-start py-2 px-3 bg-gradient-to-r from-gray-50 to-white rounded border border-gray-200 hover:border-blue-300 transition-colors">
                                  <span className="font-medium text-gray-700 text-xs max-w-[60%]">
                                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </span>
                                  <span className={`${valueColor} font-medium text-xs text-right max-w-[40%] break-words`}>
                                    {String(displayValue)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Detail Skor */}
                      {survey.scoreDetail && (
                        <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-blue-200">
                          <h4 className="font-semibold text-gray-900 mb-3 text-sm flex items-center">
                            <Star className="w-4 h-4 mr-2 text-yellow-500" />
                            Detail Perhitungan Skor
                          </h4>
                          <div className="grid grid-cols-1 gap-2 text-xs">
                            {Object.entries(survey.scoreDetail).map(([key, value]) => (
                              <div key={key} className="flex justify-between items-center py-2 px-3 bg-white rounded border border-blue-100">
                                <span className="font-medium text-gray-700">
                                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                                <span className="text-blue-700 font-bold">
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
              <div className="flex items-center gap-3">
                {availablePAIYears.length > 0 && (
                  <div className="flex items-center gap-2 no-print">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <select
                      value={selectedPAIYear}
                      onChange={(e) => setSelectedPAIYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">Semua Tahun</option>
                      {availablePAIYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                )}
                <span className="text-sm text-gray-600">
                  Dibuat: {formatDate(pai.createdAt)} oleh {pai.user?.name}
                </span>
              </div>
            </div>
            <div className="p-6">
              {/* Tahun PAI Badge */}
              <div className="mb-4 flex items-center gap-2">
                <span className="px-3 py-1.5 bg-purple-600 text-white text-sm font-semibold rounded-lg flex items-center gap-2 shadow-md">
                  <Calendar className="w-4 h-4" />
                  Tahun Penilaian: {pai.tahun || new Date(pai.createdAt).getFullYear()}
                </span>
              </div>
              
              {/* Prioritas Perbaikan - Modern Card */}
              {(pai.priorityScore || pai.priorityStatus || pai.priorityNotes) && (
                <div className="priority-card mb-6 bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 border-2 border-orange-200 rounded-xl p-6 shadow-lg relative overflow-hidden">
                  {/* Background Decoration */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-200/30 to-transparent rounded-full blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-pink-200/30 to-transparent rounded-full blur-2xl"></div>
                  
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-xl text-gray-900 mb-1 flex items-center">
                          <span className="mr-2 text-2xl">🔧</span>
                          Prioritas Perbaikan & Pemeliharaan
                        </h4>
                        <p className="text-sm text-gray-600">Tingkat urgensi perbaikan infrastruktur</p>
                      </div>
                      
                      {/* Priority Score Badge - Large & Modern */}
                      {pai.priorityScore && (
                        <div className="flex flex-col items-center">
                          <div className={`
                            priority-score-badge relative flex items-center justify-center w-20 h-20 rounded-2xl shadow-xl font-bold text-3xl
                            transform transition-transform hover:scale-110
                            ${pai.priorityScore === 5 ? 'bg-gradient-to-br from-red-600 to-red-700 text-white' :
                              pai.priorityScore === 4 ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white' :
                              pai.priorityScore === 3 ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white' :
                              pai.priorityScore === 2 ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' :
                              'bg-gradient-to-br from-green-500 to-green-600 text-white'
                            }
                          `}>
                            <span className="relative z-10">{pai.priorityScore}</span>
                            {/* Glow effect */}
                            <div className="absolute inset-0 rounded-2xl blur-md opacity-50"
                              style={{
                                background: pai.priorityScore === 5 ? 'radial-gradient(circle, rgba(220,38,38,0.8) 0%, transparent 70%)' :
                                          pai.priorityScore === 4 ? 'radial-gradient(circle, rgba(249,115,22,0.8) 0%, transparent 70%)' :
                                          pai.priorityScore === 3 ? 'radial-gradient(circle, rgba(234,179,8,0.8) 0%, transparent 70%)' :
                                          pai.priorityScore === 2 ? 'radial-gradient(circle, rgba(59,130,246,0.8) 0%, transparent 70%)' :
                                          'radial-gradient(circle, rgba(34,197,94,0.8) 0%, transparent 70%)'
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-600 mt-2">Skor</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Priority Level Indicator */}
                      {pai.priorityScore && (
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-orange-200/50 shadow-md">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700">Tingkat Prioritas</span>
                            <span className="text-xs text-gray-500">Skala 1-5</span>
                          </div>
                          <div className={`
                            px-4 py-2 rounded-lg text-center font-bold text-lg
                            ${pai.priorityScore === 5 ? 'bg-red-100 text-red-800 border-2 border-red-300' :
                              pai.priorityScore === 4 ? 'bg-orange-100 text-orange-800 border-2 border-orange-300' :
                              pai.priorityScore === 3 ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300' :
                              pai.priorityScore === 2 ? 'bg-blue-100 text-blue-800 border-2 border-blue-300' :
                              'bg-green-100 text-green-800 border-2 border-green-300'
                            }
                          `}>
                            {pai.priorityScore === 5 ? '🔴 SANGAT MENDESAK' :
                             pai.priorityScore === 4 ? '🟠 MENDESAK' :
                             pai.priorityScore === 3 ? '🟡 SEDANG' :
                             pai.priorityScore === 2 ? '🔵 RENDAH' :
                             '🟢 SANGAT RENDAH'}
                          </div>
                          
                          {/* Priority Description */}
                          <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                            {pai.priorityScore === 5 && '⚠️ Memerlukan perbaikan segera untuk menghindari kerusakan lebih parah atau kegagalan sistem'}
                            {pai.priorityScore === 4 && '⏰ Perlu diperbaiki dalam waktu dekat untuk mencegah dampak operasional'}
                            {pai.priorityScore === 3 && '📋 Dapat dijadwalkan dalam rencana pemeliharaan rutin'}
                            {pai.priorityScore === 2 && '📌 Pemeliharaan preventif dapat dilakukan sesuai jadwal normal'}
                            {pai.priorityScore === 1 && '✅ Kondisi baik, pemantauan berkala sudah cukup'}
                          </div>
                        </div>
                      )}

                      {/* Status Badge */}
                      {pai.priorityStatus && (
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-orange-200/50 shadow-md">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700">Status Perbaikan</span>
                            <span className="text-xs text-gray-500">Status Terkini</span>
                          </div>
                          <div className={`
                            px-4 py-2 rounded-lg text-center font-bold text-lg flex items-center justify-center gap-2
                            ${pai.priorityStatus === 'completed' ? 'bg-green-100 text-green-800 border-2 border-green-300' :
                              pai.priorityStatus === 'in_progress' ? 'bg-blue-100 text-blue-800 border-2 border-blue-300' :
                              pai.priorityStatus === 'approved' ? 'bg-purple-100 text-purple-800 border-2 border-purple-300' :
                              'bg-gray-100 text-gray-800 border-2 border-gray-300'
                            }
                          `}>
                            {pai.priorityStatus === 'completed' && '✅ Selesai'}
                            {pai.priorityStatus === 'in_progress' && '⚙️ Dalam Proses'}
                            {pai.priorityStatus === 'approved' && '✔️ Disetujui'}
                            {pai.priorityStatus === 'pending' && '⏳ Menunggu'}
                          </div>
                          
                          {/* Status Timeline Indicator */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-600">Progress</span>
                              <span className="font-semibold text-gray-700">
                                {pai.priorityStatus === 'completed' ? '100%' :
                                 pai.priorityStatus === 'in_progress' ? '50%' :
                                 pai.priorityStatus === 'approved' ? '25%' : '0%'}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  pai.priorityStatus === 'completed' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                  pai.priorityStatus === 'in_progress' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                                  pai.priorityStatus === 'approved' ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
                                  'bg-gray-400'
                                }`}
                                style={{
                                  width: pai.priorityStatus === 'completed' ? '100%' :
                                         pai.priorityStatus === 'in_progress' ? '50%' :
                                         pai.priorityStatus === 'approved' ? '25%' : '0%'
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Priority Notes */}
                    {pai.priorityNotes && (
                      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-orange-200/50 shadow-md">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white text-xl shadow-lg">
                            📝
                          </div>
                          <div className="flex-1">
                            <h5 className="font-semibold text-gray-900 mb-2 text-sm">Catatan & Rekomendasi:</h5>
                            <p className="text-gray-700 text-sm leading-relaxed bg-gradient-to-r from-orange-50/50 to-transparent p-3 rounded-lg border-l-4 border-orange-400">
                              {pai.priorityNotes}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick Stats */}
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="priority-stat-card bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-orange-100 text-center">
                        <div className="text-2xl mb-1">
                          {pai.priorityScore >= 4 ? '🚨' : pai.priorityScore === 3 ? '⚠️' : '✅'}
                        </div>
                        <div className="text-xs text-gray-600 font-medium">
                          {pai.priorityScore >= 4 ? 'Perlu Perhatian' : pai.priorityScore === 3 ? 'Terpantau' : 'Kondisi Baik'}
                        </div>
                      </div>
                      <div className="priority-stat-card bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-orange-100 text-center">
                        <div className="text-2xl mb-1">
                          {pai.priorityStatus === 'completed' ? '🎉' : pai.priorityStatus === 'in_progress' ? '⏳' : '📋'}
                        </div>
                        <div className="text-xs text-gray-600 font-medium">
                          {pai.priorityStatus === 'completed' ? 'Sudah Ditangani' : 
                           pai.priorityStatus === 'in_progress' ? 'Sedang Proses' : 'Belum Dimulai'}
                        </div>
                      </div>
                      <div className="priority-stat-card bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-orange-100 text-center">
                        <div className="text-2xl mb-1">📅</div>
                        <div className="text-xs text-gray-600 font-medium">
                          Dicatat {new Date(pai.updatedAt).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                            // Special handling for Description field (XML/HTML content) - Display directly
                            <div>
                              {(() => {
                                const parsedData = parseXMLDescription(value)
                                if (parsedData) {
                                  return (
                                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                      <div className="text-sm font-semibold text-gray-700 mb-3">
                                        📋 Deskripsi Lengkap ({Object.keys(parsedData).length} field)
                                      </div>
                                      <table className="w-full text-sm border-collapse">
                                        <thead>
                                          <tr className="bg-gray-100">
                                            <th className="px-3 py-2 text-left font-semibold border border-gray-300 text-gray-700">Field</th>
                                            <th className="px-3 py-2 text-left font-semibold border border-gray-300 text-gray-700">Value</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {Object.entries(parsedData).map(([subKey, subValue]) => (
                                            <tr key={subKey} className="hover:bg-gray-50">
                                              <td className="px-3 py-2 font-medium text-gray-700 border border-gray-300 bg-white">{subKey}</td>
                                              <td className="px-3 py-2 text-gray-900 border border-gray-300">{String(subValue)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )
                                } else {
                                  return (
                                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm max-h-64 overflow-auto">
                                      {value}
                                    </div>
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
        {/* End of content to be exported */}
      </div>
    </Layout>
  )
}