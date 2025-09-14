'use client'

import { useRequireAuth } from '../hooks/useAuth'
import { useRouter } from 'next/navigation'
import Layout from '../components/Layout'
import Home from '../components/Home'

export default function HomePage() {
  const { loading } = useRequireAuth()
  const router = useRouter()

  const handleNavigate = (page) => {
    // Handle navigation from Home component
    switch(page) {
      case 'peta':
        router.push('/peta')
        break
      case 'users':
        router.push('/users')
        break
      default:
        router.push('/')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <Layout>
      <Home onNavigate={handleNavigate} />
    </Layout>
  )
}
