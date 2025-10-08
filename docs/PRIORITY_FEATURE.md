# Fitur Prioritas Perbaikan

## 📋 Deskripsi

Fitur Prioritas Perbaikan memungkinkan surveyor dan admin untuk menentukan tingkat urgensi perbaikan infrastruktur irigasi berdasarkan kondisi PAI (Profil Aset Irigasi). Sistem ini membantu pemerintah setempat dalam merencanakan dan memprioritaskan kegiatan pemeliharaan dan perbaikan.

## 🎯 Tujuan

- Memberikan sistem scoring untuk prioritas perbaikan (skala 1-5)
- Melacak status perbaikan (pending, approved, in progress, completed)
- Menyediakan dashboard admin untuk monitoring prioritas
- Memudahkan export data untuk perencanaan anggaran

## 🏗️ Arsitektur

### Database Schema

```prisma
model PAI {
  // ... existing fields
  priorityScore   Int?     @map("priority_score")      // 1-5 (1=sangat rendah, 5=sangat mendesak)
  priorityNotes   String?  @map("priority_notes")      // Catatan alasan prioritas
  priorityStatus  String?  @map("priority_status")     // 'pending' | 'approved' | 'in_progress' | 'completed'
}
```

### Tingkat Prioritas

| Skor | Label | Warna | Deskripsi |
|------|-------|-------|-----------|
| 5 | Sangat Mendesak | Merah (#ef4444) | Kerusakan parah, perlu perbaikan segera |
| 4 | Mendesak | Orange (#f97316) | Kerusakan signifikan, prioritas tinggi |
| 3 | Sedang | Kuning (#f59e0b) | Perlu perbaikan dalam waktu dekat |
| 2 | Rendah | Biru (#3b82f6) | Dapat dijadwalkan untuk perbaikan rutin |
| 1 | Sangat Rendah | Abu-abu (#6b7280) | Perbaikan dapat ditunda |

### Status Perbaikan

- **Pending** (⏰): Menunggu persetujuan/penjadwalan
- **Approved** (✅): Disetujui untuk perbaikan
- **In Progress** (▶️): Sedang dalam pengerjaan
- **Completed** (✅): Perbaikan selesai

## 📁 File Structure

```
app/
├── admin/
│   └── priorities/
│       └── page.js                    # Dashboard admin prioritas
├── api/
    └── pai/
        └── [id]/
            └── priority/
                └── route.js            # API endpoint prioritas

components/
└── PriorityScoreModal.jsx             # Modal input skor prioritas

prisma/
└── schema.prisma                       # Database schema
```

## 🔧 Cara Penggunaan

### 1. Setting Prioritas dari Peta

1. Buka peta irigasi
2. Klik pada fitur infrastruktur yang memiliki data PAI
3. Di popup, klik tombol **"⚠️ Prioritas"**
4. Pilih tingkat prioritas (1-5)
5. Pilih status perbaikan
6. Tambahkan catatan (opsional)
7. Klik **"Simpan Prioritas"**

### 2. Monitoring dari Dashboard Admin

1. Akses `/admin/priorities`
2. Lihat statistik prioritas per level
3. Filter berdasarkan:
   - Tingkat prioritas
   - Status perbaikan
4. Export data ke CSV untuk perencanaan

### 3. API Endpoints

#### Update Prioritas
```javascript
PATCH /api/pai/[id]/priority
Body: {
  priorityScore: 5,           // Required: 1-5
  priorityStatus: "pending",  // Optional: default "pending"
  priorityNotes: "string"     // Optional
}
```

#### Get Prioritas
```javascript
GET /api/pai/[id]/priority
Response: {
  id: "string",
  priorityScore: 5,
  priorityNotes: "string",
  priorityStatus: "pending",
  updatedAt: "2025-10-08T..."
}
```

#### List PAI dengan Filter
```javascript
GET /api/pai?includeFeature=true
// Filter PAI yang memiliki priorityScore !== null
```

## 💻 Contoh Kode

### Membuka Modal Prioritas dari JavaScript

```javascript
// Global function tersedia setelah LeafletMap di-mount
window.openPriorityModal('feature-id-123')
```

### Custom Hook untuk Data Prioritas

```javascript
import { useState, useEffect } from 'react'

export function usePriorityData() {
  const [priorities, setPriorities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/pai?includeFeature=true')
      .then(res => res.json())
      .then(data => {
        const withPriority = data.data.filter(p => p.priorityScore !== null)
        setPriorities(withPriority.sort((a, b) => 
          (b.priorityScore || 0) - (a.priorityScore || 0)
        ))
      })
      .finally(() => setLoading(false))
  }, [])

  return { priorities, loading }
}
```

## 🔐 Permissions

- **Surveyor & Admin**: Dapat mengatur skor prioritas
- **Viewer**: Hanya dapat melihat prioritas
- **SuperAdmin**: Akses penuh termasuk update status

Menggunakan sistem RBAC existing (`lib/permissions.js`):
- `PERMISSIONS.SURVEY_CREATE` untuk mengupdate prioritas
- `PERMISSIONS.FEATURE_VIEW` untuk melihat prioritas

## 📊 Export Data

Dashboard menyediakan fitur export CSV dengan kolom:
- Feature ID
- Nama Feature
- Tipe PAI (Saluran/Bangunan)
- Skor Prioritas
- Status
- Catatan
- Tanggal Update

Format nama file: `prioritas-perbaikan-YYYY-MM-DD.csv`

## 🎨 UI Components

### PriorityScoreModal

Modal interaktif untuk input skor prioritas dengan:
- Radio buttons untuk memilih level prioritas (1-5)
- Dropdown untuk status perbaikan
- Textarea untuk catatan
- Validasi form
- Loading states
- Error handling

### Priority Dashboard

Dashboard admin dengan:
- Stats cards per level prioritas
- Filter dropdown (prioritas & status)
- Sortable table
- Export CSV button
- Responsive design

## 🔄 Workflow Integration

1. **Surveyor** melakukan survey → mengisi PAI
2. **Surveyor/Admin** menilai kondisi → set prioritas
3. **Admin** review prioritas → approve/reject
4. **Pemerintah** menggunakan data untuk:
   - Perencanaan anggaran
   - Penjadwalan perbaikan
   - Monitoring progress

## 🚀 Future Enhancements

- [ ] Notifikasi email untuk prioritas tinggi
- [ ] Timeline tracking untuk setiap status
- [ ] Integrasi dengan sistem budgeting
- [ ] Foto before/after untuk completed status
- [ ] Analytics & reporting advanced
- [ ] Mobile app untuk surveyor

## 📝 Audit Trail

Setiap perubahan prioritas dicatat di `AuditLog`:
```javascript
{
  action: 'UPDATE_PRIORITY',
  entityType: 'PAI',
  oldValues: { priorityScore: 3, ... },
  newValues: { priorityScore: 5, ... }
}
```

## 🐛 Troubleshooting

**Modal tidak muncul**
- Pastikan PAI sudah dibuat untuk feature tersebut
- Check console untuk error messages
- Pastikan `window.openPriorityModal` terdefinisi

**Data tidak tersimpan**
- Check permissions (minimal SURVEYOR role)
- Validasi priorityScore (1-5)
- Check network tab untuk error responses

**Export tidak bekerja**
- Check browser compatibility (modern browsers only)
- Pastikan ada data yang difilter
- Check file download permissions
