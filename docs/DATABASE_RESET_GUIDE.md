# 🔄 Cara Reset Database & Fresh Start

## Masalah yang Terjadi
- `npx prisma migrate` lambat/stuck
- Error "prepared statement already exists"
- Error "operation not permitted" saat generate
- Perlu convert priorityScore dari Int (1-5) ke Float (0-1)

## Penyebab Lambat
1. **Koneksi Database Pooler**: Menggunakan Supabase pooler (6543) yang kadang lambat untuk migration
2. **File Lock**: Prisma Client di-lock oleh Node.js process yang masih running
3. **Prepared Statement**: Conflict di database connection

## ✅ Solusi Fresh Start

### Step 1: Drop Semua Tabel (Supabase SQL Editor)

Buka **Supabase Dashboard** → **SQL Editor**, jalankan:

```sql
-- ⚠️ WARNING: Menghapus SEMUA DATA!
DROP TABLE IF EXISTS "Photo" CASCADE;
DROP TABLE IF EXISTS "PAI" CASCADE;
DROP TABLE IF EXISTS "Survey" CASCADE;
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "Config" CASCADE;
DROP TABLE IF EXISTS "Feature" CASCADE;
DROP TABLE IF EXISTS "Session" CASCADE;
DROP TABLE IF EXISTS "Account" CASCADE;
DROP TABLE IF EXISTS "VerificationToken" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TYPE IF EXISTS "Role" CASCADE;
```

### Step 2: Stop Semua Node.js Process

```powershell
# Cek process
Get-Process | Where-Object {$_.ProcessName -like "*node*"}

# Stop semua (atau tutup terminal yang menjalankan npm run dev)
taskkill /F /IM node.exe
```

### Step 3: Generate Prisma Client

```bash
npx prisma generate
```

### Step 4: Push Schema ke Database

```bash
npx prisma db push
```

Ini akan membuat semua tabel baru sesuai schema.prisma (dengan priorityScore sudah Float).

### Step 5: Seed Data Admin User

```bash
node scripts/create-admin-user.js
# atau
node scripts/create-dummy-user.js
```

### Step 6: Seed Config Survey

```bash
node scripts/seed-configs.js
```

### Step 7: Start Development Server

```bash
npm run dev
```

## 📝 Perubahan Schema yang Sudah Dilakukan

### 1. Priority Score (PAI Model)
```prisma
// BEFORE
priorityScore   Int?     @map("priority_score") // 1-5

// AFTER  
priorityScore   Float?   @map("priority_score") // 0-1 (desimal)
```

### 2. Tahun Field (Survey & PAI)
```prisma
// BEFORE
// Tidak ada field tahun

// AFTER
tahun           Int      @default(2025)
@@unique([featureId, scheme, tahun]) // Survey
@@unique([featureId, tahun])         // PAI
```

## 🔧 Tips Menghindari Masalah di Masa Depan

### 1. Gunakan Direct Connection untuk Migration
Edit `.env` sementara saat migration:

```env
# Development - gunakan direct connection (port 5432)
DATABASE_URL="postgresql://user:pass@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Production - gunakan pooler (port 6543)  
# DATABASE_URL="postgresql://user:pass@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"
```

### 2. Stop Dev Server Sebelum Migration
Selalu stop `npm run dev` sebelum:
- `npx prisma generate`
- `npx prisma db push`
- `npx prisma migrate`

### 3. Gunakan `db push` untuk Development
```bash
# Development - cepat, no migration files
npx prisma db push

# Production - buat migration files proper
npx prisma migrate dev --name description
```

### 4. Clear Prisma Client Cache jika Error
```bash
# Windows PowerShell
Remove-Item -Recurse -Force node_modules\.prisma
npx prisma generate
```

## 🎯 Setelah Reset Selesai

Database akan fresh dengan:
- ✅ Priority Score menggunakan Float (0-1)
- ✅ Field tahun di Survey & PAI
- ✅ Unique constraints untuk tahun
- ✅ Tidak ada data lama yang conflict

Upload ulang data:
1. Upload KML feature via `/peta` page
2. Buat user admin via script
3. Mulai penilaian Survey & PAI dengan field tahun

## 📂 File yang Dibuat
- `prisma/migrations/00_reset_database.sql` - SQL reset manual
- `prisma/migrations/change_priority_score_to_float.sql` - Convert Int ke Float
- `docs/DATABASE_RESET_GUIDE.md` - Dokumentasi ini
