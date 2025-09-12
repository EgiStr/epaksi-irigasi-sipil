import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useIrigasiData } from '../hooks/useIrigasiData';

// Dynamic import untuk mengatasi SSR issue
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div style={{ 
      height: '80vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontSize: '18px'
    }}>
      🗺️ Memuat peta...
    </div>
  )
});

const IrigasiMap = () => {
  const { geoJsonData, boundaryData, layersData, loading, error, reloadData } = useIrigasiData();
  const [selectedLayers, setSelectedLayers] = useState(new Set());
  const [filteredData, setFilteredData] = useState(null);

  // Initialize selected layers when layersData is loaded
  useEffect(() => {
    if (layersData && layersData.layers) {
      // Auto-select all layers initially
      const allLayers = new Set(layersData.layers.map(layer => layer.sourceLayer));
      setSelectedLayers(allLayers);
    }
  }, [layersData]);

  // Filter GeoJSON data based on selected layers
  useEffect(() => {
    if (geoJsonData && geoJsonData.features && selectedLayers.size > 0) {
      const filtered = {
        ...geoJsonData,
        features: geoJsonData.features.filter(feature => 
          selectedLayers.has(feature.properties.sourceLayer)
        )
      };
      setFilteredData(filtered);
    } else {
      setFilteredData(geoJsonData);
    }
  }, [geoJsonData, selectedLayers]);

  const toggleLayer = (layerName) => {
    const newSelected = new Set(selectedLayers);
    if (newSelected.has(layerName)) {
      newSelected.delete(layerName);
    } else {
      newSelected.add(layerName);
    }
    setSelectedLayers(newSelected);
  };

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
        ⏳ Memuat data dari database...
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
          Pastikan koneksi database tersedia
        </div>
        <button 
          onClick={reloadData}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  // No data state
  if (!filteredData || !filteredData.features || filteredData.features.length === 0) {
    return (
      <div style={{ 
        height: '80vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        fontSize: '16px',
        color: '#666'
      }}>
        📭 Tidak ada data untuk ditampilkan
        <div style={{ fontSize: '14px', marginTop: '8px' }}>
          Silakan upload file KML atau GeoJSON terlebih dahulu
        </div>
        <button 
          onClick={reloadData}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Refresh Data
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '80vh' }}>
      {/* Layer Control Panel */}
     
      {/* Map Component */}
      <LeafletMap 
        geoJsonData={filteredData} 
        boundaryData={boundaryData}
        layersData={layersData}
        onDataReload={reloadData}
      />
    </div>
  );
};

export default IrigasiMap;