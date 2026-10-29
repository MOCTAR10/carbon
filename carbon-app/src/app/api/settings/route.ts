import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Public settings endpoint — no auth required
// Only exposes price/currency (not admin-only config)
const PUBLIC_KEYS = ['monthly_price', 'currency', 'subscription_duration_days']

export async function GET() {
  try {
    const result = await query(
      `SELECT key, value FROM platform_settings WHERE key = ANY($1)`,
      [PUBLIC_KEYS]
    )
    const settings: Record<string, string> = {
      monthly_price: '250000',
      currency: 'FCFA',
      subscription_duration_days: '30',
    }
    for (const r of result.rows) {
      settings[r.key] = r.value
    }
    return NextResponse.json(settings)
  } catch {
    // If table doesn't exist yet, return defaults
    return NextResponse.json({
      monthly_price: '250000',
      currency: 'FCFA',
      subscription_duration_days: '30',
    })
  }
}
