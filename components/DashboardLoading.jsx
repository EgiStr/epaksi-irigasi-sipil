import React from 'react';
import { Loader2 } from 'lucide-react';

const DashboardLoading = () => {
  return (
    <div className="px-2 md:px-0">
      <div className="dashboard-header">
        <h2>Dashboard Overview</h2>
        <p>Memuat data sistem irigasi Way Rarem...</p>
      </div>
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-lg">Memuat dashboard...</span>
        </div>
      </div>
      
      {/* Skeleton Stats Cards */}
      <div className="stats-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-card animate-pulse">
            <div className="stat-icon bg-gray-200">
              <div className="w-6 h-6 bg-gray-300 rounded"></div>
            </div>
            <div className="stat-content">
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardLoading;
