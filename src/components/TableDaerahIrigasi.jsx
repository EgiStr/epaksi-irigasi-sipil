import React, { useState } from 'react';
import { Search, Filter, Download, Eye } from 'lucide-react';

const TableDaerahIrigasi = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Sample data - dalam implementasi nyata, ini akan datang dari API atau JSON
  const irigasiData = [
    {
      id: 1,
      nama: 'Bendung Way Rarem Utama',
      kategori: 'Bendung Way Rarem',
      lokasi: 'Way Rarem',
      koordinat: '[-4.7500, 105.0000]',
      status: 'Aktif',
      kapasitas: '50 m³/s',
      tahunBangun: '1985',
      kondisi: 'Baik'
    },
    {
      id: 2,
      nama: 'Saluran Primer Way Rarem',
      kategori: 'Jaringan Irigasi Way Rarem',
      lokasi: 'Way Rarem',
      koordinat: '[-4.7505, 105.0010]',
      status: 'Aktif',
      kapasitas: '30 m³/s',
      tahunBangun: '1986',
      kondisi: 'Baik'
    },
    {
      id: 3,
      nama: 'Bangunan Bagi Utama',
      kategori: 'Bangunan_Irigasi Way Rarem',
      lokasi: 'Way Rarem',
      koordinat: '[-4.7510, 105.0020]',
      status: 'Aktif',
      kapasitas: '25 m³/s',
      tahunBangun: '1987',
      kondisi: 'Sedang'
    },
    {
      id: 4,
      nama: 'Saluran Sekunder A',
      kategori: 'Jaringan Irigasi Way Rarem',
      lokasi: 'Way Rarem',
      koordinat: '[-4.7515, 105.0030]',
      status: 'Aktif',
      kapasitas: '15 m³/s',
      tahunBangun: '1988',
      kondisi: 'Baik'
    },
    {
      id: 5,
      nama: 'Pintu Air Sekunder',
      kategori: 'Bangunan.kml',
      lokasi: 'Way Rarem',
      koordinat: '[-4.7520, 105.0040]',
      status: 'Aktif',
      kapasitas: '20 m³/s',
      tahunBangun: '1989',
      kondisi: 'Baik'
    }
  ];

  const categories = [
    { value: 'all', label: 'Semua Kategori' },
    { value: 'Bendung Way Rarem', label: 'Bendung' },
    { value: 'Bangunan_Irigasi Way Rarem', label: 'Bangunan Irigasi' },
    { value: 'Jaringan Irigasi Way Rarem', label: 'Jaringan Irigasi' },
    { value: 'Bangunan.kml', label: 'Bangunan Lainnya' }
  ];

  const filteredData = irigasiData.filter(item => {
    const matchesSearch = item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.lokasi.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.kategori === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusBadge = (status) => {
    const statusClass = status === 'Aktif' ? 'status-active' : 'status-inactive';
    return <span className={`status-badge ${statusClass}`}>{status}</span>;
  };

  const getConditionBadge = (kondisi) => {
    const conditionClasses = {
      'Baik': 'condition-good',
      'Sedang': 'condition-fair',
      'Buruk': 'condition-poor'
    };
    return <span className={`condition-badge ${conditionClasses[kondisi]}`}>{kondisi}</span>;
  };

  return (
    <div className="table-container">
      <div className="table-header">
        <div className="header-title">
          <h2>Tabel Daerah Irigasi Way Rarem</h2>
          <p>Data lengkap infrastruktur irigasi</p>
        </div>
        
        <div className="header-actions">
          <button className="action-btn download-btn">
            <Download size={16} />
            Export Data
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-filter">
          <div className="search-box">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama atau lokasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="category-filter">
            <Filter size={16} className="filter-icon" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="filter-select"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="results-info">
          Menampilkan {filteredData.length} dari {irigasiData.length} data
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Infrastruktur</th>
              <th>Kategori</th>
              <th>Lokasi</th>
              <th>Koordinat</th>
              <th>Status</th>
              <th>Kapasitas</th>
              <th>Tahun Bangun</th>
              <th>Kondisi</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td className="name-cell">
                  <strong>{item.nama}</strong>
                </td>
                <td>
                  <span className="category-tag">
                    {item.kategori.replace('Way Rarem', 'WR')}
                  </span>
                </td>
                <td>{item.lokasi}</td>
                <td className="coord-cell">{item.koordinat}</td>
                <td>{getStatusBadge(item.status)}</td>
                <td>{item.kapasitas}</td>
                <td>{item.tahunBangun}</td>
                <td>{getConditionBadge(item.kondisi)}</td>
                <td>
                  <button className="action-btn view-btn" title="Lihat Detail">
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredData.length === 0 && (
        <div className="no-data">
          <p>Tidak ada data yang sesuai dengan filter yang dipilih.</p>
        </div>
      )}

      {/* Summary */}
      <div className="table-summary">
        <div className="summary-stats">
          <div className="summary-item">
            <span className="summary-label">Total Infrastruktur:</span>
            <span className="summary-value">{filteredData.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Status Aktif:</span>
            <span className="summary-value">
              {filteredData.filter(item => item.status === 'Aktif').length}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Kondisi Baik:</span>
            <span className="summary-value">
              {filteredData.filter(item => item.kondisi === 'Baik').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableDaerahIrigasi;
