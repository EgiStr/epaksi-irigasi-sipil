'use client'

import { useCallback } from 'react'

// Komponen InputField dipindahkan keluar untuk menghindari re-render
const InputField = ({ 
  label, 
  path, 
  type = 'text', 
  placeholder, 
  required = false,
  min,
  max,
  step,
  disabled = false,
  value,
  onChange,
  error
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value === null || value === undefined ? '' : value}
        onChange={(e) => {
          const newValue = type === 'number' ? 
            (e.target.value === '' ? null : parseFloat(e.target.value)) : 
            e.target.value
          onChange(path, newValue)
        }}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100' : ''}`}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

// Komponen TextAreaField dipindahkan keluar untuk menghindari re-render
const TextAreaField = ({ 
  label, 
  path, 
  placeholder, 
  required = false, 
  rows = 3,
  value,
  onChange,
  error
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        value={value === null || value === undefined ? '' : value}
        onChange={(e) => onChange(path, e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

export default function PAIFormFields({ 
  paiType, 
  formData, 
  onChange, 
  errors = {} 
}) {
  // Optimized handleInputChange dengan useCallback untuk mencegah re-render berlebihan
  const handleInputChange = useCallback((path, value) => {
    const newData = { ...formData }
    
    // Handle nested object updates
    const pathArray = path.split('.')
    let current = newData
    
    for (let i = 0; i < pathArray.length - 1; i++) {
      if (!current[pathArray[i]]) {
        current[pathArray[i]] = {}
      }
      current = current[pathArray[i]]
    }
    
    current[pathArray[pathArray.length - 1]] = value
    
    // Debug log untuk melihat perubahan data
    
    onChange(newData)
  }, [formData, onChange])

  const getNestedValue = useCallback((path, defaultValue = '') => {
    const pathArray = path.split('.')
    let current = formData
    
    for (const key of pathArray) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key]
      } else {
        return defaultValue
      }
    }
    
    return current ?? defaultValue
  }, [formData])

  const getErrorMessage = useCallback((path) => {
    const pathArray = path.split('.')
    let current = errors
    
    for (const key of pathArray) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key]
      } else {
        return null
      }
    }
    
    return current
  }, [errors])

  return (
    <div className="space-y-6">
      {/* Bagian Umum - Daerah Irigasi */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          📍 Daerah Irigasi
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="Nama Daerah Irigasi"
            path="di.name"
            placeholder="D.I. Way Rarem"
            required
            value={getNestedValue("di.name")}
            onChange={handleInputChange}
            error={getErrorMessage("di.name")}
          />
          <InputField
            label="Luas (Ha)"
            path="di.area_ha"
            type="number"
            placeholder="6389"
            min="0"
            step="0.01"
            value={getNestedValue("di.area_ha")}
            onChange={handleInputChange}
            error={getErrorMessage("di.area_ha")}
          />
        </div>
      </div>

      {/* Bagian Umum - Informasi Aset */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          🏗️ Informasi Aset
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="Jenis Aset"
            path="aset.jenis"
            placeholder={paiType === 'saluran' ? 'S01' : 'P99'}
            required
            value={getNestedValue("aset.jenis")}
            onChange={handleInputChange}
            error={getErrorMessage("aset.jenis")}
          />
          <InputField
            label="Nama Aset"
            path="aset.nama"
            placeholder={paiType === 'saluran' ? 'SPrimer Way Rarem' : 'US'}
            required
            value={getNestedValue("aset.nama")}
            onChange={handleInputChange}
            error={getErrorMessage("aset.nama")}
          />
          <div className="md:col-span-2">
            <InputField
              label="Nomenklatur"
              path="aset.nomenklatur"
              placeholder={paiType === 'saluran' ? 'RR 11-2' : 'N S 1 6 Ki'}
              value={getNestedValue("aset.nomenklatur")}
              onChange={handleInputChange}
              error={getErrorMessage("aset.nomenklatur")}
            />
          </div>
        </div>
      </div>

      {/* Kondisi berdasarkan tipe PAI */}
      {paiType === 'saluran' && (
        <>
          {/* Bangunan Hulu & Hilir */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              🏗️ Bangunan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Bangunan Hulu"
                path="bangunan.hulu"
                placeholder="Sadap (BR 11)"
                value={getNestedValue("bangunan.hulu")}
                onChange={handleInputChange}
                error={getErrorMessage("bangunan.hulu")}
              />
              <InputField
                label="Bangunan Hilir"
                path="bangunan.hilir"
                placeholder="Sadap (BR 11-2)"
                value={getNestedValue("bangunan.hilir")}
                onChange={handleInputChange}
                error={getErrorMessage("bangunan.hilir")}
              />
            </div>
          </div>

          {/* Subsistem */}
          <div className="border rounded-lg p-4 bg-green-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              🚰 Subsistem
            </h3>
            <InputField
              label="Subsistem"
              path="subsystem"
              placeholder="Saluran Primer Way Rarem (1)"
              value={getNestedValue("subsystem")}
              onChange={handleInputChange}
              error={getErrorMessage("subsystem")}
            />
          </div>

          {/* Hidraulik */}
          <div className="border rounded-lg p-4 bg-cyan-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              💧 Data Hidraulik
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Luas Areal Layanan (Ha)"
                path="hidraulik.luas_areal_ha"
                type="number"
                placeholder="6515.43"
                min="0"
                step="0.01"
                value={getNestedValue("hidraulik.luas_areal_ha")}
                onChange={handleInputChange}
                error={getErrorMessage("hidraulik.luas_areal_ha")}
              />
              <InputField
                label="Q Desain (m³/det)"
                path="hidraulik.q_desain_m3s"
                type="number"
                placeholder="0.00847"
                min="0"
                step="0.00001"
                value={getNestedValue("hidraulik.q_desain_m3s")}
                onChange={handleInputChange}
                error={getErrorMessage("hidraulik.q_desain_m3s")}
              />
              <InputField
                label="Panjang Saluran (m)"
                path="hidraulik.panjang_m"
                type="number"
                placeholder="1200.65"
                min="0"
                step="0.01"
                value={getNestedValue("hidraulik.panjang_m")}
                onChange={handleInputChange}
                error={getErrorMessage("hidraulik.panjang_m")}
              />
            </div>
          </div>

          {/* Pintu */}
          <div className="border rounded-lg p-4 bg-yellow-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              🚪 Data Pintu
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <InputField
                label="Jumlah"
                path="pintu.jumlah"
                type="number"
                placeholder="1"
                min="0"
                value={getNestedValue("pintu.jumlah")}
                onChange={handleInputChange}
                error={getErrorMessage("pintu.jumlah")}
              />
              <InputField
                label="Lebar (m)"
                path="pintu.lebar_m"
                type="number"
                placeholder="2.5"
                min="0"
                step="0.01"
                value={getNestedValue("pintu.lebar_m")}
                onChange={handleInputChange}
                error={getErrorMessage("pintu.lebar_m")}
              />
              <InputField
                label="Tinggi (m)"
                path="pintu.tinggi_m"
                type="number"
                placeholder="1.8"
                min="0"
                step="0.01"
                value={getNestedValue("pintu.tinggi_m")}
                onChange={handleInputChange}
                error={getErrorMessage("pintu.tinggi_m")}
              />
              <InputField
                label="Tenaga"
                path="pintu.tenaga"
                placeholder="Manual"
                value={getNestedValue("pintu.tenaga")}
                onChange={handleInputChange}
                error={getErrorMessage("pintu.tenaga")}
              />
              <InputField
                label="Bahan Pintu"
                path="pintu.bahan"
                placeholder="Besi"
                value={getNestedValue("pintu.bahan")}
                onChange={handleInputChange}
                error={getErrorMessage("pintu.bahan")}
              />
            </div>
          </div>

          {/* Tahun Dibangun */}
          <div className="border rounded-lg p-4 bg-purple-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              📅 Tahun Dibangun
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Tahun Dibangun"
                path="tahun_dibangun"
                type="number"
                placeholder="1980"
                min="1900"
                max="2024"
                value={getNestedValue("tahun_dibangun")}
                onChange={handleInputChange}
                error={getErrorMessage("tahun_dibangun")}
              />
            </div>
          </div>

          {/* Dimensi Desain */}
          <div className="border rounded-lg p-4 bg-orange-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              📐 Dimensi (Desain)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <InputField
                label="Li (m)"
                path="dimensi_desain.li_m"
                type="number"
                placeholder="0"
                min="0"
                step="0.01"
                value={getNestedValue("dimensi_desain.li_m")}
                onChange={handleInputChange}
                error={getErrorMessage("dimensi_desain.li_m")}
              />
              <InputField
                label="b (m)"
                path="dimensi_desain.b_m"
                type="number"
                placeholder="0"
                min="0"
                step="0.01"
                value={getNestedValue("dimensi_desain.b_m")}
                onChange={handleInputChange}
                error={getErrorMessage("dimensi_desain.b_m")}
              />
              <InputField
                label="La (m)"
                path="dimensi_desain.la_m"
                type="number"
                placeholder="0"
                min="0"
                step="0.01"
                value={getNestedValue("dimensi_desain.la_m")}
                onChange={handleInputChange}
                error={getErrorMessage("dimensi_desain.la_m")}
              />
              <InputField
                label="H (m)"
                path="dimensi_desain.h_m"
                type="number"
                placeholder="0"
                min="0"
                step="0.01"
                value={getNestedValue("dimensi_desain.h_m")}
                onChange={handleInputChange}
                error={getErrorMessage("dimensi_desain.h_m")}
              />
              <InputField
                label="Kemiringan"
                path="dimensi_desain.kemiringan"
                type="number"
                placeholder="0.001"
                min="0"
                step="0.0001"
                value={getNestedValue("dimensi_desain.kemiringan")}
                onChange={handleInputChange}
                error={getErrorMessage("dimensi_desain.kemiringan")}
              />
            </div>
          </div>

          {/* Dimensi Kenyataan */}
          <div className="border rounded-lg p-4 bg-red-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              📏 Dimensi (Kenyataan)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <InputField
                label="Li (m)"
                path="dimensi_nyata.li_m"
                type="number"
                placeholder="6"
                min="0"
                step="0.01"
                value={getNestedValue("dimensi_nyata.li_m")}
                onChange={handleInputChange}
                error={getErrorMessage("dimensi_nyata.li_m")}
              />
              <InputField
                label="b (m)"
                path="dimensi_nyata.b_m"
                type="number"
                placeholder="2.6"
                min="0"
                step="0.01"
                value={getNestedValue("dimensi_nyata.b_m")}
                onChange={handleInputChange}
                error={getErrorMessage("dimensi_nyata.b_m")}
              />
              <InputField
                label="La (m)"
                path="dimensi_nyata.la_m"
                type="number"
                placeholder="6"
                min="0"
                step="0.01"
                value={getNestedValue("dimensi_nyata.la_m")}
                onChange={handleInputChange}
                error={getErrorMessage("dimensi_nyata.la_m")}
              />
              <InputField
                label="H (m)"
                path="dimensi_nyata.h_m"
                type="number"
                placeholder="2.8"
                min="0"
                step="0.01"
                value={getNestedValue("dimensi_nyata.h_m")}
                onChange={handleInputChange}
                error={getErrorMessage("dimensi_nyata.h_m")}
              />
            </div>
          </div>
        </>
      )}

      {paiType === 'bangunan' && (
        <>
          {/* Nama Saluran untuk Bangunan */}
          <div className="border rounded-lg p-4 bg-purple-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              🚰 Nama Saluran
            </h3>
            <InputField
              label="Nama Saluran"
              path="saluran.nama"
              placeholder="STersier S 1 6 Ki"
              value={getNestedValue("saluran.nama")}
              onChange={handleInputChange}
              error={getErrorMessage("saluran.nama")}
            />
          </div>
        </>
      )}

      {/* Catatan - Umum untuk semua tipe */}
      <div className="border rounded-lg p-4 bg-gray-100">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          📝 Catatan
        </h3>
        <TextAreaField
          label="Catatan Tambahan"
          path="catatan"
          placeholder="Catatan kondisi, riwayat perbaikan, atau informasi penting lainnya"
          rows={3}
          value={getNestedValue("catatan")}
          onChange={handleInputChange}
          error={getErrorMessage("catatan")}
        />
      </div>
    </div>
  )
}