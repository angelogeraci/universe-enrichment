import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/signout',
  '/public',
]

export async function middleware (req: NextRequest) {
  const { pathname } = req.nextUrl
  // Autoriser les chemins publics
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }
  // Vérifier la session NextAuth (JWT)
  const token = await getToken({ req, secret: process.env.AUTH_SECRET })
  if (!token) {
    // Rediriger toute tentative d'accès à une route privée vers /login
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }
  // Protection spécifique pour /admin
  if (pathname.startsWith('/admin') && token.role !== 'admin') {
    return NextResponse.redirect(new URL('/projects', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api/auth|_next|favicon.ico|login|signout|public).*)'],
} 