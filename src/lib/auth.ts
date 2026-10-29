import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'carbontrack-secret-key-change-in-production'
)

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createToken(payload: { userId: number; email: string; companyId: number | null; role: string; partnerId?: number | null }): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as { userId: number; email: string; companyId: number | null; role: string; partnerId?: number | null }
  } catch {
    return null
  }
}

// Each portal gets its own cookie so sessions never collide
export const PORTAL_COOKIE = {
  admin:  'adm_token',
  expert: 'exp_token',
  user:   'token',
} as const

type Portal = keyof typeof PORTAL_COOKIE

export async function getSession(portal: Portal = 'user') {
  const cookieName = PORTAL_COOKIE[portal]
  if (!cookieName) return null // unknown portal (e.g. legacy ?portal=cnc)
  const token = cookies().get(cookieName)?.value
  if (!token) return null
  return verifyToken(token)
}
