import React from 'react';
import { hasPermission, PERMISSIONS } from '../lib/permissions';

const SystemInfo = React.memo(({ session }) => {
  return (
    <div className="quick-info">
      <div className="info-card">
        <h4>💡 Tips Penggunaan</h4>
        <ul>
          <li>Gunakan menu "Peta Irigasi" untuk visualisasi interaktif</li>
          <li>Akses "Tabel Daerah Irigasi" untuk data detail</li>
          <li>Klik pada fitur peta untuk informasi lengkap</li>
          {hasPermission(session?.user?.role, PERMISSIONS.USER_VIEW) && (
            <li>Kelola pengguna melalui menu "Manajemen Pengguna"</li>
          )}
          {hasPermission(session?.user?.role, PERMISSIONS.SURVEY_CREATE) && (
            <li>Buat survey baru dengan klik pada fitur di peta</li>
          )}
        </ul>
      </div>      
    </div>
  );
});

SystemInfo.displayName = 'SystemInfo';

export default SystemInfo;
