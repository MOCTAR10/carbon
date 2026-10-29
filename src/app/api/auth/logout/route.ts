import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })
  // Clear all portal cookies so no cross-portal session survives
  for (const name of ['token', 'adm_token', 'exp_token', 'cnc_token']) {
    response.cookies.set(name, '', { maxAge: 0, path: '/' })
  }
  return response
}
