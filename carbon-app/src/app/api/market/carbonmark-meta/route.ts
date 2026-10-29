import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CARBONMARK_BASE = 'https://api.carbonmark.com'

function carbonmarkHeaders(): Record<string, string> {
  const key = process.env.CARBONMARK_API_KEY
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (key) h['Authorization'] = `Bearer ${key}`
  return h
}

async function cfetch(path: string, revalidate = 900) {
  const res = await fetch(`${CARBONMARK_BASE}${path}`, {
    headers: carbonmarkHeaders(),
    next: { revalidate },
  })
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`)
  return res.json()
}

export async function GET() {
  try {
    const [listingsResult, retirementsResult, categoriesResult, countriesResult, vintagesResult] =
      await Promise.allSettled([
        cfetch('/listings', 1800),
        cfetch('/retirements', 300),  // fresh — used for live feed
        cfetch('/categories', 3600),
        cfetch('/countries', 3600),
        cfetch('/vintages', 3600),
      ])

    // ── LISTINGS ──────────────────────────────────────────
    const listings: any[] = listingsResult.status === 'fulfilled' ? listingsResult.value : []
    const activeListings = listings.filter(l => l.active && !l.deleted && parseFloat(l.singleUnitPrice) > 0)

    const totalAvailableTons = activeListings.reduce((s, l) => s + parseFloat(l.leftToSell || '0'), 0)

    // Category distribution
    const catCounts: Record<string, { count: number; tons: number }> = {}
    for (const l of activeListings) {
      const cat = l.project?.category || 'Other'
      if (!catCounts[cat]) catCounts[cat] = { count: 0, tons: 0 }
      catCounts[cat].count++
      catCounts[cat].tons += parseFloat(l.leftToSell || '0')
    }
    const categoryDistribution = Object.entries(catCounts)
      .map(([name, v]) => ({ name, count: v.count, tons: Math.round(v.tons) }))
      .sort((a, b) => b.count - a.count)

    // Country distribution
    const countryCounts: Record<string, number> = {}
    for (const l of activeListings) {
      const c = l.project?.country || 'Unknown'
      countryCounts[c] = (countryCounts[c] || 0) + 1
    }
    const countryDistribution = Object.entries(countryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Price range distribution
    const priceRanges = [
      { label: '< $1', min: 0, max: 1, count: 0 },
      { label: '$1 – $5', min: 1, max: 5, count: 0 },
      { label: '$5 – $15', min: 5, max: 15, count: 0 },
      { label: '> $15', min: 15, max: Infinity, count: 0 },
    ]
    for (const l of activeListings) {
      const p = parseFloat(l.singleUnitPrice)
      const bucket = priceRanges.find(r => p >= r.min && p < r.max)
      if (bucket) bucket.count++
    }

    // Vintage distribution
    const vintageCounts: Record<string, number> = {}
    for (const l of activeListings) {
      const v = l.project?.vintage
      if (v) vintageCounts[v] = (vintageCounts[v] || 0) + 1
    }
    const vintageDistribution = Object.entries(vintageCounts)
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year.localeCompare(b.year))

    // ── RETIREMENTS ───────────────────────────────────────
    const retirements: any[] = retirementsResult.status === 'fulfilled' ? retirementsResult.value : []
    const totalRetiredTons = retirements.reduce((s, r) => s + (r.amount || 0), 0)

    // Monthly retirement volume (last 8 months)
    const monthlyRetirements: Record<string, number> = {}
    for (const r of retirements) {
      const d = new Date((r.timestamp || 0) * 1000)
      const key = d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
      monthlyRetirements[key] = (monthlyRetirements[key] || 0) + (r.amount || 0)
    }
    const retirementTimeline = Object.entries(monthlyRetirements)
      .map(([month, tons]) => ({ month, tons: parseFloat(tons.toFixed(2)) }))
      .slice(-8)

    // Live retirement feed — last 20, enriched
    const liveFeed = retirements
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 20)
      .map(r => ({
        id: r.id,
        amount: r.amount,
        beneficiaryName: r.beneficiaryName || 'Anonyme',
        retirementMessage: r.retirementMessage || '',
        tokenName: r.token?.name || r.creditId || 'TCO2',
        timestamp: r.timestamp,
        date: new Date((r.timestamp || 0) * 1000).toLocaleDateString('fr-FR', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }),
        polygonscanUrl: r.polygonscanUrl || r.onChainExplorerUrl || null,
      }))

    // ── METADATA ──────────────────────────────────────────
    const categories: string[] = categoriesResult.status === 'fulfilled'
      ? categoriesResult.value.map((c: any) => c.id)
      : []
    const countries: string[] = countriesResult.status === 'fulfilled'
      ? countriesResult.value.map((c: any) => c.id)
      : []
    const vintages: string[] = vintagesResult.status === 'fulfilled'
      ? (Array.isArray(vintagesResult.value) ? vintagesResult.value : Object.values(vintagesResult.value)).map(String).filter(Boolean)
      : []

    return NextResponse.json({
      stats: {
        activeListings: activeListings.length,
        totalAvailableTons: Math.round(totalAvailableTons),
        totalRetiredTons: parseFloat(totalRetiredTons.toFixed(2)),
        retirementCount: retirements.length,
      },
      categoryDistribution,
      countryDistribution,
      priceRanges,
      vintageDistribution,
      retirementTimeline,
      liveFeed,
      meta: { categories, countries, vintages },
    })
  } catch (error) {
    console.error('Carbonmark Meta Error:', error)
    return NextResponse.json({ error: 'Failed to fetch Carbonmark metadata' }, { status: 500 })
  }
}
