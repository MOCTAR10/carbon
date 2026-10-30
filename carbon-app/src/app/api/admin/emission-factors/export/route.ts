import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getAdminSession, forbidden } from '@/lib/admin'
import { toFactor } from '@/lib/factor-library'
import { CSV_COLUMNS, csvCell, fromLibrary } from '@/lib/factor-import'

export const dynamic = 'force-dynamic'

/** Whole library as CSV (";" separated, UTF-8 with BOM for Excel) — also the template for imports. */
export async function GET() {
  if (!(await getAdminSession())) return forbidden()
  try {
    const { rows } = await query('SELECT * FROM emission_factors ORDER BY category, subcategory, id')
    const lines = rows.map(r => {
      const f = fromLibrary(toFactor(r))
      return CSV_COLUMNS.map(c => csvCell(c === 'recommended' ? f.is_recommended : f[c])).join(';')
    })
    const csv = '﻿' + [CSV_COLUMNS.join(';'), ...lines].join('\r\n') + '\r\n'
    const date = new Date().toISOString().slice(0, 10)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="facteurs-emission-${date}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[admin/emission-factors/export]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
