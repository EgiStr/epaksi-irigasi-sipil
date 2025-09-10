# 🗺️ Sistem Pemetaan Irigasi Sipil

Aplikasi web untuk manajemen dan visualisasi data sistem irigasi berbasis Next.js dengan integrasi Prisma ORM dan peta interaktif menggunakan Leaflet.

## ✨ Fitur Utama

- 🗺️ **Peta Interaktif** - Visualisasi data irigasi dengan Leaflet Maps
- 📊 **Dashboard Analytics** - Statistik dan analisis data irigasi
- 📋 **Manajemen Data** - CRUD operations untuk data daerah irigasi
- 🔍 **Filter & Search** - Pencarian dan filter data yang mudah
- 📱 **Responsive Design** - Kompatibel dengan berbagai ukuran layar
- 🗄️ **Database Integration** - Menggunakan Prisma ORM dengan `POSTGRESQL + POSTGIS`

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19
- **Database**: `POSTGRESQL + POSTGIS` + Prisma ORM
- **Maps**: Leaflet + React-Leaflet
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm atau yarn

### Installation

1. **Clone repository**
```bash
git clone <repository-url>
cd sipil-irrigation-map-system
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup database**
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database (optional)
node prisma/seed.js
```

4. **Start development server**
```bash
npm run dev
```

5. **Open browser**
```
http://localhost:3000
```

## 📁 Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.js          # Root layout
│   └── page.js            # Home page
├── components/            # React components
│   ├── Home.jsx           # Dashboard home
│   ├── IrigasiMap.jsx     # Map wrapper component
│   ├── LeafletMap.jsx     # Leaflet map component
│   ├── Layout.jsx         # Main layout
│   ├── Sidebar.jsx        # Navigation sidebar
│   └── TableDaerahIrigasi.jsx
├── hooks/                 # Custom React hooks
│   └── useIrigasiData.js  # Data fetching hook
├── lib/                   # Utility libraries
│   └── prisma.js          # Prisma client
├── prisma/                # Database schema & migrations
│   ├── schema.prisma      # Database schema
│   ├── seed.js            # Database seeder
│   └── migrations/        # Migration files
└── public/                # Static assets
    ├── data_irigasi.json  # Sample irrigation data
    └── rbi.json.geojson   # Boundary data
```

## 🗄️ Database Schema

```prisma
model DaerahIrigasi {
  id            Int      @id @default(autoincrement())
  nama          String
  kecamatan     String
  desa          String
  luasLahan     Float
  jenisIrigasi  String
  kondisi       String
  tahunBangun   Int?
  latitude      Float?
  longitude     Float?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npx prisma studio    # Open Prisma Studio
npx prisma migrate   # Run database migrations
```

## 🌐 API Endpoints

- `GET /api/irigasi` - Get all irrigation areas
- `POST /api/irigasi` - Create new irrigation area
- `PUT /api/irigasi/[id]` - Update irrigation area
- `DELETE /api/irigasi/[id]` - Delete irrigation area

## 📋 Environment Variables

Create `.env` file in root directory:

```env
# Database
DATABASE_URL="file:./dev.db"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Database toolkit
- [Leaflet](https://leafletjs.com/) - Interactive maps library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

## 📞 Support

Jika Anda mengalami masalah atau memiliki pertanyaan, silakan buat issue di repository ini.

---

**Made with ❤️ for Indonesian Irrigation Management**+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
