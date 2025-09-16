import './globals.css'
import NextAuthProvider from '../components/NextAuthProvider'
import { SidebarProvider } from '../contexts/SidebarContext'

export const metadata = {
  title: 'Sistem Pemetaan Irigasi Sipil',
  description: 'Sistem informasi pemetaan daerah irigasi',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <NextAuthProvider>
          <SidebarProvider>
            {children}
          </SidebarProvider>
        </NextAuthProvider>
      </body>
    </html>
  )
}
