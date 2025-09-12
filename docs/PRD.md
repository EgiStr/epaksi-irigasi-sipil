# PRODUCT REQUIREMENT DOCUMENT (PRD)
## Sistem Penilaian Kinerja Irigasi (Dashboard + Input Survei Lapangan)

### 1) Ringkasan Eksekutif
* **Tujuan:** Aplikasi web untuk mendata jaringan/aset irigasi dan menghitung **skor kondisi** otomatis berbasis pembobotan penelitian (dua skema: **Irigasi Utama** & **Irigasi Tersier**).
* **MVP (V0):** Dashboard peta (layer dari **KML**). Klik fitur saluran/bangunan → isi variabel survei → sistem menghitung skor berbobot → tampilkan **kategori mutu** (Baik/Sedang/Kurang/Buruk) pada peta & tabel.
* **Pengguna:** Surveyor lapangan, operator UPTD, admin dinas, manajemen.
* **Output:** Peta interaktif bersimbol mutu, rekap skor & **ekspor CSV/PDF**, konfigurasi bobot & ambang **dinamis** (tanpa re-deploy).

### 2) Ruang Lingkup & Prioritas
**V0 (Prioritas)**
1. Impor & render **KML** (contoh awal: *D.I WAY RAREM.kml*).
2. Kontrol layer: on/off, transparansi, legenda.
3. Klik fitur → panel detail.
4. **Form survei kontekstual** (Utama/Tersier) + validasi.
5. **Mesin skoring** berbobot (konfigurable via JSON).
6. **Klasifikasi mutu** (ambang A/B/C/D konfigurable).
7. Simpan hasil survei (riwayat per fitur + audit ringan).
8. Tabel rekap + **ekspor CSV**.
9. **Styling peta** menurut mutu.
10. Peran dasar: **Surveyor**, **Admin**, **Viewer** (RBAC).

**V1 (Peningkatan)**
* Upload KML/GeoJSON mandiri → **PostGIS**.
* **Offline-first (PWA)** + sinkronisasi.
* **Lampiran** (foto bukti).
* Laporan **PDF** (per D.I./desa/periode).
* **Tren waktu** & analitik.
* **AI Copilot** (opsional): validasi isian, ringkas temuan, cegah inkonsistensi.

---

### 3) Arsitektur Sistem
```
[Frontend: Next.js (React) + Leaflet/MapLibre]
│ ▲
▼ │
[Next.js API Routes (Node)] ── SQL (parameterized) ──> [PostgreSQL + PostGIS]
▲ ▲
│ │
Upload KML (UI) ETL: KML→GeoJSON→PostGIS
+ import status (ogr2ogr + Node importer)
```
* **Frontend:** Next.js (App Router), React, Leaflet/MapLibre GL.
* **Backend:** Next.js **API Routes** (Node.js) + auth JWT, RBAC.
* **DB:** PostgreSQL 15 + **PostGIS** 3.x (SRID 4326).
* **ETL:** `ogr2ogr` + Node importer (parsing `Description` HTML → **props JSON**).
* **File store (V1):** MinIO/S3 untuk upload besar & lampiran.

---

### 4) Alur Kerja (User Flow)
1. **Admin** unggah KML → sistem konversi → tulis ke PostGIS → layer otomatis muncul.
2. **Surveyor** buka peta → klik fitur → sistem pilih skema (**Utama/Tersier**) → tampil **form variabel**.
3. Isi variabel → **skor realtime** + **kelas mutu** tampil & **warna fitur** berubah.
4. **Simpan** → entry survei tercatat (timestamp, user, featureId).
5. **Dashboard**: peta mutu + rekap tabel + filter (periode, desa, tipe, kategori).
6. Ekspor **CSV** (V0), **PDF** (V1).

---

### 5) Model Skoring (Inti)
**Prinsip:** **Weighted Sum Model (WSM)**. Semua bobot & ambang di **Config JSON** (editable Admin).

**5.1. Bobot Top-Level**
* **Utama:** `prasarana_fisik:45`, `produktivitas_tanam:15`, `sarana_penunjang:10`, `organisasi_personalia:10`, `dokumentasi:5`, `p3a_gp3a_ip3a:10`
* **Tersier:** `prasarana_fisik_tersier:25`, `produktivitas_tanam:15`, `kondisi_op_tersier:20`, `org_personalia_petugas_op:15`, `dokumentasi:5`, `p3a:20`
> Sub-kriteria & bobot detail mengikuti dokumen penelitian; semua **disimpan di JSON**.

**5.2. Tipe Input & Normalisasi (→ 0..1)**
* `boolean`: `1/0`
* `ordinal(k)`: `(val-1)/(k-1)`
* `persentase`: `p/100`
* `numerik[min,max]`: `(x-min)/(max-min)` dibatasi 0..1

**5.3. Rumus**
* Sub: `score_sub = val_norm * weight_sub`
* Kategori: `score_cat = (Σ score_sub / Σ weight_sub) * weight_cat`
* Total: `score_total = Σ score_cat`
* Kelas: ambang **A/B/C/D** (konfigurable, contoh A≥85; B 70–84.99; C 55–69.99; D<55)

**5.4. Contoh Config (Admin-editable)**
```json
{
    "version": "v1",
    "scheme": "utama",
    "grading": { "A": [85,100], "B": [70,84.99], "C": [55,69.99], "D": [0,54.99] },
    "categories": [
        {
            "key": "prasarana_fisik", "label": "Prasarana Fisik", "weight": 45,
            "subs": [
                {"key":"bangunan_utama","label":"Bangunan Utama","weight":13,"type":"ordinal","k":5},
                {"key":"saluran_pembawa","label":"Saluran Pembawa","weight":10,"type":"ordinal","k":5},
                {"key":"bangunan_pada_saluran_pembawa","label":"Bangunan pada Saluran Pembawa","weight":9,"type":"ordinal","k":5},
                {"key":"saluran_pembuang_dan_bangunannya","label":"Saluran Pembuang & Bangunannya","weight":4,"type":"ordinal","k":5},
                {"key":"jalan_masuk_inspeksi","label":"Jalan Masuk/Inspeksi","weight":4,"type":"boolean"},
                {"key":"kantor_perumahan_gudang","label":"Kantor/Perumahan/Gudang","weight":5,"type":"boolean"}
            ]
        },
        {
            "key":"produktivitas_tanam","label":"Produktivitas Tanam","weight":15,
            "subs":[
                {"key":"pemenuhan_kebutuhan_air","label":"Pemenuhan kebutuhan air","weight":8,"type":"ordinal","k":5},
                {"key":"realisasi_luas_tanam","label":"Realisasi luas tanam","weight":4,"type":"persentase"},
                {"key":"produktivitas_padi","label":"Produktivitas padi","weight":3,"type":"nilai_numerik","min":3,"max":8}
            ]
        }
        // ... kategori lain mengikuti riset
    ]
}
```
> Angka sub-bobot di atas **placeholder**; Admin mengisi final dari dokumen resmi.

---

### 6) Data Model & Relasi
**Entitas**
* **Feature**: `feature_id`, `name`, `type`, `scheme`, `source_layer`, `props(JSONB)`, `geom(geometry,4326)`, `created_at`
* **Survey**: `survey_id`, `feature_id`, `scheme`, `values(JSONB)`, `score_total`, `score_class`, `score_detail(JSONB)`, `config_id`, `created_at`, `created_by`, `attachments?`
* **Config**: `config_id`, `scheme`, `json(JSONB)`, `active`
* **User**: `user_id`, `role(admin/surveyor/viewer)`, `org`

**Relasi**
* `Feature 1—N Survey`
* `Config 1—N Survey` (via `config_id` yang dipakai saat kalkulasi)

---

### 7) Antarmuka & UX (MVP)
* **Peta utama**: Kontrol layer, legenda mutu; klik fitur → **Drawer kanan**: metadata, **Form Survei** (dinamis), skor real-time, **Simpan**.
* **Tabel rekap**: Kolom {Feature, Skor, Kategori, Tanggal, Surveyor}; filter {periode, skema, kategori, desa}.
* **Admin → Konfigurasi Skor**: Editor JSON + validasi skema; tombol **Set Active**.
* Notifikasi validasi input (range, wajib isi, dll).

---

### 8) Spesifikasi Teknis (Detail)
**Frontend**
* Next.js (App Router), React, Leaflet/MapLibre.
* Upload KML (V1): Komponen drag-drop → kirim ke `/api/upload`.

**Backend**
* Next.js API Routes; TypeScript; Zod untuk validasi body.
* Auth JWT, RBAC middleware.
* Log terstruktur (requestId, user, featureId).

**Database**
* PostgreSQL + **PostGIS**; indeks **GIST** pada `geom`, **GIN** pada `props`.
* SRID 4326 (WGS84).

**ETL**
* `ogr2ogr` KML→GeoJSON→PostGIS.
* Node script: parsing `Description` (HTML) → `props JSON`, buat `feature_id` stabil (hash jika perlu), **UPSERT** ke `features`.

**DevOps**
* Docker Compose: `web(nextjs)`, `db(postgres)`, `postgis`, (opsional) `minio`.
* GitHub Actions: lint, test, build, deploy.

---

### 9) API Kontrak (Ringkas & Tegas)
**Features**
* `GET /api/features?source_layer=&bbox=minx,miny,maxx,maxy&scheme=` → **FeatureCollection GeoJSON** (limit default 5000)
* `GET /api/features/[feature_id]` → Feature tunggal
* `GET /api/layers` → daftar `source_layer` + jumlah fitur

**Surveys**
* `POST /api/surveys` Body: `{ feature_id, scheme, config_id?, values:{} }` Server: ambil **config aktif** (atau `config_id`), hitung skor, tulis Survey, kembalikan `{score_total, score_class, detail}`
* `GET /api/surveys?feature_id=&start=&end=` → daftar survei + ringkas

**Configs**
* `GET /api/configs/active?scheme=utama|tersier`
* `PUT /api/configs/:id` (Admin) → update JSON + validasi
* `POST /api/configs/activate` → set aktif

**Upload (V1)**
* `POST /api/upload` (Admin) → terima **KML/GeoJSON**, jalankan pipeline ETL, kembalikan ringkasan (jumlah fitur, layer, durasi).

---

### 10) ETL Pipeline (End-to-End)
**10.1. DDL PostGIS**
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE IF NOT EXISTS features (
    id BIGSERIAL PRIMARY KEY,
    feature_id TEXT UNIQUE,
    name TEXT,
    scheme TEXT, -- 'utama' | 'tersier' | null (boleh kosong saat impor)
    source_layer TEXT,
    props JSONB,
    geom geometry(GEOMETRY, 4326),
    created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_features_geom ON features USING gist (geom);
CREATE INDEX IF NOT EXISTS idx_features_layer ON features (source_layer);
CREATE INDEX IF NOT EXISTS idx_features_props ON features USING gin (props jsonb_path_ops);
CREATE TABLE IF NOT EXISTS surveys (
    id BIGSERIAL PRIMARY KEY,
    feature_id TEXT REFERENCES features(feature_id) ON DELETE CASCADE,
    scheme TEXT NOT NULL,
    values JSONB NOT NULL,
    score_total NUMERIC,
    score_class TEXT,
    score_detail JSONB,
    config_id INT,
    created_at TIMESTAMP DEFAULT now(),
    created_by TEXT
);
CREATE TABLE IF NOT EXISTS configs (
    id SERIAL PRIMARY KEY,
    scheme TEXT NOT NULL,
    json JSONB NOT NULL,
    active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now()
);
```

**10.2. Konversi & Impor**
```bash
# KML → GeoJSON
ogr2ogr -f GeoJSON /tmp/irigasi.geojson "/path/to/file.kml"
# Node importer (ringkas, idempotent UPSERT)
# - baca /tmp/irigasi.geojson
# - parse properties.Description (HTML table) → props JSON
# - tentukan name, source_layer, feature_id (hash jika tidak ada)
# - INSERT ... ON CONFLICT (feature_id) DO UPDATE ...
# - geom via ST_GeomFromGeoJSON, SRID 4326
```

**10.3. Upload API (V1)**
* `POST /api/upload`:
    1. Simpan file;
    2. Jika KML → `ogr2ogr` ke GeoJSON;
    3. Panggil importer;
    4. Kembalikan `{inserted, updated, layers, errors}`.

---

### 11) Perhitungan di Server (Pseudo-code)
```ts
function normalize(v, spec) { /* boolean | ordinal(k) | percent | numeric[min,max] */ }
function classify(total, grading) { /* return A/B/C/D */ }
function calcScore(values, config) {
    let total = 0, detail = {};
    for (const cat of config.categories) {
        let sumSub = 0, sumW = 0;
        for (const sub of cat.subs) {
            const val = normalize(values[sub.key], sub);
            sumSub += (val ?? 0) * sub.weight;
            sumW += sub.weight;
        }
        const score_cat = (sumW ? (sumSub / sumW) : 0) * cat.weight;
        detail[cat.key] = score_cat;
        total += score_cat;
    }
    const cls = classify(total, config.grading);
    return { total, cls, detail };
}
```

---

### 12) Keamanan & Privasi
* JWT + RBAC per peran (Admin/Surveyor/Viewer).
* Validasi & sanitasi payload (Zod).
* Audit ringan (`created_by`, IP, waktu).
* Backup DB harian; rate limit pada endpoint upload.

---

### 13) Kinerja & Skalabilitas
* Indeks GIST/GIN aktif; query bbox < 300–500 ms @50k fitur.
* Pagination & limit default (5000).
* Simplifikasi geometri untuk tampilan (pre-simplify/topojson bila padat).

---

### 14) Pengujian (Definition of Done)
* **Unit test**: Normalisasi & `calcScore` (semua tipe variabel).
* **E2E**: Klik fitur → isi form → skor cocok dengan kalkulator referensi.
* **Visual**: Warna kelas pada peta sesuai klasifikasi.
* **Data**: Unggah KML → minimal 1.000 fitur tersimpan; 10+ survei; ekspor CSV valid.
* **API**: `GET /features?bbox=...` mengembalikan FeatureCollection valid; `GET /layers` menampilkan ringkasan benar.

---

### 15) Risiko & Mitigasi
* **Perubahan indikator penelitian** → bobot/ambang via Config JSON (tanpa re-deploy).
* **Kualitas KML buruk** → pra-proses (repair/snap), fallback ke edit manual.
* **Koneksi lapangan** → PWA offline (V1).

---

### 16) Timeline (Indikatif)
* **M1:** Skema DB + mesin skoring + render KML.
* **M2:** Form survei dinamis + simpan & rekap + styling mutu.
* **M3:** Admin konfigurasi + ekspor CSV + pengujian.
* **M4:** UAT satu D.I. + dokumentasi + hardening.

---

### Lampiran A — Draft Variabel (Kerangka)
**Utama**
* *Prasarana Fisik (45):* `bangunan_utama(13, ord)`, `saluran_pembawa(10, ord)`, `bangunan_pada_saluran_pembawa(9, ord)`, `saluran_pembuang(4, ord)`, `jalan_inspeksi(4, bool)`, `kantor_perumahan_gudang(5, bool)`
* *Produktivitas Tanam (15):* `pemenuhan_kebutuhan_air(8, ord)`, `realisasi_luas_tanam(4, %)`, `produktivitas_padi(3, num[min,max])`
* *Sarana Penunjang (10):* `peralatan_op(4)`, `transportasi(2)`, `alat_kantor(2)`, `alat_komunikasi(2)`
* *Organisasi & Personalia (10)* (2 sub; isi dari riset)
* *Dokumentasi (5):* `buku_data_DI(2, bool)`, `peta_gambar(3, bool)`
* *P3A/GP3A/IP3A (10):* (7 sub; bobot dari riset)

**Tersier**
* *Prasarana Fisik Tersier (25)* (4 sub)
* *Produktivitas Tanam (15)* (3 sub)
* *Kondisi OP JI. Tersier (20)* (4 sub)
* *Org Personalia Petugas OP (15)* (3 sub)
* *Dokumentasi (5)* (2–3 sub)
* *P3A (20)* (8 sub)
> **Tindakan Admin awal:** Lengkapi bobot sub & tipe input → **aktifkan Config v1**.

---

### Lampiran B — Prosedur Impor KML
**V0:** Upload KML → FE parse (togeojson) → kirim GeoJSON → simpan Feature + GeoJSON ke DB.

**V1 (server):**
```bash
ogr2ogr -f "PostgreSQL" \
PG:"host=localhost dbname=irigasi user=postgres password=***" \
"D.I WAY RAREM.kml" \
-nln features -nlt PROMOTE_TO_MULTI \
-lco GEOMETRY_NAME=geom -progress
```

---

### Lampiran C — Warna Kelas Mutu (Default)
* **A (Baik)**: hijau • **B (Sedang)**: kuning • **C (Kurang)**: oranye • **D (Buruk)**: merah
(Admin bisa ubah palet.)

---


## 5) Sprint Planning & Timeline

### Sprint 1: Database Migration & Upload System 
**Objective:** Migrate from static files to PostgreSQL + PostGIS with KML/GeoJSON upload capability migrate from using json/geojson files to a robust PostgreSQL + PostGIS database system. Implement a file upload system for KML/GeoJSON files with progress tracking and error handling.  
**Status:** In Progress

1. **Database Setup & Schema**
   -  PostgreSQL + PostGIS configuration
   -  Prisma schema with geospatial fields
   -  Migration scripts and seed data
   -  Database connection and optimization

2. **KML Processing & Upload API**
   -  KML parser utility (HTML description parsing)
   -  File upload endpoint with validation
   -  UPSERT operations for data import
   -  Progress tracking and error handling

3. **Database-Driven Features API**
   -  GeoJSON features endpoint with filtering
   -  Layer management and statistics
   -  PostGIS spatial queries and bbox filtering
   -  Standardized layer categories implementation

4. **Frontend Integration**
   -  Drag-drop file upload component
   -  Real-time data reloading after upload
   -  Layer management UI with categories
   -  Enhanced map component with database integration

5. **Data Management & UI**
   -  Updated hooks for database integration
   -  Modal system for upload functionality
   -  Error handling and user feedback
   -  Responsive design and accessibility

**Key Deliverables:**
- KML/GeoJSON upload to database
- Layer categorization (Batas Wilayah, Bangunan_Irigasi WR, etc.)
- Real-time map rendering from database
- Progress tracking and error handling
- Production-ready upload system

### Sprint 2: Scoring Engine & Survey System 🔄 NEXT
**Status:** Ready to Start  
**Duration:** 3-4 weeks  
**Objective:** Implement survey forms, scoring calculations, and result visualization

**Planned Tasks:**
1. **Survey Configuration System**
   - Create survey configuration schema (Utama/Tersier schemes)
   - Implement dynamic form generation from config
   - Add weight and threshold management
   - Create configuration API endpoints

2. **Scoring Engine Development**
   - Implement scoring calculation logic
   - Add normalization functions
   - Create quality classification system (A/B/C/D)
   - Unit tests for scoring scenarios

3. **Survey UI & Forms**
   - Build contextual survey forms (Utama vs Tersier)
   - Implement real-time score calculation
   - Add form validation and error handling
   - Create survey history and audit trail

4. **Map Integration & Visualization**
   - Update map styling based on quality scores
   - Implement color-coded features
   - Add legend and filtering by quality
   - Create interactive feature details

5. **Data Export & Reporting**
   - Implement CSV export functionality
   - Add survey summary tables
   - Create basic PDF report generation
   - Add data filtering and search

**Acceptance Criteria:**
- Complete survey workflow (click → form → score → save)
- Dynamic scoring with configurable weights
- Quality-based map styling and legends
- CSV export with survey data
- Form validation and error handling

### Sprint 3: Advanced Features & Optimization 🔄 FUTURE
**Status:** Planned  
**Duration:** 2-3 weeks  
**Objective:** Add advanced features and performance optimizations

**Planned Tasks:**
1. **User Management & RBAC**
   - Implement user authentication (JWT)
   - Add role-based access control
   - Create user management interface
   - Add audit logging

2. **Offline Support & PWA**
   - Implement service workers
   - Add offline data caching
   - Create sync mechanism
   - PWA configuration

3. **File Attachments & Media**
   - Photo upload for survey evidence
   - File storage integration (MinIO/S3)
   - Media gallery in survey details
   - File compression and optimization

4. **Analytics & Reporting**
   - Trend analysis over time
   - Advanced PDF reports
   - Dashboard analytics
   - Data visualization enhancements

5. **Performance & Monitoring**
   - Database query optimization
   - Frontend performance monitoring
   - Error tracking and logging
   - Load testing and optimization

### Sprint 4: AI Copilot & Final Polish 🔄 FUTURE
**Status:** Planned  
**Duration:** 2 weeks  
**Objective:** Add AI assistance and final system polish

**Planned Tasks:**
1. **AI Copilot Integration**
   - Survey validation assistance
   - Automated issue detection
   - Smart suggestions for improvements
   - Natural language processing

2. **System Testing & QA**
   - End-to-end testing
   - User acceptance testing
   - Performance benchmarking
   - Security audit

3. **Documentation & Training**
   - User manuals and guides
   - API documentation
   - Training materials
   - Deployment guides

4. **Production Deployment**
   - Docker containerization
   - CI/CD pipeline setup
   - Monitoring and alerting
   - Backup and recovery procedures

---

## 6) Technical Implementation Notes

### Database Schema Highlights
```sql
-- Features table with PostGIS geometry
CREATE TABLE features (
  id SERIAL PRIMARY KEY,
  feature_id VARCHAR(255) UNIQUE NOT NULL,
  geometry GEOMETRY(GEOMETRY, 4326),
  properties JSONB,
  source_layer VARCHAR(100),
  scheme VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Spatial indexes for performance
CREATE INDEX idx_features_geometry ON features USING GIST (geometry);
CREATE INDEX idx_features_source_layer ON features (source_layer);
CREATE INDEX idx_features_scheme ON features (scheme);
```

### API Endpoints Summary
- `POST /api/upload` - File upload with processing
- `GET /api/features` - GeoJSON features with filtering
- `GET /api/layers` - Layer statistics and metadata
- `POST /api/surveys` - Survey submission with scoring
- `GET /api/configs` - Survey configuration management

### Key Technologies
- **Frontend:** Next.js 15, React 19, Leaflet, Tailwind CSS
- **Backend:** Next.js API Routes, Node.js
- **Database:** PostgreSQL 15 + PostGIS 3.x
- **ORM:** Prisma with geospatial support
- **Processing:** Custom KML parser, ogr2ogr integration

### Performance Considerations
- Spatial indexing for fast queries
- Lazy loading for large datasets
- Caching strategies for configuration
- Optimized GeoJSON responses
- Background processing for uploads

---

## 7) Risk Mitigation & Contingency

### Technical Risks
1. **PostGIS Complexity:** Mitigated by using Prisma ORM and tested spatial queries
2. **Large File Uploads:** Handled with streaming and progress tracking
3. **Browser Performance:** Implemented virtualization for large datasets
4. **Data Consistency:** UPSERT operations ensure data integrity

### Business Risks
1. **Data Quality:** Validation at upload and survey levels
2. **User Adoption:** Intuitive UI with comprehensive documentation
3. **Scalability:** Modular architecture supports future growth
4. **Maintenance:** Clean code with automated testing

### Contingency Plans
- **Database Issues:** Local SQLite fallback for development
- **Upload Failures:** Retry mechanism with error recovery
- **Performance Problems:** Query optimization and caching layers
- **Data Loss:** Regular backups and transaction logging

---

*Document Version: 2.0*  
*Last Updated: [Current Date]*  
*Next Review: After Sprint 2 completion*