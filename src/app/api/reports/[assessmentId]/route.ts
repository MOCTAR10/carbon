import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { assessmentId: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { assessmentId } = params

    // Fetch assessment with site and company info
    const assessmentResult = await query(
      `SELECT a.*, s.name as site_name, s.type as site_type, s.address as site_address, s.country,
              c.name as company_name, c.rccm, c.sector, c.logo_url
       FROM assessments a 
       JOIN sites s ON a.site_id = s.id 
       JOIN companies c ON s.company_id = c.id
       WHERE a.id = $1 AND c.id = $2`,
      [assessmentId, session.companyId]
    )

    if (assessmentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Bilan non trouvé' }, { status: 404 })
    }

    const assessment = assessmentResult.rows[0]

    // Fetch all emission entries
    const entriesResult = await query(
      'SELECT * FROM emission_entries WHERE assessment_id = $1 ORDER BY scope, category, subcategory',
      [assessmentId]
    )

    // Single pass over all entries — builds every grouping at once
    const ghgProtocol: { scope1: unknown[]; scope2: unknown[]; scope3: unknown[] } = { scope1: [], scope2: [], scope3: [] }
    const byGhgCategory: Record<string, { entries: unknown[]; total: number }> = {}
    const byCategory: Record<string, number> = {}
    const bySubcategory: Record<string, { total: number; scope: number; category: string; count: number }> = {}
    const upstreamVsCombustion: Record<string, { upstream: number; combustion: number; total: number }> = {}
    const byIsoCategory: Record<string, { total: number; scope: number; count: number }> = {}
    const monthAccum: Record<number, { total: number; s1: number; s2: number; s3: number }> = {}
    const yearAccum: Record<number, { total: number; s1: number; s2: number; s3: number }> = {}

    for (const e of entriesResult.rows) {
      const co2 = parseFloat(e.total_co2eq) || 0
      const sc = e.scope as number

      if (sc === 1) ghgProtocol.scope1.push(e)
      else if (sc === 2) ghgProtocol.scope2.push(e)
      else ghgProtocol.scope3.push(e)

      const ghgCat = e.ghg_category || 'Autre'
      if (!byGhgCategory[ghgCat]) byGhgCategory[ghgCat] = { entries: [], total: 0 }
      byGhgCategory[ghgCat].entries.push(e)
      byGhgCategory[ghgCat].total += co2

      byCategory[e.category] = (byCategory[e.category] || 0) + co2

      const subKey = e.subcategory || e.category
      if (!bySubcategory[subKey]) bySubcategory[subKey] = { total: 0, scope: sc, category: e.category, count: 0 }
      bySubcategory[subKey].total += co2
      bySubcategory[subKey].scope = sc
      bySubcategory[subKey].count++

      if (!upstreamVsCombustion[e.category]) upstreamVsCombustion[e.category] = { upstream: 0, combustion: 0, total: 0 }
      upstreamVsCombustion[e.category].total += co2

      const isoKey = e.iso_category || 'Autre'
      if (!byIsoCategory[isoKey]) byIsoCategory[isoKey] = { total: 0, scope: sc, count: 0 }
      byIsoCategory[isoKey].total += co2
      byIsoCategory[isoKey].scope = sc
      byIsoCategory[isoKey].count++

      const m = parseInt(String(e.month)) || 0
      if (m >= 1 && m <= 12) {
        if (!monthAccum[m]) monthAccum[m] = { total: 0, s1: 0, s2: 0, s3: 0 }
        monthAccum[m].total += co2
        if (sc === 1) monthAccum[m].s1 += co2
        else if (sc === 2) monthAccum[m].s2 += co2
        else monthAccum[m].s3 += co2
      }

      const y = parseInt(String(e.year)) || 0
      if (y > 0) {
        if (!yearAccum[y]) yearAccum[y] = { total: 0, s1: 0, s2: 0, s3: 0 }
        yearAccum[y].total += co2
        if (sc === 1) yearAccum[y].s1 += co2
        else if (sc === 2) yearAccum[y].s2 += co2
        else yearAccum[y].s3 += co2
      }
    }

    const topEmitters = entriesResult.rows
      .map((e: { factor_name: string; total_co2eq: string; scope: number; category: string; quantity: string; unit: string }) => ({
        name: e.factor_name, total: parseFloat(e.total_co2eq) || 0,
        scope: e.scope, category: e.category,
        quantity: parseFloat(e.quantity) || 0, unit: e.unit,
      }))
      .filter((e: { total: number }) => e.total > 0)
      .sort((a: { total: number }, b: { total: number }) => b.total - a.total)
      .slice(0, 15)

    const monthLabels = ['', 'Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']
    const byMonth = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      const a = monthAccum[m] ?? { total: 0, s1: 0, s2: 0, s3: 0 }
      return { month: m, label: monthLabels[m], total: a.total, scope1: a.s1, scope2: a.s2, scope3: a.s3 }
    })

    const byYear = Object.keys(yearAccum).map(Number).sort().map(y => {
      const a = yearAccum[y]
      return { year: y, total: a.total, scope1: a.s1, scope2: a.s2, scope3: a.s3 }
    })

    return NextResponse.json({
      assessment,
      entries: entriesResult.rows,
      ghgProtocol,
      byGhgCategory,
      byCategory,
      bySubcategory,
      upstreamVsCombustion,
      topEmitters,
      byIsoCategory,
      byMonth,
      byYear,
      summary: {
        total: parseFloat(assessment.total_co2eq) || 0,
        scope1: parseFloat(assessment.scope1_co2eq) || 0,
        scope2: parseFloat(assessment.scope2_co2eq) || 0,
        scope3: parseFloat(assessment.scope3_co2eq) || 0,
      },
    })
  } catch (error) {
    console.error('Report fetch error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
