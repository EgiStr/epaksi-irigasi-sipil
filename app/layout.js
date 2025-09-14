import './globals.css'
import NextAuthProvider from '../components/NextAuthProvider'

export const metadata = {
  title: 'Sistem Pemetaan Irigasi Sipil',
  description: 'Sistem informasi pemetaan daerah irigasi',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <NextAuthProvider>
          {children}
        </NextAuthProvider>
      </body>
    </html>
  )
}
