# PRD Sprint 2: Penambahan PAI (Profil Aset Irigasi)

## 📋 Latar Belakang & Tujuan

### 🎯 **Tujuan Sprint**
Menambahkan fitur **PAI (Profil Aset Irigasi)** sebagai pelengkap sistem survei yang sudah ada, tanpa mengganggu fungsionalitas **IKSI (Indeks Kondisi Sistem Irigasi)** yang sudah berjalan.

### 📊 **Kondisi Saat Ini**
- ✅ Sistem IKSI sudah berjalan dengan baik
- ✅ Database schema sudah stabil dengan model `Feature`, `Survey`, `User`
- ✅ API endpoints sudah terstruktur dengan baik
- ✅ UI Admin panel sudah lengkap

### 🎯 **Target Sprint**
- ➕ Menambahkan PAI sebagai fitur terpisah dari IKSI
- 📸 Dukungan upload foto untuk dokumentasi PAI
- 🗺️ Integrasi dengan peta dan data geospatial
- 📋 Form input PAI yang user-friendly
- 📊 Dashboard PAI terintegrasi dengan admin panel

---

## 🔍 Analisis Project Existing

### 🗄️ **Database Schema (Current State)**
```prisma
model Feature {
  id          String   @id @default(cuid())
  featureId   String   @unique
  name        String?
  type        String?
  scheme      String?  // 'utama' | 'tersier'
  sourceLayer String
  props       Json?
  geom        Unsupported("geometry(GEOMETRY,4326)")?
  surveys     Survey[]
  // 🔄 PAI akan ditambahkan sebagai relation terpisah
}

model Survey {
  id          String
  featureId   String
  scheme      String
  values      Json     // IKSI data
  scoreTotal  Float?
  scoreClass  String?  // 'A' | 'B' | 'C' | 'D'
  // ✅ Tetap untuk IKSI, tidak diubah
}
```

### 🛠️ **API Structure (Current State)**
```
/api/
├── surveys/          # ✅ IKSI surveys
├── features/         # ✅ Feature management
├── users/            # ✅ User management
├── upload/           # ✅ File upload
└── pai/              # 🔄 Akan ditambahkan
```

### 🎨 **UI Components (Current State)**
```
components/admin/
├── SurveyManagement.jsx    # ✅ IKSI management
├── FeatureManagement.jsx   # ✅ Feature CRUD
├── UserManagement.jsx      # ✅ User admin
└── PAI/                    # 🔄 Akan ditambahkan
```

---

## 🚀 Ruang Lingkup Sprint

### ✅ **In-Scope**
- [ ] **Model PAI** terpisah dari Survey
- [ ] **API CRUD PAI** (`/api/pai/`)
- [ ] **Form PAI Saluran** dengan field yang diperlukan
- [ ] **Form PAI Bangunan** dengan field yang diperlukan
- [ ] **Upload foto** dengan preview
- [ ] **Integrasi dengan Feature** (relation)
- [ ] **UI Admin PAI** terintegrasi
- [ ] **Validasi data** PAI
- [ ] **Geospatial support** untuk PAI

### ❌ **Out-of-Scope**
- [ ] Perubahan pada sistem IKSI yang sudah ada
- [ ] Migrasi data lama ke format PAI
- [ ] Laporan PDF khusus PAI
- [ ] Mobile app untuk PAI
- [ ] API integration dengan sistem eksternal

---

## 🗄️ Model Data & Migrasi

### 🆕 **Model PAI Baru**
```prisma
model PAI {
  id            String   @id @default(cuid())
  featureId     String   @map("feature_id")
  paiType       String   @map("pai_type") // 'saluran' | 'bangunan'
  paiData       Json     @map("pai_data") // Structured PAI data
  photos        Json?    // Array of photo objects
  geom          Unsupported("geometry(GEOMETRY,4326)")?
  lengthM       Float?   @map("length_m") // For saluran
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt
  createdBy     String   @map("created_by")

  feature       Feature  @relation(fields: [featureId], references: [featureId])
  user          User     @relation(fields: [createdBy], references: [id])

  @@map("pai")
  @@index([featureId])
  @@index([paiType])
}
```

### 🔗 **Update Model Feature**
```prisma
model Feature {
  // ... existing fields ...
  pai           PAI[]    // 🔄 Add PAI relation
}
```

### 📊 **Skema JSON paiData**

#### **PAI Saluran**
```json
{
  "di": {
    "name": "D.I. Way Rarem",
    "areaHa": 6389,
    "code": "RR"
  },
  "asset": {
    "type": "S01",
    "name": "Saluran Primer Way Rarem",
    "nomenclature": "RR 11-2"
  },
  "subsystem": "Saluran Primer Way Rarem (1)",
  "hydraulic": {
    "designFlowM3s": 0.00847,
    "lengthM": 1200.6445882303785
  },
  "gates": {
    "count": null,
    "widthM": null,
    "heightM": null,
    "power": null,
    "material": null
  },
  "constructionYear": 1980,
  "designDimensions": {
    "liM": null,
    "bM": null,
    "laM": null,
    "hM": null,
    "slope": null
  },
  "actualDimensions": {
    "liM": 6,
    "bM": 2.6,
    "laM": 6,
    "hM": 2.8
  },
  "notes": null
}
```

#### **PAI Bangunan**
```json
{
  "di": {
    "name": "D.I. Way Rarem",
    "areaHa": 6389,
    "code": "RR"
  },
  "asset": {
    "type": "P99",
    "name": "US",
    "nomenclature": "N S 1 6 Ki"
  },
  "channel": {
    "name": "Saluran Tersier S 1 6 Ki"
  },
  "notes": null
}
```

---

## 🔧 API Design

### 📡 **POST /api/pai** - Create PAI
```javascript
// Request Body
{
  "featureId": "RR_SP_WayRarem_11_2",
  "paiType": "saluran",
  "paiData": { /* sesuai skema di atas */ },
  "photos": [
    {
      "id": "ph_001",
      "url": "https://files.example/saluran-utama.jpg",
      "caption": "Tampak saluran primer",
      "file": "base64_or_file_object" // untuk upload
    }
  ],
  "geom": {
    "type": "LineString",
    "coordinates": [[104.98, -4.73], [104.99, -4.72]]
  }
}

// Response
{
  "id": "pai_123",
  "featureId": "RR_SP_WayRarem_11_2",
  "paiType": "saluran",
  "createdAt": "2025-09-19T12:00:00Z"
}
```

### 📡 **GET /api/pai** - List PAI dengan Filter
```javascript
// Query Parameters
?featureId=RR_SP_WayRarem_11_2
&paiType=saluran
&page=1
&limit=20

// Response
{
  "pai": [...],
  "pagination": {
    "page": 1,
    "totalPages": 5,
    "total": 100
  }
}
```

### 📡 **GET /api/pai/[id]** - Get PAI Detail
```javascript
// Response
{
  "id": "pai_123",
  "featureId": "RR_SP_WayRarem_11_2",
  "paiType": "saluran",
  "paiData": { /* ... */ },
  "photos": [...],
  "geom": { /* GeoJSON */ },
  "lengthM": 1200.64,
  "createdAt": "2025-09-19T12:00:00Z",
  "updatedAt": "2025-09-19T12:00:00Z",
  "feature": { /* Feature info */ },
  "createdBy": { /* User info */ }
}
```

### 📡 **PUT /api/pai/[id]** - Update PAI
```javascript
// Request Body (partial update)
{
  "paiData": {
    "notes": "Updated notes"
  },
  "photos": [
    // New photos array (replace existing)
  ]
}
```

### 📡 **DELETE /api/pai/[id]** - Delete PAI
```javascript
// Response
{
  "message": "PAI berhasil dihapus",
  "deletedId": "pai_123"
}
```

### 📡 **GET /api/features/[featureId]/pai** - PAI by Feature
```javascript
// Response
{
  "feature": { /* Feature info */ },
  "pai": [
    {
      "id": "pai_123",
      "paiType": "saluran",
      "paiData": { /* ... */ },
      "createdAt": "2025-09-19T12:00:00Z"
    }
  ]
}
```

---

## 🎨 UI/UX Design

### 📋 **Form PAI (Modal)**
```jsx
// Komponen utama
<PAIFormModal
  feature={selectedFeature}
  onSave={handleSavePAI}
  onClose={() => setIsPAIModalOpen(false)}
/>

// Struktur Form
- Selector Tipe PAI: [Saluran] [Bangunan]
- Field umum (DI, Asset info, Notes)
- Field spesifik berdasarkan tipe
- Upload foto dengan preview
- Map integration untuk geom input
- Save/Cancel buttons
```

### 📊 **PAI Management Table**
```jsx
// Kolom Table
- Feature Name
- PAI Type (Saluran/Bangunan)
- Asset Name
- Nomenclature
- Construction Year
- Length/Flow (untuk Saluran)
- Photos Count
- Created Date
- Actions (View, Edit, Delete)
```

### 🗺️ **Map Integration**
```jsx
// Popup pada peta
<PAIPopup
  feature={feature}
  pai={latestPAI}
  onViewDetail={() => openPAIDetail(pai.id)}
/>

// Menampilkan
- PAI Type badge
- Asset info summary
- Photo thumbnail jika ada
- "View Detail" button
```

### 📸 **Photo Upload Component**
```jsx
<PhotoUpload
  photos={photos}
  onChange={setPhotos}
  maxFiles={10}
  acceptedTypes={['image/jpeg', 'image/png']}
/>

// Features
- Drag & drop upload
- Preview grid
- Caption input per photo
- Delete photo
- Reorder photos
```

---

## 🔒 Security & Permissions

### 👥 **Role-Based Access**
```javascript
// Permissions untuk PAI
PERMISSIONS.PAI_VIEW      // Melihat data PAI
PERMISSIONS.PAI_CREATE    // Membuat PAI baru
PERMISSIONS.PAI_EDIT      // Edit PAI
PERMISSIONS.PAI_DELETE    // Hapus PAI

// Default role permissions
SUPERADMIN: all permissions
ADMIN: PAI_VIEW, PAI_CREATE, PAI_EDIT
SURVEYOR: PAI_VIEW, PAI_CREATE
VIEWER: PAI_VIEW only
```

### 🛡️ **Data Validation**
```javascript
// Server-side validation
- paiType: must be 'saluran' or 'bangunan'
- featureId: must exist in features table
- paiData: validate against JSON schema
- photos: validate file types and sizes
- geom: validate GeoJSON format
- lengthM: auto-calculate for saluran type
```

---

## 📁 File Structure

```
app/
├── api/
│   └── pai/
│       ├── route.js              # PAI CRUD API
│       └── [id]/
│           └── route.js          # PAI by ID API
├── admin/
│   └── pai/
│       └── page.js               # PAI management page

components/
├── admin/
│   └── pai/
│       ├── PAIFormModal.jsx      # Form untuk create/edit PAI
│       ├── PAITable.jsx          # Table untuk list PAI
│       ├── PAIDetailModal.jsx    # Modal detail PAI
│       └── PhotoUpload.jsx       # Komponen upload foto
├── maps/
│   └── PAIPopup.jsx              # Popup PAI di peta
└── forms/
    └── PAIFormFields.jsx         # Reusable PAI form fields

lib/
├── validations/
│   └── pai-schema.js             # Zod schema untuk PAI validation
└── pai/
    ├── utils.js                  # PAI utility functions
    └── calculations.js           # PAI calculations (length, etc.)
```

---

## 🧪 Testing & Validation

### ✅ **Acceptance Criteria**
- [ ] PAI dapat dibuat untuk feature yang ada
- [ ] Form validation bekerja dengan baik
- [ ] Upload foto maksimal 10 file per PAI
- [ ] PAI terpisah dari IKSI (tidak mengganggu existing)
- [ ] API response sesuai spesifikasi
- [ ] UI responsive dan user-friendly
- [ ] Permission system bekerja dengan benar

### 🧪 **Test Cases**
```javascript
// Unit Tests
- PAI model validation
- API endpoint responses
- Photo upload limits
- Permission checks

// Integration Tests
- Create PAI with photos
- Update PAI data
- Delete PAI with cascade
- Feature relation integrity

// E2E Tests
- Complete PAI creation workflow
- Photo upload and preview
- Form validation feedback
- Permission-based UI changes
```

---

## 🚀 Implementation Plan

### 📅 **Phase 1: Backend (Week 1)**
- [ ] Create PAI model migration
- [ ] Implement PAI CRUD API
- [ ] Add photo upload handling
- [ ] Create validation schemas
- [ ] Update permissions

### 📅 **Phase 2: Frontend (Week 2)**
- [ ] Create PAI form components
- [ ] Implement photo upload UI
- [ ] Add PAI management table
- [ ] Integrate with existing admin layout
- [ ] Add map integration

### 📅 **Phase 3: Integration & Testing (Week 3)**
- [ ] Connect frontend to backend APIs
- [ ] Test complete workflows
- [ ] Performance optimization
- [ ] Security testing
- [ ] Documentation update

---

## 🔧 Technical Considerations

### 📊 **Performance**
- **Photo Storage**: Base64 untuk dev, S3 untuk production
- **Pagination**: 20 items per page untuk PAI list
- **Indexing**: featureId, paiType, createdAt
- **Caching**: Redis untuk frequent queries (future)

### 🔄 **Data Migration**
```sql
-- Jika ada data PAI lama, migrate ke tabel baru
INSERT INTO pai (feature_id, pai_type, pai_data, created_at, created_by)
SELECT feature_id, 'saluran', pai_data, created_at, created_by
FROM surveys
WHERE survey_kind = 'PAI';
```

### 🔗 **Integration Points**
- **Feature Management**: Link PAI ke existing features
- **Map Display**: Show PAI data on map popups
- **Survey System**: PAI terpisah dari IKSI
- **User Management**: Role-based access control

---

## 📋 Risk & Mitigation

### ⚠️ **Risks**
1. **Schema Complexity**: Menambah model baru vs menambah kolom
2. **Photo Storage**: File management complexity
3. **Performance**: Large photo files impact
4. **Data Integrity**: Foreign key constraints

### 🛡️ **Mitigation**
1. **Separate Model**: Lebih clean dan scalable
2. **File Upload Service**: Dedicated handling
3. **Optimization**: Compression dan CDN
4. **Validation**: Strong constraints dan checks

---

## 📊 Success Metrics

### 🎯 **Functional Metrics**
- ✅ PAI creation success rate > 99%
- ✅ Photo upload success rate > 95%
- ✅ Form validation accuracy 100%
- ✅ API response time < 500ms

### 👥 **User Experience Metrics**
- ✅ Time to create PAI < 5 minutes
- ✅ Photo upload time < 30 seconds
- ✅ Form error rate < 5%
- ✅ User satisfaction score > 4/5

---

## 📚 Documentation Updates

### 📖 **README.md Updates**
- [ ] Add PAI section to features
- [ ] Update API documentation
- [ ] Add photo upload instructions
- [ ] Update database schema docs

### 📋 **User Guide**
- [ ] PAI creation tutorial
- [ ] Photo upload guide
- [ ] Form field explanations
- [ ] Troubleshooting guide

---

## 🎯 Next Steps

### 🚀 **Post-Sprint Activities**
1. **User Training**: Train users on PAI system
2. **Data Migration**: Migrate existing PAI data if any
3. **Monitoring**: Set up monitoring and alerts
4. **Feedback Collection**: Gather user feedback for improvements

### 🔮 **Future Enhancements**
1. **PAI Analytics**: Advanced reporting and analytics
2. **Mobile Support**: PAI data collection via mobile app
3. **Integration**: Connect with external systems
4. **AI Features**: Auto-extraction from photos

---

**📝 Last Updated**: September 19, 2025
**👥 Author**: Development Team
**📊 Sprint Duration**: 3 weeks
**👨‍💻 Tech Lead**: System Architect

1) Ruang Lingkup Sprint
In-scope

Skema data & migrasi untuk menampung PAI.

API CRUD PAI (terintegrasi dengan entitas survei/fitur).

UI form PAI Saluran & PAI Bangunan (berbasis field yang kamu berikan).

Upload & preview foto (minio/S3 atau base64 sementara di dev).

Validasi & normalisasi dasar (konversi SRID, panjang saluran dari geometri jika ada).

Tidak mengubah mesin skoring IKSI (tetap ada berdampingan).

Out-of-scope

Perhitungan skor IKSI baru.

Laporan PDF khusus PAI (boleh ditambah sprint berikutnya).

2) Model Data & Migrasi

Opsi sederhana dan kompatibel: tambahkan kolom PAI ke tabel surveys yang sudah ada, tanpa membuat tabel baru—sesuai permintaan kamu “menambahkan PAI column di Survey (sebelumnya hanya IKSI)”.

2.1. Perubahan surveys
-- Add columns for PAI (nullable, backward compatible)
ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS survey_kind TEXT DEFAULT 'IKSI';           -- 'IKSI' | 'PAI' | 'IKSI+PAI'
ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS pai_type TEXT CHECK (pai_type IN ('saluran','bangunan'));
ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS pai JSONB;                                  -- payload profil aset (schema di bawah)
ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS pai_photos JSONB;                           -- [{id, url, caption}], optional
ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS pai_geom geometry(GEOMETRY, 4326);          -- jika titik/bentangan PAI beda dari features.geom
ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS pai_length_m NUMERIC;                       -- panjang saluran hasil hitung
ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS pai_meta JSONB;                             -- metadata tambahan (versi form, sumber, dsb)

2.2. Skema JSON pai (disarankan)
{
  "di": { "name": "D.I. Way Rarem", "area_ha": 6389, "kode": "RR" },
  "aset": {
    "jenis": "S01",               // atau "P99" untuk bangunan
    "nama": "SPrimer Way Rarem",  // atau "US"
    "nomenklatur": "RR 11-2"      // atau "N S 1 6 Ki"
  },
  "subsystem": "Saluran Primer Way Rarem (1)",   // hanya saluran
  "saluran": { "nama": "STersier S 1 6 Ki" },   // hanya bangunan (opsional)
  "hidraulik": {
    "q_desain_m3s": 0.00847,
    "panjang_m": 1200.6445882303785
  },
  "pintu": {
    "jumlah": null,
    "lebar_m": null,
    "tinggi_m": null,
    "tenaga": null,
    "bahan": null
  },
  "tahun_dibangun": 1980,
  "dimensi_desain": { "Li_m": null, "b_m": null, "La_m": null, "H_m": null, "kemiringan": null },
  "dimensi_nyata":  { "Li_m": 6, "b_m": 2.6, "La_m": 6, "H_m": 2.8 },
  "catatan": null
}


Catatan

Untuk Bangunan, isi bagian yang relevan (mis. saluran.nama, titik lokasi).

Untuk Saluran, gunakan subsystem, hidraulik.panjang_m (boleh dihitung dari geojson).

Nilai null boleh dikosongkan jika belum ada.

3) API (Next.js API Routes)
3.1. Membuat/Update PAI

POST /api/surveys/pai — buat survei PAI baru pada suatu feature_id
PUT /api/surveys/pai/:id — ubah PAI yang ada

Body (contoh PAI Saluran) — menggunakan GeoJSON dari kamu

{
  "feature_id": "RR_SP_WayRarem_11_2",
  "survey_kind": "PAI",
  "pai_type": "saluran",
  "pai": {
    "di": { "name": "D.I. Way Rarem", "area_ha": 6389 },
    "aset": { "jenis": "S01", "nama": "SPrimer Way Rarem", "nomenklatur": "RR 11-2" },
    "subsystem": "Saluran Primer Way Rarem (1)",
    "hidraulik": { "q_desain_m3s": 0.00847, "panjang_m": 1200.6445882303785 },
    "pintu": { "jumlah": null, "lebar_m": null, "tinggi_m": null, "tenaga": null, "bahan": null },
    "tahun_dibangun": 1980,
    "dimensi_desain": { "Li_m": null, "b_m": null, "La_m": null, "H_m": null, "kemiringan": null },
    "dimensi_nyata": { "Li_m": 6, "b_m": 2.6, "La_m": 6, "H_m": 2.8 },
    "catatan": null
  },
  "pai_geom_geojson": {
    "type":"LineString",
    "crs":{"type":"name","properties":{"name":"EPSG:4269"}},
    "coordinates":[[104.980843,-4.729828,0],[104.981269,-4.729569,0],[104.981489,-4.729288,54.696472],[104.981607,-4.728957,63.591431],[104.981626,-4.728636,53.950439],[104.981242,-4.727099,48.741333],[104.981242,-4.726824,58.850342],[104.981395,-4.724816,55.257996],[104.981444,-4.724434,0],[104.981535,-4.724196,55.476624],[104.981658,-4.723961,58.806335],[104.981859,-4.723766,59.866455],[104.982095,-4.723603,59.866455],[104.982557,-4.723458,57.536743],[104.982946,-4.723343,54.131775],[104.984252,-4.722881,0],[104.985834,-4.722373,56.084961]]
  },
  "pai_photos": [
    { "id": "ph_001", "url": "https://files.example/saluran-utama.jpg", "caption": "Tampak saluran primer" }
  ]
}


Body (contoh PAI Bangunan) — menggunakan GeoJSON dari kamu

{
  "feature_id": "US_NS_1_6_Ki",
  "survey_kind": "PAI",
  "pai_type": "bangunan",
  "pai": {
    "di": { "name": "D.I. Way Rarem", "area_ha": 6389 },
    "aset": { "jenis": "P99", "nama": "US", "nomenklatur": "N S 1 6 Ki" },
    "saluran": { "nama": "STersier S 1 6 Ki" },
    "catatan": null
  },
  "pai_geom_geojson": {
    "type":"Point","coordinates":[105.005058,-4.741361,68.262421]
  },
  "pai_photos": []
}


Perilaku server:

Konversi SRID: jika crs ≠ EPSG:4326, konversi ke 4326 saat menyimpan (ST_Transform) — atau minimal terima EPSG:4269 dan anggap koordinatnya lon/lat (sesuai input), lalu set 4326.

Hitung panjang (jika pai_type='saluran' dan hidraulik.panjang_m kosong):

pai_length_m = ST_Length(ST_Transform(pai_geom, 3857)) (meter), simpan ke kolom.

Isi pai.hidraulik.panjang_m dari kolom itu bila kosong.

Isi surveys.survey_kind = 'PAI', simpan pai, pai_type, pai_geom, pai_photos.

Response:

{ "id": 123, "feature_id": "RR_SP_WayRarem_11_2", "pai_type": "saluran", "saved": true }

3.2. Membaca PAI per fitur

GET /api/surveys/pai?feature_id=...&latest=true

Respon (ringkas, terbaru):

{
  "id": 123,
  "feature_id": "RR_SP_WayRarem_11_2",
  "pai_type": "saluran",
  "pai": { /* ... */ },
  "pai_photos": [/* ... */],
  "pai_length_m": 1200.64,
  "created_at": "2025-09-19T12:00:00Z"
}

4) UI/UX
4.1. Form “Tambah PAI”

Selector “Tipe PAI”: Saluran / Bangunan (wajib).

Bagian umum:

Daerah Irigasi (nama, luas/ha — prefill dari feature jika tersedia).

Jenis Aset (kode), Nama, Nomenklatur.

Catatan (opsional).

Foto: upload (multi), preview, hapus.

Jika Saluran:

Subsistem (text).

Q desain (m³/det).

Panjang (m) — readonly jika “Hitung otomatis dari geometri”.

Pintu: jumlah, lebar (m), tinggi (m), tenaga, bahan.

Tahun dibangun, Dimensi (desain & kenyataan: Li, b, La, H, kemiringan).

Geometri: tampilkan LineString (editable opsional); tombol “Hitung Panjang”.

Jika Bangunan:

Nama saluran terkait (text).

Geometri: Point (editable).

Tombol Simpan PAI (membuat entri survei baru survey_kind='PAI').

4.2. Tabel PAI (per fitur)

Kolom: Tipe, Nama, Jenis, Nomenklatur, Tahun, Panjang/Q (kalau saluran), Tanggal input.

Ikon “📷” jika ada foto.

Aksi: Lihat, Edit.

4.3. Popup Peta

Jika ada PAI terbaru, tampilkan sekilas PAI (tipe + nama + tahun + tombol “Detail”).

Style peta tetap dari layer/kelas mutu yang ada (tidak berubah).

5) Validasi & Normalisasi

pai_type wajib ∈ {saluran,bangunan}.

di.area_ha number ≥ 0 (boleh kosong).

hidraulik.q_desain_m3s number ≥ 0 (boleh kosong).

panjang_m ≥ 0 (auto-fill jika dihitung).

Dimensi (m) ≥ 0 bila diisi.

CRS: terima GeoJSON tanpa crs/EPSG:4326; jika EPSG:4269, perlakukan sebagai lon/lat dan simpan SRID=4326.

6) Keamanan & Berkas

Role tetap Admin (single).

Foto:

Dev: boleh simpan base64 di pai_photos[*].data_uri (sementara).

Prod: unggah ke S3/MinIO; simpan url + caption di pai_photos.

7) Kinerja

surveys indeks: (feature_id), GIST di pai_geom.

Limit list PAI (default 100) + pagination.

Panjang dihitung server (PostGIS) agar konsisten.

8) Test & DoD

API POST/PUT menolak pai_type tak valid.

Saluran: jika pai_geom LineString sah → panjang dihitung & tersimpan.

Bangunan: pai_geom Point sah tersimpan.

Foto minimal 1 file bisa di-upload & tampil di Detail PAI.

GET /api/surveys/pai?feature_id=...&latest=true mengembalikan entri terbaru.

UI form PAI menyimpan data sesuai contoh payload di atas.

Tidak mengubah data IKSI yang sudah ada.

9) Checklist Implementasi
Backend

 Migrasi surveys (kolom PAI).

 Zod schema validasi body PAI.

 POST /api/surveys/pai (create) + PUT (update).

 Parsing CRS & ST_GeomFromGeoJSON → SRID 4326.
Saluran: pai_length_m = ST_Length(ST_Transform(pai_geom, 3857)).

 GET /api/surveys/pai (by feature, latest, paging).

 Upload foto (dev: data URI | prod: S3/MinIO).

Frontend

 Modal/Form “Tambah PAI” (toggle tipe).

 Field sesuai skema (Saluran vs Bangunan).

 Peta mini untuk pai_geom (draw/edit line/point).

 Tabel PAI per fitur + detail.

 Popup ringkas PAI terbaru.

10) Catatan Integrasi dengan Data Eksisting

features.feature_id yang kamu pakai di peta harus sama dengan survey.feature_id.

Jika PAI Bangunan menggunakan titik baru, simpan di surveys.pai_geom (Point) tanpa mengubah features.geom.

Bonus: SQL util untuk panjang saluran
-- hitung ulang panjang untuk survei PAI saluran yang punya pai_geom
UPDATE surveys
SET pai_length_m = ST_Length(ST_Transform(pai_geom, 3857))
WHERE survey_kind='PAI' AND pai_type='saluran' AND pai_geom IS NOT NULL;