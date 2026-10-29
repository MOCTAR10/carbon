import { NextRequest, NextResponse } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const assessmentId = request.nextUrl.searchParams.get('assessmentId')
    if (!assessmentId) return NextResponse.json({ error: 'assessmentId requis' }, { status: 400 })

    const accessCheck = await query(
      'SELECT a.id FROM assessments a JOIN sites s ON a.site_id = s.id WHERE a.id = $1 AND s.company_id = $2',
      [assessmentId, session.companyId]
    )
    if (accessCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Bilan non trouvé' }, { status: 404 })
    }

    const result = await query(
      'SELECT * FROM emission_entries WHERE assessment_id = $1 ORDER BY year, month, category, subcategory, created_at',
      [assessmentId]
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Emissions fetch error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { assessmentId, entries } = await request.json()
    if (!assessmentId || !entries || !Array.isArray(entries)) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    const accessCheck = await query(
      'SELECT a.id FROM assessments a JOIN sites s ON a.site_id = s.id WHERE a.id = $1 AND s.company_id = $2',
      [assessmentId, session.companyId]
    )
    if (accessCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Bilan non trouvé' }, { status: 404 })
    }

    const { insertedEntries, totals } = await withTransaction(async (client) => {
      // Delete all existing entries — rolled back automatically if any insert fails
      await client.query('DELETE FROM emission_entries WHERE assessment_id = $1', [assessmentId])

      const insertedEntries = []
      for (const entry of entries) {
        const result = await client.query(
          `INSERT INTO emission_entries
           (assessment_id, category, subcategory, emission_factor_id, factor_name, quantity, unit,
            factor_value, total_co2eq, scope, ghg_category, iso_category, description, source_characterization, month, year)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
          [
            assessmentId,
            entry.category,
            entry.subcategory,
            entry.emissionFactorId,
            entry.factorName,
            entry.quantity,
            entry.unit,
            entry.factorValue,
            entry.totalCo2eq,
            entry.scope,
            entry.ghgCategory,
            entry.isoCategory,
            entry.description || null,
            entry.sourceCharacterization || null,
            entry.month || 0,
            entry.year || 0,
          ]
        )
        insertedEntries.push(result.rows[0])
      }

      const totals = await client.query(
        `SELECT
          COALESCE(SUM(total_co2eq), 0) as total,
          COALESCE(SUM(CASE WHEN scope = 1 THEN total_co2eq ELSE 0 END), 0) as scope1,
          COALESCE(SUM(CASE WHEN scope = 2 THEN total_co2eq ELSE 0 END), 0) as scope2,
          COALESCE(SUM(CASE WHEN scope = 3 THEN total_co2eq ELSE 0 END), 0) as scope3
         FROM emission_entries WHERE assessment_id = $1`,
        [assessmentId]
      )

      await client.query(
        'UPDATE assessments SET total_co2eq = $1, scope1_co2eq = $2, scope2_co2eq = $3, scope3_co2eq = $4, updated_at = NOW() WHERE id = $5',
        [totals.rows[0].total, totals.rows[0].scope1, totals.rows[0].scope2, totals.rows[0].scope3, assessmentId]
      )

      return { insertedEntries, totals }
    })

    return NextResponse.json({ entries: insertedEntries, totals: totals.rows[0] }, { status: 201 })
  } catch (error) {
    console.error('Emissions save error:', error)
    return NextResponse.json({ error: 'Erreur lors de la sauvegarde' }, { status: 500 })
  }
}
