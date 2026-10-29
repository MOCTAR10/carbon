import { NextRequest, NextResponse } from 'next/server'
import { PORTAL_COOKIE } from '@/lib/auth'

// Clears only the cookie for the specified portal — never touches other portals.
// Used by portal login pages to clean up a cookie that was set for the wrong role.
export async function POST(request: NextRequest) {
  const portal = (request.nextUrl.searchParams.get('portal') ?? 'user') as keyof typeof PORTAL_COOKIE
  const cookieName = PORTAL_COOKIE[portal] ?? PORTAL_COOKIE.user

  const response = NextResponse.json({ success: true })
  response.cookies.set(cookieName, '', { maxAge: 0, path: '/' })
  return response
}
