# GitHub Copilot Instructions

## 🎯 Project Overview
**Sistem Pemetaan Irigasi Sipil** - A Next.js geospatial web application for managing irrigation infrastructure with dual scoring systems (IKSI survey + PAI asset profiling) and role-based access control.

## 🏗️ Architecture

### Core Stack
- **Next.js 15.5** (App Router) + **React 19** + **PostgreSQL 15 + PostGIS**
- **Prisma ORM 6.15** for type-safe database access
- **Leaflet 1.9.4** + React-Leaflet for maps (client-side only)
- **NextAuth.js 4.24** for authentication
- **Tailwind CSS 4.1** for styling

### Critical: Bilingual Codebase Rule
- **Code & Technical**: Always English (variables, functions, API routes, comments)
- **UI & User-Facing**: Always Bahasa Indonesia (labels, messages, buttons, errors)
- Example: `const irrigationData = ...` but `<button>Simpan Data</button>`

### Data Flow Pattern
```
User → Next.js Page (Server/Client) → API Route → Prisma → PostGIS
                                         ↓
                                    Audit Logger (lib/audit.js)
                                         ↓
                                    Permission Check (lib/permissions.js)
```

## 📁 Key File Patterns

### 1. Database & ORM
- **Schema**: `prisma/schema.prisma` - Core models: `Feature`, `Survey`, `PAI`, `User`, `AuditLog`
- **Spatial Data**: Features use `geometry(GEOMETRY,4326)` for PostGIS
- **Feature ID**: MD5 hash from coordinates + name (see `lib/kml-parser.js::generateFeatureId()`)
- **Schemes**: Features tagged as `'utama'` or `'tersier'` for different assessment types

**Database Commands**:
```bash
npm run db:generate  # Generate Prisma Client
npm run db:push      # Push schema changes (dev)
npm run db:migrate   # Run migrations (production)
```

### 2. Authentication & Authorization
- **Auth Config**: `app/api/auth/[...nextauth]/route.js` - Credentials provider with bcrypt
- **Middleware**: `middleware.js` - Role-based route protection
- **Permissions**: `lib/permissions.js` - RBAC with 4 roles (VIEWER → SURVEYOR → ADMIN → SUPERADMIN)
- **Session**: JWT strategy, 24-hour expiry, user.role attached to token

**Permission Check Pattern**:
```javascript
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
if (!hasPermission(session.user.role, PERMISSIONS.FEATURE_EDIT)) {
  return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
}
```

### 3. Geospatial Data Processing
- **KML Upload**: `app/api/upload/route.js` - Parses KML → GeoJSON → PostGIS
- **Parser**: `lib/kml-parser.js` - Extracts properties from HTML tables, detects scheme
- **API**: `app/api/features/route.js` - Supports bbox filtering, spatial queries
- **Map Component**: `components/LeafletMap.jsx` - **Must use dynamic import** (Leaflet breaks SSR)

**Critical Pattern - Avoid SSR Issues**:
```javascript
// ❌ WRONG - Will break on server
import { MapContainer } from 'react-leaflet'

// ✅ CORRECT - Dynamic import
const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => <div>Memuat peta...</div>
})
```

### 4. Dual Scoring Systems

#### IKSI Survey (Existing)
- **Model**: `Survey` - Weighted scoring with A/B/C/D classification
- **Engine**: `lib/scoring/engine.js` - Implements Weighted Sum Model (WSM)
- **Config**: `config/survey-{utama|tersier}*.json` - Dynamic weights & grading thresholds
- **Normalization**: Handles boolean, ordinal, percentage, numeric inputs → [0,1] scale
- **API**: `app/api/surveys/route.js` - CRUD + `/calculate-score` endpoint

#### PAI Asset Profiling (Sprint 2)
- **Model**: `PAI` - Structured asset data with photo support
- **Types**: `'saluran'` (channel) or `'bangunan'` (structure)
- **Photos**: `Photo` model → Supabase Storage integration (`lib/supabase.js`)
- **Priority System**: `priorityScore` (1-5), `priorityStatus`, `priorityNotes` for maintenance prioritization
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

## 🔧 Development Workflows

### Local Setup
```bash
npm install
npm run db:generate              # After schema changes
node scripts/create-dummy-user.js # Create test admin
node scripts/seed-configs.js      # Seed survey configs
npm run dev                       # Start dev server
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
import { AuditLogger } from '@/lib/audit'

export async function POST(request) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session.user.role, PERMISSIONS.X)) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }
  
  // ... operation ...
  
  await AuditLogger.log({
    userId: session.user.id,
    action: 'CREATE',
    entityType: 'Feature',
    entityId: result.id,
    newValues: result
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