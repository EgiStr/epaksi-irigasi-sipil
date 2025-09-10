import './globals.css'

export const metadata = {
  title: 'Sistem Pemetaan Irigasi Sipil',
  description: 'Sistem informasi pemetaan daerah irigasi',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
