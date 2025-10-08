import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, LayersControl, ZoomControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-markercluster/styles';
import SurveyModal from './SurveyModal';
import PriorityScoreModal from './PriorityScoreModal';
import { useSurveyData } from '../hooks/useSurveyData';

// Import ikon leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix untuk ikon default leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Konstanta konfigurasi
const MAP_CONFIG = {
  center: [-4.75, 105.0],
  zoom: 11,
  colors: {
    "Bangunan_Irigasi Way Rarem": { color: "#666666", fillColor: "#999999" },
    "Bangunan.kml": { color: "#0000FF", fillColor: "#4444FF" },
    "Bendung Way Rarem": { color: "#00FF00", fillColor: "#44FF44" },
    "Jaringan Irigasi Way Rarem": { color: "#FFA500", fillColor: "#FFB84D" }
  },
  boundaryStyle: {
    color: "#800080",
    fillColor: "#E6E6FA",
    weight: 2,
    fillOpacity: 0.1,
    opacity: 0.8,
    dashArray: "8, 4"
  },
  cluster: {
    // Konfigurasi clustering
    maxClusterRadius: 50, // Radius maksimum untuk pengelompokan (dalam pixel)
    disableClusteringAtZoom: 16, // Zoom level dimana clustering dimatikan
    showCoverageOnHover: false, // Tampilkan area coverage saat hover
    spiderfyOnMaxZoom: true, // Spiderfy saat zoom maksimum
    removeOutsideVisibleBounds: true, // Hapus marker di luar area pandang untuk performa
    animate: true, // Animasi saat clustering/unclustering
    animateAddingMarkers: true, // Animasi saat menambah marker
    maxZoom: 18 // Zoom maksimum
  }
};

const FIELD_LABELS = {
  'id_di': '🏢 ID Daerah Irigasi',
  'k_di': '🔢 Kode DI',
  'n_di': '🌊 Nama Daerah Irigasi',
  'nama': '🏗️ Nama Bangunan',
  'nomenklatu': '📝 Nomenklatur',
  'k_aset': '🔧 Kode Aset',
  'n_aset': '⚙️ Jenis Aset',
  'saluran': '🚰 Nama Saluran',
  'ELEVATION': '📏 Elevasi'
};

const PRIORITY_FIELDS = ['n_di', 'nama', 'nomenklatu', 'n_aset', 'saluran', 'k_di', 'k_aset', 'ELEVATION'];

const LeafletMap = ({ geoJsonData, boundaryData, layersData, onDataReload }) => {
  // State for survey modal
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  
  // State for priority modal
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
  const [selectedPAI, setSelectedPAI] = useState(null);
  
  // Survey visualization controls
  const [showSurveyLayer, setShowSurveyLayer] = useState(true);
  const [surveyFilter, setSurveyFilter] = useState('all'); // 'all', 'surveyed', 'not-surveyed', 'quality-A', 'quality-B', 'quality-C', 'quality-D'
  
  // Survey data hook
  const {
    surveys,
    loading: surveyLoading,
    getSurveyForFeature,
    getQualityClass,
    getFeatureQualityColor,
    reloadSurveys,
    getStatistics
  } = useSurveyData();

  // Function to create custom cluster icon
  const createClusterCustomIcon = useCallback((cluster) => {
    const childCount = cluster.getChildCount();
    let sizeClass = 'small';
    let bgColor = '#2196F3'; // Default blue
    
    // Determine cluster size and color based on count
    if (childCount < 10) {
      sizeClass = 'small';
      bgColor = '#4CAF50'; // Green for small clusters
    } else if (childCount < 50) {
      sizeClass = 'medium';
      bgColor = '#FF9800'; // Orange for medium clusters
    } else {
      sizeClass = 'large';
      bgColor = '#F44336'; // Red for large clusters
    }
    
    const size = sizeClass === 'small' ? 30 : sizeClass === 'medium' ? 40 : 50;
    
    return L.divIcon({
      html: `<div style="
        background-color: ${bgColor};
        color: white;
        border-radius: 50%;
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: ${size < 35 ? '12px' : size < 45 ? '14px' : '16px'};
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: all 0.2s ease;
      " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">${childCount}</div>`,
      className: 'custom-cluster-icon',
      iconSize: L.point(size, size),
      iconAnchor: L.point(size / 2, size / 2)
    });
  }, []);

  // Separate features by geometry type for better clustering
  const separateFeaturesByGeometry = useCallback((features) => {
    const pointFeatures = [];
    const nonPointFeatures = [];
    
    features.forEach(feature => {
      if (feature.geometry?.type === 'Point') {
        pointFeatures.push(feature);
      } else {
        nonPointFeatures.push(feature);
      }
    });
    
    return { pointFeatures, nonPointFeatures };
  }, []);
  const handleClusterEvents = useCallback((clusterGroup) => {
    // Event ketika cluster diklik
    clusterGroup.on('clusterclick', (event) => {
      const cluster = event.layer;
      const childMarkers = cluster.getAllChildMarkers();
      
      // Buat popup info untuk cluster
      let popupContent = `
        <div style="font-family: Arial, sans-serif; max-width: 300px;">
          <h4 style="margin: 0 0 8px 0; color: #1f2937; font-size: 14px;">
            🗂️ Kelompok Bangunan Irigasi
          </h4>
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
            Jumlah total: <strong>${childMarkers.length}</strong> bangunan
          </div>
          <div style="max-height: 200px; overflow-y: auto; border-top: 1px solid #e5e7eb; padding-top: 8px;">
      `;
      
      // Ambil informasi dari setiap marker dalam cluster
      childMarkers.slice(0, 10).forEach((marker, index) => {
        const feature = marker.feature;
        if (feature && feature.properties) {
          const props = feature.properties;
          const name = props.name || props.featureId || `Bangunan ${index + 1}`;
          const type = props.type || props.sourceLayer || 'Tidak diketahui';
          
          popupContent += `
            <div style="padding: 4px 0; border-bottom: 1px solid #f3f4f6; font-size: 11px;">
              <div style="font-weight: 500; color: #374151;">${name}</div>
              <div style="color: #6b7280;">${type}</div>
            </div>
          `;
        }
      });
      
      if (childMarkers.length > 10) {
        popupContent += `
          <div style="padding: 4px 0; font-size: 11px; color: #6b7280; text-align: center;">
            ... dan ${childMarkers.length - 10} bangunan lainnya
          </div>
        `;
      }
      
      popupContent += `
          </div>
          <div style="margin-top: 8px; font-size: 11px; color: #6b7280; text-align: center;">
            💡 Perbesar peta untuk melihat detail setiap bangunan
          </div>
        </div>
      `;
      
      cluster.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'cluster-popup'
      }).openPopup();
    });
    
    // Event ketika cluster di-hover
    clusterGroup.on('clustermouseover', (event) => {
      const cluster = event.layer;
      // Tambahkan efek visual saat hover jika diperlukan
    });
    
  }, []);

  // Cluster options dengan event handlers
  const clusterOptions = useMemo(() => ({
    ...MAP_CONFIG.cluster,
    iconCreateFunction: createClusterCustomIcon,
    // Custom styling untuk cluster
    polygonOptions: {
      fillColor: '#2196F3',
      color: '#1976D2',
      weight: 2,
      opacity: 0.5,
      fillOpacity: 0.1
    }
  }), [createClusterCustomIcon]);

  // Function to open survey modal
  const openSurveyForFeature = useCallback((featureId) => {
    
    // Find feature by ID
    const targetFeature = geoJsonData?.features?.find(f => f.properties?.featureId === featureId);
    
    if (targetFeature) {
      setSelectedFeature(targetFeature);
      setIsSurveyModalOpen(true);
    } else {
      console.error('Feature not found with ID:', featureId);
    }
  }, [geoJsonData]);

  // Function to open PAI modal
  const openPAIForFeature = useCallback((featureId) => {
    // Find feature by ID
    const targetFeature = geoJsonData?.features?.find(f => f.properties?.featureId === featureId);
    
    if (targetFeature && typeof window !== 'undefined' && window.openPAIManagementModal) {
      window.openPAIManagementModal(targetFeature.properties);
    } else {
      console.error('Feature not found or PAI modal not available:', featureId);
    }
  }, [geoJsonData]);

  // Function to open priority modal
  const openPriorityModalForPAI = useCallback(async (featureId) => {
    try {
      // Find feature by ID
      const targetFeature = geoJsonData?.features?.find(f => f.properties?.featureId === featureId);
      
      if (!targetFeature) {
        console.error('Feature not found with ID:', featureId);
        alert('❌ Feature tidak ditemukan');
        return;
      }

      // ✅ FIX: Fetch PAI with latest=true for consistent response format
      const response = await fetch(`/api/pai?featureId=${featureId}&latest=true`);
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data PAI');
      }

      const data = await response.json();
      console.log('PAI data for priority (latest=true):', data);
      
      // ✅ FIX: Response format is { pai: {...} } or { pai: null }
      const pai = data.pai;
      
      if (!pai) {
        alert('⚠️ Data PAI belum tersedia\n\nSilakan buat data PAI terlebih dahulu dengan klik tombol "📝 PAI" sebelum mengatur prioritas perbaikan.');
        return;
      }
      
      // ✅ FIX: Use pai directly (already an object, not array)
      setSelectedPAI(pai);
      setSelectedFeature(targetFeature);
      setIsPriorityModalOpen(true);
      
    } catch (error) {
      console.error('Error opening priority modal:', error);
      alert('❌ Gagal membuka modal prioritas: ' + error.message);
    }
  }, [geoJsonData]);

  // Setup global functions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.openSurveyModal = openSurveyForFeature;
      window.openPAIModal = openPAIForFeature;
      window.openPriorityModal = openPriorityModalForPAI;
      
      // Function to load PAI info in popup
      window.loadPAIInfo = async (featureId) => {
        try {
          // ✅ FIX: Tambahkan latest=true untuk konsistensi response format
          const response = await fetch(`/api/pai?featureId=${featureId}&latest=true`);
          
          const paiInfoElement = document.getElementById(`pai-info-${featureId}`);
          const priorityBtn = document.getElementById(`priority-btn-${featureId}`);
          
          if (!response.ok) {
            console.error('Failed to fetch PAI:', response.status);
            // Show error state
            if (paiInfoElement) {
              paiInfoElement.innerHTML = '<div style="color: #ef4444; font-size: 12px;">❌ Gagal memuat data PAI</div>';
            }
            if (priorityBtn) {
              priorityBtn.disabled = true;
              priorityBtn.style.opacity = '0.5';
              priorityBtn.style.cursor = 'not-allowed';
              priorityBtn.title = 'Gagal memuat data PAI';
            }
            return;
          }
          
          const data = await response.json();
          console.log('PAI API Response (latest=true):', data); // Debug log
          
          if (paiInfoElement) {
            // ✅ FIX: Response format dengan latest=true adalah { pai: {...} } atau { pai: null }
            const pai = data.pai;
            const hasPAI = pai !== null && pai !== undefined;
            
            if (hasPAI) {
              // ✅ FIX: pai sudah berupa object, tidak perlu akses array lagi
              const paiTypeIcon = pai.paiType === 'saluran' ? '🚰' : '🏢';
              const paiTypeName = pai.paiType === 'saluran' ? 'Saluran' : 'Bangunan';
              
              let infoHTML = `<div style="color: #374151;">`;
              infoHTML += `<div style="margin-bottom: 4px;"><strong>${paiTypeIcon} ${paiTypeName}</strong></div>`;
              infoHTML += `<div>${pai.paiData?.aset?.nama || 'Tidak ada nama'}</div>`;
              infoHTML += `<div style="font-size: 11px; color: #6b7280;">${pai.paiData?.aset?.jenis || ''} • ${pai.paiData?.aset?.nomenklatur || ''}</div>`;
              
              if (pai.paiType === 'saluran' && pai.lengthM) {
                infoHTML += `<div style="font-size: 11px; color: #6b7280;">Panjang: ${Math.round(pai.lengthM)}m</div>`;
              }
              
              if (pai.photos && pai.photos.length > 0) {
                infoHTML += `<div style="font-size: 11px; color: #6b7280;">📷 ${pai.photos.length} foto</div>`;
              }
              
              // Add priority info if exists
              if (pai.priorityScore) {
                const priorityLabels = {
                  5: { label: 'Sangat Mendesak', color: '#ef4444' },
                  4: { label: 'Mendesak', color: '#f97316' },
                  3: { label: 'Sedang', color: '#f59e0b' },
                  2: { label: 'Rendah', color: '#3b82f6' },
                  1: { label: 'Sangat Rendah', color: '#6b7280' }
                };
                const priorityInfo = priorityLabels[pai.priorityScore];
                infoHTML += `<div style="margin-top: 6px; padding: 4px 8px; background: ${priorityInfo.color}20; border-left: 3px solid ${priorityInfo.color}; border-radius: 4px;">`;
                infoHTML += `<div style="font-size: 11px; font-weight: 600; color: ${priorityInfo.color};">⚠️ Prioritas: ${priorityInfo.label} (${priorityInfo.priority})</div>`;
                if (pai.priorityNotes) {
                  infoHTML += `<div style="font-size: 10px; color: #6b7280; margin-top: 2px;">${pai.priorityNotes}</div>`;
                }
                infoHTML += `</div>`;
              }
              
              infoHTML += `<div style="font-size: 11px; color: #6b7280;">Updated: ${new Date(pai.updatedAt).toLocaleDateString('id-ID')}</div>`;
              infoHTML += `</div>`;
              
              paiInfoElement.innerHTML = infoHTML;
              
              // Enable priority button
              if (priorityBtn) {
                priorityBtn.disabled = false;
                priorityBtn.style.opacity = '1';
                priorityBtn.style.cursor = 'pointer';
                priorityBtn.title = 'Atur prioritas perbaikan';
                // ✅ FIX: Don't set onclick to null, HTML onclick attribute will handle it
              }
            } else {
              // No PAI data
              paiInfoElement.innerHTML = `
                <div style="padding: 8px; background: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 4px;">
                  <div style="color: #92400e; font-size: 12px; font-weight: 600; margin-bottom: 4px;">
                    ℹ️ Belum ada data PAI
                  </div>
                  <div style="color: #78350f; font-size: 11px;">
                    Silakan buat data PAI terlebih dahulu dengan klik tombol "📝 PAI"
                  </div>
                </div>
              `;
              
              // Disable priority button with explanation
              if (priorityBtn) {
                priorityBtn.disabled = true;
                priorityBtn.style.opacity = '0.5';
                priorityBtn.style.cursor = 'not-allowed';
                priorityBtn.title = 'Buat data PAI terlebih dahulu untuk mengatur prioritas';
                
                // ✅ FIX: Don't override onclick, disabled button won't be clickable anyway
                // The HTML onclick attribute will work when button is enabled
              }
            }
          }
        } catch (error) {
          console.error('Error loading PAI info:', error);
          const paiInfoElement = document.getElementById(`pai-info-${featureId}`);
          const priorityBtn = document.getElementById(`priority-btn-${featureId}`);
          
          if (paiInfoElement) {
            paiInfoElement.innerHTML = `
              <div style="padding: 8px; background: #fee2e2; border-left: 3px solid #ef4444; border-radius: 4px;">
                <div style="color: #991b1b; font-size: 12px; font-weight: 600;">
                  ❌ Gagal memuat data PAI
                </div>
                <div style="color: #7f1d1d; font-size: 11px; margin-top: 2px;">
                  ${error.message || 'Terjadi kesalahan'}
                </div>
              </div>
            `;
          }
          
          if (priorityBtn) {
            priorityBtn.disabled = true;
            priorityBtn.style.opacity = '0.5';
            priorityBtn.style.cursor = 'not-allowed';
            priorityBtn.title = 'Gagal memuat data PAI';
          }
        }
      };
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete window.openSurveyModal;
        delete window.openPAIModal;
        delete window.openPriorityModal;
        delete window.loadPAIInfo;
      }
    };
  }, [openSurveyForFeature, openPAIForFeature, openPriorityModalForPAI]);

  // Debug state changes
  useEffect(() => {
  }, [isSurveyModalOpen]);
  
  useEffect(() => {
  }, [selectedFeature]);

  // Memoize kategori untuk menghindari re-calculation
  const categories = useMemo(() => {
    if (!geoJsonData?.features) return [];
    return [...new Set(geoJsonData.features.map(f => f.properties?.sourceLayer).filter(Boolean))];
  }, [geoJsonData]);

  // Generate dynamic colors for source layers
  const generateLayerColor = useCallback((sourceLayer, index) => {
    // Special handling for specific layers
    if (sourceLayer && sourceLayer.toLowerCase().includes('bangunan_irigasi')) {
      return { color: "#666666", fillColor: "#999999" }; // Gray for Bangunan Irigasi
    }
    
    const colors = [
      { color: "#FF0000", fillColor: "#FF4444" }, // Red
      { color: "#0000FF", fillColor: "#4444FF" }, // Blue  
      { color: "#00FF00", fillColor: "#44FF44" }, // Green
      { color: "#FFA500", fillColor: "#FFB84D" }, // Orange
      { color: "#800080", fillColor: "#B347B3" }, // Purple
      { color: "#FF1493", fillColor: "#FF69B4" }, // Deep Pink
      { color: "#20B2AA", fillColor: "#48D1CC" }, // Light Sea Green
      { color: "#FFD700", fillColor: "#FFEF4D" }, // Gold
      { color: "#DC143C", fillColor: "#F56565" }, // Crimson
      { color: "#4169E1", fillColor: "#6B8BFF" }  // Royal Blue
    ];
    
    // Use predefined colors or generate based on index
    return colors[index % colors.length] || { color: "#999999", fillColor: "#CCCCCC" };
  }, []);

  // Optimized style functions
  const getFeatureStyle = useCallback((feature) => {
    const sourceLayer = feature.properties?.sourceLayer;
    const featureId = feature.properties?.featureId;
    const categoryIndex = categories.indexOf(sourceLayer);
    const geomType = feature.geometry?.type;
    
    // Check if this feature has a survey score and survey layer is visible
    const surveyColor = (featureId && showSurveyLayer) ? getFeatureQualityColor(featureId) : null;
    
    let colorConfig;
    if (surveyColor && surveyColor !== '#6b7280') {
      // Use survey-based color if available (excluding gray/no survey)
      colorConfig = {
        color: surveyColor,
        fillColor: surveyColor
      };
    } else {
      // Use default layer colors
      colorConfig = generateLayerColor(sourceLayer, categoryIndex);
    }
    
    const baseStyle = {
      color: colorConfig.color,
      fillColor: colorConfig.fillColor,
      weight: geomType === "Point" ? 2 : 3,
      fillOpacity: geomType === "Point" ? 0.8 : 0.5,
      opacity: geomType === "Point" ? 1.0 : 0.8
    };

    return geomType === "Point" ? { ...baseStyle, radius: 8 } : baseStyle;
  }, [categories, getFeatureQualityColor, showSurveyLayer]);

  const pointToLayer = useCallback((feature, latlng) => {
    const style = getFeatureStyle(feature);
    return L.circleMarker(latlng, { ...style, radius: 10 });
  }, [getFeatureStyle]);

  // Optimized HTML parser
  const parseHTMLDescription = useCallback((htmlString) => {
    if (!htmlString) return {};
    
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlString;
      const tds = tempDiv.querySelectorAll('td');
      const data = {};
      
      for (let i = 0; i < tds.length - 1; i += 2) {
        const key = tds[i].textContent.trim();
        const value = tds[i + 1].textContent.trim();
        if (key && value && key !== 'Unknown Point Feature') {
          data[key] = value;
        }
      }
      return data;
    } catch (error) {
      console.error('Error parsing HTML:', error);
      return {};
    }
  }, []);

  // Optimized popup content builder with survey button
  const buildPopupContent = useCallback((props, detailData, feature) => {
    let content = '<div style="font-family: Arial, sans-serif; max-width: 380px;">';
    
    // Header with sourceLayer
    if (props.sourceLayer) {
      const categoryIndex = categories.indexOf(props.sourceLayer);
      const categoryColor = generateLayerColor(props.sourceLayer, categoryIndex)?.color || "#333";
      content += `<h3 style="margin: 0 0 12px 0; color: ${categoryColor}; font-size: 16px; font-weight: bold; border-bottom: 2px solid ${categoryColor}; padding-bottom: 6px;">${props.sourceLayer}</h3>`;
    }
    
    // Main info - use database fields
    const infoFields = [
      { key: 'name', label: '📍 Nama', prop: props.name },
      { key: 'featureId', label: '🆔 Feature ID', prop: props.featureId },
      { key: 'type', label: '🏷️ Tipe', prop: props.type },
      { key: 'scheme', label: '📋 Skema', prop: props.scheme },
      { key: 'NAMOBJ', label: '🗺️ Wilayah', prop: props.NAMOBJ },
      { key: 'WADMKK', label: '🏛️ Kabupaten', prop: props.WADMKK }
    ];
    
    infoFields.forEach(({ label, prop }) => {
      if (prop) {
        content += `<div style="margin: 8px 0; padding: 6px; background: #f8f9fa; border-radius: 4px;">`;
        content += `<strong style="color: #2c3e50;">${label}:</strong> ${prop}</div>`;
      }
    });
    
    // Detail data
    if (Object.keys(detailData).length > 0) {
      const categoryIndex = categories.indexOf(props.sourceLayer);
      const categoryColor = generateLayerColor(props.sourceLayer, categoryIndex)?.color || '#333';
      content += `<div style="margin: 12px 0; padding: 10px; background: #f1f3f4; border-radius: 6px; border-left: 4px solid ${categoryColor};">`;
      content += `<div style="font-weight: bold; margin-bottom: 8px; color: #2c3e50;">📋 Detail Informasi:</div>`;
      
      PRIORITY_FIELDS.forEach(field => {
        if (detailData[field] && detailData[field] !== '0' && detailData[field] !== '') {
          const label = FIELD_LABELS[field] || field;
          let value = detailData[field];
          if (field === 'ELEVATION' && value !== '0') value += ' meter';
          
          content += `<div style="margin: 4px 0; padding: 3px 0; font-size: 13px;">`;
          content += `<span style="font-weight: 500; color: #495057;">${label}:</span> `;
          content += `<span style="color: #212529;">${value}</span></div>`;
        }
      });
      content += `</div>`;
    }

    // Add survey info and button for irrigation features (exclude boundary features)
    const isIrrigationFeature = props.featureId && !props.NAMOBJ && !props.WADMKK;
    if (isIrrigationFeature) {
      // Add PAI info section (will be populated by loadPAIInfo)
      content += `<div style="margin: 12px 0; padding: 10px; background: #f0fdf4; border-radius: 6px; border: 1px solid #bbf7d0;">`;
      content += `<div style="font-weight: bold; color: #15803d; margin-bottom: 6px;">📋 Info PAI</div>`;
      content += `<div id="pai-info-${props.featureId}" style="min-height: 24px; display: flex; align-items: center;">`;
      content += `<div style="display: flex; align-items: center; gap: 6px; color: #6b7280; font-size: 12px;">`;
      content += `<div class="animate-pulse" style="width: 12px; height: 12px; background: #9ca3af; border-radius: 50%;"></div>`;
      content += `Memuat data PAI...`;
      content += `</div>`;
      content += `</div>`;
      content += `</div>`;
      
      // Check if survey exists
      const existingSurvey = getSurveyForFeature(props.featureId);
      
      if (existingSurvey) {
        // Display existing survey info
        const qualityColor = getFeatureQualityColor(props.featureId);
        content += `<div style="margin: 12px 0; padding: 10px; background: #f0f9ff; border-radius: 6px; border: 1px solid ${qualityColor};">`;
        content += `<div style="font-weight: bold; color: #1e40af; margin-bottom: 6px;">📊 Hasil Survey</div>`;
        content += `<div style="display: flex; justify-content: space-between; align-items: center;">`;
        content += `<div>`;
        content += `<div style="font-size: 13px; color: #374151;">Skor: <strong>${existingSurvey.scoreTotal?.toFixed(1) || 'N/A'}</strong></div>`;
        content += `<div style="font-size: 13px; color: ${qualityColor}; font-weight: bold;">Kelas: ${existingSurvey.scoreClass || 'N/A'}</div>`;
        content += `<div style="font-size: 11px; color: #6b7280;">Skema: ${existingSurvey.scheme}</div>`;
        content += `</div>`;
        content += `<div style="width: 20px; height: 20px; background: ${qualityColor}; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.2);"></div>`;
        content += `</div>`;
        content += `<div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Survey: ${new Date(existingSurvey.createdAt).toLocaleDateString('id-ID')}</div>`;
        content += `</div>`;
        
        // Update survey button
        content += `<div style="margin: 8px 0; padding: 8px; background: #fff3cd; border-radius: 6px; text-align: center; border: 1px solid #ffc107;">`;
        content += `<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 4px;">`;
        content += `<button onclick="window.openSurveyModal && window.openSurveyModal('${props.featureId}')" 
                      style="background: #ffc107; color: #212529; border: none; padding: 6px 8px; border-radius: 4px; 
                             cursor: pointer; font-weight: 500; font-size: 11px;">
                      🔄 Survey
                    </button>`;
        content += `<button onclick="window.openPAIModal && window.openPAIModal('${props.featureId}')" 
                     style="background: #16a34a; color: white; border: none; padding: 6px 8px; border-radius: 4px; 
                           cursor: pointer; font-weight: 500; font-size: 11px;">
                  📝 PAI
                </button>`;
        content += `<button id="priority-btn-${props.featureId}" 
                     onclick="window.openPriorityModal && window.openPriorityModal('${props.featureId}')" 
                     style="background: #ef4444; color: white; border: none; padding: 6px 8px; border-radius: 4px; 
                           font-weight: 500; font-size: 11px; opacity: 0.5; cursor: not-allowed;" 
                     disabled
                     title="Memuat status PAI...">
                  ⚠️ Prioritas
                </button>`;
        content += `</div>`;
        content += `<div style="font-size: 10px; color: #856404;">Update survey, kelola PAI, atau atur prioritas perbaikan</div>`;
        content += `</div>`;
      } else {
        // No survey yet - show create button
        content += `<div style="margin: 12px 0; padding: 10px; background: #e3f2fd; border-radius: 6px; text-align: center; border: 1px solid #2196f3;">`;
        content += `<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 4px;">`;
        content += `<button onclick="window.openSurveyModal && window.openSurveyModal('${props.featureId}')" 
                      style="background: #2196f3; color: white; border: none; padding: 8px 16px; border-radius: 4px; 
                             cursor: pointer; font-weight: 500; font-size: 13px;">
                      📋 IKSI
                    </button>`;
        content += `<button onclick="window.openPAIModal && window.openPAIModal('${props.featureId}')" 
                     style="background: #16a34a; color: white; border: none; padding: 8px 12px; border-radius: 4px; 
                           cursor: pointer; font-weight: 500; font-size: 12px;">
                  📝 PAI
                </button>`;
        content += `<button id="priority-btn-${props.featureId}" 
                     onclick="window.openPriorityModal && window.openPriorityModal('${props.featureId}')" 
                     style="background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 4px; 
                           font-weight: 500; font-size: 12px; opacity: 0.5; cursor: not-allowed;" 
                     disabled
                     title="Memuat status PAI...">
                  ⚠️ Prioritas
                </button>`;
        content += `</div>`;
        content += `<div style="font-size: 11px; color: #666;">Buat survey, kelola PAI, atau atur prioritas perbaikan</div>`;
        content += `</div>`;
      }
    }
    
    // Add detail button for all features at the bottom
    if (props.featureId) {
      content += `<div style="margin: 12px 0; padding: 8px; background: #f8fafc; border-radius: 6px; text-align: center; border: 1px solid #e2e8f0;">`;
      content += `<button onclick="window.open('/features/${props.featureId}', '_blank')" 
                    style="background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 4px; 
                           cursor: pointer; font-weight: 500; font-size: 13px; width: 100%;">
                    📊 Lihat Detail Lengkap
                  </button>`;
      content += `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                    Informasi lengkap PAI, Survey, dan Properties
                  </div>`;
      content += `</div>`;
    }
    
    return content + '</div>';
  }, [categories, generateLayerColor, getSurveyForFeature, getFeatureQualityColor]);

  // Optimized event handler
  const onEachFeature = useCallback((feature, layer) => {
    if (!feature.properties) return;
    
    const props = feature.properties;
    const detailData = parseHTMLDescription(props.Description);
    const popupContent = buildPopupContent(props, detailData, feature);
    
    layer.bindPopup(popupContent, {
      maxWidth: 420,
      maxHeight: 600,
      className: 'custom-popup'
    });

    // Add popup open event to load PAI info
    layer.on('popupopen', () => {
      const isIrrigationFeature = props.featureId && !props.NAMOBJ && !props.WADMKK;
      if (isIrrigationFeature && typeof window !== 'undefined' && window.loadPAIInfo) {
        // Load PAI info after a short delay to ensure DOM is ready
        setTimeout(() => {
          window.loadPAIInfo(props.featureId);
        }, 100);
      }
    });
    
    // Optimized hover effects
    layer.on({
      mouseover: function() {
        const isBoundary = props.NAMOBJ || props.WADMKK;
        this.setStyle(isBoundary ? 
          { weight: 3, opacity: 0.9, fillOpacity: 0.05 } :
          { weight: 5, opacity: 1, fillOpacity: 0.9 }
        );
      },
      mouseout: function() {
        const isBoundary = props.NAMOBJ || props.WADMKK;
        this.setStyle(isBoundary ? MAP_CONFIG.boundaryStyle : getFeatureStyle(feature));
      },
      // Add click event for direct survey access (alternative to popup button)
      click: function(e) {
        const isIrrigationFeature = props.featureId && !props.NAMOBJ && !props.WADMKK;
        
        // If Ctrl/Cmd key is pressed, open survey directly
        if (e.originalEvent.ctrlKey || e.originalEvent.metaKey) {
          e.originalEvent.preventDefault();
          if (isIrrigationFeature) {
            openSurveyForFeature(props.featureId);
          }
        }
        // Otherwise, let the popup open normally
      }
    });
  }, [parseHTMLDescription, buildPopupContent, getFeatureStyle, geoJsonData, openSurveyForFeature]);

  // Filter features based on survey status
  const getFilteredFeatures = useCallback((features) => {
    if (!showSurveyLayer || surveyFilter === 'all') {
      return features;
    }

    return features.filter(feature => {
      const featureId = feature.properties?.featureId;
      if (!featureId) return surveyFilter === 'all';

      const survey = getSurveyForFeature(featureId);
      const hasSurvey = !!survey;
      const score = survey?.scoreTotal || 0;

      switch (surveyFilter) {
        case 'surveyed':
          return hasSurvey;
        case 'not-surveyed':
          return !hasSurvey;
        case 'baik':
          return hasSurvey && score >= 80;
        case 'sedang':
          return hasSurvey && score >= 50 && score < 80;
        case 'buruk':
          return hasSurvey && score < 50;
        case 'quality-A':
          return hasSurvey && survey.scoreClass === 'A';
        case 'quality-B':
          return hasSurvey && survey.scoreClass === 'B';
        case 'quality-C':
          return hasSurvey && survey.scoreClass === 'C';
        case 'quality-D':
          return hasSurvey && survey.scoreClass === 'D';
        default:
          return true;
      }
    });
  }, [showSurveyLayer, surveyFilter, getSurveyForFeature]);

  // Memoized layer data calculations
  const layerDataMap = useMemo(() => {
    if (!geoJsonData?.features) return {};
    
    const map = {};
    categories.forEach(category => {
      const categoryFeatures = geoJsonData.features.filter(
        feature => feature.properties?.sourceLayer === category
      );
      const filteredFeatures = getFilteredFeatures(categoryFeatures);
      
      if (filteredFeatures.length > 0) {
        map[category] = {
          ...geoJsonData,
          features: filteredFeatures
        };
      }
    });
    return map;
  }, [geoJsonData, categories, getFilteredFeatures]);

  // Calculate statistics based on all features
  const statistics = useMemo(() => {
    if (!geoJsonData?.features) return { total: 0, surveyed: 0, qualityBreakdown: {}, classCounts: {}, averageScore: 0 };
    
    const totalFeatures = geoJsonData.features.length;
    return getStatistics(totalFeatures);
  }, [geoJsonData?.features, getStatistics]);

  return (
    <div style={{ height: '80vh', minHeight: '640px', width: '100%', position: 'relative' }}>
      {/* Custom CSS for cluster styling */}
      <style jsx>{`
        .custom-cluster-icon {
          background: transparent !important;
          border: none !important;
        }
        
        .custom-cluster-icon div {
          transition: all 0.2s ease-in-out;
        }
        
        .custom-cluster-icon:hover div {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
        }
        
        .leaflet-cluster-anim .leaflet-marker-icon, 
        .leaflet-cluster-anim .leaflet-marker-shadow {
          transition: transform 0.3s ease-out, opacity 0.3s ease-in;
        }
        
        /* Custom cluster popup styling */
        .cluster-popup {
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .cluster-popup .leaflet-popup-content-wrapper {
          border-radius: 8px;
          padding: 1px;
        }
        
        .cluster-popup .leaflet-popup-content {
          margin: 12px 16px;
          line-height: 1.4;
        }
      `}</style>
    
      {/* Survey Filter Controls */}
      {!isSurveyModalOpen && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
          zIndex: 1000,
          fontSize: '13px',
          fontWeight: '500',
          minWidth: '240px'
        }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#1f2937' }}>
          📊 Filter Survey
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showSurveyLayer}
              onChange={(e) => setShowSurveyLayer(e.target.checked)}
              style={{ marginRight: '6px' }}
            />
            Tampilkan Layer Survey
          </label>
        </div>

        {showSurveyLayer && (
          <div>
            <div style={{ marginBottom: '6px', fontSize: '12px', color: '#666' }}>Status Survey:</div>
            <select
              value={surveyFilter}
              onChange={(e) => setSurveyFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                fontSize: '12px'
              }}
            >
              <option value="all">Semua</option>
              <option value="surveyed">Sudah Disurvei</option>
              <option value="not-surveyed">Belum Disurvei</option>
              <option value="baik">Kualitas Baik (≥80)</option>
              <option value="sedang">Kualitas Sedang (50-79)</option>
              <option value="buruk">Kualitas Buruk (&lt;50)</option>
            </select>
            
            {/* Survey Statistics */}
            <div style={{ marginTop: '8px', padding: '6px', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '11px' }}>
              <div>Total Features: {statistics.total}</div>
              <div>Tersurvei: {statistics.surveyed} ({statistics.total > 0 ? Math.round((statistics.surveyed / statistics.total) * 100) : 0}%)</div>
              <div>Rata-rata Skor: {statistics.averageScore?.toFixed(1) || 'N/A'}</div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Survey Statistics Panel - moved to right side */}
      {!isSurveyModalOpen && statistics.total > 0 && showSurveyLayer && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '10px 12px',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 1000,
          fontSize: '12px',
          fontWeight: '500',
          minWidth: '180px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#1f2937' }}>
            📈 Statistik Kualitas
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ backgroundColor: '#10b981', width: '12px', height: '12px', borderRadius: '2px' }}></span>
              <span>Baik: {statistics.qualityBreakdown?.baik || 0}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ backgroundColor: '#f59e0b', width: '12px', height: '12px', borderRadius: '2px' }}></span>
              <span>Sedang: {statistics.qualityBreakdown?.sedang || 0}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ backgroundColor: '#ef4444', width: '12px', height: '12px', borderRadius: '2px' }}></span>
              <span>Buruk: {statistics.qualityBreakdown?.buruk || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Survey Statistics Panel */}
      {statistics.total > 0 && !showSurveyLayer && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '10px 12px',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 1000,
          fontSize: '12px',
          fontWeight: '500',
          minWidth: '180px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#1f2937' }}>
            📋 Statistik Survey ({statistics.total})
          </div>
          <div style={{ marginBottom: '4px', color: '#374151' }}>
            Rata-rata: <strong>{statistics.averageScore}</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '11px' }}>
            <div style={{ color: '#22c55e' }}>A: {statistics.classCounts.A}</div>
            <div style={{ color: '#eab308' }}>B: {statistics.classCounts.B}</div>
            <div style={{ color: '#f97316' }}>C: {statistics.classCounts.C}</div>
            <div style={{ color: '#ef4444' }}>D: {statistics.classCounts.D}</div>
          </div>
          {surveyLoading && (
            <div style={{ marginTop: '4px', fontSize: '10px', color: '#6b7280' }}>
              🔄 Memuat data survey...
            </div>
          )}
        </div>
      )}
      
      <MapContainer
        center={MAP_CONFIG.center}
        zoom={MAP_CONFIG.zoom}
        style={{ height: '100%', width: '100%', borderRadius: '8px' }}
        scrollWheelZoom={true}
        zoomControl={false} // Always disable default zoom control
      >
        {/* Conditionally add zoom control only when modal is not open */}
        {!isSurveyModalOpen && <ZoomControl position="topleft" />}
        
        {/* Only show LayersControl when modal is not open */}
        {!isSurveyModalOpen && (
          <LayersControl position="topright">
          {/* Base Layers */}
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
          </LayersControl.BaseLayer>
          
          <LayersControl.BaseLayer name="Satellite (Esri)">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            />
          </LayersControl.BaseLayer>
          
          <LayersControl.BaseLayer name="Satellite (Google)">
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
              attribution='&copy; <a href="https://www.google.com/maps">Google</a>'
            />
          </LayersControl.BaseLayer>
          
          <LayersControl.BaseLayer name="Hybrid (Google)">
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
              attribution='&copy; <a href="https://www.google.com/maps">Google</a>'
            />
          </LayersControl.BaseLayer>
          
          <LayersControl.BaseLayer name="Terrain">
            <TileLayer
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
            />
          </LayersControl.BaseLayer>

          {/* Overlay Layers */}
          {/* Boundary layer (background) */}
          {boundaryData?.features && (
            <LayersControl.Overlay name={`Batas Wilayah (${boundaryData.features.length})`} checked={true}>
              <GeoJSON
                key="boundary-layer"
                data={boundaryData}
                style={() => MAP_CONFIG.boundaryStyle}
                onEachFeature={onEachFeature}
              />
            </LayersControl.Overlay>
          )}

          {/* Irrigation layers (foreground) - using sourceLayer from database */}
          {Object.entries(layerDataMap).map(([sourceLayer, layerData]) => {
            // Format layer name for display
            const formatLayerName = (name) => {
              return name
                .replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase())
                .replace('Way Rarem', 'WR');
            };
            
            const displayName = formatLayerName(sourceLayer);
            const featureCount = layerData.features.length;
            
            // Separate point and non-point features
            const { pointFeatures, nonPointFeatures } = separateFeaturesByGeometry(layerData.features);
            
            return (
              <LayersControl.Overlay 
                key={sourceLayer} 
                name={`${displayName} (${featureCount})`}
                checked={true}
              >
                {/* Render non-point features (lines, polygons) without clustering */}
                {nonPointFeatures.length > 0 && (
                  <GeoJSON
                    key={`${sourceLayer}-non-point-${nonPointFeatures.length}`}
                    data={{
                      type: "FeatureCollection",
                      features: nonPointFeatures
                    }}
                    style={getFeatureStyle}
                    onEachFeature={onEachFeature}
                  />
                )}
                
                {/* Render point features with clustering */}
                {pointFeatures.length > 0 && (
                  <MarkerClusterGroup
                    {...clusterOptions}
                    key={`cluster-${sourceLayer}-${pointFeatures.length}`}
                    eventHandlers={{
                      add: (event) => {
                        // Setup event handlers setelah cluster group ditambahkan
                        handleClusterEvents(event.target);
                      }
                    }}
                  >
                    <GeoJSON
                      key={`${sourceLayer}-point-${pointFeatures.length}`}
                      data={{
                        type: "FeatureCollection",
                        features: pointFeatures
                      }}
                      style={getFeatureStyle}
                      pointToLayer={pointToLayer}
                      onEachFeature={onEachFeature}
                    />
                  </MarkerClusterGroup>
                )}
              </LayersControl.Overlay>
            );
          })}
        </LayersControl>
        )}
      </MapContainer>
      
      {/* Compact legend */}
      {!isSurveyModalOpen && (
      <div style={{
        position: 'absolute',
        bottom: '15px',
        left: '15px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '8px 12px',
        borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 1000,
        fontSize: '11px',
        maxWidth: '200px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Legend</div>
        
        {boundaryData && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{
              width: '12px', height: '12px', 
              background: '#E6E6FA', 
              border: '1px dashed #800080',
              marginRight: '6px'
            }}></div>
            Batas Wilayah
          </div>
        )}
        
        {Object.entries(layerDataMap).map(([sourceLayer, layerData]) => {
          const categoryIndex = categories.indexOf(sourceLayer);
          const colorConfig = generateLayerColor(sourceLayer, categoryIndex);
          const displayName = sourceLayer
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace('Way Rarem', 'WR');
          
          return (
            <div key={sourceLayer} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{
                width: '12px', height: '12px',
                backgroundColor: colorConfig.fillColor,
                border: `1px solid ${colorConfig.color}`,
                marginRight: '6px'
              }}></div>
              {displayName} ({layerData.features.length})
            </div>
          );
        })}
        
        {/* Survey Status Legend */}
        {showSurveyLayer && (
          <>
            <div style={{ 
              borderTop: '1px solid #e5e7eb', 
              marginTop: '8px', 
              paddingTop: '6px',
              fontWeight: 'bold',
              fontSize: '10px'
            }}>
              Status Survey:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
              <div style={{
                width: '12px', height: '12px',
                backgroundColor: '#10b981',
                border: '1px solid #059669',
                marginRight: '6px'
              }}></div>
              Baik (≥80)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
              <div style={{
                width: '12px', height: '12px',
                backgroundColor: '#f59e0b',
                border: '1px solid #d97706',
                marginRight: '6px'
              }}></div>
              Sedang (50-79)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
              <div style={{
                width: '12px', height: '12px',
                backgroundColor: '#ef4444',
                border: '1px solid #dc2626',
                marginRight: '6px'
              }}></div>
              Buruk (&lt;50)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
              <div style={{
                width: '12px', height: '12px',
                backgroundColor: '#6b7280',
                border: '1px solid #4b5563',
                marginRight: '6px'
              }}></div>
              Belum Disurvei
            </div>
          </>
        )}
        
      </div>
      )}

      {/* Survey Modal */}
      <SurveyModal
        isOpen={isSurveyModalOpen}
        onClose={() => {
          setIsSurveyModalOpen(false);
        }}
        featureData={selectedFeature}
        onSurveySubmit={(result) => {
          
          // Reload survey data to update map styling
          reloadSurveys();
          
          // Optionally trigger data reload to show updated scores
          if (onDataReload) {
            onDataReload();
          }
          
          // Show success message (you can enhance this with a toast notification)
        }}
      />

      {/* Priority Score Modal */}
      <PriorityScoreModal
        isOpen={isPriorityModalOpen}
        onClose={() => {
          setIsPriorityModalOpen(false);
          setSelectedPAI(null);
        }}
        featureData={selectedFeature}
        paiData={selectedPAI}
        onSubmit={(result) => {
          console.log('Priority updated:', result);
          
          // Optionally trigger data reload
          if (onDataReload) {
            onDataReload();
          }
          
          // Show success message
          alert('Prioritas berhasil disimpan!');
        }}
      />
      
      
    </div>
  );
};

export default LeafletMap;
