// Emission factor library, read from the `emission_factors` table (seeded from emission-factors.ts,
// then maintained by admins through imports). Server-only. A short in-memory cache keeps the bilan
// save path fast; admin writes call invalidateFactorCache().
import { query } from '@/lib/db'
import type { EmissionFactor } from '@/lib/emission-factors'

export interface LibraryFactor extends EmissionFactor {
  scope: 1 | 2 | 3
  ghgCategory: string
  isoCategory: string
  sourceYear: number | null
  licence: string
  keywords: string[]
  sectors: string[]
  siteTypes: string[]
  isRecommended: boolean
  status: 'active' | 'retired'
  updatedAt: string
}

type Row = Record<string, unknown>

export const toFactor = (r: Row): LibraryFactor => ({
  id: String(r.id),
  category: String(r.category),
  subcategory: String(r.subcategory),
  name: String(r.name ?? ''),
  nameFr: String(r.name_fr),
  unit: String(r.unit),
  factorUpstream: Number(r.factor_upstream),
  factorCombustion: Number(r.factor_combustion),
  factorTotal: Number(r.factor_total),
  source: String(r.source),
  sourceRef: String(r.source_ref ?? ''),
  region: String(r.region ?? ''),
  uncertainty: r.uncertainty == null ? 0 : Number(r.uncertainty),
  scope: Number(r.scope) as 1 | 2 | 3,
  ghgCategory: String(r.ghg_category ?? ''),
  isoCategory: String(r.iso_category ?? ''),
  sourceYear: r.source_year == null ? null : Number(r.source_year),
  licence: String(r.licence ?? ''),
  keywords: (r.keywords as string[] | null) ?? [],
  sectors: (r.sectors as string[] | null) ?? [],
  siteTypes: (r.site_types as string[] | null) ?? [],
  isRecommended: Boolean(r.is_recommended),
  status: r.status === 'retired' ? 'retired' : 'active',
  updatedAt: new Date(String(r.updated_at)).toISOString(),
})

const TTL_MS = 60_000
let cache: { at: number; all: LibraryFactor[]; byId: Map<string, LibraryFactor> } | null = null

/** Every factor, retired included (old bilans can still reference them). */
async function load() {
  if (cache && Date.now() - cache.at < TTL_MS) return cache
  const { rows } = await query('SELECT * FROM emission_factors ORDER BY category, subcategory, name_fr')
  const all = rows.map(toFactor)
  cache = { at: Date.now(), all, byId: new Map(all.map(f => [f.id, f])) }
  return cache
}

export async function getFactorMap(): Promise<Map<string, LibraryFactor>> {
  return (await load()).byId
}

/** Factors offered to companies when entering data. */
export async function getActiveFactors(): Promise<LibraryFactor[]> {
  return (await load()).all.filter(f => f.status === 'active')
}

export async function getAllFactors(): Promise<LibraryFactor[]> {
  return (await load()).all
}

export function invalidateFactorCache() {
  cache = null
}
