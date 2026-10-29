import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession('admin')
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    const result = await query(`SELECT key, value, label, updated_at FROM platform_settings ORDER BY key`, [])
    const settings: Record<string, { value: string; label: string; updatedAt: string }> = {}
    for (const r of result.rows) {
      settings[r.key] = { value: r.value, label: r.label, updatedAt: r.updated_at }
    }
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Admin settings GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession('admin')
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    const body = await request.json()
    const updates = Object.entries(body as Record<string, string>)
      .filter(([, v]) => typeof v === 'string' || typeof v === 'number')

    if (updates.length > 0) {
      // Single query with unnest — avoids N round-trips
      const keys   = updates.map(([k]) => k)
      const values = updates.map(([, v]) => String(v))
      await query(
        `UPDATE platform_settings SET value = u.value, updated_at = NOW()
         FROM (SELECT unnest($1::text[]) AS key, unnest($2::text[]) AS value) AS u
         WHERE platform_settings.key = u.key`,
        [keys, values]
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin settings PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
