import React, { useMemo } from 'react';
import { BarChart3, Map, Users, Droplets, TrendingUp, MapPin } from 'lucide-react';
import IrigasiMap from './IrigasiMap';
import { useIrigasiData } from '../hooks/useIrigasiData';

const Home = ({ onNavigate }) => {
  const { geoJsonData } = useIrigasiData();
  
  // Calculate real statistics from data_irigasi.json
  const statistics = useMemo(() => {
    if (!geoJsonData?.features) {
      return {
        totalDaerahIrigasi: 0,
        bangunanIrigasi: 0,
        jaringanIrigasi: 0,
        totalAsetIrigasi: 0,
        areaLayanan: 0,
        bendung: 0
      };
    }

    const features = geoJsonData.features;
    
    // Count features by source layer category
    const bangunanIrigasi = features.filter(f => 
      f.properties?.source_layer === 'Bangunan_Irigasi Way Rarem'
    ).length;
    
    const bendung = features.filter(f => 
      f.properties?.source_layer === 'Bendung Way Rarem'
    ).length;
    
    const bangunanLain = features.filter(f => 
      f.properties?.source_layer === 'Bangunan.kml'
    ).length;
    
    // Get irrigation network features with area coverage
    const jaringanFeatures = features.filter(f => 
      f.properties?.source_layer === 'Jaringan Irigasi Way Rarem'
    );
    
    // Calculate total area served (in hectares) from jaringan irigasi
    const totalAreaLayanan = jaringanFeatures.reduce((total, feature) => {
      const luasLayan = parseFloat(feature.properties?.luas_layan || 0);
      return total + luasLayan;
    }, 0);
    
    // Get unique irrigation areas (Daerah Irigasi)
    const uniqueDI = [...new Set(features.map(f => f.properties?.n_di))].filter(Boolean);

    return {
      totalDaerahIrigasi: uniqueDI.length,
      bangunanIrigasi: bangunanIrigasi,
      jaringanIrigasi: jaringanFeatures.length,
      totalAsetIrigasi: features.length,
      areaLayanan: Math.round(totalAreaLayanan), // Total hectares served
      bendung: bendung
    };
  }, [geoJsonData]);

  const stats = [
    {
      id: 1,
      title: 'Total Daerah Irigasi',
      value: '1',
      subtitle: 'Way Rarem',
      icon: MapPin,
      color: '#3b82f6',
      bgColor: '#dbeafe'
    },
    {
      id: 2,
      title: 'Bangunan Irigasi',
      value: statistics.bangunanIrigasi.toString(),
      subtitle: 'Unit',
      icon: Droplets,
      color: '#10b981',
      bgColor: '#d1fae5'
    },
    {
      id: 3,
      title: 'Jaringan Irigasi',
      value: statistics.jaringanIrigasi.toString(),
      subtitle: 'Segmen',
      icon: Map,
      color: '#f59e0b',
      bgColor: '#fef3c7'
    },
    {
      id: 4,
      title: 'Total Aset',
      value: statistics.totalAsetIrigasi.toString(),
      subtitle: 'Semua Fitur',
      icon: TrendingUp,
      color: '#ef4444',
      bgColor: '#fee2e2'
    }
  ];

  const recentActivities = [
    {
      id: 1,
      title: 'Update Data Bendung Way Rarem',
      time: '2 jam yang lalu',
      type: 'update'
    },
    {
      id: 2,
      title: 'Pemeliharaan Saluran Primer',
      time: '1 hari yang lalu',
      type: 'maintenance'
    },
    {
      id: 3,
      title: 'Inspeksi Bangunan Bagi',
      time: '3 hari yang lalu',
      type: 'inspection'
    }
  ];

  return (
    <div className="px-2 md:px-0">
      <div className="dashboard-header">
        <h2>Dashboard Overview</h2>
        <p>Ringkasan sistem irigasi Way Rarem</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {stats.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <div key={stat.id} className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: stat.bgColor }}>
                <IconComponent size={24} color={stat.color} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-title">{stat.title}</div>
                <div className="stat-subtitle">{stat.subtitle}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Map Preview - Full Width */}
      <div className="map-preview-full">
        <div className="content-card map-preview-card">
          <div className="card-header">
            <h3 className='text-sm md:text-xl'>🗺️ Peta Irigasi Way Rarem</h3>
            <button 
              className="view-full-btn"
              onClick={() => onNavigate && onNavigate('peta')}>
              Lihat Peta Lengkap
            </button>
          </div>
          <div className="map-preview-container">
            <div className="map-container-small">
              <IrigasiMap />
            </div>
            <div className="map-overlay">
              <div className="map-info">
                <Map size={24} color="#3b82f6" />
                <span>Klik "Lihat Peta Lengkap" untuk akses penuh</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Info */}
      <div className="quick-info">
        <div className="info-card">
          <h4>💡 Tips Penggunaan</h4>
          <ul>
            <li>Gunakan menu "Peta Irigasi" untuk visualisasi interaktif</li>
            <li>Akses "Tabel Daerah Irigasi" untuk data detail</li>
            <li>Klik pada fitur peta untuk informasi lengkap</li>
          </ul>
        </div>
        <div className="info-card">
          <h4>📊 Statistik Sistem</h4>
          <div className="system-stats">
            <div className="system-stat">
              <span className="stat-label">Status Sistem:</span>
              <span className="text-sm text-green-500 font-semibold">Online</span>
            </div>
            <div className="system-stat">
              <span className="stat-label">Boundary:</span>
              <span className="text-sm">Lampung Utara & Tulang Bawang Barat</span>
            </div>
            <div className="system-stat">
              <span className="stat-label">Daerah Irigasi:</span>
              <span className="text-sm">Way Rarem</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
