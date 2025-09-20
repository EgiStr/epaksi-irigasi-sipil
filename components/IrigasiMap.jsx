import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useIrigasiData } from '../hooks/useIrigasiData';
import PAIFormModal from './admin/pai/PAIFormModal';
import PAIDetailModal from './admin/pai/PAIDetailModal';

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
  
  // PAI Modal states
  const [isPAIFormModalOpen, setIsPAIFormModalOpen] = useState(false);
  const [isPAIDetailModalOpen, setIsPAIDetailModalOpen] = useState(false);
  const [selectedFeatureForPAI, setSelectedFeatureForPAI] = useState(null);
  const [viewingPAI, setViewingPAI] = useState(null);
  const [existingPAI, setExistingPAI] = useState(null); // State untuk existing PAI
  const [loadingExistingPAI, setLoadingExistingPAI] = useState(false);

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

  // Setup global PAI management function
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.openPAIManagementModal = async (feature) => {
        console.log('Opening PAI modal for feature:', feature);
        setSelectedFeatureForPAI(feature);
        
        // Check if this feature already has PAI
        await checkExistingPAI(feature.featureId);
        
        setIsPAIFormModalOpen(true);
      };
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete window.openPAIManagementModal;
      }
    };
  }, []);

  // Function to check existing PAI for a feature
  const checkExistingPAI = async (featureId) => {
    if (!featureId) return;
    
    setLoadingExistingPAI(true);
    try {
      console.log('Checking existing PAI for featureId:', featureId);
      const response = await fetch(`/api/pai?featureId=${featureId}&latest=true`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Existing PAI response:', data);
        
        if (data.pai) {
          // For latest=true, API returns single object, not array
          const existingPaiData = data.pai;
          console.log('Found existing PAI:', existingPaiData);
          setExistingPAI(existingPaiData);
        } else {
          console.log('No existing PAI found for this feature');
          setExistingPAI(null);
        }
      } else {
        console.log('Error fetching existing PAI:', response.status);
        setExistingPAI(null);
      }
    } catch (error) {
      console.error('Error checking existing PAI:', error);
      setExistingPAI(null);
    } finally {
      setLoadingExistingPAI(false);
    }
  };

  // PAI handlers
  const handleSavePAI = async (paiData) => {
    try {
      console.log('Saving PAI data:', paiData)
      
      let url, method
      if (paiData.id) {
        // Update existing PAI
        url = `/api/pai/${paiData.id}`
        method = 'PUT'
        console.log('Updating existing PAI with ID:', paiData.id)
      } else {
        // Create new PAI
        url = '/api/pai'
        method = 'POST'
        console.log('Creating new PAI')
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paiData)
      });

      if (response.ok) {
        const result = await response.json()
        console.log('PAI save result:', result)
        
        // Close modal and reset states
        setIsPAIFormModalOpen(false);
        setExistingPAI(null); // Reset existing PAI state
        setSelectedFeatureForPAI(null); // Reset selected feature
        
        alert(paiData.id ? 'PAI berhasil diupdate' : 'PAI berhasil disimpan');
        
        // Refresh data if needed
        if (window.refreshMapData) {
          window.refreshMapData()
        }
      } else {
        const errorData = await response.json();
        console.error('PAI save error:', errorData)
        throw new Error(errorData.error || 'Gagal menyimpan PAI');
      }
    } catch (error) {
      console.error('Error saving PAI:', error);
      throw error;
    }
  };

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

      {/* PAI Modals */}
      <PAIFormModal
        isOpen={isPAIFormModalOpen}
        onClose={() => {
          console.log('Closing PAI Form Modal');
          setIsPAIFormModalOpen(false);
          setSelectedFeatureForPAI(null);
          setExistingPAI(null); // Reset existing PAI when closing
        }}
        feature={selectedFeatureForPAI}
        onSave={handleSavePAI}
        initialData={existingPAI} // Pass existing PAI data for edit mode
        loading={loadingExistingPAI} // Pass loading state
      />

      <PAIDetailModal
        isOpen={isPAIDetailModalOpen}
        onClose={() => {
          setIsPAIDetailModalOpen(false);
          setViewingPAI(null);
        }}
        pai={viewingPAI}
      />
    </div>
  );
};

export default IrigasiMap;