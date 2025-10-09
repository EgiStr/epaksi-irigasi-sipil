# 🚨 Halaman Prioritas Penanganan Infrastruktur

## 📋 Gambaran Umum

Halaman **Prioritas Penanganan** adalah dashboard khusus untuk memonitor dan mengelola prioritas perbaikan infrastruktur irigasi. Halaman ini menampilkan semua data PAI (Profil Aset Irigasi) dengan fokus pada tingkat urgensi perbaikan yang diurutkan berdasarkan ranking prioritas.

**Lokasi File**: `app/prioritas/page.js`  
**Route**: `/prioritas`  
**Menu**: "Prioritas Penanganan" (di sidebar utama)

---

## 🎯 Tujuan & Fitur Utama

### Tujuan
- Memberikan visibilitas penuh terhadap infrastruktur yang memerlukan perbaikan mendesak
- Memudahkan prioritisasi anggaran dan sumber daya perbaikan
- Tracking status penanganan infrastruktur dari pending hingga selesai
- Memisahkan data prioritas dari manajemen PAI umum untuk fokus lebih baik

### Fitur Utama
1. **Ranking Otomatis** - Infrastruktur diurutkan berdasarkan priorityScore (5 = tertinggi)
2. **Filter Multi-Dimensi** - Filter berdasarkan status, prioritas, dan pencarian nama
3. **Statistik Real-time** - Dashboard cards menampilkan ringkasan mendesak/sedang/rendah/selesai
4. **Sorting Dinamis** - Sort by ranking, nama, status, atau tanggal update
5. **Visual Indicators** - Warna semantik (merah, kuning, hijau) untuk prioritas
6. **Quick Actions** - Link langsung ke detail feature untuk analisis lebih lanjut

---

## 🎨 Desain Interface

### Layout Struktur
```
┌─────────────────────────────────────────────────────────────┐
│ 🚨 Prioritas Penanganan Infrastruktur                      │
│ Daftar infrastruktur berdasarkan tingkat urgensi...        │
├─────────────────────────────────────────────────────────────┤
│ [🔴 Mendesak: 12] [🟡 Sedang: 8] [🔵 Rendah: 5] [✅ Selesai: 3] │
├─────────────────────────────────────────────────────────────┤
│ [🔍 Cari...] [Status ▼] [Prioritas ▼]                      │
│ Menampilkan 25 dari 28 total infrastruktur                 │
├─────────────────────────────────────────────────────────────┤
│ Ranking | Prioritas | Nama | Tipe | Status | Catatan | ... │
│ ───────────────────────────────────────────────────────────│
│   1     🔴 5        Bendung A  🌊   ⚙️    Retakan berat    │
│   2     🔴 5        Saluran B  🌊   ⏳    Kebocoran major  │
│   3     🟠 4        Pintu C    🏗️   ✅    Perbaikan...     │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

### Color System (Prioritas)
- **🔴 Skor 5**: Gradient merah (`bg-gradient-to-br from-red-600 to-red-700`) - SANGAT MENDESAK
- **🟠 Skor 4**: Gradient orange (`from-orange-500 to-orange-600`) - MENDESAK  
- **🟡 Skor 3**: Gradient kuning (`from-yellow-500 to-yellow-600`) - SEDANG
- **🔵 Skor 2**: Gradient biru (`from-blue-500 to-blue-600`) - RENDAH
- **🟢 Skor 1**: Gradient hijau (`from-green-500 to-green-600`) - SANGAT RENDAH
- **⚪ Null**: Abu-abu (`bg-gray-100`) - Belum dinilai

### Ranking Badge System
- **Top 3 (1-3)**: Gradient orange-red dengan shadow (`from-orange-500 to-red-500`)
- **Top 10 (4-10)**: Gradient yellow-orange (`from-yellow-400 to-orange-400`)
- **Sisanya (11+)**: Abu-abu standar (`bg-gray-200`)

---

## 📊 Struktur Data

### Data Model (dari PAI)
```javascript
{
  id: "uuid",
  featureId: "feature_md5_hash",
  paiType: "saluran" | "bangunan",
  priorityScore: 1-5 | null,           // Skor urgensi
  priorityStatus: "pending" | "approved" | "in_progress" | "completed",
  priorityNotes: "Deskripsi masalah dan rekomendasi",
  paiData: {
    aset: { nama, jenis, nomenklatur },
    di: { name, kode, area_ha },
    teknis: { ... }
  },
  feature: { name, type, scheme },
  user: { name },
  createdAt: "timestamp",
  updatedAt: "timestamp"
}
```

### State Management
```javascript
// Main states
const [paiData, setPaiData] = useState([])           // Raw data dari API
const [filteredData, setFilteredData] = useState([]) // Data setelah filter + sort
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)

// Filter states
const [searchQuery, setSearchQuery] = useState('')
const [sortBy, setSortBy] = useState('priorityScore')
const [sortOrder, setSortOrder] = useState('desc')   // desc = tertinggi dulu
const [filterStatus, setFilterStatus] = useState('all')
const [filterScore, setFilterScore] = useState('all')
```

---

## 🔧 Fitur Teknis

### 1. Sorting Algorithm
```javascript
// Default sort: priorityScore DESC (tertinggi dulu)
result.sort((a, b) => {
  let aValue = a.priorityScore || 0  // Treat null as 0
  let bValue = b.priorityScore || 0
  return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
})
```

**Sortable Fields**:
- `priorityScore` - Skor prioritas (default)
- `name` - Nama infrastruktur
- `status` - Status perbaikan
- `updatedAt` - Tanggal update terakhir

### 2. Multi-Filter System
```javascript
// Search filter (nama, lokasi, catatan)
if (searchQuery) {
  result = result.filter(item => {
    const searchLower = searchQuery.toLowerCase()
    return (
      item.feature?.name?.toLowerCase().includes(searchLower) ||
      item.paiData?.aset?.nama?.toLowerCase().includes(searchLower) ||
      item.paiData?.di?.name?.toLowerCase().includes(searchLower) ||
      item.priorityNotes?.toLowerCase().includes(searchLower)
    )
  })
}

// Status filter
if (filterStatus !== 'all') {
  result = result.filter(item => item.priorityStatus === filterStatus)
}

// Score filter
if (filterScore !== 'all') {
  result = result.filter(item => item.priorityScore === parseInt(filterScore))
}
```

### 3. Statistics Calculation
```javascript
const stats = {
  total: paiData.length,
  mendesak: paiData.filter(p => p.priorityScore >= 4).length,      // Skor 4-5
  sedang: paiData.filter(p => p.priorityScore === 3).length,       // Skor 3
  rendah: paiData.filter(p => p.priorityScore && p.priorityScore <= 2).length, // Skor 1-2
  belumDinilai: paiData.filter(p => !p.priorityScore).length,      // null
  completed: paiData.filter(p => p.priorityStatus === 'completed').length,
  inProgress: paiData.filter(p => p.priorityStatus === 'in_progress').length
}
```

---

## 📚 API Integration

### Endpoint
```javascript
GET /api/pai
```

### Response Structure
```javascript
{
  "pai": [
    {
      "id": "...",
      "featureId": "...",
      "priorityScore": 5,
      "priorityStatus": "in_progress",
      "priorityNotes": "Retakan struktural berat...",
      "paiType": "bangunan",
      "paiData": { ... },
      "feature": { "name": "Bendung Way Rarem", ... },
      "user": { "name": "John Doe" },
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-20T14:30:00Z"
    },
    // ... more items
  ],
  "total": 28
}
```

---

## 🎯 User Flows

### Flow 1: Melihat Infrastruktur Mendesak
```
1. User membuka halaman /prioritas
2. Sistem menampilkan data diurutkan priorityScore DESC (default)
3. Card statistik menunjukkan 12 infrastruktur mendesak (skor 4-5)
4. Ranking #1-3 ditampilkan dengan badge merah-orange
5. User melihat detail dengan klik tombol "Detail"
```

### Flow 2: Filter & Search
```
1. User mengetik "bendung" di search box
2. Sistem filter real-time (feature name, asset name, DI name, notes)
3. User pilih Status = "Dalam Proses"
4. Sistem kombinasikan filter: nama + status
5. Counter "Menampilkan X dari Y" update otomatis
```

### Flow 3: Sort & Prioritize
```
1. User klik header "Status Perbaikan"
2. Sistem sort by status: pending → approved → in_progress → completed
3. User klik lagi (toggle asc/desc)
4. Icon sort (↑/↓) menunjukkan arah sorting
```

---

## 🚀 Implementasi Detail

### Component Structure
```javascript
PrioritasPenangananPage
├─ Layout (wrapper)
├─ Dashboard Header
│  ├─ Title & Description
│  └─ Icon (AlertTriangle)
├─ Statistics Cards Grid (4 cards)
│  ├─ Mendesak Card (red gradient)
│  ├─ Sedang Card (yellow gradient)
│  ├─ Rendah Card (blue gradient)
│  └─ Selesai Card (green gradient)
├─ Filters & Search Bar
│  ├─ Search Input (Search icon)
│  ├─ Status Dropdown
│  └─ Priority Score Dropdown
├─ Data Table
│  ├─ Sortable Headers
│  ├─ Ranking Column (numbered badges)
│  ├─ Priority Badge Column (colored)
│  ├─ Status Badge Column
│  └─ Action Buttons (Detail link)
└─ Summary Footer
   └─ Quick stats (mendesak, in progress, completed)
```

### Helper Functions
```javascript
// Prioritas badge dengan icon dan warna
const getPriorityBadge = (score) => {
  switch (score) {
    case 5: return { text: 'SANGAT MENDESAK', color: 'bg-red-100 text-red-800', icon: '🔴' }
    case 4: return { text: 'MENDESAK', color: 'bg-orange-100 text-orange-800', icon: '🟠' }
    case 3: return { text: 'SEDANG', color: 'bg-yellow-100 text-yellow-800', icon: '🟡' }
    case 2: return { text: 'RENDAH', color: 'bg-blue-100 text-blue-800', icon: '🔵' }
    case 1: return { text: 'SANGAT RENDAH', color: 'bg-green-100 text-green-800', icon: '🟢' }
    default: return { text: 'Belum Dinilai', color: 'bg-gray-100 text-gray-800', icon: '⚪' }
  }
}

// Status badge dengan icon Lucide
const getStatusBadge = (status) => {
  switch (status) {
    case 'completed': return { text: 'Selesai', color: 'bg-green-100 text-green-800', icon: <CheckCircle /> }
    case 'in_progress': return { text: 'Dalam Proses', color: 'bg-blue-100 text-blue-800', icon: <Clock /> }
    case 'approved': return { text: 'Disetujui', color: 'bg-purple-100 text-purple-800', icon: <CheckCircle /> }
    default: return { text: 'Menunggu', color: 'bg-gray-100 text-gray-800', icon: <AlertTriangle /> }
  }
}

// Format tanggal ke Bahasa Indonesia
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
```

---

## 🎨 CSS Classes & Styling

### Custom Classes (dari globals.css)
```css
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.content-card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
```

### Tailwind Utilities (key patterns)
```javascript
// Gradient backgrounds
"bg-gradient-to-br from-red-50 to-orange-50"
"bg-gradient-to-br from-orange-500 to-red-500"

// Hover effects
"hover:bg-gray-50 transition-colors"
"hover:scale-110 transform"

// Border & Shadow
"border-2 border-red-200"
"shadow-lg"
"rounded-xl"

// Text colors
"text-red-700 font-bold text-3xl"
```

---

## 🧪 Testing Checklist

### Functional Tests
- [ ] Data PAI ter-load dengan benar dari `/api/pai`
- [ ] Default sort by `priorityScore DESC` berfungsi
- [ ] Search filter nama/lokasi/catatan responsive
- [ ] Filter status (pending/approved/in_progress/completed) bekerja
- [ ] Filter prioritas (1-5) bekerja
- [ ] Kombinasi multiple filters bekerja
- [ ] Sorting toggle asc/desc berfungsi
- [ ] Statistics cards menghitung dengan benar
- [ ] Link "Detail" mengarah ke `/features/{featureId}`
- [ ] Loading state menampilkan skeleton
- [ ] Empty state menampilkan pesan kosong

### Visual Tests
- [ ] Ranking badge top 3 berwarna orange-red gradient
- [ ] Priority badges menggunakan warna semantik yang benar
- [ ] Status badges menampilkan icon Lucide yang sesuai
- [ ] Responsive layout di mobile/tablet/desktop
- [ ] Statistics cards grid responsive (4 cols → 2 cols → 1 col)
- [ ] Table horizontal scroll di mobile
- [ ] Hover effects pada table rows dan buttons

### Performance Tests
- [ ] Render time < 500ms untuk 100 items
- [ ] Filter/sort tidak lag dengan 200+ items
- [ ] No memory leaks pada component unmount

---

## 🔗 Integrasi dengan Sistem

### Menu Sidebar
- **Label**: "Prioritas Penanganan"
- **Icon**: `<AlertTriangle />` (Lucide)
- **Position**: Setelah "Peta Irigasi", sebelum "Admin Panel"
- **Permission**: `PERMISSIONS.FEATURE_VIEW` (sama dengan Peta)

### Halaman PAI Admin (Perubahan)
- ✅ **DIHAPUS**: Kolom "Prioritas Penanganan" & "Status Prioritas"
- ✅ **DIHAPUS**: Filter dropdown prioritas & status
- ✅ **ALASAN**: Memisahkan concern - PAI Management fokus pada data teknis, Prioritas Penanganan fokus pada urgensi perbaikan

### Feature Detail Page (Tetap Ada)
- Priority card tetap ditampilkan di halaman `/features/{featureId}`
- User bisa update priority dari feature detail
- Link dari tabel prioritas → feature detail untuk edit

---

## 📖 User Guide

### Cara Menggunakan Halaman Prioritas Penanganan

#### 1. Melihat Ranking Prioritas
- Buka menu "Prioritas Penanganan" di sidebar
- Infrastruktur otomatis diurutkan dari yang paling mendesak (skor 5) ke rendah (skor 1)
- Ranking #1-3 ditampilkan dengan badge khusus (merah-orange)

#### 2. Filter Berdasarkan Status
- Gunakan dropdown "Status Perbaikan" untuk filter:
  - **Menunggu**: Belum ditindaklanjuti
  - **Disetujui**: Sudah disetujui untuk diperbaiki
  - **Dalam Proses**: Sedang dikerjakan
  - **Selesai**: Perbaikan sudah selesai

#### 3. Cari Infrastruktur Spesifik
- Ketik nama infrastruktur, lokasi DI, atau kata kunci dari catatan
- Filter otomatis saat mengetik (real-time search)

#### 4. Lihat Detail & Update Prioritas
- Klik tombol "Detail" pada baris infrastruktur
- Anda akan diarahkan ke halaman Feature Detail
- Di sana bisa melihat informasi lengkap dan mengubah prioritas

#### 5. Monitoring Statistik
- Card di atas tabel menunjukkan:
  - **Mendesak** (Merah): Skor 4-5, perlu perhatian segera
  - **Sedang** (Kuning): Skor 3, jadwalkan dalam rencana rutin
  - **Rendah** (Biru): Skor 1-2, pemantauan berkala
  - **Selesai** (Hijau): Sudah ditangani dengan status completed

---

## 🔮 Future Enhancements

### Phase 2 (Short-term)
- [ ] Export to Excel/PDF dengan format prioritas
- [ ] Bulk update status (select multiple → update status)
- [ ] Filter tanggal range untuk update terakhir
- [ ] Badge "Baru" untuk infrastruktur ditambahkan <7 hari
- [ ] Notification count untuk prioritas baru di menu

### Phase 3 (Medium-term)
- [ ] Timeline view untuk tracking riwayat perubahan status
- [ ] Grafik trend prioritas (bulan ini vs bulan lalu)
- [ ] Integration dengan sistem anggaran (budget allocation)
- [ ] Auto-escalation: prioritas 5 lebih dari 30 hari → notifikasi

### Phase 4 (Long-term)
- [ ] Prediksi ML untuk rekomendasi prioritas berdasarkan pola historis
- [ ] Mobile app untuk update status perbaikan di lapangan
- [ ] Integration dengan IoT sensors untuk monitoring real-time
- [ ] Dashboard executive dengan KPI perbaikan infrastruktur

---

## 📝 Notes & Best Practices

### Data Quality
- **Prioritas harus diisi**: Infrastruktur tanpa priorityScore akan muncul paling bawah (dianggap skor 0)
- **Catatan wajib**: priorityNotes memberikan konteks penting untuk decision making
- **Update berkala**: Ubah status sesuai progress perbaikan untuk tracking akurat

### Performance
- Halaman ini di-optimize untuk max 500 items tanpa pagination
- Jika data > 500, pertimbangkan pagination atau lazy loading
- Filter client-side cukup untuk dataset kecil-menengah

### Accessibility
- Gunakan warna + icon untuk color-blind users
- Semua interactive elements punya hover state
- Table responsive dengan horizontal scroll di mobile

### Maintenance
- Update badge colors jika ada revisi skema prioritas
- Sinkronisasi dengan perubahan di PAI model (prisma schema)
- Test regression setelah update API /api/pai

---

## 📞 Support & Feedback

Untuk pertanyaan atau saran terkait halaman Prioritas Penanganan:
- **Developer**: Tim SINTARA Way Rarem
- **File Location**: `app/prioritas/page.js`
- **Related Components**: `components/admin/pai/PAITable.jsx`, `app/features/[featureId]/page.js`
- **Documentation**: `docs/PRIORITY_FEATURE.md`, `docs/PRD_SPRINT2.md`

---

**Last Updated**: 2025-01-20  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
