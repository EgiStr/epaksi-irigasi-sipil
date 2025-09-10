import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import dataIrigasi from '../data_irigasi.json';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

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
    "Bangunan_Irigasi Way Rarem": { color: "#FF0000", fillColor: "#FF4444" },
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

const IrigasiMap = () => {
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [boundaryData, setBoundaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoize kategori untuk menghindari re-calculation
  const categories = useMemo(() => {
    if (!geoJsonData?.features) return [];
    return [...new Set(geoJsonData.features.map(f => f.properties?.source_layer))];
  }, [geoJsonData]);

  // Load data 
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Set data irigasi langsung (sudah di-import)
        setGeoJsonData(dataIrigasi);
        
        // Load boundary data
        const boundaryResponse = await fetch('/rbi.json.geojson');
        if (boundaryResponse.ok) {
          const boundaryJson = await boundaryResponse.json();
          if (boundaryJson.features?.length > 0) {
            setBoundaryData(boundaryJson);
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Optimized style functions
  const getFeatureStyle = useCallback((feature) => {
    const category = feature.properties?.source_layer;
    const colorConfig = MAP_CONFIG.colors[category] || { color: "#999999", fillColor: "#CCCCCC" };
    const geomType = feature.geometry?.type;
    
    const baseStyle = {
      color: colorConfig.color,
      fillColor: colorConfig.fillColor,
      weight: geomType === "Point" ? 2 : 3,
      fillOpacity: geomType === "Point" ? 0.8 : 0.5,
      opacity: geomType === "Point" ? 1.0 : 0.8
    };

    return geomType === "Point" ? { ...baseStyle, radius: 8 } : baseStyle;
  }, []);

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

  // Optimized popup content builder
  const buildPopupContent = useCallback((props, detailData) => {
    let content = '<div style="font-family: Arial, sans-serif; max-width: 380px;">';
    
    // Header
    if (props.source_layer) {
      const categoryColor = MAP_CONFIG.colors[props.source_layer]?.color || "#333";
      content += `<h3 style="margin: 0 0 12px 0; color: ${categoryColor}; font-size: 16px; font-weight: bold; border-bottom: 2px solid ${categoryColor}; padding-bottom: 6px;">${props.source_layer}</h3>`;
    }
    
    // Main info
    const infoFields = [
      { key: 'Name', label: '📍 Nama', prop: props.Name },
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
      content += `<div style="margin: 12px 0; padding: 10px; background: #f1f3f4; border-radius: 6px; border-left: 4px solid ${MAP_CONFIG.colors[props.source_layer]?.color || '#333'};">`;
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
    
    return content + '</div>';
  }, []);

  // Optimized event handler
  const onEachFeature = useCallback((feature, layer) => {
    if (!feature.properties) return;
    
    const props = feature.properties;
    const detailData = parseHTMLDescription(props.Description);
    const popupContent = buildPopupContent(props, detailData);
    
    layer.bindPopup(popupContent, {
      maxWidth: 420,
      maxHeight: 600,
      className: 'custom-popup'
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
      }
    });
  }, [parseHTMLDescription, buildPopupContent, getFeatureStyle]);

  // Memoized layer data calculations
  const layerDataMap = useMemo(() => {
    if (!geoJsonData?.features) return {};
    
    const map = {};
    categories.forEach(category => {
      const filteredFeatures = geoJsonData.features.filter(
        feature => feature.properties?.source_layer === category
      );
      if (filteredFeatures.length > 0) {
        map[category] = {
          ...geoJsonData,
          features: filteredFeatures
        };
      }
    });
    return map;
  }, [geoJsonData, categories]);

  // Loading state
  if (loading) {
    return (
      <div style={{ 
        height: '80vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontSize: '18px'
      }}>
        ⏳ Memuat data peta...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ 
        height: '80vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        fontSize: '16px',
        color: '#d32f2f'
      }}>
        Error: {error}
        <div style={{ fontSize: '14px', marginTop: '8px', color: '#666' }}>
          Pastikan file data tersedia
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '80vh', minHeight: '500px', width: '100%', position: 'relative' }}>
      {/* Status info panel */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '8px 12px',
        borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 1000,
        fontSize: '12px',
        fontWeight: '500'
      }}>
        <div>📊 Irigasi: {geoJsonData?.features?.length || 0}</div>
        <div>🗺️ Boundary: {boundaryData?.features?.length || 0}</div>
      </div>
      
      <MapContainer
        center={MAP_CONFIG.center}
        zoom={MAP_CONFIG.zoom}
        style={{ height: '100%', width: '100%', borderRadius: '8px' }}
        scrollWheelZoom={true}
      >
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

          {/* Irrigation layers (foreground) */}
          {Object.entries(layerDataMap).map(([category, layerData]) => (
            <LayersControl.Overlay 
              key={category} 
              name={`${category.replace('Way Rarem', 'WR')} (${layerData.features.length})`}
              checked={true}
            >
              <GeoJSON
                data={layerData}
                style={getFeatureStyle}
                pointToLayer={pointToLayer}
                onEachFeature={onEachFeature}
              />
            </LayersControl.Overlay>
          ))}
        </LayersControl>
      </MapContainer>
      
      {/* Compact legend */}
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
        
        {Object.entries(MAP_CONFIG.colors).map(([category, colorConfig]) => 
          layerDataMap[category] && (
            <div key={category} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{
                width: '12px', height: '12px',
                backgroundColor: colorConfig.fillColor,
                border: `1px solid ${colorConfig.color}`,
                marginRight: '6px'
              }}></div>
              {category.replace('Way Rarem', 'WR')}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default IrigasiMap;
