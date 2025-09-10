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
  const { geoJsonData, boundaryData, loading, error } = useIrigasiData();

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

  return <LeafletMap geoJsonData={geoJsonData} boundaryData={boundaryData} />;
};

export default IrigasiMap;