import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { jwtSecret } from '@/lib/jwt-secret'
import { isDisabledPath } from '@/lib/features'


const COOKIE = {
  admin:  'adm_token',
  expert: 'exp_token',
  user:   'token',
}

async function verifyRole(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret())
    return (payload.role as string) ?? null
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Paused modules (carbon market, AI assistant) ─────────────────────────
  if (isDisabledPath(pathname)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Fonctionnalité non disponible' }, { status: 404 })
    }
    const home = pathname.startsWith('/admin') ? '/admin' : pathname.startsWith('/partner') ? '/' : '/dashboard'
    return NextResponse.redirect(new URL(home, request.url))
  }

  // ── Admin routes (except /admin/login) ──────────────────────────────────
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = request.cookies.get(COOKIE.admin)?.value
    if (!token) return NextResponse.redirect(new URL('/admin/login', request.url))
    const role = await verifyRole(token)
    if (role !== 'admin') return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // ── Already-logged-in admin visits /admin/login → skip to /admin ─────────
  if (pathname.startsWith('/admin/login')) {
    const token = request.cookies.get(COOKIE.admin)?.value
    if (token && (await verifyRole(token)) === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  // ── Expert routes (except /expert/login) ────────────────────────────────
  if (pathname.startsWith('/expert') && !pathname.startsWith('/expert/login')) {
    const token = request.cookies.get(COOKIE.expert)?.value
    if (!token) return NextResponse.redirect(new URL('/expert/login', request.url))
    const role = await verifyRole(token)
    if (role !== 'expert') return NextResponse.redirect(new URL('/expert/login', request.url))
  }

  // ── Already-logged-in expert visits /expert/login → skip to /expert ──────
  if (pathname.startsWith('/expert/login')) {
    const token = request.cookies.get(COOKIE.expert)?.value
    if (token && (await verifyRole(token)) === 'expert') {
      return NextResponse.redirect(new URL('/expert', request.url))
    }
  }

  // ── Dashboard: redirect admins/experts to their portal ───────────────────
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/') || pathname === '/subscription') {
    const token = request.cookies.get(COOKIE.user)?.value
    if (token) {
      const role = await verifyRole(token)
      if (role === 'expert') return NextResponse.redirect(new URL('/expert', request.url))
      if (role === 'admin')  return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*', '/expert/:path*', '/dashboard', '/dashboard/:path*', '/subscription',
    '/partner', '/partner/:path*',
    '/api/partner/:path*', '/api/partners', '/api/partners/:path*', '/api/market/:path*',
    '/api/puro/:path*', '/api/vvb-registry', '/api/admin/projects/:path*', '/api/admin/credits/:path*',
    '/api/auth/partner-me', '/api/rag/:path*', '/api/admin/rag/:path*',
  ],
}
