# 📅 Filter Tahun - Halaman Detail Infrastruktur

## 📋 Deskripsi
Fitur filter tahun pada halaman **Detail Infrastruktur Irigasi** (`app/features/[featureId]/page.js`) memungkinkan pengguna untuk menyaring data penilaian Survey (IKSI) dan PAI berdasarkan tahun. Fitur ini meningkatkan organisasi data, terutama ketika ada banyak penilaian dari tahun yang berbeda, dan membuat hasil cetak/print lebih rapi.

## 🎯 Tujuan
1. **Organisasi Data**: Memisahkan penilaian berdasarkan tahun untuk kemudahan review
2. **Print/Export Optimal**: Mencetak hanya data tahun tertentu, menghindari penumpukan data
3. **Navigasi Historis**: Memudahkan perbandingan penilaian antar tahun
4. **User Experience**: Interface yang clean dengan dropdown filter yang intuitif

## 🏗️ Arsitektur

### State Management
```javascript
// Filter selections
const [selectedSurveyYear, setSelectedSurveyYear] = useState('all')
const [selectedPAIYear, setSelectedPAIYear] = useState('all')

// Available years from data
const [availableSurveyYears, setAvailableSurveyYears] = useState([])
const [availablePAIYears, setAvailablePAIYears] = useState([])

// Full data storage (unfiltered)
const [allSurveys, setAllSurveys] = useState([])
const [paiList, setPaiList] = useState([])

// Filtered data (displayed)
const [surveys, setSurveys] = useState([])
const [pai, setPai] = useState(null)
```

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Fetch Data from API                                  │
│    GET /api/features/[featureId]?format=management      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Extract & Store Data                                 │
│    - Store ALL surveys in allSurveys                    │
│    - Store ALL PAI in paiList                           │
│    - Extract unique years:                              │
│      • surveyYears = [...new Set(map tahun)]            │
│      • paiYears = [...new Set(map tahun)]               │
│    - Sort years DESC (latest first)                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Default Filter Selection                             │
│    - setSelectedSurveyYear(surveyYears[0])              │
│    - setSelectedPAIYear(paiYears[0])                    │
│    → Defaults to latest year                            │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Filter Data with useEffect                           │
│                                                          │
│  useEffect(() => {                                       │
│    if (selectedSurveyYear === 'all')                    │
│      setSurveys(allSurveys)                             │
│    else                                                  │
│      setSurveys(filter by year)                         │
│  }, [selectedSurveyYear, allSurveys])                   │
│                                                          │
│  useEffect(() => {                                       │
│    if (selectedPAIYear === 'all')                       │
│      setPai(paiList[0])                                 │
│    else                                                  │
│      setPai(filter by year)                             │
│  }, [selectedPAIYear, paiList])                         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Display Filtered Data                                │
│    - Show only surveys matching selectedSurveyYear      │
│    - Show only PAI matching selectedPAIYear             │
│    - Update count badges automatically                  │
└─────────────────────────────────────────────────────────┘
```

## 🎨 UI Components

### 1. Filter Dropdown - Survey
Lokasi: Survey card header

```jsx
<div className="flex items-center gap-3">
  {availableSurveyYears.length > 0 && (
    <div className="flex items-center gap-2 no-print">
      <Calendar className="w-4 h-4 text-gray-500" />
      <select
        value={selectedSurveyYear}
        onChange={(e) => setSelectedSurveyYear(
          e.target.value === 'all' ? 'all' : parseInt(e.target.value)
        )}
        className="text-sm border border-gray-300 rounded px-2 py-1 
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">Semua Tahun</option>
        {availableSurveyYears.map(year => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>
    </div>
  )}
  <span className="activity-count">{surveys.length} Survey</span>
</div>
```

**Fitur**:
- Icon Calendar untuk visual clarity
- Option "Semua Tahun" untuk melihat semua data
- Dynamic count badge yang update otomatis
- Class `no-print` agar tidak muncul di cetak

### 2. Filter Dropdown - PAI
Lokasi: PAI card header

```jsx
<div className="flex items-center gap-3">
  {availablePAIYears.length > 0 && (
    <div className="flex items-center gap-2 no-print">
      <Calendar className="w-4 h-4 text-gray-500" />
      <select
        value={selectedPAIYear}
        onChange={(e) => setSelectedPAIYear(
          e.target.value === 'all' ? 'all' : parseInt(e.target.value)
        )}
        className="text-sm border border-gray-300 rounded px-2 py-1 
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">Semua Tahun</option>
        {availablePAIYears.map(year => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>
    </div>
  )}
  <span className="text-sm text-gray-600">
    Dibuat: {formatDate(pai.createdAt)} oleh {pai.user?.name}
  </span>
</div>
```

### 3. Year Badge - Survey Item
Lokasi: Setiap survey card

```jsx
<div className="flex items-center gap-2 mb-1">
  <span className="text-sm font-medium text-gray-600">Survey #{index + 1}</span>
  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs 
                   font-semibold rounded-full flex items-center gap-1">
    <Calendar className="w-3 h-3" />
    {survey.tahun || new Date(survey.createdAt).getFullYear()}
  </span>
</div>
```

**Styling**:
- Background: `bg-blue-600` (blue for survey)
- Text: White dengan font semibold
- Icon: Calendar kecil (w-3 h-3)
- Shape: Rounded-full pill

### 4. Year Badge - PAI
Lokasi: Atas konten PAI

```jsx
<div className="mb-4 flex items-center gap-2">
  <span className="px-3 py-1.5 bg-purple-600 text-white text-sm 
                   font-semibold rounded-lg flex items-center gap-2 shadow-md">
    <Calendar className="w-4 h-4" />
    Tahun Penilaian: {pai.tahun || new Date(pai.createdAt).getFullYear()}
  </span>
</div>
```

**Styling**:
- Background: `bg-purple-600` (purple for PAI, berbeda dari survey)
- Shadow: `shadow-md` untuk emphasis
- Icon: Calendar (w-4 h-4)
- Shape: Rounded-lg

### 5. Print Filter Info
Lokasi: PDF header (visible only in print)

```jsx
{(selectedSurveyYear !== 'all' || selectedPAIYear !== 'all') && (
  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
    <div className="text-sm font-medium text-blue-800">
      📅 Filter Tahun Aktif:
      {selectedSurveyYear !== 'all' && (
        <span className="ml-2 px-2 py-1 bg-blue-100 rounded">
          Survey: {selectedSurveyYear}
        </span>
      )}
      {selectedPAIYear !== 'all' && (
        <span className="ml-2 px-2 py-1 bg-blue-100 rounded">
          PAI: {selectedPAIYear}
        </span>
      )}
    </div>
  </div>
)}
```

**Purpose**: 
- Menunjukkan di PDF bahwa data sudah difilter
- Hanya muncul jika filter aktif (bukan "Semua Tahun")
- Background biru dengan border untuk visibility

## 💾 Data Extraction Logic

### Extract Unique Years from Surveys
```javascript
// In fetchFeatureDetail()
const surveyYears = [
  ...new Set(
    allSurveyData.map(s => 
      s.tahun || new Date(s.createdAt).getFullYear()
    )
  )
].sort((a, b) => b - a) // DESC: latest first

setAvailableSurveyYears(surveyYears)

// Set default to latest year
if (surveyYears.length > 0) {
  setSelectedSurveyYear(surveyYears[0])
}
```

**Key Points**:
1. **Fallback Logic**: `s.tahun || new Date(s.createdAt).getFullYear()`
   - Prioritas: field `tahun` dari database
   - Fallback: ekstrak tahun dari `createdAt` jika `tahun` null
2. **Set for Uniqueness**: `[...new Set(...)]` menghilangkan duplikat
3. **Sort DESC**: Tahun terbaru di atas
4. **Auto-select Latest**: Default filter = tahun terbaru

### Extract Unique Years from PAI
```javascript
const paiYears = [
  ...new Set(
    allPAIData.map(p => 
      p.tahun || new Date(p.createdAt).getFullYear()
    )
  )
].sort((a, b) => b - a)

setAvailablePAIYears(paiYears)

if (paiYears.length > 0) {
  setSelectedPAIYear(paiYears[0])
}
```

**Sama seperti Survey** dengan logika identik.

## 🔄 Filter Logic with useEffect

### Survey Filter
```javascript
useEffect(() => {
  if (selectedSurveyYear === 'all') {
    // Show all surveys
    setSurveys(allSurveys)
  } else {
    // Filter by selected year
    const filtered = allSurveys.filter(s => 
      (s.tahun || new Date(s.createdAt).getFullYear()) === selectedSurveyYear
    )
    setSurveys(filtered)
  }
}, [selectedSurveyYear, allSurveys])
```

**Dependencies**:
- `selectedSurveyYear`: Re-run saat user ubah filter
- `allSurveys`: Re-run saat data baru di-fetch

**Logic**:
1. Jika "Semua Tahun" → show all
2. Jika tahun spesifik → filter dengan matching year
3. Auto-update count badge (surveys.length)

### PAI Filter
```javascript
useEffect(() => {
  if (selectedPAIYear === 'all') {
    // Show first PAI from all list
    setPai(paiList.length > 0 ? paiList[0] : null)
  } else {
    // Filter by selected year
    const filtered = paiList.filter(p => 
      (p.tahun || new Date(p.createdAt).getFullYear()) === selectedPAIYear
    )
    setPai(filtered.length > 0 ? filtered[0] : null)
  }
}, [selectedPAIYear, paiList])
```

**Note**: PAI shows single item (latest), bukan list seperti Survey.

## 🖨️ Print/Export Integration

### Filter Info in PDF Header
```javascript
{(selectedSurveyYear !== 'all' || selectedPAIYear !== 'all') && (
  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
    <div className="text-sm font-medium text-blue-800">
      📅 Filter Tahun Aktif:
      {selectedSurveyYear !== 'all' && (
        <span className="ml-2 px-2 py-1 bg-blue-100 rounded">
          Survey: {selectedSurveyYear}
        </span>
      )}
      {selectedPAIYear !== 'all' && (
        <span className="ml-2 px-2 py-1 bg-blue-100 rounded">
          PAI: {selectedPAIYear}
        </span>
      )}
    </div>
  </div>
)}
```

**Behavior**:
- Hanya muncul di PDF jika filter aktif
- Menunjukkan tahun yang dipilih untuk Survey dan/atau PAI
- Styling: Blue theme untuk consistency

### Hide Filter Dropdowns in Print
```jsx
<div className="flex items-center gap-2 no-print">
  <Calendar className="w-4 h-4 text-gray-500" />
  <select ...>
    ...
  </select>
</div>
```

**Class**: `no-print`
- Defined in print styles: `button, .no-print { display: none !important; }`
- Filter dropdowns tidak akan muncul di PDF export

### Print Shows Filtered Data Only
Karena `contentRef` merujuk ke DOM yang sudah ter-filter, maka:
- ✅ Surveys yang muncul = hasil filter
- ✅ PAI yang muncul = hasil filter
- ✅ Count badges otomatis sesuai filtered data

## 🎯 User Workflows

### Workflow 1: Melihat Data Tahun Tertentu
```
1. User buka halaman Detail Infrastruktur
   → Default: Tahun terbaru (2025)
   
2. User lihat dropdown "Semua Tahun" di Survey header
   → Pilih tahun 2024
   
3. Tampilan update otomatis:
   ✅ Hanya survey tahun 2024 yang muncul
   ✅ Count badge update: "3 Survey" → "1 Survey"
   ✅ Year badge di setiap survey menunjukkan 2024
   
4. User scroll ke PAI section
   → Pilih tahun 2024 di PAI dropdown
   
5. PAI data update:
   ✅ Hanya PAI tahun 2024 yang muncul
   ✅ Tahun badge menunjukkan "Tahun Penilaian: 2024"
```

### Workflow 2: Print/Export Data Tahun Tertentu
```
1. User pilih tahun yang ingin di-print:
   - Survey: 2024
   - PAI: 2024
   
2. User klik tombol "Cetak / Simpan PDF"
   
3. Print preview terbuka dengan:
   ✅ PDF header menunjukkan "📅 Filter Tahun Aktif: Survey: 2024 | PAI: 2024"
   ✅ Hanya data tahun 2024 yang muncul
   ✅ Filter dropdown tidak muncul (hidden dengan no-print)
   ✅ Year badges tetap muncul untuk clarity
   
4. User simpan as PDF:
   → File PDF clean, hanya berisi data tahun 2024
```

### Workflow 3: Bandingkan Data Antar Tahun
```
1. User pilih tahun 2024 di Survey dropdown
   → Review hasil survey 2024
   → Catat skor: 85.5, Kelas B
   
2. User ubah dropdown ke tahun 2025
   → Review hasil survey 2025
   → Catat skor: 90.2, Kelas A
   
3. User pilih "Semua Tahun"
   → Lihat semua survey side-by-side
   → Year badge membantu identifikasi tahun
   
4. Insights: 
   "Kondisi infrastruktur membaik dari tahun 2024 ke 2025"
```

## 🔧 Technical Implementation Details

### 1. Year Extraction
```javascript
// Extract year dari survey/PAI dengan fallback
const getYear = (item) => {
  return item.tahun || new Date(item.createdAt).getFullYear()
}

// Usage in map
surveyYears = [...new Set(allSurveyData.map(s => getYear(s)))]
```

**Fallback Priority**:
1. `item.tahun` (dari database, added in Sprint 2)
2. `new Date(item.createdAt).getFullYear()` (dari timestamp)

### 2. Filter Comparison
```javascript
// Compare survey year with selected year
const filtered = allSurveys.filter(s => 
  getYear(s) === selectedSurveyYear
)
```

**Type Safety**: 
- `selectedSurveyYear` bisa string 'all' atau number
- Comparison strict (`===`) dengan result dari `getYear()` (number)

### 3. Dropdown Value Parsing
```javascript
onChange={(e) => setSelectedSurveyYear(
  e.target.value === 'all' 
    ? 'all' 
    : parseInt(e.target.value)
)}
```

**Logic**:
- HTML select mengembalikan string
- Parse ke integer jika bukan 'all'
- Memastikan type consistency untuk comparison

### 4. Conditional Rendering
```jsx
{availableSurveyYears.length > 0 && (
  <div className="flex items-center gap-2 no-print">
    ...filter dropdown...
  </div>
)}
```

**Reason**: 
- Hanya tampilkan dropdown jika ada data tahun
- Avoid rendering empty dropdown

## 📊 Data Structures

### Survey with Year
```javascript
{
  id: 1,
  featureId: "abc123",
  scheme: "utama",
  tahun: 2024,              // ← Year field
  scoreTotal: 85.5,
  scoreClass: "B",
  values: {...},
  createdAt: "2024-06-15T10:30:00Z",
  user: { name: "John Doe" }
}
```

### PAI with Year
```javascript
{
  id: 1,
  featureId: "abc123",
  paiType: "saluran",
  tahun: 2024,              // ← Year field
  paiData: {...},
  priorityScore: 4,
  priorityStatus: "approved",
  createdAt: "2024-06-15T10:30:00Z",
  user: { name: "John Doe" },
  paiPhotos: [...]
}
```

### Available Years Array
```javascript
availableSurveyYears: [2025, 2024, 2023, 2022]  // DESC sorted
availablePAIYears: [2025, 2024, 2023]
```

### Selected Year State
```javascript
selectedSurveyYear: 2025     // number or 'all'
selectedPAIYear: 2025        // number or 'all'
```

## 🎨 Styling Guide

### Filter Dropdown
```css
.text-sm           /* Font size */
.border            /* Border */
.border-gray-300   /* Border color */
.rounded           /* Rounded corners */
.px-2 .py-1        /* Padding */
.focus:outline-none        /* Remove default outline */
.focus:ring-2              /* Custom focus ring */
.focus:ring-blue-500       /* Blue focus ring */
```

### Year Badge (Survey)
```css
.px-2 .py-0.5              /* Compact padding */
.bg-blue-600               /* Blue background */
.text-white                /* White text */
.text-xs                   /* Small text */
.font-semibold             /* Bold font */
.rounded-full              /* Pill shape */
.flex .items-center .gap-1 /* Flexbox for icon */
```

### Year Badge (PAI)
```css
.px-3 .py-1.5              /* Larger padding */
.bg-purple-600             /* Purple background (distinct from survey) */
.text-white                /* White text */
.text-sm                   /* Small text */
.font-semibold             /* Bold font */
.rounded-lg                /* Less rounded than pill */
.shadow-md                 /* Shadow for emphasis */
```

### Print Filter Info
```css
.mt-3                      /* Margin top */
.p-3                       /* Padding */
.bg-blue-50                /* Light blue background */
.rounded-lg                /* Rounded corners */
.border .border-blue-200   /* Blue border */
.text-sm                   /* Small text */
.font-medium               /* Medium font weight */
.text-blue-800             /* Dark blue text */
```

## ✅ Testing Checklist

### Functional Tests
- [ ] Filter dropdown muncul hanya jika ada data tahun
- [ ] Default selection = tahun terbaru
- [ ] Ubah filter Survey → data update dengan benar
- [ ] Ubah filter PAI → data update dengan benar
- [ ] Option "Semua Tahun" menampilkan semua data
- [ ] Count badge update otomatis sesuai filtered data
- [ ] Year badge menampilkan tahun yang benar
- [ ] Filter info muncul di print preview jika filter aktif
- [ ] Filter dropdown tidak muncul di print (no-print class)
- [ ] Filtered data only di PDF export

### Edge Cases
- [ ] Tidak ada survey → dropdown tidak muncul
- [ ] Tidak ada PAI → dropdown tidak muncul
- [ ] Hanya 1 tahun → dropdown tetap functional
- [ ] Data tanpa field `tahun` → fallback ke createdAt year
- [ ] Filter tahun yang tidak ada data → tampilkan "Belum ada data"
- [ ] Semua tahun dipilih, lalu switch ke tahun spesifik → smooth transition

### UI/UX Tests
- [ ] Calendar icon visible dan aligned
- [ ] Dropdown accessible (keyboard navigation)
- [ ] Focus ring terlihat jelas
- [ ] Year badge tidak overflow pada mobile
- [ ] Print filter info legible dan well-formatted
- [ ] Color contrast memenuhi WCAG standards

## 📈 Benefits

### 1. Data Organization
- ✅ Penilaian multi-tahun tidak bercampur
- ✅ Mudah focus pada tahun tertentu
- ✅ Historical tracking yang terstruktur

### 2. Print Quality
- ✅ PDF tidak overload dengan data semua tahun
- ✅ Clear indication tahun yang di-print
- ✅ Professional look & feel

### 3. User Experience
- ✅ Intuitive dropdown interface
- ✅ Visual year badges untuk quick reference
- ✅ Auto-update count badges
- ✅ Smooth filter transitions

### 4. Performance
- ✅ Filter di client-side (no additional API calls)
- ✅ useEffect dependency optimization
- ✅ Efficient re-renders

## 🔮 Future Enhancements

### Potential Improvements
1. **Year Range Filter**: Filter tahun 2022-2024
2. **Multi-Year Comparison**: Side-by-side comparison chart
3. **Export Multi-Year**: Export semua tahun dalam 1 PDF dengan sections
4. **Year Trends Chart**: Visualisasi skor survey over years
5. **Filter Persistence**: Save filter preference di localStorage

### API Optimization (Optional)
```javascript
// Current: Fetch all, filter client-side
GET /api/features/[featureId]?format=management

// Future: Server-side filtering
GET /api/features/[featureId]?format=management&surveyYear=2024&paiYear=2024
```

**Pros**: Reduce data transfer
**Cons**: More API complexity, less responsive UI

## 📚 Related Documentation
- `docs/TAHUN_PENILAIAN_FEATURE.md` - Year field implementation
- `docs/PRD_SPRINT2.md` - PAI with year feature
- `docs/PRINT_CSS_STYLES.md` - Print styling guide

## 🏷️ Tags
`#filter` `#tahun` `#year` `#survey` `#pai` `#print` `#export` `#useEffect` `#frontend` `#ui-ux`
