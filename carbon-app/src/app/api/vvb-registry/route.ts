/**
 * GET /api/vvb-registry — list known VVBs
 * Auth: admin (for assignment UI)
 */

import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const result = await query(
    `SELECT * FROM vvb_registry WHERE active = true ORDER BY name`,
    []
  )
  return NextResponse.json({ vvbs: result.rows })
}
