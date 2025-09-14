'use client'

import React, { useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Map, 
  Droplets, 
  TrendingUp, 
  MapPin
} from 'lucide-react';
import { useIrigasiData } from '../hooks/useIrigasiData';
import DashboardLoading from './DashboardLoading';
import DashboardError from './DashboardError';
import StatsCard from './StatsCard';
import AdminQuickActions from './AdminQuickActions';
import SystemInfo from './SystemInfo';

// Dynamic import untuk optimasi Next.js
const IrigasiMap = dynamic(() => import('./IrigasiMap'), {
  ssr: false,
  loading: () => <DashboardLoading />
});

const Home = ({ onNavigate }) => {
  const { data: session } = useSession();
  const router = useRouter();
  const { geoJsonData, loading, error } = useIrigasiData();

  // Optimized navigation handler using useCallback
  const handleNavigation = useCallback((page) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      // Fallback menggunakan Next.js router
      if (page === 'users') {
        router.push('/users');
      } else {
        router.push(`/?page=${page}`);
      }
    }
  }, [onNavigate, router]);

  // Loading state
  if (loading) {
    return <DashboardLoading />;
  }

  // Error state
  if (error) {
    return <DashboardError error={error} />;
  }

  return (
    <div className="px-2 md:px-0">
      <div className="dashboard-header">
        <h2>Dashboard Overview</h2>
      </div>

      {/* Map Preview - Full Width */}
      <div className="map-preview-full">
        <div className="content-card map-preview-card">
          <div className="card-header">
            <h3 className='text-sm md:text-xl'>🗺️ Peta Irigasi</h3>
            <button 
              className="view-full-btn"
              onClick={() => handleNavigation('peta')}
              type="button"
            >
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

      {/* Admin Quick Actions & System Info */}
      <AdminQuickActions session={session} onNavigate={handleNavigation} />
      <SystemInfo session={session} />
    </div>
  );
};

// Memoized export untuk mencegah re-render yang tidak perlu
export default React.memo(Home);
