# 📅 Fitur Tahun Penilaian PAI & IKSI

## 🎯 Gambaran Umum

Fitur **Tahun Penilaian** memungkinkan sistem untuk menyimpan multiple penilaian (PAI dan IKSI) untuk infrastruktur yang sama di tahun yang berbeda, dengan logika:

- **Tahun Sama** → **UPDATE** data penilaian existing
- **Tahun Berbeda** → **INSERT** data penilaian baru

Ini memungkinkan tracking historis kondisi infrastruktur dari tahun ke tahun.

---

## 🗄️ Database Schema Changes

### Model `Survey` (IKSI)

```prisma
model Survey {
  id          String   @id @default(cuid())
  featureId   String   @map("feature_id")
  scheme      String   // 'utama' | 'tersier'
  tahun       Int      @default(2025)  // ✨ NEW FIELD
  values      Json     @map("values")
  scoreTotal  Float?   @map("score_total")
  scoreClass  String?  @map("score_class")
  // ... other fields
  
  @@unique([featureId, scheme, tahun])  // ✨ UNIQUE CONSTRAINT
  @@index([tahun])  // ✨ INDEX
}
```

**Unique Constraint**: `(featureId, scheme, tahun)` memastikan 1 survey per feature+scheme+tahun

### Model `PAI`

```prisma
model PAI {
  id          String   @id @default(cuid())
  featureId   String   @map("feature_id")
  paiType     String   @map("pai_type")  // 'saluran' | 'bangunan'
  tahun       Int      @default(2025)  // ✨ NEW FIELD
  paiData     Json     @map("pai_data")
  // ... other fields
  
  @@unique([featureId, tahun])  // ✨ UNIQUE CONSTRAINT
  @@index([tahun])  // ✨ INDEX
}
```

**Unique Constraint**: `(featureId, tahun)` memastikan 1 PAI per feature per tahun

---

## 🔧 Logika Bisnis

### Alur Create/Update Survey (IKSI)

```javascript
// API: POST /api/surveys
{
  featureId: "abc123",
  scheme: "utama",
  tahun: 2025,  // ← Optional, default = current year
  values: { ... }
}

// Database Check
const existingSurvey = await prisma.survey.findUnique({
  where: { 
    featureId_scheme_tahun: {
      featureId: "abc123",
      scheme: "utama",
      tahun: 2025
    }
  }
})

if (existingSurvey) {
  // ✅ UPDATE - Same year
  await prisma.survey.update({
    where: { id: existingSurvey.id },
    data: { values, scoreTotal, ... }
  })
} else {
  // ✨ INSERT - Different year or first time
  await prisma.survey.create({
    data: { featureId, scheme, tahun, values, ... }
  })
}
```

### Alur Create/Update PAI

```javascript
// API: POST /api/pai
{
  featureId: "abc123",
  paiType: "saluran",
  tahun: 2025,  // ← Optional, default = current year
  paiData: { ... }
}

// Database Check
const existingPAI = await prisma.pAI.findUnique({
  where: { 
    featureId_tahun: {
      featureId: "abc123",
      tahun: 2025
    }
  }
})

if (existingPAI) {
  // ✅ UPDATE - Same year
  await prisma.pAI.update({
    where: { id: existingPAI.id },
    data: { paiData, ... }
  })
} else {
  // ✨ INSERT - Different year or first time
  await prisma.pAI.create({
    data: { featureId, paiType, tahun, paiData, ... }
  })
}
```

---

## 📊 Contoh Skenario

### Skenario 1: Penilaian Pertama Kali (2025)

```javascript
// User melakukan survey di tahun 2025
POST /api/surveys
{
  featureId: "feature_001",
  scheme: "utama",
  tahun: 2025,  // atau null (default current year)
  values: { kondisi: "baik", ... }
}

// Result:
{
  survey: {
    id: "survey_abc",
    tahun: 2025,
    isUpdate: false,
    message: "Survey tahun 2025 berhasil dibuat"
  }
}
```

### Skenario 2: Update Penilaian di Tahun yang Sama (2025)

```javascript
// User edit survey di tahun 2025 yang sama
POST /api/surveys
{
  featureId: "feature_001",
  scheme: "utama",
  tahun: 2025,  // Sama dengan data existing
  values: { kondisi: "cukup baik", ... }  // Update nilai
}

// Result:
{
  survey: {
    id: "survey_abc",  // ← ID SAMA (update)
    tahun: 2025,
    isUpdate: true,
    message: "Survey tahun 2025 berhasil diperbarui"
  }
}
```

### Skenario 3: Penilaian di Tahun Baru (2026)

```javascript
// User melakukan survey di tahun 2026 (tahun depan)
POST /api/surveys
{
  featureId: "feature_001",
  scheme: "utama",
  tahun: 2026,  // Berbeda dari existing (2025)
  values: { kondisi: "rusak ringan", ... }
}

// Result:
{
  survey: {
    id: "survey_xyz",  // ← ID BARU (insert)
    tahun: 2026,
    isUpdate: false,
    message: "Survey tahun 2026 berhasil dibuat"
  }
}

// Database sekarang punya 2 record:
// - survey_abc (tahun 2025) - data lama tetap ada
// - survey_xyz (tahun 2026) - data baru
```

---

## 🛠️ API Changes

### POST `/api/surveys`

**Request Body** (NEW):
```javascript
{
  featureId: string,      // required
  scheme: "utama"|"tersier",  // required
  tahun: number,          // ✨ NEW - optional, default current year
  values: object,         // required
  configId: number        // optional
}
```

**Response** (UPDATED):
```javascript
{
  survey: {
    id: string,
    featureId: string,
    scheme: string,
    tahun: number,        // ✨ NEW
    scoreTotal: number,
    scoreClass: string,
    isUpdate: boolean,    // ✨ NEW - true if updated, false if created
    message: string       // ✨ NEW - "Survey tahun XXXX berhasil dibuat/diperbarui"
  },
  scoring: { ... },
  validation: { ... }
}
```

### POST `/api/pai`

**Request Body** (NEW):
```javascript
{
  featureId: string,      // required
  paiType: "saluran"|"bangunan",  // required
  tahun: number,          // ✨ NEW - optional, default current year
  paiData: object         // required
}
```

**Response** (UPDATED):
```javascript
{
  message: string,        // "PAI tahun XXXX berhasil dibuat/diperbarui"
  pai: {
    id: string,
    featureId: string,
    paiType: string,
    tahun: number,        // ✨ NEW
    paiData: object
  },
  isUpdate: boolean       // ✨ NEW - true if updated, false if created
}
```

---

## 📚 Helper Functions

### `lib/tahun-utils.js`

```javascript
import { 
  getCurrentYear,           // → 2025
  isSameYear,               // → true/false
  getYearFromDate,          // Date → year number
  validateTahun,            // Check if year in range 2000-2100
  determinePenilaianAction, // → {action: 'update'|'create', reason: '...'}
  formatTahunDisplay,       // → "Tahun 2025"
  getYearsDropdownOptions,  // → [{value: 2024, label: "2024"}, ...]
  getTahunPeriod,           // → 'past'|'present'|'future'
  getTahunBadgeColor        // → {bg: 'bg-green-100', text: '...', label: '...'}
} from '@/lib/tahun-utils'
```

**Usage Example**:
```javascript
// Check if should update or create
const { action, reason } = determinePenilaianAction(2025, 2026)
// action: 'create'
// reason: 'Tahun berbeda (2025 → 2026), akan membuat penilaian baru'

// Get years for dropdown
const yearsOptions = getYearsDropdownOptions()
// [
//   {value: 2020, label: "2020"},
//   {value: 2021, label: "2021"},
//   ...
//   {value: 2025, label: "2025 (Tahun Ini)", isDefault: true},
//   {value: 2026, label: "2026 (Tahun Depan)"}
// ]
```

---

## 🎨 UI Components

### Tahun Dropdown Input

```jsx
import { getYearsDropdownOptions } from '@/lib/tahun-utils'

function SurveyForm() {
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const yearsOptions = getYearsDropdownOptions()
  
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Tahun Penilaian
      </label>
      <select
        value={tahun}
        onChange={(e) => setTahun(parseInt(e.target.value))}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        {yearsOptions.map(year => (
          <option key={year.value} value={year.value}>
            {year.label}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500 mt-1">
        Pilih tahun yang sama untuk memperbarui data, atau tahun berbeda untuk membuat penilaian baru
      </p>
    </div>
  )
}
```

### Tahun Badge Display

```jsx
import { getTahunBadgeColor } from '@/lib/tahun-utils'

function TahunBadge({ tahun }) {
  const { bg, text, label } = getTahunBadgeColor(tahun)
  
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${bg} ${text}`}>
      📅 {tahun} {label && `(${label})`}
    </span>
  )
}

// Usage:
<TahunBadge tahun={2025} />  // → 📅 2025 (Tahun Ini) [green]
<TahunBadge tahun={2024} />  // → 📅 2024 (Tahun Lalu) [gray]
<TahunBadge tahun={2026} />  // → 📅 2026 (Tahun Depan) [blue]
```

---

## 🗂️ Migration Steps

### 1. Update Schema
```bash
# Edit prisma/schema.prisma (already done)
npm run db:generate
```

### 2. Run SQL Migration
```bash
# Execute migration SQL
psql -U your_user -d your_database -f prisma/migrations/add_tahun_to_surveys_and_pai.sql
```

**Or use Prisma Migrate**:
```bash
# Create migration
npx prisma migrate dev --name add_tahun_to_surveys_and_pai

# Apply to production
npx prisma migrate deploy
```

### 3. Verify Migration
```sql
-- Check surveys table
SELECT COUNT(*), tahun FROM surveys GROUP BY tahun ORDER BY tahun;

-- Check pai table
SELECT COUNT(*), tahun FROM pai GROUP BY tahun ORDER BY tahun;

-- Check unique constraints
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'surveys'::regclass;
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'pai'::regclass;
```

---

## 🧪 Testing Checklist

### API Testing

#### Survey API
- [ ] POST `/api/surveys` dengan `tahun` = current year → UPDATE existing
- [ ] POST `/api/surveys` dengan `tahun` = different year → INSERT new
- [ ] POST `/api/surveys` tanpa `tahun` → Default ke current year
- [ ] POST `/api/surveys` dengan `tahun` invalid (< 2000) → Error 400
- [ ] GET `/api/surveys?tahun=2025` → Filter by year
- [ ] Unique constraint error saat duplicate `(featureId, scheme, tahun)`

#### PAI API
- [ ] POST `/api/pai` dengan `tahun` = current year → UPDATE existing
- [ ] POST `/api/pai` dengan `tahun` = different year → INSERT new
- [ ] POST `/api/pai` tanpa `tahun` → Default ke current year
- [ ] POST `/api/pai` dengan `tahun` invalid (< 2000) → Error 400
- [ ] GET `/api/pai?tahun=2025` → Filter by year
- [ ] Unique constraint error saat duplicate `(featureId, tahun)`

### UI Testing
- [ ] Dropdown tahun menampilkan last 5 years + current + next
- [ ] Default selection = current year
- [ ] Badge tahun menampilkan warna yang benar (past/present/future)
- [ ] Form validation: tahun wajib diisi atau default
- [ ] Success message menunjukkan "dibuat" atau "diperbarui"

### Edge Cases
- [ ] Survey tahun 2025 sudah ada → edit lagi di 2025 → UPDATE
- [ ] Survey tahun 2025 sudah ada → buat di 2026 → INSERT (2 records)
- [ ] PAI tahun 2024 sudah ada → buat di 2025 → INSERT
- [ ] Multiple users edit same feature same year → Last write wins
- [ ] Timezone handling: Server time vs client time

---

## 📖 User Guide

### Cara Membuat Penilaian Baru

1. **Buka form penilaian** (Survey IKSI atau PAI)
2. **Pilih tahun** dari dropdown:
   - **Tahun ini** (hijau): Akan memperbarui penilaian tahun ini jika sudah ada
   - **Tahun lalu** (abu-abu): Membuat/update penilaian tahun lalu
   - **Tahun depan** (biru): Membuat penilaian untuk tahun depan
3. **Isi data penilaian** seperti biasa
4. **Submit**: Sistem akan otomatis:
   - **UPDATE** jika sudah ada penilaian di tahun yang dipilih
   - **INSERT** jika belum ada penilaian di tahun yang dipilih

### Cara Melihat Historis Penilaian

```javascript
// Feature Detail Page - List all surveys by year
<div className="mt-6">
  <h4 className="font-semibold mb-3">Historis Penilaian IKSI</h4>
  {surveys.map(survey => (
    <div key={survey.id} className="border p-4 rounded-lg mb-3">
      <div className="flex justify-between items-start">
        <div>
          <TahunBadge tahun={survey.tahun} />
          <p className="text-sm text-gray-600 mt-1">
            Skor: {survey.scoreTotal} - Kelas {survey.scoreClass}
          </p>
        </div>
        <button>Lihat Detail</button>
      </div>
    </div>
  ))}
</div>
```

---

## 🔮 Future Enhancements

### Phase 2
- [ ] **Comparison View**: Bandingkan penilaian 2 tahun berbeda
- [ ] **Trend Chart**: Grafik perubahan skor dari tahun ke tahun
- [ ] **Bulk Year Update**: Update multiple records ke tahun baru sekaligus
- [ ] **Year Filter** di admin dashboard
- [ ] **Export by Year**: Download data per tahun

### Phase 3
- [ ] **Forecast Model**: Prediksi kondisi infrastruktur tahun depan
- [ ] **Year-over-Year Report**: Laporan perbandingan tahunan
- [ ] **Archive Old Years**: Arsipkan data lebih dari 5 tahun
- [ ] **Fiscal Year Support**: Support tahun anggaran (bukan kalender)

---

## 🐛 Troubleshooting

### Error: "Duplicate key value violates unique constraint"

**Cause**: Mencoba insert tahun yang sudah ada untuk feature yang sama

**Solution**: 
```javascript
// Check existing data first
const existing = await prisma.survey.findUnique({
  where: { 
    featureId_scheme_tahun: { featureId, scheme, tahun }
  }
})

if (existing) {
  // Do UPDATE instead of INSERT
}
```

### Issue: Data tahun lama hilang setelah update

**Cause**: Update tanpa cek tahun, overwrite data lama

**Solution**: Pastikan API selalu cek unique constraint `(featureId, scheme, tahun)` sebelum update

### Issue: Tahun default tidak sesuai

**Cause**: Timezone server berbeda dengan client

**Solution**: Selalu gunakan `getCurrentYear()` helper untuk consistency

---

## 📞 Support

Untuk pertanyaan terkait fitur tahun penilaian:
- **Developer**: Tim SINTARA Way Rarem
- **Files**:
  - Database: `prisma/schema.prisma`
  - API: `app/api/surveys/route.js`, `app/api/pai/route.js`
  - Utils: `lib/tahun-utils.js`
  - Validation: `lib/validations/pai-schema.js`
  - Migration: `prisma/migrations/add_tahun_to_surveys_and_pai.sql`

---

**Last Updated**: 2025-01-20  
**Version**: 1.0.0  
**Status**: ✅ Ready for Implementation
