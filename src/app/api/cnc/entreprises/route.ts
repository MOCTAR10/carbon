import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await query(
      `SELECT id, name, rccm, sector, logo_url, created_at
       FROM companies
       ORDER BY name ASC`
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('CNC entreprises error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
