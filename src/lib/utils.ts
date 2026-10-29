import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Custom theme utilities tailwind-merge can't infer (otherwise bg-forest-grain would override bg-forest-900)
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'bg-image': ['bg-forest-grain'],
      shadow: ['shadow-soft', 'shadow-lifted', 'shadow-gold'],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Formatting (fr-FR everywhere — never toFixed() in UI) ──────────────────────

export type CO2Unit = 'kg' | 't' | 'kt'
const CO2_UNITS: Record<CO2Unit, { div: number; label: string }> = {
  kg: { div: 1, label: 'kgCO₂e' },
  t:  { div: 1_000, label: 'tCO₂e' },
  kt: { div: 1_000_000, label: 'ktCO₂e' },
}

/** Best unit for a magnitude in kg. Use one unit per view (pick it from the view's total) so rows compare. */
export function co2UnitFor(kg: number): CO2Unit {
  const a = Math.abs(kg)
  return a >= 1_000_000 ? 'kt' : a >= 1_000 ? 't' : 'kg'
}

/** Emission totals are stored in kgCO2e. Pass `unit` to force a shared unit across a view. */
export function fmtCO2(kg: number, unit: CO2Unit = co2UnitFor(kg)) {
  const u = CO2_UNITS[unit]
  const v = (Number(kg) || 0) / u.div
  const digits = unit === 'kg' ? (Math.abs(v) < 10 && v !== 0 ? 1 : 0) : 2
  return { value: v.toLocaleString('fr-FR', { maximumFractionDigits: digits }), unit: u.label }
}

export function fmtCO2Text(kg: number, unit?: CO2Unit) {
  const { value, unit: u } = fmtCO2(kg, unit)
  return `${value} ${u}`
}

/** Plain number, fr-FR grouping. */
export function fmtNum(v: number, maxDigits = 2) {
  return (Number(v) || 0).toLocaleString('fr-FR', { maximumFractionDigits: maxDigits })
}

/** Share as "54 %" (non-breaking space). `part`/`whole` in the same unit. Shows "< 1 %" for tiny non-zero shares. */
export function fmtPct(part: number, whole: number, digits = 0) {
  if (!whole) return '—'
  const p = (part / whole) * 100
  if (p > 0 && p < 1 && digits === 0) return '< 1 %'
  return `${p.toLocaleString('fr-FR', { maximumFractionDigits: digits })} %`
}

export function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Ko`
  return `${(bytes / 1024 / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`
}

export function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtDateTime(d: string | Date) {
  return new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
export const MONTHS_SHORT_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

/** "3 bilans", "1 bilan", "0 bilan" (French: 0 and 1 are singular). */
export function plural(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString('fr-FR')} ${Math.abs(n) < 2 ? one : many}`
}

// ── Scope palette — the single source of truth (UI, charts and PDF) ───────────
export const SCOPES = [
  { scope: 1, label: 'Scope 1', name: 'Émissions directes',  hex: '#1A402C', rgb: [26, 64, 44] as [number, number, number],   bg: 'bg-forest-700', text: 'text-forest-700', onDark: 'bg-ivory-100' },
  { scope: 2, label: 'Scope 2', name: 'Énergie indirecte',   hex: '#B8935A', rgb: [184, 147, 90] as [number, number, number], bg: 'bg-gold-500',   text: 'text-gold-600',   onDark: 'bg-gold-400' },
  { scope: 3, label: 'Scope 3', name: 'Autres indirectes',   hex: '#7FA98F', rgb: [127, 169, 143] as [number, number, number], bg: 'bg-forest-300', text: 'text-forest-500', onDark: 'bg-forest-300' },
] as const
export const scopeStyle = (scope: number) => SCOPES[Math.min(Math.max(scope, 1), 3) - 1]
