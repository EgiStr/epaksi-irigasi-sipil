import React from 'react';
import { AlertCircle } from 'lucide-react';

const DashboardError = ({ error, onRetry }) => {
  return (
    <div className="px-2 md:px-0">
      <div className="dashboard-header">
        <h2>Dashboard Overview</h2>
        <p>Terjadi masalah saat memuat data</p>
      </div>
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Gagal memuat data</h3>
          <p className="text-gray-600 mb-4">Error: {error}</p>
          <button 
            onClick={onRetry || (() => window.location.reload())} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            type="button"
          >
            Muat Ulang
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardError;
