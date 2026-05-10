import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const secret = process.env.NEXTAUTH_SECRET

  const token = secret
    ? await getToken({ req, secret })
    : null

  const needsAuth =
    path.startsWith('/contactos') ||
    path.startsWith('/perfil') ||
    path.startsWith('/admin') ||
    path.startsWith('/recomendaciones')

  if (needsAuth && !token) {
    const login = new URL('/login', req.url)
    login.searchParams.set('callbackUrl', path + req.nextUrl.search)
    return NextResponse.redirect(login)
  }

  if (path.startsWith('/admin') && token && token.role !== 'admin') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  if (path.startsWith('/recomendaciones') && token && token.role !== 'admin') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/contactos/:path*',
    '/perfil/:path*',
    '/admin/:path*',
    '/recomendaciones',
    '/recomendaciones/:path*',
  ],
}
