import { NextRequest, NextResponse } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { getCompanySession, unauthorized, parseId, certificationLock, lockedResponse } from '@/lib/company'
import { ALL_EMISSION_FACTORS, SCOPE_MAPPING, type EmissionFactor } from '@/lib/emission-factors'

export const dynamic = 'force-dynamic'

const FACTORS = new Map<string, EmissionFactor>(ALL_EMISSION_FACTORS.map(f => [f.id, f]))
const MAX_ENTRIES = 20_000
const MAX_QUANTITY = 1e10   // quantity is NUMERIC(15,4)
const MAX_TOTAL = 1e12      // total_co2eq is NUMERIC(15,2)

export async function GET(request: NextRequest) {
  try {
    const session = await getCompanySession()
    if (!session) return unauthorized()

    const assessmentId = parseId(request.nextUrl.searchParams.get('assessmentId'))
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

type IncomingEntry = { emissionFactorId?: unknown; quantity?: unknown; month?: unknown; year?: unknown }

export async function POST(request: NextRequest) {
  try {
    const session = await getCompanySession()
    if (!session) return unauthorized()

    const body = await request.json().catch(() => null)
    const assessmentId = parseId(body?.assessmentId)
    const entries: IncomingEntry[] | null = Array.isArray(body?.entries) ? body.entries : null
    if (!assessmentId || !entries || entries.length > MAX_ENTRIES) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    const accessCheck = await query(
      `SELECT a.id, a.year, COALESCE(a.start_month, 1) AS start_month, COALESCE(a.end_month, 12) AS end_month
       FROM assessments a JOIN sites s ON a.site_id = s.id WHERE a.id = $1 AND s.company_id = $2`,
      [assessmentId, session.companyId]
    )
    if (accessCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Bilan non trouvé' }, { status: 404 })
    }
    const assessment = accessCheck.rows[0]
    if (await certificationLock(assessmentId)) return lockedResponse()

    // Rebuild every row from the server's factor table: the client only chooses factor, period and quantity.
    const rows: unknown[][] = []
    for (const e of entries) {
      const factor = FACTORS.get(String(e.emissionFactorId))
      const quantity = Number(e.quantity)
      const month = Number(e.month)
      const year = Number(e.year)
      if (!factor) {
        return NextResponse.json({ error: `Facteur d'émission inconnu : ${String(e.emissionFactorId)}` }, { status: 400 })
      }
      if (!Number.isFinite(quantity) || quantity < 0 || quantity > MAX_QUANTITY || quantity * factor.factorTotal > MAX_TOTAL) {
        return NextResponse.json({ error: `Quantité invalide pour « ${factor.nameFr} »` }, { status: 400 })
      }
      if (year !== assessment.year || !Number.isInteger(month) || month < assessment.start_month || month > assessment.end_month) {
        return NextResponse.json({ error: `Période hors du périmètre du bilan (${factor.nameFr}, ${month}/${year})` }, { status: 400 })
      }
      if (quantity === 0) continue
      const scopeInfo = SCOPE_MAPPING[factor.subcategory] || { scope: 3, ghgCategory: 'Autre', isoCategory: '' }
      rows.push([
        factor.category, factor.subcategory, factor.id, factor.nameFr, quantity, factor.unit,
        factor.factorTotal, quantity * factor.factorTotal, scopeInfo.scope, scopeInfo.ghgCategory, scopeInfo.isoCategory,
        `${factor.nameFr} - ${factor.source}`, factor.region || null, month, year,
      ])
    }

    const { insertedEntries, totals } = await withTransaction(async (client) => {
      // Replace all entries — rolled back automatically if the insert fails
      await client.query('DELETE FROM emission_entries WHERE assessment_id = $1', [assessmentId])

      let insertedEntries: unknown[] = []
      if (rows.length > 0) {
        const cols = (i: number) => rows.map(r => r[i])
        const result = await client.query(
          `INSERT INTO emission_entries
           (assessment_id, category, subcategory, emission_factor_id, factor_name, quantity, unit,
            factor_value, total_co2eq, scope, ghg_category, iso_category, description, source_characterization, month, year)
           SELECT $1, * FROM unnest(
             $2::text[], $3::text[], $4::text[], $5::text[], $6::numeric[], $7::text[],
             $8::numeric[], $9::numeric[], $10::int[], $11::text[], $12::text[],
             $13::text[], $14::text[], $15::int[], $16::int[]
           )
           RETURNING *`,
          [assessmentId, ...Array.from({ length: 15 }, (_, i) => cols(i))]
        )
        insertedEntries = result.rows
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
