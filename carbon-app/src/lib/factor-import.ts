// Validation and diff for admin imports of emission factors (CSV/XLSX rows parsed in the browser).
// Pure functions: the route does the DB work. Column names are the CSV header keys below.
import { SECTOR_LABELS } from '@/lib/sectors'
import type { LibraryFactor } from '@/lib/factor-library'

export const FACTOR_CATEGORIES = ['energy', 'non_energy', 'inputs', 'freight', 'transport', 'waste', 'capital'] as const

/** Import/export columns, in file order. Lists (keywords, sectors, site_types) are separated by "|". */
export const CSV_COLUMNS = [
  'id', 'category', 'subcategory', 'name_fr', 'name', 'unit', 'factor_total', 'factor_upstream', 'factor_combustion',
  'scope', 'ghg_category', 'iso_category', 'source', 'source_ref', 'source_year', 'region', 'uncertainty', 'licence',
  'keywords', 'sectors', 'site_types', 'recommended', 'status',
] as const

/** A validated row, in DB column names */
export interface FactorInput {
  id: string
  category: string
  subcategory: string
  name_fr: string
  name: string
  unit: string
  factor_total: number
  factor_upstream: number
  factor_combustion: number
  scope: 1 | 2 | 3
  ghg_category: string
  iso_category: string
  source: string
  source_ref: string
  source_year: number | null
  region: string
  uncertainty: number | null
  licence: string
  keywords: string[]
  sectors: string[]
  site_types: string[]
  is_recommended: boolean
  status: 'active' | 'retired'
}

export const fromLibrary = (f: LibraryFactor): FactorInput => ({
  id: f.id, category: f.category, subcategory: f.subcategory, name_fr: f.nameFr, name: f.name, unit: f.unit,
  factor_total: f.factorTotal, factor_upstream: f.factorUpstream, factor_combustion: f.factorCombustion,
  scope: f.scope, ghg_category: f.ghgCategory, iso_category: f.isoCategory, source: f.source, source_ref: f.sourceRef,
  source_year: f.sourceYear, region: f.region, uncertainty: f.uncertainty || null, licence: f.licence,
  keywords: f.keywords, sectors: f.sectors, site_types: f.siteTypes, is_recommended: f.isRecommended, status: f.status,
})

const blank = (v: unknown) => v == null || String(v).trim() === ''
const str = (v: unknown) => (v == null ? '' : String(v).trim())
function num(v: unknown): number {
  if (typeof v === 'number') return v
  const s = str(v).replace(/[\s  ]/g, '').replace(',', '.')
  return s === '' ? NaN : Number(s)
}
const list = (v: unknown) => str(v).split('|').map(x => x.trim()).filter(Boolean)
function bool(v: unknown): boolean | null {
  const s = str(v).toLowerCase()
  if (['1', 'true', 'oui', 'yes', 'x', 'vrai'].includes(s)) return true
  if (['0', 'false', 'non', 'no', 'faux', ''].includes(s)) return false
  return null
}

/** Column sizes of the emission_factors table */
const MAX_LENGTHS: Partial<Record<keyof FactorInput, number>> = {
  name: 300, unit: 100, ghg_category: 200, iso_category: 20, source: 200, source_ref: 200, region: 100, licence: 100,
}

export type Template =Pick<FactorInput, 'category' | 'scope' | 'ghg_category' | 'iso_category'>

/**
 * One raw row → validated factor, or the list of problems. Existing factor: blank cells keep the current
 * value. New factor: required columns must be filled; a known subcategory supplies scope and GHG/ISO categories.
 */
export function validateRow(
  raw: Record<string, unknown>,
  existing: FactorInput | undefined,
  subcategoryTemplate: (sub: string) => Template | undefined,
): { ok: FactorInput } | { errors: string[] } {
  const errors: string[] = []
  const r: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) r[k.trim().toLowerCase()] = v
  const has = (k: string) => !blank(r[k])

  const id = str(r.id)
  if (!/^[a-z0-9][a-z0-9_]{1,99}$/.test(id)) errors.push('id : minuscules, chiffres et « _ » uniquement (2 à 100 caractères)')

  const base: Partial<FactorInput> = existing ? { ...existing } : { keywords: [], sectors: [], site_types: [], is_recommended: false, status: 'active', factor_upstream: 0, factor_combustion: 0, name: '', source_ref: '', region: '', licence: '', source_year: null, uncertainty: null }
  const out = base as FactorInput
  out.id = id

  if (has('category')) out.category = str(r.category)
  if (has('subcategory')) out.subcategory = str(r.subcategory)
  for (const k of ['name_fr', 'name', 'unit', 'source', 'source_ref', 'region', 'licence', 'ghg_category', 'iso_category'] as const) {
    if (has(k)) out[k] = str(r[k])
  }
  for (const k of ['factor_total', 'factor_upstream', 'factor_combustion'] as const) {
    if (!has(k)) continue
    const n = num(r[k])
    if (!Number.isFinite(n) || n < 0 || n > 1e9) errors.push(`${k} : nombre positif attendu (« ${str(r[k])} »)`)
    else out[k] = n
  }
  if (has('scope')) {
    const s = num(r.scope)
    if (s !== 1 && s !== 2 && s !== 3) errors.push('scope : 1, 2 ou 3')
    else out.scope = s
  }
  if (has('source_year')) {
    const y = num(r.source_year)
    if (!Number.isInteger(y) || y < 1990 || y > 2100) errors.push('source_year : année sur 4 chiffres')
    else out.source_year = y
  }
  if (has('uncertainty')) {
    const u = num(r.uncertainty)
    if (!Number.isFinite(u) || u < 0 || u > 1) errors.push('uncertainty : entre 0 et 1 (ex. 0,2 pour 20 %)')
    else out.uncertainty = u
  }
  if (has('keywords')) out.keywords = list(r.keywords)
  if (has('sectors')) {
    out.sectors = list(r.sectors)
    const bad = out.sectors.filter(s => !(s in SECTOR_LABELS))
    if (bad.length) errors.push(`sectors : codes inconnus (${bad.join(', ')})`)
  }
  if (has('site_types')) {
    out.site_types = list(r.site_types)
    if (out.site_types.some(s => !/^[a-z_]{2,40}$/.test(s))) errors.push('site_types : codes en minuscules (ex. bureau|entrepot)')
  }
  if (has('recommended')) {
    const b = bool(r.recommended)
    if (b == null) errors.push('recommended : oui ou non')
    else out.is_recommended = b
  }
  if (has('status')) {
    const s = str(r.status)
    if (s !== 'active' && s !== 'retired') errors.push('status : active ou retired')
    else out.status = s
  }

  // A known subcategory brings its scope and GHG/ISO categories when the row leaves them blank
  const tpl = out.subcategory ? subcategoryTemplate(out.subcategory) : undefined
  if (!existing && tpl) {
    if (!has('category')) out.category = tpl.category
    if (!has('scope')) out.scope = tpl.scope
    if (!has('ghg_category')) out.ghg_category = tpl.ghg_category
    if (!has('iso_category')) out.iso_category = tpl.iso_category
  }

  if (!FACTOR_CATEGORIES.includes(out.category as typeof FACTOR_CATEGORIES[number])) errors.push(`category : ${FACTOR_CATEGORIES.join(', ')}`)
  if (!out.subcategory || !/^[a-z0-9_]{2,50}$/.test(out.subcategory)) errors.push('subcategory : code en minuscules (ex. electricity)')
  if (!out.name_fr || out.name_fr.length > 300) errors.push('name_fr : requis (300 caractères max.)')
  if (!out.unit || !/^kgCO2eq\/.{1,90}$/.test(out.unit)) errors.push('unit : doit commencer par « kgCO2eq/ » (ex. kgCO2eq/litre)')
  if ((out.factor_total == null || !Number.isFinite(out.factor_total)) && !has('factor_total')) errors.push('factor_total : requis')
  if (!out.source) errors.push('source : requise (ex. GIEC 2006, DEFRA 2024)')
  if (!out.scope) errors.push('scope : requis pour une nouvelle sous-catégorie')
  if (!out.ghg_category) errors.push('ghg_category : requise pour une nouvelle sous-catégorie (ex. 1-3 Émissions directes de procédé)')
  for (const [k, max] of Object.entries(MAX_LENGTHS) as [keyof FactorInput, number][]) {
    if (String(out[k] ?? '').length > max) errors.push(`${k} : ${max} caractères maximum`)
  }
  if ([...out.keywords, ...out.sectors, ...out.site_types].some(s => s.length > 80)) errors.push('keywords : 80 caractères maximum par mot-clé')

  return errors.length ? { errors } : { ok: out }
}

const DIFF_FIELDS: (keyof FactorInput)[] = [
  'category', 'subcategory', 'name_fr', 'name', 'unit', 'factor_total', 'factor_upstream', 'factor_combustion', 'scope',
  'ghg_category', 'iso_category', 'source', 'source_ref', 'source_year', 'region', 'uncertainty', 'licence',
  'keywords', 'sectors', 'site_types', 'is_recommended', 'status',
]

export function diffFactor(before: FactorInput, after: FactorInput) {
  const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
  return DIFF_FIELDS.filter(k => !same(before[k], after[k])).map(field => ({ field, before: before[field], after: after[field] }))
}

/** CSV cell for export ("|" lists, ";" separated file, quotes when needed) */
export function csvCell(v: unknown): string {
  const s = Array.isArray(v) ? v.join('|') : v == null ? '' : typeof v === 'boolean' ? (v ? 'oui' : 'non') : String(v)
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
