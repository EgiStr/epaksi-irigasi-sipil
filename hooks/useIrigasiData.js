import { useState, useEffect } from 'react';

export const useIrigasiData = () => {
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [boundaryData, setBoundaryData] = useState(null);
  const [layersData, setLayersData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load features from database API
        const featuresResponse = await fetch('/api/features?limit=5000');
        
        if (featuresResponse.ok) {
          const featuresData = await featuresResponse.json();
          setGeoJsonData(featuresData);
        } else {
          console.warn('Failed to load features from database, trying static files...');
          // Fallback to static files if API fails
          const irigasiResponse = await fetch('/data_irigasi.json');
          if (irigasiResponse.ok) {
            const irigasiJson = await irigasiResponse.json();
            setGeoJsonData(irigasiJson);
          }
        }
        
        // Load layers information
        const layersResponse = await fetch('/api/layers');
        
        if (layersResponse.ok) {
          const layers = await layersResponse.json();
          setLayersData(layers);
        }
        
        // Load boundary data (keep static file for now)
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

  // Function to reload data (useful after upload)
  const reloadData = async () => {
    setLoading(true);
    try {
      const [featuresResponse, layersResponse] = await Promise.all([
        fetch('/api/features?limit=5000'),
        fetch('/api/layers')
      ]);
      
      if (featuresResponse.ok) {
        const featuresData = await featuresResponse.json();
        setGeoJsonData(featuresData);
      }
      
      if (layersResponse.ok) {
        const layers = await layersResponse.json();
        setLayersData(layers);
      }
    } catch (err) {
      console.error('Error reloading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { 
    geoJsonData, 
    boundaryData, 
    layersData,
    loading, 
    error, 
    reloadData 
  };
};
