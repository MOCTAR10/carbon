import { NextRequest, NextResponse } from 'next/server'
import { withTransaction } from '@/lib/db'
import { getCompanySession, unauthorized, parseId, ownsAssessment, certificationLock, lockedResponse } from '@/lib/company'
import { getFactorMap } from '@/lib/factor-library'

export const dynamic = 'force-dynamic'

/**
 * Copilote "Remplacer" action: moves a bilan's quantities from one factor to another of the same unit
 * (typically a retired factor → its current replacement). Entries are re-valued from the library and the
 * proofs attached to the old factor follow, all in one transaction.
 */
export async function POST(req: NextRequest) {
  const session = await getCompanySession()
  if (!session) return unauthorized()
  const body = await req.json().catch(() => null)
  const assessmentId = parseId(body?.assessmentId)
  const fromId = typeof body?.from === 'string' ? body.from : ''
  const toId = typeof body?.to === 'string' ? body.to : ''
  if (!assessmentId || !fromId || !toId || fromId === toId) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  try {
    if (!(await ownsAssessment(assessmentId, session.companyId))) return NextResponse.json({ error: 'Bilan non trouvé' }, { status: 404 })
    if (await certificationLock(assessmentId)) return lockedResponse()
    const factors = await getFactorMap()
    const from = factors.get(fromId)
    const to = factors.get(toId)
    if (!from || !to) return NextResponse.json({ error: 'Facteur inconnu' }, { status: 400 })
    if (to.status !== 'active') return NextResponse.json({ error: 'Le facteur de remplacement doit être actif' }, { status: 400 })
    if (from.unit !== to.unit) return NextResponse.json({ error: `Unités différentes (${from.unit} / ${to.unit}) : remplacement impossible` }, { status: 400 })

    const moved = await withTransaction(async client => {
      // Same month already holding the target factor: quantities are added together
      const { rows } = await client.query(
        `SELECT month, year, SUM(quantity) AS quantity FROM emission_entries
         WHERE assessment_id = $1 AND emission_factor_id IN ($2, $3) GROUP BY month, year`,
        [assessmentId, fromId, toId]
      )
      const hadFrom = await client.query('SELECT 1 FROM emission_entries WHERE assessment_id = $1 AND emission_factor_id = $2 LIMIT 1', [assessmentId, fromId])
      if (!hadFrom.rowCount) return 0
      await client.query('DELETE FROM emission_entries WHERE assessment_id = $1 AND emission_factor_id IN ($2, $3)', [assessmentId, fromId, toId])
      for (const r of rows) {
        const q = Number(r.quantity)
        await client.query(
          `INSERT INTO emission_entries (assessment_id, category, subcategory, emission_factor_id, factor_name, quantity, unit,
             factor_value, total_co2eq, scope, ghg_category, iso_category, description, source_characterization, month, year)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [assessmentId, to.category, to.subcategory, to.id, to.nameFr, q, to.unit, to.factorTotal, q * to.factorTotal,
            to.scope, to.ghgCategory, to.isoCategory, `${to.nameFr} - ${to.source}`, to.region || null, r.month, r.year]
        )
      }
      await client.query('UPDATE audit_documents SET emission_factor_id = $3 WHERE assessment_id = $1 AND emission_factor_id = $2', [assessmentId, fromId, toId])
      await client.query(
        `UPDATE assessments a SET total_co2eq = t.total, scope1_co2eq = t.s1, scope2_co2eq = t.s2, scope3_co2eq = t.s3, updated_at = NOW()
         FROM (SELECT COALESCE(SUM(total_co2eq), 0) AS total,
                      COALESCE(SUM(total_co2eq) FILTER (WHERE scope = 1), 0) AS s1,
                      COALESCE(SUM(total_co2eq) FILTER (WHERE scope = 2), 0) AS s2,
                      COALESCE(SUM(total_co2eq) FILTER (WHERE scope = 3), 0) AS s3
               FROM emission_entries WHERE assessment_id = $1) t
         WHERE a.id = $1`,
        [assessmentId]
      )
      return rows.length
    })
    if (!moved) return NextResponse.json({ error: 'Ce facteur n’est pas utilisé dans le bilan' }, { status: 404 })
    return NextResponse.json({ moved, to: to.id })
  } catch (err) {
    console.error('[emissions/replace]', err)
    return NextResponse.json({ error: 'Remplacement impossible' }, { status: 500 })
  }
}
