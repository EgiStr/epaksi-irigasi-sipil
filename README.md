# 🌊 Sistem Informasi Irigasi Way Rarem

Aplikasi web komprehensif untuk manajemen, visualisasi, dan penilaian infrastruktur sistem irigasi berbasis Next.js dengan integrasi PostgreSQL PostGIS dan peta interaktif Leaflet. Sistem ini dikembangkan khusus untuk pengelolaan data irigasi Way Rarem dengan fitur survey dan analytics yang lengkap.

## ✨ Fitur Utama

### 🗺️ **Peta Interaktif & Geospasial**
- Visualisasi data irigasi dengan Leaflet Maps dan PostGIS
- Layer management dengan kontrol opacity dan visibilitas
- Upload dan parsing file KML/GeoJSON
- Spatial queries dan filtering berdasarkan bounding box
- Interactive popups dengan detail feature properties
- Responsive map controls dan mobile-friendly

### 🔐 **Sistem Autentikasi & Autorisasi**
- NextAuth.js dengan kredensial login
- Role-Based Access Control (RBAC) dengan permissions granular
- Multi-role support: SUPER_ADMIN, ADMIN, USER, VIEWER
- Session management dan secure logout
- Password hashing dengan bcryptjs

### 📊 **Manajemen Data & Analytics**
- **Feature Management**: CRUD operations untuk data geospasial
- **Survey System**: Penilaian kondisi infrastruktur dengan scoring
- **User Management**: Admin panel untuk manajemen pengguna
- **Audit Logs**: Tracking semua aktivitas sistem
- **Analytics Dashboard**: Statistik dan visualisasi data
- **Config Management**: Pengaturan survey dan sistem

### 📋 **Survey & Penilaian**
- **Survey Configuration**: Template survey untuk irigasi utama/tersier
- **Scoring Engine**: Sistem penilaian otomatis berdasarkan kriteria
- **Survey Analytics**: Statistik dan laporan hasil survey
- **Historical Data**: Tracking perubahan kondisi infrastruktur
- **Multi-scheme Support**: Survey untuk sistem utama dan tersier

### 🔍 **Search & Filter**
- Advanced filtering berdasarkan scheme, source layer, dan properties
- Full-text search untuk feature names dan descriptions
- Date range filtering untuk survey data
- Pagination support untuk performa optimal
- Export capabilities untuk data dan laporan

## 🛠️ Tech Stack

### **Framework & Runtime**
- **Next.js 15.5.2** - React framework dengan App Router
- **React 19.1** - UI library dengan modern hooks
- **Node.js** - Runtime environment

### **Database & ORM**
- **PostgreSQL** - Relational database
- **PostGIS** - Spatial database extension
- **Prisma ORM 6.15** - Type-safe database client
- **Database Migrations** - Schema versioning dan deployment

### **Authentication & Security**
- **NextAuth.js 4.24** - Authentication framework
- **bcryptjs** - Password hashing
- **RBAC System** - Custom role-based access control
- **CSRF Protection** - Built-in security features

### **Maps & Geospatial**
- **Leaflet 1.9.4** - Interactive maps library
- **React-Leaflet 5.0** - React bindings untuk Leaflet
- **PostGIS** - Spatial data storage dan queries
- **GeoJSON/KML** - Geospatial data formats

### **UI & Styling**
- **Tailwind CSS 4.1** - Utility-first CSS framework
- **Lucide React** - Modern icon library
- **Responsive Design** - Mobile-first approach
- **Custom CSS** - Additional styling untuk map components

### **File Processing**
- **@mapbox/togeojson** - KML to GeoJSON conversion
- **xmldom** - XML parsing untuk KML files
- **File Upload API** - Secure file upload dengan validation

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** - JavaScript runtime
- **npm atau yarn** - Package manager
- **PostgreSQL 13+** - Database server
- **PostGIS extension** - Spatial database support

### Installation

1. **Clone repository**
```bash
git clone https://github.com/EgiStr/epaksi-irigasi-sipil
cd epaksi-irigasi-sipil
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env.local
# Edit .env.local dengan konfigurasi database dan secrets
```

4. **Setup database**
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (development)
npm run db:push

# Atau run migrations (production)
npm run db:migrate
```

5. **Seed initial data** (opsional)
```bash
# Create admin user dan initial configs
node scripts/create-dummy-user.js
node scripts/seed-configs.js
```

6. **Start development server**
```bash
npm run dev
```

7. **Open browser**
```
http://localhost:3000
```

### Default Admin Account
```
Email: admin@wayrarem.id
Password: password123
Role: SUPER_ADMIN
```

## 🗂️ Project Structure

```
sipil-irrigation-map-system/
├── app/                          # Next.js App Router
│   ├── admin/                    # Admin-only pages
│   │   ├── analytics/           # Dashboard analytics
│   │   ├── audit-logs/          # System audit logs
│   │   ├── configs/             # Survey configurations
│   │   ├── features/            # Feature management
│   │   ├── settings/            # System settings
│   │   ├── surveys/             # Survey management
│   │   └── users/               # User management
│   ├── api/                      # API endpoints
│   │   ├── auth/                # NextAuth configuration
│   │   ├── features/            # Feature CRUD API
│   │   ├── irigasi/             # Legacy irrigation API
│   │   ├── layers/              # Layer management API
│   │   ├── survey-configs/      # Survey config API
│   │   ├── surveys/             # Survey data API
│   │   ├── upload/              # File upload API
│   │   └── users/               # User management API
│   ├── login/                    # Authentication pages
│   ├── peta/                     # Map visualization page
│   ├── tabel/                    # Data table views
│   ├── users/                    # User profile pages
│   ├── globals.css              # Global styles
│   ├── layout.js                # Root layout
│   └── page.js                  # Home dashboard
├── components/                   # React components
│   ├── admin/                   # Admin-specific components
│   │   ├── AdminDashboard.jsx   # Main admin dashboard
│   │   ├── AnalyticsDashboard.jsx # Analytics view
│   │   ├── AuditLogs.jsx        # Audit log viewer
│   │   ├── FeatureManagement.jsx # Feature CRUD interface
│   │   ├── SurveyManagement.jsx # Survey management
│   │   └── UserManagement.jsx   # User admin panel
│   ├── auth/                    # Authentication components
│   ├── maps/                    # Map-related components
│   ├── modals/                  # Modal dialogs
│   ├── FileUpload.jsx           # File upload component
│   ├── Home.jsx                 # Homepage dashboard
│   ├── IrigasiMap.jsx          # Main map wrapper
│   ├── LeafletMap.jsx          # Leaflet implementation
│   ├── Layout.jsx              # Main layout component
│   ├── Sidebar.jsx             # Navigation sidebar
│   └── TableDaerahIrigasi.jsx  # Data table
├── hooks/                       # Custom React hooks
│   ├── useAuth.js              # Authentication hooks
│   ├── useIrigasiData.js       # Data fetching hooks
│   └── useMap.js               # Map-related hooks
├── lib/                         # Utility libraries
│   ├── kml-parser.js           # KML file processing
│   ├── permissions.js          # RBAC permissions
│   ├── prisma.js               # Prisma client
│   └── scoring/                # Survey scoring engine
├── prisma/                      # Database schema & migrations
│   ├── migrations/             # Database migrations
│   ├── schema.prisma           # Database schema
│   └── seed.js                 # Database seeder
├── scripts/                     # Utility scripts
│   ├── create-dummy-user.js    # Create admin user
│   └── seed-configs.js         # Seed survey configs
├── config/                      # Configuration files
│   ├── survey-utama.json       # Survey config utama
│   └── survey-tersier.json     # Survey config tersier
└── public/                      # Static assets
    ├── data_irigasi.json       # Sample irrigation data
    ├── rbi.json.geojson        # Boundary data
    └── assets/                 # Images dan icons
```

## 🗄️ Database Schema

### **Core Tables**

```prisma
// User management dengan RBAC
model User {
  id       String @id @default(cuid())
  email    String @unique
  password String
  name     String?
  role     Role   @default(ADMIN)
  org      String?
  status   String @default("ACTIVE")
}

// Geospatial features dengan PostGIS
model Feature {
  id           String   @id @default(cuid())
  featureId    String   @unique
  name         String?
  type         String?
  scheme       String?  // 'utama' | 'tersier'
  sourceLayer  String
  props        Json?
  geom         Unsupported("geometry")?
  surveys      Survey[]
}

// Survey system untuk penilaian infrastruktur
model Survey {
  id          String   @id @default(cuid())
  featureId   String
  scheme      String   // 'utama' | 'tersier'
  responses   Json     // Survey responses
  totalScore  Float?
  scoreClass  String?  // 'A', 'B', 'C', 'D'
  userId      String
  feature     Feature  @relation(fields: [featureId], references: [featureId])
  user        User     @relation(fields: [userId], references: [id])
}

// Survey configurations
model SurveyConfig {
  id          String @id @default(cuid())
  scheme      String @unique // 'utama' | 'tersier'
  name        String
  description String?
  config      Json   // Survey structure
  isActive    Boolean @default(false)
}

// Layer management
model Layer {
  id           String  @id @default(cuid())
  layerId      String  @unique
  name         String
  category     String?
  style        Json    @default("{}")
  zIndex       Int     @default(0)
  visible      Boolean @default(true)
  opacity      Float   @default(1.0)
  featureCount Int     @default(0)
}
```

### **RBAC Roles & Permissions**

```javascript
// Role hierarchy
SUPER_ADMIN → ADMIN → USER → VIEWER

// Permission categories
- FEATURE_*: Feature management (view, create, edit, delete)
- SURVEY_*: Survey operations (view, create, edit, delete)
- USER_*: User management (view, create, edit, delete)
- LAYER_*: Layer management (view, create, edit, delete)
- CONFIG_*: System configuration (view, edit)
- AUDIT_*: Audit log access (view)
```

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start development server dengan Turbopack
npm run build            # Build untuk production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run db:generate      # Generate Prisma client
npm run db:push         # Push schema ke database (dev)
npm run db:migrate      # Run database migrations (prod)
npx prisma studio       # Open Prisma Studio
npx prisma migrate dev  # Create new migration

# Utility scripts
node scripts/create-dummy-user.js    # Create admin user
node scripts/seed-configs.js        # Seed survey configurations
```

## 🌐 API Endpoints

### **Authentication**
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout
- `GET /api/auth/session` - Get current session

### **Features Management**
- `GET /api/features` - List features dengan spatial filtering
- `POST /api/features` - Create new feature
- `GET /api/features/[featureId]` - Get feature detail
- `PUT /api/features/[featureId]` - Update feature
- `DELETE /api/features/[featureId]` - Delete feature

### **Survey System**
- `GET /api/surveys` - List surveys dengan filtering
- `POST /api/surveys` - Create new survey
- `POST /api/surveys/calculate-score` - Calculate survey score
- `GET /api/surveys/stats` - Survey statistics

### **Layer Management**
- `GET /api/layers` - List all layers
- `POST /api/layers` - Create new layer
- `PUT /api/layers/[id]` - Update layer
- `DELETE /api/layers/[id]` - Delete layer

### **Survey Configuration**
- `GET /api/survey-configs` - List survey configs
- `POST /api/survey-configs` - Create config
- `POST /api/survey-configs/activate` - Activate config

### **User Management** (Admin only)
- `GET /api/users` - List users dengan pagination
- `POST /api/users` - Create new user
- `PUT /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user

### **File Upload**
- `POST /api/upload` - Upload KML/GeoJSON files

## 📤 Upload Data Geospasial

### **Supported Formats**
- **KML Files** (`.kml`) - Google Earth format
- **GeoJSON Files** (`.geojson`) - Standard geospatial format

### **Upload Process**
1. **Akses Feature Management** (Admin only)
2. **Klik Upload Button** pada toolbar
3. **Select File** dan isi metadata:
   - Source Layer (required)
   - Name (optional)
   - Type/Category (optional)
   - Scheme: 'utama' atau 'tersier'
4. **Upload & Process** - File akan diparse dan features akan disimpan

### **Data Processing**
- **Geometry Validation** - Memastikan geometry valid
- **CRS Transformation** - Convert ke EPSG:4326 (WGS84)
- **Batch Insert** - Optimized untuk file besar
- **Duplicate Handling** - Mencegah data duplikat
- **Property Extraction** - Parse metadata dari KML descriptions

## 🔍 Survey System

### **Survey Configuration**
```json
{
  "scheme": "utama",
  "categories": [
    {
      "id": "kondisi_fisik",
      "name": "Kondisi Fisik Bangunan",
      "weight": 0.4,
      "questions": [
        {
          "id": "struktur_utama",
          "text": "Kondisi struktur utama bangunan",
          "type": "radio",
          "options": [
            { "value": "baik", "label": "Baik", "score": 4 },
            { "value": "sedang", "label": "Sedang", "score": 3 },
            { "value": "rusak_ringan", "label": "Rusak Ringan", "score": 2 },
            { "value": "rusak_berat", "label": "Rusak Berat", "score": 1 }
          ]
        }
      ]
    }
  ]
}
```

### **Scoring System**
- **Weighted Scoring** - Kategori memiliki bobot berbeda
- **Automatic Calculation** - Score dihitung otomatis
- **Classification** - A (90-100), B (80-89), C (70-79), D (<70)
- **Historical Tracking** - Menyimpan perubahan kondisi

## 📊 Analytics & Reporting

### **Dashboard Metrics**
- Total features per layer dan scheme
- Survey completion rates
- Score distribution dan trends
- User activity statistics
- System performance metrics

### **Data Visualization**
- **Charts**: Bar, line, pie charts untuk survey data
- **Maps**: Choropleth untuk visualisasi score
- **Tables**: Sortable dan filterable data tables
- **Export**: PDF/Excel export untuk reports

## 🔒 Security Features

### **Authentication Security**
- **Password Hashing** - bcryptjs dengan salt
- **Session Management** - Secure session storage
- **CSRF Protection** - Built-in Next.js protection
- **Rate Limiting** - API rate limiting (planned)

### **Authorization**
- **RBAC System** - Granular permission control
- **Route Protection** - Middleware untuk protected routes
- **API Security** - Endpoint-level authorization
- **Data Isolation** - User-based data access control

### **Data Security**
- **Input Validation** - Comprehensive input sanitization
- **SQL Injection Prevention** - Prisma ORM protection
- **File Upload Security** - MIME type dan size validation
- **Audit Logging** - Complete activity tracking

## 📱 Mobile Support

### **Responsive Design**
- **Mobile-First** - Optimized untuk mobile devices
- **Touch Controls** - Touch-friendly map interactions
- **Adaptive Layout** - Flexible sidebar dan navigation
- **Performance** - Optimized untuk mobile networks

### **PWA Features** (Planned)
- **Offline Support** - Cache critical data
- **App Installation** - Install sebagai native app
- **Push Notifications** - Survey reminders
- **Background Sync** - Sync data saat online

## 🚀 Deployment

### **Environment Variables**
```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/irrigation_db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# App Configuration
NEXT_PUBLIC_APP_NAME="Sistem Irigasi Way Rarem"
NEXT_PUBLIC_MAP_CENTER_LAT="-5.2"
NEXT_PUBLIC_MAP_CENTER_LNG="105.2"
```

### **Production Deployment**
```bash
# Build aplikasi
npm run build

# Run database migrations
npm run db:migrate

# Start production server
npm start
```

### **Docker Support** (Planned)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🧪 Testing

### **Testing Stack** (Planned)
- **Jest** - Unit testing framework
- **React Testing Library** - Component testing
- **Playwright** - E2E testing
- **Prisma Testing** - Database testing utilities

### **Test Commands**
```bash
npm run test              # Run unit tests
npm run test:watch        # Watch mode
npm run test:e2e          # E2E tests
npm run test:coverage     # Coverage report
```

## 📈 Performance Optimization

### **Frontend Optimization**
- **Code Splitting** - Automatic route-based splitting
- **Image Optimization** - Next.js Image component
- **Bundle Analysis** - Webpack bundle analyzer
- **Caching** - Strategic browser caching

### **Database Optimization**
- **Indexing** - Spatial dan B-tree indexes
- **Query Optimization** - Efficient Prisma queries
- **Connection Pooling** - Database connection management
- **Pagination** - Limit data transfer

### **Map Performance**
- **Lazy Loading** - Load map components on demand
- **Feature Clustering** - Group nearby features
- **Tile Caching** - Cache map tiles
- **Viewport Filtering** - Load only visible features

## 🤝 Contributing

### **Development Workflow**
1. **Fork repository**
2. **Create feature branch** (`git checkout -b feature/amazing-feature`)
3. **Follow coding standards** (ESLint + Prettier)
4. **Write tests** untuk new features
5. **Update documentation** jika diperlukan
6. **Commit changes** (`git commit -m 'Add amazing feature'`)
7. **Push to branch** (`git push origin feature/amazing-feature`)
8. **Open Pull Request**

### **Code Standards**
- **ESLint** - JavaScript linting
- **Prettier** - Code formatting
- **Conventional Commits** - Commit message format
- **TypeScript** - Gradual migration (planned)

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

### **Core Technologies**
- [Next.js](https://nextjs.org/) - The React Framework
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [NextAuth.js](https://next-auth.js.org/) - Authentication for Next.js
- [Leaflet](https://leafletjs.com/) - Open-source JavaScript library for interactive maps
- [PostGIS](https://postgis.net/) - Spatial database extender for PostgreSQL
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

### **Special Thanks**
- **Tim Pengembang** Way Rarem Irrigation Project
- **Komunitas Open Source** untuk tools dan libraries
- **PostgreSQL Community** untuk database excellence
- **React Community** untuk ecosystem yang luar biasa

## 📞 Support & Contact

### **Technical Support**
- **GitHub Issues**: [Repository Issues](https://github.com/EgiStr/epaksi-irigasi-sipil/issues)

### **Project Information**
- **Version**: v1.0.0
- **Status**: Active Development
- **Last Updated**: September 2025
- **Maintainer**: Eggi Satria | Happy Syahrul Ramadhan

---

**🌊 Made with ❤️ for Indonesian Irrigation Management**

*Sistem Informasi Irigasi Way Rarem - Mendukung Ketahanan Pangan Indonesia*
