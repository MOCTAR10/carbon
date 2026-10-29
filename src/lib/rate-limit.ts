// Minimal in-memory fixed-window rate limiter. Production runs a single PM2 fork, so one
// process-wide map is authoritative; it resets on restart, which is acceptable for brute-force damping.
import type { NextRequest } from 'next/server'

const buckets = new Map<string, { count: number; resetAt: number }>()

export function clientIp(request: NextRequest) {
  return request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown'
}

/** Count one hit for `key`; returns seconds to wait when over `limit` within `windowMs`, else 0. */
export function rateLimit(key: string, limit: number, windowMs: number): number {
  const now = Date.now()
  if (buckets.size > 10_000) {
    buckets.forEach((b, k) => { if (b.resetAt <= now) buckets.delete(k) })
  }
  const b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return 0
  }
  b.count++
  return b.count > limit ? Math.ceil((b.resetAt - now) / 1000) : 0
}

export function resetRateLimit(key: string) {
  buckets.delete(key)
}
