# ✅ Update Priority Score Validation (1-5 → 0-1)

## 📝 Perubahan yang Dilakukan

### 1. API Validation (`app/api/pai/[id]/priority/route.js`)

**BEFORE:**
```javascript
// Validate priority score
if (priorityScore && (priorityScore < 1 || priorityScore > 5)) {
  return NextResponse.json(
    { error: 'Skor prioritas harus antara 1-5' },
    { status: 400 }
  )
}
```

**AFTER:**
```javascript
// Validate priority score (0-1, desimal)
if (priorityScore !== null && priorityScore !== undefined) {
  if (typeof priorityScore !== 'number' || priorityScore < 0 || priorityScore > 1) {
    return NextResponse.json(
      { error: 'Skor prioritas harus berupa angka desimal antara 0-1 (contoh: 0.25, 0.5, 0.75, 1)' },
      { status: 400 }
    )
  }
}
```

### 2. Validasi yang Ditambahkan

- ✅ **Type Check**: `typeof priorityScore !== 'number'` - memastikan input adalah number
- ✅ **Range Check**: `priorityScore < 0 || priorityScore > 1` - memastikan nilai antara 0-1
- ✅ **Null Handling**: `priorityScore !== null && priorityScore !== undefined` - allow null values
- ✅ **Error Message**: Menjelaskan format yang benar dengan contoh

## 🎯 Contoh Request Valid

```javascript
// ✅ Valid
PATCH /api/pai/{id}/priority
{
  "priorityScore": 0.75,
  "priorityNotes": "Kerusakan sedang",
  "priorityStatus": "approved"
}

// ✅ Valid
PATCH /api/pai/{id}/priority
{
  "priorityScore": 1,
  "priorityNotes": "Sangat mendesak",
  "priorityStatus": "pending"
}

// ✅ Valid
PATCH /api/pai/{id}/priority
{
  "priorityScore": 0.25,
  "priorityNotes": "Prioritas rendah",
  "priorityStatus": "pending"
}
```

## ❌ Contoh Request Invalid

```javascript
// ❌ Invalid - melebihi 1
{
  "priorityScore": 1.5,  // Error: harus antara 0-1
  "priorityNotes": "Test"
}

// ❌ Invalid - kurang dari 0
{
  "priorityScore": -0.5,  // Error: harus antara 0-1
  "priorityNotes": "Test"
}

// ❌ Invalid - bukan number
{
  "priorityScore": "0.5",  // Error: harus berupa number
  "priorityNotes": "Test"
}

// ❌ Invalid - melebihi range
{
  "priorityScore": 5,  // Error: harus antara 0-1 (old scale tidak valid)
  "priorityNotes": "Test"
}
```

## 🔗 Response Error

**Error Response:**
```json
{
  "error": "Skor prioritas harus berupa angka desimal antara 0-1 (contoh: 0.25, 0.5, 0.75, 1)"
}
```

**Status Code:** `400 Bad Request`

## 📊 Mapping Nilai Lama ke Baru (Optional)

Jika ada data lama dengan skala 1-5, konversi:

| Old (1-5) | New (0-1) | Label |
|-----------|-----------|-------|
| 5 | 1.0 | Sangat Mendesak |
| 4 | 0.75 | Mendesak |
| 3 | 0.5 | Sedang |
| 2 | 0.25 | Rendah |
| 1 | 0.0 | Sangat Rendah |

## ✅ Testing Checklist

- [x] API validation updated dari 1-5 ke 0-1
- [x] Type checking untuk memastikan input adalah number
- [x] Null handling untuk optional priority score
- [x] Error message informatif dengan contoh
- [x] Frontend modal sudah menggunakan number input (0-1)
- [x] Helper functions (getPriorityColor, getPriorityLabel) sudah di-update
- [x] Halaman prioritas menampilkan nilai desimal dengan `.toFixed(2)`

## 🚀 Next Steps

1. **Reset Database** (jika perlu):
   - Jalankan SQL di Supabase untuk drop tables
   - Run `npx prisma db push`
   
2. **Test API**:
   ```bash
   # Test dengan valid value
   curl -X PATCH http://localhost:3000/api/pai/[id]/priority \
     -H "Content-Type: application/json" \
     -d '{"priorityScore": 0.75, "priorityStatus": "approved"}'
   
   # Test dengan invalid value (should return error)
   curl -X PATCH http://localhost:3000/api/pai/[id]/priority \
     -H "Content-Type: application/json" \
     -d '{"priorityScore": 5, "priorityStatus": "approved"}'
   ```

3. **Start Dev Server**:
   ```bash
   npm run dev
   ```

## 📚 Related Files

- `app/api/pai/[id]/priority/route.js` - API validation ✅
- `components/PriorityScoreModal.jsx` - UI input (number 0-1) ✅
- `app/prioritas/page.js` - Display dengan .toFixed(2) ✅
- `prisma/schema.prisma` - priorityScore Float ✅
