# GitHub Copilot Instructions

## 🎯 Project Overview
**Sistem Pemetaan Irigasi Sipil** (Way Rarem) - A Next.js geospatial web application for managing irrigation infrastructure with dual scoring systems (IKSI survey + PAI asset profiling) and role-based access control.

**Tech at a Glance**: Next.js 15 App Router | PostgreSQL + PostGIS | Leaflet Maps | NextAuth RBAC | Prisma ORM

## 🏗️ Architecture

### Core Stack
- **Next.js 15.5.2** (App Router) + **React 19.1** + **PostgreSQL 15 + PostGIS**
- **Prisma ORM 6.15** for type-safe database access
- **Leaflet 1.9.4** + React-Leaflet 5.0 for maps (client-side only)
- **NextAuth.js 4.24** for authentication (JWT strategy)
- **Tailwind CSS 4.1** for styling
- **Supabase Storage** for photo uploads (PAI)

### Critical: Bilingual Codebase Rule 🌐
**ALWAYS enforce this separation:**
- **Code & Technical**: English (variables, functions, API routes, file names, comments)
- **UI & User-Facing**: Bahasa Indonesia (labels, messages, buttons, errors, toasts)
- **Example**: `const irrigationData = ...` but `<button>Simpan Data</button>`

### Data Flow Architecture
```
User Action → Next.js Page (RSC/Client) → API Route Handler
                                              ↓
                                    [Permission Check] lib/permissions.js
                                              ↓
                                    [Database Operation] Prisma Client
                                              ↓
                                    [PostGIS Spatial Query] (if geospatial)
                                              ↓
                                    [Audit Log] lib/audit.js (for mutations)
                                              ↓
                                          Response
```

**Key Principles**:
- API routes validate session FIRST (`getServerSession`)
- Permission checks use `hasPermission()` with granular `PERMISSIONS` constants
- Audit trail for ALL mutations (create/update/delete)
- Geospatial queries use raw SQL with `prisma.$queryRaw`

## 📁 Key File Patterns

### 1. Database & ORM
- **Schema**: `prisma/schema.prisma` - Core models: `Feature`, `Survey`, `PAI`, `Photo`, `User`, `AuditLog`, `Config`
- **Spatial Data**: Features use `geometry(GEOMETRY,4326)` for PostGIS (SRID 4326 = WGS84)
- **Feature ID Strategy**: MD5 hash from `coordinates + name + description` (see `lib/kml-parser.js::generateFeatureId()`)
  - Ensures stable IDs across KML re-uploads
  - Prevents duplicate features from same source
- **Schemes**: Features tagged as `'utama'` (primary) or `'tersier'` (tertiary) for irrigation hierarchy

**Database Commands**:
```bash
npm run db:generate  # Generate Prisma Client after schema changes
npm run db:push      # Push schema to DB (dev - no migrations)
npm run db:migrate   # Create & run migrations (production)
npx prisma studio    # GUI database browser
```

**Critical Schema Details**:
- `Feature.geom`: PostGIS geometry column, NOT managed by Prisma (use raw SQL)
- `Survey.values`: JSON blob for flexible survey responses
- `PAI.paiData`: JSON blob for structured asset documentation
- All models have `createdAt`/`updatedAt` for audit trails

### 2. Authentication & Authorization
- **Auth Config**: `app/api/auth/[...nextauth]/route.js` - Credentials provider with bcrypt
- **Middleware**: `middleware.js` - Role-based route protection + unauthorized redirects
- **Permissions**: `lib/permissions.js` - RBAC with 4-tier hierarchy:
  - `VIEWER` (0): Read-only access to maps/reports
  - `SURVEYOR` (1): Create surveys + features
  - `ADMIN` (2): User management + system config
  - `SUPERADMIN` (3): Full access including role assignment
- **Session**: JWT strategy, 24-hour expiry, `user.role` + `user.id` in token

**Permission Check Pattern** (REQUIRED in all API routes):
```javascript
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/route'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'

export async function POST(request) {
  // 1. Session validation FIRST
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
  }
  
  // 2. Permission check
  if (!hasPermission(session.user.role, PERMISSIONS.FEATURE_EDIT)) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }
  
  // 3. Business logic...
}
```

**User Hierarchy Check** (for user management):
```javascript
import { canManageUser } from '@/lib/permissions'
if (!canManageUser(session.user.role, targetUser.role)) {
  return NextResponse.json({ error: 'Tidak dapat mengelola user dengan role lebih tinggi' }, { status: 403 })
}
```

### 3. Geospatial Data Processing
- **KML Upload**: `app/api/upload/route.js` - Parses KML → GeoJSON → PostGIS with batch insert
- **Parser**: `lib/kml-parser.js` - Key functions:
  - `parseKMLDescription()`: Extracts properties from HTML tables in KML
  - `generateFeatureId()`: Creates stable MD5 hash from coordinates + metadata
  - `detectScheme()`: Auto-detects 'utama' vs 'tersier' from properties
  - `geometryToWKT()`: Converts GeoJSON geometry to PostGIS WKT format
  - `force2D()`: Removes Z-coordinates (PostGIS uses 2D SRID 4326)
- **API Patterns**:
  - `GET /api/features`: Supports `?bbox=`, `?source_layer=`, `?scheme=`, `?format=geojson|management`
  - Bbox format: `minx,miny,maxx,maxy` (WGS84 coordinates)
  - Spatial queries: Use `prisma.$queryRaw` with PostGIS functions (`ST_Within`, `ST_Intersects`)
- **Map Component**: `components/LeafletMap.jsx` - **CRITICAL: Must use dynamic import**

**Critical Pattern - Avoid SSR Issues** (Leaflet is client-only):
```javascript
// ❌ WRONG - Will crash on server render
import { MapContainer } from 'react-leaflet'

// ✅ CORRECT - Dynamic import with ssr: false
import dynamic from 'next/dynamic'
const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => <div className="animate-pulse">Memuat peta...</div>
})
```

**PostGIS Query Pattern** (for spatial operations):
```javascript
// Example: Find features within bounding box
const features = await prisma.$queryRaw`
  SELECT id, feature_id, name, ST_AsGeoJSON(geom)::json as geometry
  FROM features
  WHERE ST_Within(
    geom,
    ST_MakeEnvelope(${minx}, ${miny}, ${maxx}, ${maxy}, 4326)
  )
  LIMIT ${limit}
`
```

### 4. Dual Scoring Systems

#### IKSI Survey (Existing)
- **Model**: `Survey` - Weighted scoring with A/B/C/D classification
- **Engine**: `lib/scoring/engine.js` - Implements Weighted Sum Model (WSM)
  - `normalizeValue()`: Converts raw inputs to [0,1] scale based on field type
  - `calculateTotalScore()`: Aggregates category scores with weights
  - `determineQualityClass()`: Maps score to grade (A/B/C/D)
  - **Supported Types**: `boolean`, `ordinal`, `persentase`, `numerik`, `likert`, `binary`, `score`
- **Config**: `config/survey-{utama|tersier}*.json` - Dynamic weights & grading thresholds
  - Structure: Categories → Subs (with weights, types, min/max)
  - Grading: `{ A: {min: 90, max: 100}, B: {...}, C: {...}, D: {...} }`
- **Normalization Examples**:
  - Boolean: `true` → 1, `false` → 0
  - Ordinal (k=5): value 4 → (4-1)/(5-1) = 0.75
  - Percentage: 85% → 0.85
  - Numeric (min=0, max=100): value 60 → 0.6
- **API**: `app/api/surveys/route.js` - CRUD + `/calculate-score` endpoint

#### PAI Asset Profiling (Sprint 2)
- **Model**: `PAI` - Structured asset data with photo support
- **Types**: `'saluran'` (channel) or `'bangunan'` (structure)
- **Photos**: `Photo` model → Supabase Storage integration (`lib/supabase.js`)
  - Max 5MB per photo, stored as `{paiId}/photo_{timestamp}.jpg`
  - Public URLs returned in API responses
- **Priority System**: 
  - `priorityScore` (1-5): 1=lowest, 5=critical
  - `priorityStatus`: 'pending' | 'approved' | 'in_progress' | 'completed'
  - `priorityNotes`: Text explanation for priority decision
- **API**: `app/api/pai/route.js` - Separate from surveys
- **API Priority**: `app/api/pai/[id]/priority/route.js` - PATCH for updating priority scores
- **Forms**: `components/forms/PAIFormFields.jsx` + `PhotoManager.jsx`
- **Priority Modal**: `components/PriorityScoreModal.jsx` - UI for setting repair priorities
- **Admin Page**: `app/admin/priorities/page.js` - Dashboard for viewing all priorities

### 5. Audit Trail System
- **Logger**: `lib/audit.js::AuditLogger` - Tracks all user actions
- **Usage**: Call `AuditLogger.log()` in API routes after mutations
- **Storage**: `AuditLog` model with user, action, entity type, old/new values
- **Admin UI**: `app/admin/audit-logs/page.js`
- **Helper Methods**:
  - `logLogin()`, `logLogout()`: Authentication events
  - `logUserCreate()`, `logUserUpdate()`, `logUserDelete()`: User management
  - `logRoleChange()`: Critical permission changes
  - `logSurveyAction()`: Survey CRUD operations
  - `logDataUpload()`: File uploads with metadata
  - `getRequestInfo()`: Extract IP & user agent from request headers

**Audit Pattern** (add to API routes with mutations):
```javascript
import { AuditLogger, getRequestInfo } from '@/lib/audit'

const { ipAddress, userAgent } = getRequestInfo(request)
await AuditLogger.log({
  userId: session.user.id,
  action: 'FEATURE_UPDATE',
  entityType: 'Feature',
  entityId: feature.id,
  oldValues: existingFeature,
  newValues: updatedFeature,
  ipAddress,
  userAgent
})
```

## 🔧 Development Workflows

### Local Setup
```bash
npm install
npm run db:generate              # After schema changes
node scripts/create-dummy-user.js # Create test admin
node scripts/seed-configs.js      # Seed survey configs
npm run dev                       # Start dev server (localhost:3000)
```

**Default Test Credentials**:
```
Email: admin@wayrarem.id
Password: password123
Role: SUPERADMIN
```

### Adding New Features
1. **Database**: Update `prisma/schema.prisma` → `npm run db:push`
2. **API**: Create route in `app/api/*/route.js` with permission checks
3. **Component**: If map-related, use dynamic import
4. **Audit**: Add `AuditLogger.log()` for sensitive operations
5. **Types**: Features need `featureId`, `sourceLayer`, `scheme` fields

### Common Gotchas
- **Leaflet Icons**: Fixed in `components/LeafletMap.jsx` - imports from `/public/leaflet/`
- **GeoJSON Format**: Must include `type: 'FeatureCollection'` and `features` array
- **Spatial Queries**: Use raw SQL with `prisma.$queryRaw` for PostGIS functions
- **Photo Upload**: Max 5MB, stored in Supabase, URLs saved in `Photo.url`
- **Environment Variables**: Ensure `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` are set in `.env.local`

## 🎨 UI/UX Conventions

### Map Visualization
- **Colors**: Defined in `MAP_CONFIG` (LeafletMap.jsx) - different per `sourceLayer`
- **Popups**: Show priority fields first (defined in `PRIORITY_FIELDS` array)
- **Survey Status**: Color-coded by quality class (A=green, B=yellow, C=orange, D=red)
- **Controls**: Layer toggle, opacity sliders, legend - all in Bahasa Indonesia

### Forms & Validation
- **Survey Forms**: Auto-generated from JSON config, type-aware inputs
- **PAI Forms**: Schema validation with Zod (`lib/validations/pai-schema.js`)
- **Photo Upload**: Drag-drop + preview, managed by `PhotoUpload.jsx`

## 📋 Reference Decision Log

### Why PostGIS?
Spatial indexing for bbox queries, future geocoding/routing support

### Why Separate Survey vs PAI?
Different purposes - IKSI scores condition, PAI documents assets. Independent lifecycles.

### Why MD5 for Feature IDs?
Stable IDs across KML re-uploads, prevents duplicate features

### Why JSON Configs?
Admin-editable scoring without redeployment (see `app/admin/configs/page.js`)

## 🚨 Critical Patterns

### API Route Template
```javascript
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/route'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { AuditLogger, getRequestInfo } from '@/lib/audit'

export async function POST(request) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session.user.role, PERMISSIONS.X)) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }
  
  // ... operation ...
  
  const { ipAddress, userAgent } = getRequestInfo(request)
  await AuditLogger.log({
    userId: session.user.id,
    action: 'CREATE',
    entityType: 'Feature',
    entityId: result.id,
    newValues: result,
    ipAddress,
    userAgent
  })
  
  return NextResponse.json(result)
}
```

### Data Fetching Hook Template
```javascript
export function useEntityData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/entity')
      if (!res.ok) throw new Error(await res.text())
      setData(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])
  return { data, loading, error, reload }
}
```

## 📚 Key Files to Reference
- `prisma/schema.prisma` - Full data model
- `lib/permissions.js` - All roles & permissions
- `lib/scoring/engine.js` - Survey calculation logic
- `lib/kml-parser.js` - Geospatial data processing
- `components/LeafletMap.jsx` - Map implementation patterns
- `middleware.js` - Route protection logic
- `docs/PRD.md` + `docs/PRD_SPRINT2.md` - Feature requirements