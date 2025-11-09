import './globals.css'
import NextAuthProvider from '../components/NextAuthProvider'
import { SidebarProvider } from '../contexts/SidebarContext'

export const metadata = {
  title: 'Sistem Pengelolaan Irigasi Daerah',
  description: 'Sistem informasi Pengelolaan daerah irigasi',
}

export default function RootLayout({ children }) {
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
