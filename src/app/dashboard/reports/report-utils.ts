import { SUBCATEGORY_LABELS } from '@/lib/emission-factors'
import { MONTHS_SHORT_FR, SCOPES, type CO2Unit } from '@/lib/utils'

// ── API shapes (/api/reports/[assessmentId]) — pg NUMERIC columns arrive as strings ──

export interface AssessmentListItem {
  id: number; name: string; year: number; site_name: string; status?: string
}

export interface EmissionEntry {
  id: number; category: string; subcategory: string; emission_factor_id?: string | null; factor_name: string
  quantity: number | string; unit: string; factor_value: number | string; total_co2eq: number | string
  scope: number; ghg_category: string; iso_category: string
  description: string; source_characterization: string; month?: number | null; year?: number | null
}

export interface MonthData { month: number; label: string; total: number; scope1: number; scope2: number; scope3: number }
export interface YearData { year: number; total: number; scope1: number; scope2: number; scope3: number }

export interface ReportData {
  assessment: {
    id: number; name: string; year: number; status?: string
    start_month?: number | null; end_month?: number | null
    site_name: string; site_type: string; site_address: string; country?: string | null
    company_name: string; rccm: string; sector: string; logo_url?: string | null
  }
  entries: EmissionEntry[]
  summary: { total: number; scope1: number; scope2: number; scope3: number }
  byCategory: Record<string, number>
  byGhgCategory: Record<string, { total: number }>
  bySubcategory?: Record<string, { total: number; scope: number; category: string; count: number }>
  byMonth?: MonthData[]
  byYear?: YearData[]
}

// ── Labels ─────────────────────────────────────────────────────────────────────

export const CATEGORY_FR: Record<string, string> = {
  energy: 'Énergie', non_energy: 'Hors énergie', inputs: 'Intrants',
  freight: 'Fret', transport: 'Déplacements', waste: 'Déchets', capital: 'Immobilisations',
}
export const categoryLabel = (c: string) => CATEGORY_FR[c] ?? c

// Freight shares its subcategory codes with generic modes (road, air, rail…): name them explicitly.
const FREIGHT_FR: Record<string, string> = {
  road: 'Fret routier', air: 'Fret aérien', rail: 'Fret ferroviaire', maritime: 'Fret maritime', river: 'Fret fluvial',
}
/** Stored subcategory code (see lib/emission-factors) → French label. */
export function subcategoryLabel(sub: string, category?: string) {
  if (category === 'freight' && FREIGHT_FR[sub]) return FREIGHT_FR[sub]
  return SUBCATEGORY_LABELS[sub] ?? FREIGHT_FR[sub] ?? CATEGORY_FR[sub] ?? sub
}

// Mirrors the site type options of /dashboard/sites
const SITE_TYPES_FR: Record<string, string> = {
  agence: 'Agence / Succursale', boutique: 'Boutique / Point de vente', bureau: 'Bureau / Siège social',
  chantier: 'Chantier / Construction', clinique: 'Clinique / Centre médical', datacenter: 'Data center / Informatique',
  ecole: 'École / Campus', entrepot: 'Entrepôt / Stockage', exploitation_agricole: 'Exploitation agricole',
  garage: 'Garage / Atelier', hotel: 'Hôtel / Hébergement', laboratoire: 'Laboratoire / R&D',
  logistique: 'Plateforme logistique', magasin: 'Magasin', restaurant: 'Restaurant / Restauration',
  supermarche: 'Supermarché / Hypermarché', usine: 'Usine / Production', autre: 'Autre',
}
export const siteTypeLabel = (t?: string | null) => (t ? SITE_TYPES_FR[t] ?? t : '')

// ISO 14069 reporting categories (codes stored in emission_entries.iso_category)
const ISO_FR: Record<string, string> = {
  '1-1': 'Combustion fixe', '1-2': 'Combustion mobile', '1-3': 'Procédés', '1-4': 'Émissions fugitives',
  '1-5': 'Biomasse (sols et forêts)',
  '2-1': 'Consommation d’électricité', '2-2': 'Vapeur, chaleur et froid',
  '3-1': 'Achats de biens et services', '3-2': 'Immobilisations', '3-3': 'Énergie (hors scopes 1 et 2)',
  '3-4': 'Transport de marchandises amont', '3-5': 'Déchets', '3-6': 'Déplacements professionnels',
  '3-7': 'Déplacements domicile-travail', '3-8': 'Actifs en leasing amont',
}
export const isoLabel = (code: string) => (ISO_FR[code] ? `${code} · ${ISO_FR[code]}` : code)

/** "Mars", "Janv." — capitalised short French month (1-12). */
export const monthShort = (m: number) => {
  const s = MONTHS_SHORT_FR[m - 1] ?? ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const num = (v: unknown) => (typeof v === 'number' ? v : parseFloat(String(v ?? ''))) || 0
export const scopeHex = (scope: number) => SCOPES[Math.min(Math.max(scope || 3, 1), 3) - 1].hex
export const scopeOfGhg = (name: string) => (name.startsWith('1-') ? 1 : name.startsWith('2-') ? 2 : 3)

// ── Units ─────────────────────────────────────────────────────────────────────

export const UNIT_DIV: Record<CO2Unit, number> = { kg: 1, t: 1_000, kt: 1_000_000 }
export const UNIT_SHORT: Record<CO2Unit, string> = { kg: 'kg', t: 't', kt: 'kt' }

/** Chart axis tick in a fixed unit, fr-FR: "40 t", "1,5 kt". */
export const axisTick = (unit: CO2Unit) => (v: number) =>
  `${(v / UNIT_DIV[unit]).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ${UNIT_SHORT[unit]}`

// Muted series palette (Forest & Ivory) for non-scope breakdowns
export const SERIES = ['#1A402C', '#B8935A', '#7FA98F', '#356A4C', '#D3B27C', '#8A8F87', '#0F2A1D', '#AFCBB9']

// ── Derived data ──────────────────────────────────────────────────────────────

/** Months covered by the bilan (start_month..end_month, defaults 1..12). */
export function periodMonths(a: ReportData['assessment']) {
  const s = Math.min(Math.max(Number(a.start_month) || 1, 1), 12)
  const e = Math.min(Math.max(Number(a.end_month) || 12, s), 12)
  return { start: s, end: e, months: Array.from({ length: e - s + 1 }, (_, i) => s + i) }
}

export type Source = { key: string; name: string; total: number; scope: number; category: string; subcategory: string; quantity: number; unit: string; months: number[] }

/** Same factor entered for several months → one source line (sum), sorted by weight. */
export function aggregateSources(entries: EmissionEntry[]): Source[] {
  const map = new Map<string, Source>()
  for (const e of entries) {
    const key = `${e.emission_factor_id || e.factor_name}|${e.unit}`
    const cur = map.get(key) ?? { key, name: e.factor_name, total: 0, scope: e.scope, category: e.category, subcategory: e.subcategory, quantity: 0, unit: e.unit, months: [] }
    cur.total += num(e.total_co2eq)
    cur.quantity += num(e.quantity)
    const m = Number(e.month) || 0
    if (m >= 1 && m <= 12 && !cur.months.includes(m)) cur.months.push(m)
    map.set(key, cur)
  }
  return Array.from(map.values()).filter(s => s.total > 0).sort((a, b) => b.total - a.total)
}

/** "Mars", "Janv. – Mars", "3 mois" — readable month coverage for a source. */
export function monthsText(months: number[]) {
  if (months.length === 0) return ''
  const sorted = months.slice().sort((a, b) => a - b)
  if (sorted.length === 1) return monthShort(sorted[0])
  const contiguous = sorted.every((m, i) => i === 0 || m === sorted[i - 1] + 1)
  return contiguous ? `${monthShort(sorted[0])} – ${monthShort(sorted[sorted.length - 1])}` : `${sorted.length} mois`
}
