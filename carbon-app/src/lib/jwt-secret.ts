// Shared by lib/auth (Node) and middleware (Edge) — no Node-only imports here.
const DEV_FALLBACK = 'carbontrack-secret-key-change-in-production'

let cached: Uint8Array | null = null

/**
 * JWT signing key. In production a missing JWT_SECRET is a hard error: falling back to the
 * public default would let anyone mint admin tokens. Resolved lazily so `next build` never needs it.
 */
export function jwtSecret(): Uint8Array {
  if (cached) return cached
  const value = process.env.JWT_SECRET
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is not set — refusing to sign or verify sessions with the default key')
    }
    cached = new TextEncoder().encode(DEV_FALLBACK)
    return cached
  }
  cached = new TextEncoder().encode(value)
  return cached
}
