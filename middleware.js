import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { canAccessRoute, ROLE_HIERARCHY } from './lib/permissions'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage = req.nextUrl.pathname.startsWith('/login')
    const isApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth')

    // Allow API auth routes
    if (isApiAuthRoute) {
      return NextResponse.next()
    }

    // If user is on login page
    if (isAuthPage) {
      // If already authenticated, redirect to home
      if (isAuth) {
        return NextResponse.redirect(new URL('/', req.url))
      }
      // If not authenticated, allow access to login page
      return NextResponse.next()
    }

    // For all other protected routes
    if (!isAuth) {
      // Redirect to login with callback URL
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check role-based access
    const userRole = token.role
    const currentPath = req.nextUrl.pathname

    // Define role requirements for different routes
    const routeAccess = {
      '/users': ['ADMIN', 'SUPERADMIN'],
      '/analytics': ['ADMIN', 'SUPERADMIN'],
      '/settings': ['SUPERADMIN'],
      '/audit': ['SUPERADMIN']
    }

    // Check if route requires specific roles
    for (const [route, allowedRoles] of Object.entries(routeAccess)) {
      if (currentPath.startsWith(route)) {
        if (!allowedRoles.includes(userRole)) {
          // Redirect to unauthorized page or home
          return NextResponse.redirect(new URL('/?error=unauthorized', req.url))
        }
      }
    }

    // Check permission-based access using our permission system
    if (!canAccessRoute(userRole, currentPath)) {
      return NextResponse.redirect(new URL('/?error=permission-denied', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow API auth routes without token
        if (req.nextUrl.pathname.startsWith('/api/auth')) {
          return true
        }
        
        // Allow login page access without token
        if (req.nextUrl.pathname.startsWith('/login')) {
          return true
        }

        // For all other routes, require valid token with role
        const validRoles = ['SUPERADMIN', 'ADMIN', 'SURVEYOR', 'VIEWER']
        return token && validRoles.includes(token.role)
      }
    }
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|assets).*)',
  ]
}
