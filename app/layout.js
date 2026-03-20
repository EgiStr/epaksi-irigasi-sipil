import './globals.css'
import NextAuthProvider from '../components/NextAuthProvider'
import { SidebarProvider } from '../contexts/SidebarContext'
import { unstable_cache } from 'next/cache'
import { prisma } from '../lib/prisma'

export const metadata = {
  title: 'Sistem Pengelolaan Irigasi Daerah',
  description: 'Sistem informasi Pengelolaan daerah irigasi',
}

// Ping the database at most once every 24 hours using Next.js cache revalidation
const keepAliveDB = unstable_cache(
  async () => {
    await prisma.$queryRaw`SELECT 1`
    return { ok: true }
  },
  ['db-keep-alive'],
  { revalidate: 86400 }
)

export default async function RootLayout({ children }) {
  // Keep database alive - cached and revalidated every 24 hours (no cronjob needed)
  try {
    await keepAliveDB()
  } catch {
    // Silently fail - keep-alive is non-critical
  }

  return (
    <html lang="id">
      <body suppressHydrationWarning={true}>
        <NextAuthProvider>
          <SidebarProvider>
            {children}
          </SidebarProvider>
        </NextAuthProvider>
      </body>
    </html>
  )
}
