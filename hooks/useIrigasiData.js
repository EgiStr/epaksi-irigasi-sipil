import { useState, useEffect } from 'react';

export const useIrigasiData = () => {
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [boundaryData, setBoundaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load data irigasi
        const irigasiResponse = await fetch('/data_irigasi.json');
        if (irigasiResponse.ok) {
          const irigasiJson = await irigasiResponse.json();
          setGeoJsonData(irigasiJson);
        } else {
          throw new Error('Failed to load irrigation data');
        }
        
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

  return { geoJsonData, boundaryData, loading, error };
};
