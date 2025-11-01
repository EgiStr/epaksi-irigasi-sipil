# 📋 Dokumentasi Form Kuesioner Penilaian

## 🎯 Overview

Form Kuesioner adalah fitur baru untuk penilaian kondisi infrastruktur irigasi dengan sistem scoring berbeda dari Survey IKSI. Form ini menggunakan input numerik (1-100) untuk semua field dan memiliki 3 varian berdasarkan tipe saluran:

- **Primer** - Untuk saluran primer (S01, S21)
- **Sekunder** - Untuk saluran sekunder (S02, S21) 
- **Tersier** - Untuk saluran tersier (S15)

## 📂 Struktur File yang Dibuat

### 1. Database Schema
**File**: `prisma/schema.prisma`

Model baru `Kuesioner`:
```prisma
model Kuesioner {
  id          String   @id @default(cuid())
  featureId   String   @map("feature_id")
  scheme      String   // 'primer' | 'sekunder' | 'tersier'
  tahun       Int      @default(2025)
  values      Json     @map("values")
  scoreTotal  Float?   @map("score_total")
  scoreClass  String?  @map("score_class") // 'BAIK' | 'SEDANG' | 'JELEK'
  scoreDetail Json?    @map("score_detail")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String   @map("created_by")
  
  feature     Feature  @relation(...)
  user        User     @relation(...)
  
  @@unique([featureId, scheme, tahun])
}
```

### 2. Konfigurasi Form
**Files**:
- `config/kuesioner-primer.json`
- `config/kuesioner-sekunder.json`
- `config/kuesioner-tersier.json`

Struktur hierarki 3 level:
```
Category (e.g., S01 - SALURAN PRIMER, weight: 10%)
  └─ Sub Category (e.g., S01_01 - Kapasitas Saluran, weight: 5%)
      └─ Field (e.g., S01_01_01 - Profil saluran, weight: 50%, input: 1-100)
```

**Grading System**:
- BAIK: 70-100
- SEDANG: 40-69.99
- JELEK: 0-39.99

### 3. API Routes

#### **GET/POST/PUT/DELETE** `/api/kuesioner`
**File**: `app/api/kuesioner/route.js`

**GET** - Fetch kuesioner data
```javascript
// Query params
GET /api/kuesioner?featureId=xxx&scheme=primer&tahun=2025

// Response
{
  "kuesioner": [
    {
      "id": "...",
      "featureId": "...",
      "scheme": "primer",
      "tahun": 2025,
      "values": { "S01_01_01": "85", ... },
      "scoreTotal": 84.75,
      "scoreClass": "BAIK",
      "scoreDetail": { ... },
      "feature": { ... },
      "user": { ... }
    }
  ]
}
```

**POST** - Create/Update kuesioner
```javascript
POST /api/kuesioner
Body: {
  "featureId": "xxx",
  "scheme": "primer",
  "tahun": 2025,
  "values": {
    "S01_01_01": "85",
    "S01_01_02": "85",
    "S01_01_03": "85",
    ...
  }
}

// Response
{
  "message": "Kuesioner berhasil disimpan",
  "kuesioner": { ... }
}
```

**PUT** - Update existing kuesioner
```javascript
PUT /api/kuesioner
Body: {
  "id": "xxx",
  "values": { ... }
}
```

**DELETE** - Delete kuesioner
```javascript
DELETE /api/kuesioner?id=xxx
```

#### **POST** `/api/kuesioner/calculate-score`
**File**: `app/api/kuesioner/calculate-score/route.js`

Menghitung skor tertimbang berdasarkan hierarki:
```javascript
POST /api/kuesioner/calculate-score
Body: {
  "scheme": "primer",
  "values": {
    "S01_01_01": "85",
    "S01_01_02": "85",
    ...
  }
}

// Response
{
  "score": 84.75,
  "qualityClass": "BAIK",
  "categoryScores": {
    "S01": {
      "label": "SALURAN PRIMER",
      "score": 85.0,
      "weight": 10,
      "weightedScore": 8.5,
      "subs": { ... }
    },
    ...
  },
  "grading": { ... }
}
```

**Algoritma Perhitungan**:
1. **Field Score** = (input_value * field_weight) / 100
2. **Sub Score** = Sum of all field scores
3. **Category Score** = (sub_score * sub_weight) / 100
4. **Total Score** = Sum of all weighted category scores

### 4. UI Component

#### **KuesionerModal**
**File**: `components/KuesionerModal.jsx`

**Features**:
- ✅ Accordion hierarki 3 level (Category > Sub > Fields)
- ✅ Real-time score calculation (debounced 500ms)
- ✅ Auto-detect scheme dari sourceLayer feature
- ✅ Support edit existing kuesioner
- ✅ Validasi required fields
- ✅ Score panel dengan breakdown per kategori
- ✅ Responsive design

**Props**:
```javascript
<KuesionerModal
  isOpen={boolean}
  onClose={() => void}
  featureData={object}
  onSubmit={(result) => void}
/>
```

### 5. Integrasi Halaman Detail

**File**: `app/features/[featureId]/page.js`

**Changes**:
- Import `KuesionerModal` dan icon `ClipboardList`
- State baru: `kuesionerList`, `allKuesioner`, `showKuesionerModal`, `selectedKuesionerYear`, `availableKuesionerYears`
- Fetch kuesioner data di `fetchFeatureDetail()`
- Filter kuesioner by year dengan useEffect
- Helper function `getKuesionerScoreColor()`
- Section baru "Data Kuesioner Penilaian" setelah PAI section
- Modal component di akhir layout

**Features di Halaman Detail**:
- ✅ Tombol "Isi Kuesioner" untuk buka modal
- ✅ Filter tahun untuk kuesioner
- ✅ Tampilan list kuesioner dengan badge scheme & tahun
- ✅ Detail inputan penilaian dengan color coding (hijau/kuning/merah)
- ✅ Breakdown skor per kategori
- ✅ Empty state dengan CTA "Isi Kuesioner Sekarang"

## 🚀 Setup & Migration

### 1. Generate Prisma Client
```powershell
cd "d:\projek sipil\web\web_new\epaksi-irigasi-sipil"
npx prisma generate
```

### 2. Push Schema ke Database
```powershell
npx prisma db push
```

**Troubleshooting jika gagal**:
```powershell
# Coba restart dev server dan ulangi
npm run dev

# Atau gunakan migration
npx prisma migrate dev --name add_kuesioner_model
```

### 3. Restart Dev Server
```powershell
npm run dev
```

## 📝 Cara Penggunaan

### Untuk User (Surveyor)

1. **Buka Detail Feature**
   - Navigate ke halaman peta
   - Klik feature di peta atau dari tabel
   - Akan terbuka halaman `/features/[featureId]`

2. **Isi Kuesioner**
   - Scroll ke section "Data Kuesioner Penilaian"
   - Klik tombol **"Isi Kuesioner"** (warna ungu)
   - Modal akan terbuka

3. **Pilih Scheme** (Auto-detect)
   - Scheme otomatis terdeteksi dari sourceLayer feature
   - Primer: untuk saluran primer
   - Sekunder: untuk saluran sekunder
   - Tersier: untuk saluran tersier

4. **Isi Form**
   - Expand kategori dengan klik header
   - Expand sub-kategori untuk lihat field
   - Input nilai **1-100** untuk setiap field
   - Skor akan dihitung otomatis real-time
   - Lihat hasil di panel kanan

5. **Submit**
   - Pastikan semua field required (bertanda *) terisi
   - Klik **"Simpan"** atau **"Perbarui"** (jika edit)
   - Akan ada konfirmasi sukses
   - Data otomatis reload

6. **Filter by Tahun**
   - Gunakan dropdown tahun di header section
   - Pilih tahun spesifik atau "Semua Tahun"

### Untuk Developer

#### Tambah Field Baru
Edit file config yang sesuai:
```json
{
  "key": "S01_01_04",
  "label": "4. Field baru",
  "weight": 10,
  "type": "numerik",
  "min": 1,
  "max": 100,
  "description": "Deskripsi field",
  "required": true
}
```

#### Custom Validation
Edit `components/KuesionerModal.jsx`:
```javascript
const validateForm = () => {
  const newErrors = {};
  // Add custom validation logic
  return { isValid: ..., errors: newErrors };
};
```

#### Export Data Kuesioner
```javascript
// Fetch all kuesioner
const response = await fetch('/api/kuesioner');
const data = await response.json();

// Filter by feature
const response = await fetch(`/api/kuesioner?featureId=${featureId}`);

// Filter by scheme & tahun
const response = await fetch(`/api/kuesioner?scheme=primer&tahun=2025`);
```

## 🎨 UI/UX Details

### Color Scheme
- **Primary**: Purple (#9333ea) - Main actions
- **Primer**: Blue (#2563eb)
- **Sekunder**: Green (#16a34a)
- **Tersier**: Yellow (#ca8a04)

### Score Colors
- **BAIK** (70-100): Green
- **SEDANG** (40-69.99): Yellow
- **JELEK** (0-39.99): Red

### Responsive Breakpoints
- Mobile: Full width accordion
- Tablet: Split view (form + score panel)
- Desktop: Optimized layout with side-by-side

## 🔒 Permissions

**Required Permissions**:
- **Create**: `SURVEY_CREATE` (SURVEYOR+)
- **Edit**: `SURVEY_EDIT` (SURVEYOR+)
- **Delete**: `SURVEY_DELETE` (ADMIN+)
- **View**: All authenticated users

## 📊 Audit Trail

Semua operasi tercatat di `AuditLog`:
- `KUESIONER_CREATE`
- `KUESIONER_UPDATE`
- `KUESIONER_DELETE`

Data yang dicatat:
- User ID & info
- Action type
- Old/new values
- IP address & user agent
- Timestamp

## 🐛 Known Issues & Limitations

1. **Database Migration**
   - Jika `npx prisma db push` gagal dengan error "prepared statement already exists"
   - Solusi: Restart PostgreSQL pooler atau gunakan direct connection

2. **Scheme Detection**
   - Auto-detection bergantung pada `sourceLayer` feature
   - Jika tidak terdeteksi, default ke "primer"

3. **Concurrent Edit**
   - Belum ada lock mechanism
   - Last save wins

## 📈 Future Enhancements

- [ ] Bulk import kuesioner dari Excel
- [ ] Export kuesioner ke PDF/Excel
- [ ] Comparison view (compare multiple years)
- [ ] Photo upload per field
- [ ] Comments/notes per field
- [ ] Approval workflow
- [ ] Mobile app support

## 🆘 Support

Jika ada masalah:
1. Check browser console untuk error
2. Check server logs (`npm run dev` output)
3. Verify database connection
4. Check API response di Network tab

---

**Created**: November 1, 2025
**Version**: 1.0.0
**Status**: ✅ Ready for Production
