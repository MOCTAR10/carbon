import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

const FCFA_PER_USD = 600
const CARBONMARK_BASE = 'https://api.carbonmark.com'

function carbonmarkHeaders(): Record<string, string> {
  const key = process.env.CARBONMARK_API_KEY
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (key) h['Authorization'] = `Bearer ${key}`
  return h
}

async function getBlockchainProjects() {
  try {
    const res = await fetch(`${CARBONMARK_BASE}/listings`, {
      headers: carbonmarkHeaders(),
      next: { revalidate: 1800 }, // 30 min cache
    })
    if (!res.ok) throw new Error(`Carbonmark HTTP ${res.status}`)
    const listings: any[] = await res.json()

    // Filter active, non-deleted, with price and enough supply
    const active = listings.filter(l =>
      l.active &&
      !l.deleted &&
      l.project?.name &&
      parseFloat(l.singleUnitPrice) > 0 &&
      parseFloat(l.leftToSell) >= 0.1
    )

    // Deduplicate by project key — keep cheapest listing per project
    const byProject = new Map<string, any>()
    for (const l of active) {
      const key = l.project.key
      const existing = byProject.get(key)
      if (!existing || parseFloat(l.singleUnitPrice) < parseFloat(existing.singleUnitPrice)) {
        byProject.set(key, l)
      }
    }

    // Sort cheapest first, return all
    const sorted = Array.from(byProject.values())
      .sort((a, b) => parseFloat(a.singleUnitPrice) - parseFloat(b.singleUnitPrice))

    return sorted.map(l => {
      const proj = l.project
      const type = mapCategoryToType(proj.category)
      const priceUsd = parseFloat(l.singleUnitPrice)
      return {
        id: `carbonmark_${proj.key}`,
        partner_id: null,
        external_api_id: proj.key,
        title: proj.name,
        description: buildDescription(proj),
        project_type: type,
        category: proj.category || 'Other',
        country: proj.country || 'International',
        vintage: proj.vintage || null,
        standard: proj.key?.startsWith('GS') ? 'Gold Standard' : 'VCS',
        methodology: proj.methodology || null,
        credit_id: l.creditId,
        price_per_ton: Math.round(priceUsd * FCFA_PER_USD),
        price_per_ton_usd: priceUsd,
        tons_available: Math.round(parseFloat(l.leftToSell)),
        min_fill: parseFloat(l.minFillAmount) || 0.001,
        tons_sold: 0,
        image_url: imageForType(type),
        is_local: false,
        source: 'carbonmark_live',
        listing_id: l.id,
      }
    })
  } catch (err) {
    console.error('[Carbonmark API Error]', err)
    return []
  }
}

function mapCategoryToType(category: string): string {
  const c = (category || '').toLowerCase()
  if (c.includes('forest') || c.includes('redd') || c.includes('land')) return 'Conservation (REDD+)'
  if (c.includes('blue') || c.includes('ocean') || c.includes('coastal')) return 'Carbone Bleu'
  if (c.includes('agriculture') || c.includes('biochar')) return 'Agriculture Régénérative'
  if (c.includes('waste') || c.includes('biogas') || c.includes('methane')) return 'Gestion des Déchets'
  if (c.includes('energy efficiency')) return 'Efficacité Énergétique'
  if (c.includes('renewable') || c.includes('solar') || c.includes('wind') || c.includes('hydro')) return 'Énergie Renouvelable'
  if (c.includes('industrial')) return 'Industrie'
  return 'Autre'
}

function imageForType(type: string): string {
  const map: Record<string, string> = {
    'Conservation (REDD+)': 'https://images.unsplash.com/photo-1516026672322-bc52d61a47b8?w=800&q=80',
    'Carbone Bleu': 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80',
    'Agriculture Régénérative': 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=800&q=80',
    'Gestion des Déchets': 'https://images.unsplash.com/photo-1604187351574-c75ca79f5807?w=800&q=80',
    'Efficacité Énergétique': 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80',
    'Énergie Renouvelable': 'https://images.unsplash.com/photo-1509391366360-2e9597a8402c?w=800&q=80',
    'Industrie': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80',
  }
  return map[type] || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80'
}

function buildDescription(proj: any): string {
  const parts: string[] = []
  if (proj.methodology) parts.push(`Méthodo. ${proj.methodology}`)
  if (proj.vintage) parts.push(`Millésime ${proj.vintage}`)
  if (proj.key) parts.push(`Réf. ${proj.key}`)
  const base = `Crédit carbone certifié sur KlimaDAO Carbonmark (Polygon).`
  return parts.length > 0 ? `${base} ${parts.join(' · ')}.` : base
}

async function getCoinGeckoPrices() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=toucan-protocol-nature-carbon-tonne,toucan-protocol-base-carbon-tonne&vs_currencies=usd',
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function GET() {
  try {
    const [priceResult, blockchainResult, localResult] = await Promise.allSettled([
      getCoinGeckoPrices(),
      getBlockchainProjects(),
      query(
        `SELECT cp.*, p.name as partner_name
         FROM carbon_projects cp
         LEFT JOIN partners p ON cp.partner_id = p.id
         WHERE cp.tons_available > cp.tons_sold
         ORDER BY cp.created_at DESC`
      )
    ])

    let nctPriceUsd = 0.28
    let bctPriceUsd = 0.025
    if (priceResult.status === 'fulfilled' && priceResult.value) {
      nctPriceUsd = priceResult.value['toucan-protocol-nature-carbon-tonne']?.usd || nctPriceUsd
      bctPriceUsd = priceResult.value['toucan-protocol-base-carbon-tonne']?.usd || bctPriceUsd
    }

    const blockchainProjects = blockchainResult.status === 'fulfilled' ? blockchainResult.value : []

    const localProjects = localResult.status === 'fulfilled'
      ? localResult.value.rows.map(row => ({
          ...row,
          price_per_ton: parseFloat(row.price_per_ton),
          price_per_ton_usd: parseFloat(row.price_per_ton) / FCFA_PER_USD,
          is_local: true,
          source: 'local_ngo',
          category: row.project_type || 'Reforestation',
          vintage: null,
        }))
      : []

    // Compute unique categories and countries from blockchain projects
    const categories = Array.from(new Set(blockchainProjects.map((p: any) => p.category))).sort()
    const countries = Array.from(new Set(blockchainProjects.map((p: any) => p.country))).sort()
    const vintages = Array.from(new Set(blockchainProjects.filter((p: any) => p.vintage).map((p: any) => p.vintage))).sort()

    return NextResponse.json({
      projects: [...localProjects, ...blockchainProjects],
      filters: { categories, countries, vintages },
      market: {
        nctPriceUsd,
        bctPriceUsd,
        nctPriceFCFA: Math.round(nctPriceUsd * FCFA_PER_USD),
        bctPriceFCFA: Math.round(bctPriceUsd * FCFA_PER_USD),
        activeListings: blockchainProjects.length,
        totalAvailableTons: blockchainProjects.reduce((s: number, p: any) => s + p.tons_available, 0),
        source: blockchainProjects.length > 0 ? 'carbonmark_live' : 'local_only',
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Market Projects API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch carbon market data' }, { status: 500 })
  }
}
