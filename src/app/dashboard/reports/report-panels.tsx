'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Flame, Zap, Network, MoveHorizontal, ClipboardList, Sigma, type LucideIcon } from 'lucide-react'
import { cn, fmtCO2, fmtCO2Text, fmtNum, fmtPct, plural, SCOPES, type CO2Unit } from '@/lib/utils'
import { sectorLabel } from '@/lib/sectors'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import {
  aggregateSources, categoryLabel, isoLabel, monthShort, monthsText, num, periodMonths, scopeHex, scopeOfGhg,
  siteTypeLabel, subcategoryLabel, SERIES, UNIT_DIV, type ReportData,
} from './report-utils'

// Recharts is heavy: load the chart panels only when a report is on screen
const chartSkeleton = (h: string) => function ChartSkeleton() { return <Skeleton className={cn('w-full rounded-xl', h)} /> }
const ScopeDonut = dynamic(() => import('./report-charts').then(m => m.ScopeDonut), { ssr: false, loading: chartSkeleton('h-full rounded-full') })
const MonthlyChart = dynamic(() => import('./report-charts').then(m => m.MonthlyChart), { ssr: false, loading: chartSkeleton('h-[340px]') })
const YearlyChart = dynamic(() => import('./report-charts').then(m => m.YearlyChart), { ssr: false, loading: chartSkeleton('h-[280px]') })
const CumulativeChart = dynamic(() => import('./report-charts').then(m => m.CumulativeChart), { ssr: false, loading: chartSkeleton('h-[260px]') })

export const SCOPE_ICONS: LucideIcon[] = [Flame, Zap, Network]

const THEAD_ROW = 'border-y border-ivory-300 bg-ivory-100 text-[11px] uppercase tracking-[0.12em] text-ink-500'
const TFOOT_ROW = 'border-t border-forest-200 bg-forest-50 font-semibold text-forest-900'

/** One unit for the whole report (picked from its total) so every figure compares. */
export function co2For(unit: CO2Unit) {
  return (kg: number) => {
    const v = kg / UNIT_DIV[unit]
    if (unit !== 'kg' && kg > 0 && v < 0.01) return `< 0,01 ${fmtCO2(kg, unit).unit}`
    return fmtCO2Text(kg, unit)
  }
}

type Ctx = { report: ReportData; unit: CO2Unit; co2: (kg: number) => string }

// ── Shared building blocks ─────────────────────────────────────────────────

function NoData({ text = 'Aucune donnée' }: { text?: string }) {
  return <p className="rounded-xl border border-dashed border-ivory-400 bg-ivory-50 px-4 py-12 text-center text-sm text-ink-400">{text}</p>
}

/** Horizontal table scroller with a hint on small screens. */
function TableScroll({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="flex items-center gap-1.5 px-6 pb-2 text-[11px] text-ink-400 md:hidden">
        <MoveHorizontal className="size-3.5" /> Faites glisser pour voir toutes les colonnes
      </p>
      <div className="overflow-x-auto">{children}</div>
    </>
  )
}

type Ranked = { key: string; label: string; sub?: string; value: number; color: string }

/** Ranked list with proportional bars — readable at any width (replaces label-heavy bar charts). */
function RankedBars({ items, total, co2 }: { items: Ranked[]; total: number; co2: (kg: number) => string }) {
  const max = Math.max(...items.map(i => i.value), 1)
  return (
    <ol className="space-y-3.5">
      {items.map((it, i) => (
        <li key={it.key}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <div className="flex min-w-0 items-baseline gap-2.5">
              <span className="w-5 flex-shrink-0 text-right text-[11px] font-semibold tabular-nums text-ink-400">{i + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-800" title={it.label}>{it.label}</p>
                {it.sub && <p className="truncate text-xs text-ink-400">{it.sub}</p>}
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums text-forest-900">{co2(it.value)}</p>
              <p className="text-[11px] tabular-nums text-ink-400">{fmtPct(it.value, total, 1)}</p>
            </div>
          </div>
          <div className="ml-[30px] h-1.5 overflow-hidden rounded-full bg-ivory-200">
            <div className="h-full rounded-full" style={{ width: `${Math.max((it.value / max) * 100, 1.5)}%`, backgroundColor: it.color }} />
          </div>
        </li>
      ))}
    </ol>
  )
}

function ScopeLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-500', className)}>
      {SCOPES.map(s => (
        <span key={s.scope} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: s.hex }} /> {s.label} · {s.name}
        </span>
      ))}
    </div>
  )
}

function ScopeChip({ scope, short }: { scope: number; short?: boolean }) {
  const tone = scope === 1 ? 'forest' : scope === 2 ? 'gold' : 'neutral'
  return <Badge tone={tone}>{short ? `S${scope}` : `Scope ${scope}`}</Badge>
}

function monthSeries(report: ReportData) {
  const p = periodMonths(report.assessment)
  return (report.byMonth ?? [])
    .filter(m => m.month >= p.start && m.month <= p.end)
    .map(m => ({ ...m, label: monthShort(m.month) }))
}

// ── KPI row ────────────────────────────────────────────────────────────────

export function KpiRow({ report, unit }: Ctx) {
  const total = report.summary.total
  const main = fmtCO2(total, unit)
  const vals = [report.summary.scope1, report.summary.scope2, report.summary.scope3]
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="relative flex flex-col overflow-hidden rounded-2xl bg-forest-900 bg-forest-grain p-6 text-ivory-50 shadow-lifted">
        <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full border border-gold-400/15" />
        <div className="flex items-center gap-2 text-gold-300/90">
          <Sigma className="size-4" strokeWidth={1.8} />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Émissions totales</p>
        </div>
        <p className="mt-4 font-display text-[2rem] font-light leading-none tabular-nums">
          {main.value} <span className="font-sans text-sm font-medium text-forest-100/70">{main.unit}</span>
        </p>
        <p className="mt-auto border-t border-white/10 pt-3 text-xs text-forest-100/60">Scopes 1, 2 et 3 consolidés</p>
      </div>
      {SCOPES.map((s, i) => {
        const Icon = SCOPE_ICONS[i]
        const v = fmtCO2(vals[i], unit)
        const pct = total > 0 ? (vals[i] / total) * 100 : 0
        return (
          <Card key={s.scope} className="flex flex-col p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ backgroundColor: s.hex }} />
                <p className="text-sm font-semibold text-ink-800">{s.label}</p>
              </div>
              <Icon className="size-4 text-ink-400" strokeWidth={1.8} />
            </div>
            <p className="mt-4 font-display text-2xl leading-none tabular-nums text-forest-900">
              {v.value} <span className="font-sans text-xs font-medium text-ink-400">{v.unit}</span>
            </p>
            <p className="mt-1 text-xs text-ink-400">{s.name}</p>
            <div className="mt-auto flex items-center gap-3 pt-4">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ivory-200">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: s.hex }} />
              </div>
              <span className="w-12 text-right text-xs font-semibold tabular-nums text-ink-500">{fmtPct(vals[i], total, 1)}</span>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ── Overview ───────────────────────────────────────────────────────────────

export function OverviewPanel({ report, unit, co2 }: Ctx) {
  const total = report.summary.total
  const vals = [report.summary.scope1, report.summary.scope2, report.summary.scope3]
  const donut = SCOPES.map((s, i) => ({ name: s.label, value: vals[i], fill: s.hex })).filter(d => d.value > 0)

  const categories = useMemo<Ranked[]>(() => Object.entries(report.byCategory)
    .filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a)
    .map(([k, v], i) => ({ key: k, label: categoryLabel(k), value: v, color: SERIES[i % SERIES.length] })), [report])

  const sources = useMemo<Ranked[]>(() => aggregateSources(report.entries ?? []).slice(0, 10).map(s => ({
    key: s.key, label: s.name, value: s.total, color: scopeHex(s.scope),
    sub: [`Scope ${s.scope}`, subcategoryLabel(s.subcategory, s.category), monthsText(s.months)].filter(Boolean).join(' · '),
  })), [report])

  const subcategories = useMemo<Ranked[]>(() => Object.entries(report.bySubcategory ?? {})
    .filter(([, v]) => v.total > 0).sort(([, a], [, b]) => b.total - a.total).slice(0, 12)
    .map(([k, v]) => ({ key: k, label: subcategoryLabel(k, v.category), sub: `${categoryLabel(v.category)} · ${plural(v.count, 'poste')}`, value: v.total, color: scopeHex(v.scope) })), [report])

  const crossTab = useMemo(() => {
    const map: Record<string, [number, number, number]> = {}
    for (const e of report.entries ?? []) {
      const k = e.category || 'autre'
      map[k] ??= [0, 0, 0]
      map[k][Math.min(Math.max(e.scope, 1), 3) - 1] += num(e.total_co2eq)
    }
    return Object.entries(map)
      .map(([k, v]) => ({ key: k, label: categoryLabel(k), parts: v, total: v[0] + v[1] + v[2] }))
      .filter(d => d.total > 0).sort((a, b) => b.total - a.total)
  }, [report])
  const crossMax = Math.max(...crossTab.map(c => c.total), 1)

  const months = monthSeries(report)
  let running = 0
  const cumulative = months.map(m => ({ label: m.label, cumulative: (running += m.total) }))
  const a = report.assessment
  const p = periodMonths(a)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader eyebrow="GHG Protocol" title="Répartition par scope" />
          <CardContent className="flex flex-1 flex-col">
            {donut.length > 0 ? (
              <div className="flex flex-col items-center gap-8 sm:flex-row">
                <div className="relative size-[180px] flex-shrink-0">
                  <ScopeDonut data={donut} unit={unit} />
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Total</span>
                    <span className="font-display text-2xl leading-tight tabular-nums text-forest-900">{fmtCO2(total, unit).value}</span>
                    <span className="text-[11px] text-ink-400">{fmtCO2(total, unit).unit}</span>
                  </div>
                </div>
                <div className="w-full min-w-0 flex-1 space-y-4">
                  {SCOPES.map((s, i) => (
                    <div key={s.scope}>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="size-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: s.hex }} />
                          <span className="truncate text-sm font-medium text-ink-700">{s.label} · {s.name}</span>
                        </span>
                        <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-forest-900">{co2(vals[i])}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ivory-200">
                          <div className="h-full rounded-full" style={{ width: `${total > 0 ? (vals[i] / total) * 100 : 0}%`, backgroundColor: s.hex }} />
                        </div>
                        <span className="w-14 text-right text-xs font-semibold tabular-nums text-ink-500">{fmtPct(vals[i], total, 1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : <NoData />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader eyebrow="Sources" title="Émissions par catégorie" />
          <CardContent>
            {categories.length > 0 ? <RankedBars items={categories} total={total} co2={co2} /> : <NoData />}
          </CardContent>
        </Card>
      </div>

      {sources.length > 0 && (
        <Card>
          <CardHeader eyebrow="Priorités" title="Principales sources d’émissions" />
          <CardContent>
            <p className="-mt-2 mb-5 text-sm text-ink-500">
              Les {plural(sources.length, 'source')} les plus émettrices, toutes périodes confondues — c’est là que se trouvent vos leviers de réduction.
            </p>
            <RankedBars items={sources} total={total} co2={co2} />
            <ScopeLegend className="mt-6 border-t border-ivory-200 pt-4" />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {subcategories.length > 0 && (
          <Card>
            <CardHeader eyebrow="Ventilation" title="Par sous-catégorie" />
            <CardContent><RankedBars items={subcategories} total={total} co2={co2} /></CardContent>
          </Card>
        )}

        {crossTab.length > 0 && (
          <Card>
            <CardHeader eyebrow="Croisement" title="Scopes par catégorie" />
            <CardContent>
              <ul className="space-y-4">
                {crossTab.map(c => (
                  <li key={c.key}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-medium text-ink-800">{c.label}</span>
                      <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-forest-900">{co2(c.total)}</span>
                    </div>
                    <div
                      className="flex h-2.5 overflow-hidden rounded-full bg-ivory-200"
                      style={{ width: `${Math.max((c.total / crossMax) * 100, 3)}%` }}
                      role="img"
                      aria-label={SCOPES.map((s, i) => `${s.label} : ${co2(c.parts[i])}`).join(', ')}
                    >
                      {c.parts.map((v, i) => v > 0 && (
                        <span key={i} className="h-full" style={{ width: `${(v / c.total) * 100}%`, backgroundColor: SCOPES[i].hex }} />
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
              <ScopeLegend className="mt-6 border-t border-ivory-200 pt-4" />
            </CardContent>
          </Card>
        )}
      </div>

      {cumulative.some(c => c.cumulative > 0) && (
        <Card>
          <CardHeader eyebrow="Tendance" title="Cumul des émissions sur la période" />
          <CardContent><CumulativeChart data={cumulative} unit={unit} id="cum-overview" /></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader eyebrow="Contexte" title="Informations du bilan" />
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
            <div className="rounded-xl border border-ivory-300 bg-ivory-50 p-4">
              <dt className="mb-1 text-xs text-ink-400">Entreprise</dt>
              <dd className="font-semibold text-ink-800">{a.company_name || '—'}</dd>
              <dd className="mt-0.5 text-xs text-ink-500">{[a.rccm && `RCCM ${a.rccm}`, a.sector && sectorLabel(a.sector)].filter(Boolean).join(' · ')}</dd>
            </div>
            <div className="rounded-xl border border-ivory-300 bg-ivory-50 p-4">
              <dt className="mb-1 text-xs text-ink-400">Site</dt>
              <dd className="font-semibold text-ink-800">{a.site_name || '—'}</dd>
              <dd className="mt-0.5 text-xs text-ink-500">{[siteTypeLabel(a.site_type), a.site_address, a.country].filter(Boolean).join(' · ')}</dd>
            </div>
            <div className="rounded-xl border border-ivory-300 bg-ivory-50 p-4">
              <dt className="mb-1 text-xs text-ink-400">Période et saisie</dt>
              <dd className="font-semibold text-ink-800">
                {p.start === 1 && p.end === 12 ? `Année ${a.year}` : `${monthShort(p.start)} – ${monthShort(p.end)} ${a.year}`}
              </dd>
              <dd className="mt-0.5 text-xs text-ink-500">{plural(report.entries?.length || 0, 'poste d’émission', 'postes d’émission')}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Monthly ────────────────────────────────────────────────────────────────

export function MonthlyPanel({ report, unit, co2 }: Ctx) {
  const months = monthSeries(report)
  const hasData = months.some(m => m.total > 0)
  let c = 0
  const cumulative = months.map(m => ({ label: m.label, cumulative: (c += m.total) }))
  const years = (report.byYear ?? []).map(y => ({ ...y, label: String(y.year) }))
  const total = report.summary.total

  if (!hasData) {
    return (
      <Card className="p-6">
        <EmptyState
          icon={ClipboardList}
          title="Aucune donnée mensuelle"
          description="Saisissez vos consommations mois par mois dans le bilan pour suivre leur saisonnalité."
          action={<Button asChild size="sm" variant="outline"><Link href={`/dashboard/assessments/${report.assessment.id}`}>Ouvrir le bilan</Link></Button>}
        />
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader eyebrow="Saisonnalité" title="Émissions mensuelles par scope" />
        <CardContent><MonthlyChart data={months} unit={unit} /></CardContent>
      </Card>

      <Card>
        <CardHeader eyebrow="Tendance" title="Évolution cumulée" />
        <CardContent><CumulativeChart data={cumulative} unit={unit} id="cum-monthly" /></CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader eyebrow="Données" title="Détail mensuel" />
        <TableScroll>
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className={THEAD_ROW}>
                <th scope="col" className="px-6 py-3 text-left font-semibold">Mois</th>
                {SCOPES.map(s => <th key={s.scope} scope="col" className="px-4 py-3 text-right font-semibold">{s.label}</th>)}
                <th scope="col" className="px-4 py-3 text-right font-semibold">Total</th>
                <th scope="col" className="px-6 py-3 text-right font-semibold">Part</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200">
              {months.map(m => (
                <tr key={m.month} className={m.total > 0 ? 'transition-colors hover:bg-ivory-50' : 'text-ink-300'}>
                  <th scope="row" className="px-6 py-2.5 text-left font-medium text-ink-800">{m.label}</th>
                  {[m.scope1, m.scope2, m.scope3].map((v, i) => (
                    <td key={i} className="px-4 py-2.5 text-right tabular-nums text-ink-600">{v > 0 ? co2(v) : '—'}</td>
                  ))}
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-forest-900">{m.total > 0 ? co2(m.total) : '—'}</td>
                  <td className="px-6 py-2.5 text-right tabular-nums text-ink-500">{m.total > 0 ? fmtPct(m.total, total, 1) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={TFOOT_ROW}>
                <th scope="row" className="px-6 py-3 text-left">Total</th>
                <td className="px-4 py-3 text-right tabular-nums">{co2(report.summary.scope1)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{co2(report.summary.scope2)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{co2(report.summary.scope3)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{co2(total)}</td>
                <td className="px-6 py-3 text-right">100 %</td>
              </tr>
            </tfoot>
          </table>
        </TableScroll>
      </Card>

      {years.length > 1 && (
        <Card>
          <CardHeader eyebrow="Historique" title="Comparaison annuelle" />
          <CardContent><YearlyChart data={years} unit={unit} /></CardContent>
        </Card>
      )}
    </div>
  )
}

// ── GHG Protocol ───────────────────────────────────────────────────────────

export function GhgPanel({ report, co2 }: Ctx) {
  const total = report.summary.total
  const vals = [report.summary.scope1, report.summary.scope2, report.summary.scope3]
  const cats = Object.entries(report.byGhgCategory)
    .filter(([, v]) => v.total > 0)
    .map(([name, v]) => ({ name, total: v.total, scope: scopeOfGhg(name) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }))

  return (
    <Card>
      <CardHeader eyebrow="Corporate Standard" title="Rapport GHG Protocol" />
      <CardContent className="space-y-4">
        {SCOPES.map((s, i) => {
          const Icon = SCOPE_ICONS[i]
          const items = cats.filter(c => c.scope === s.scope)
          const max = Math.max(...items.map(c => c.total), 1)
          return (
            <section key={s.scope} className="rounded-xl border border-ivory-300 bg-ivory-50/60 p-5" aria-labelledby={`ghg-s${s.scope}`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg text-white" style={{ backgroundColor: s.hex }}>
                  <Icon className="size-4" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 id={`ghg-s${s.scope}`} className="text-sm font-semibold text-forest-900">{s.label} — {s.name}</h3>
                  <p className="text-xs text-ink-400">{fmtPct(vals[i], total, 1)} du total</p>
                </div>
                <span className="font-display text-lg tabular-nums text-forest-900">{co2(vals[i])}</span>
              </div>
              {items.length > 0 ? (
                <ul className="mt-4 space-y-3 border-t border-ivory-300 pt-4">
                  {items.map(c => (
                    <li key={c.name}>
                      <div className="mb-1 flex justify-between gap-4 text-sm">
                        <span className="min-w-0 text-ink-700">{c.name}</span>
                        <span className="flex-shrink-0 font-semibold tabular-nums text-ink-800">{co2(c.total)}</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-ivory-200">
                        <div className="h-full rounded-full" style={{ width: `${Math.max((c.total / max) * 100, 1.5)}%`, backgroundColor: s.hex }} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-ink-400">Aucune émission déclarée pour ce scope.</p>
              )}
            </section>
          )
        })}
        <div className="flex flex-col gap-1 rounded-xl bg-forest-900 bg-forest-grain px-6 py-5 text-ivory-50 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-300">Total des émissions</span>
          <span className="font-display text-2xl tabular-nums">{co2(total)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ── ISO 14064 / 14069 ──────────────────────────────────────────────────────

export function IsoPanel({ report, co2 }: Ctx) {
  const total = report.summary.total
  const rows = useMemo(() => {
    const map: Record<string, { total: number; scope: number; count: number }> = {}
    for (const e of report.entries ?? []) {
      const k = e.iso_category || 'Autre'
      map[k] ??= { total: 0, scope: e.scope, count: 0 }
      map[k].total += num(e.total_co2eq)
      map[k].count++
    }
    return Object.entries(map).map(([code, v]) => ({ code, ...v })).filter(r => r.total > 0)
      .sort((a, b) => a.code.localeCompare(b.code, 'fr', { numeric: true }))
  }, [report])

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader eyebrow="Normes internationales" title="ISO 14064-1 / ISO 14069" />
        {rows.length === 0 ? <CardContent><NoData /></CardContent> : (
          <TableScroll>
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className={THEAD_ROW}>
                  <th scope="col" className="px-6 py-3 text-left font-semibold">Poste ISO 14069</th>
                  <th scope="col" className="px-4 py-3 text-center font-semibold">Scope</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Postes</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Émissions</th>
                  <th scope="col" className="w-48 px-6 py-3 text-right font-semibold">Part</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200">
                {rows.map(r => (
                  <tr key={r.code} className="transition-colors hover:bg-ivory-50">
                    <th scope="row" className="px-6 py-3 text-left font-medium text-ink-800">{isoLabel(r.code)}</th>
                    <td className="px-4 py-3 text-center"><ScopeChip scope={r.scope} /></td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-500">{r.count}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink-800">{co2(r.total)}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-ivory-200">
                          <div className="h-full rounded-full" style={{ width: `${total > 0 ? (r.total / total) * 100 : 0}%`, backgroundColor: scopeHex(r.scope) }} />
                        </div>
                        <span className="w-14 text-right tabular-nums text-ink-500">{fmtPct(r.total, total, 1)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={TFOOT_ROW}>
                  <th scope="row" className="px-6 py-3 text-left">Total</th>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-right tabular-nums">{report.entries?.length || 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{co2(total)}</td>
                  <td className="px-6 py-3 text-right">100 %</td>
                </tr>
              </tfoot>
            </table>
          </TableScroll>
        )}
      </Card>

      <Card>
        <CardHeader eyebrow="Référentiel" title="Cadre normatif" />
        <CardContent>
          <div className="grid grid-cols-1 gap-4 text-sm text-ink-500 md:grid-cols-2">
            <div className="rounded-xl border border-ivory-300 bg-ivory-50 p-5">
              <p className="mb-2 font-display text-base text-forest-900">ISO 14064-1:2018</p>
              <p className="leading-relaxed">Spécifications et lignes directrices, au niveau des organismes, pour la quantification et la déclaration des émissions et suppressions de gaz à effet de serre.</p>
            </div>
            <div className="rounded-xl border border-ivory-300 bg-ivory-50 p-5">
              <p className="mb-2 font-display text-base text-forest-900">ISO 14069:2013</p>
              <p className="leading-relaxed">Guide d’application de l’ISO 14064-1 pour la quantification et la déclaration des émissions de GES des organisations, poste par poste.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Detail ─────────────────────────────────────────────────────────────────

export function DetailPanel({ report, co2 }: Ctx) {
  const [scope, setScope] = useState<number>(0)
  const entries = useMemo(() => (report.entries ?? []).slice().sort((a, b) =>
    a.scope - b.scope || a.category.localeCompare(b.category) || (a.factor_name || '').localeCompare(b.factor_name || '') || (Number(a.month) || 0) - (Number(b.month) || 0),
  ), [report])
  const shown = scope ? entries.filter(e => e.scope === scope) : entries
  const shownTotal = shown.reduce((s, e) => s + num(e.total_co2eq), 0)

  if (entries.length === 0) {
    return (
      <Card className="p-6">
        <EmptyState
          icon={ClipboardList}
          title="Aucun poste d’émission saisi"
          description="Ouvrez le bilan pour saisir vos données."
          action={<Button asChild size="sm" variant="outline"><Link href={`/dashboard/assessments/${report.assessment.id}`}>Ouvrir le bilan</Link></Button>}
        />
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        eyebrow="Inventaire"
        title="Tous les postes d’émission"
        action={
          <div className="hidden items-center gap-1 rounded-xl border border-ivory-300 bg-ivory-100 p-1 sm:flex" role="group" aria-label="Filtrer par scope">
            {[0, 1, 2, 3].map(s => (
              <button
                key={s}
                onClick={() => setScope(s)}
                aria-pressed={scope === s}
                className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors', scope === s ? 'bg-white text-forest-900 shadow-soft' : 'text-ink-500 hover:text-forest-900')}
              >
                {s === 0 ? 'Tous' : `Scope ${s}`}
              </button>
            ))}
          </div>
        }
      />
      <TableScroll>
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className={THEAD_ROW}>
              <th scope="col" className="px-6 py-3 text-left font-semibold">Source</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Mois</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Catégorie GHG</th>
              <th scope="col" className="px-4 py-3 text-center font-semibold">Scope</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Quantité</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Facteur</th>
              <th scope="col" className="px-6 py-3 text-right font-semibold">Émissions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ivory-200">
            {shown.map(e => {
              const unitLabel = (e.unit || '').replace('kgCO2eq/', '')
              return (
                <tr key={e.id} className="transition-colors hover:bg-ivory-50">
                  <td className="px-6 py-2.5">
                    <p className="font-medium text-ink-800">{e.factor_name}</p>
                    <p className="text-xs text-ink-400">{subcategoryLabel(e.subcategory, e.category)}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink-600">{Number(e.month) ? monthShort(Number(e.month)) : '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-ink-500">{e.ghg_category}</td>
                  <td className="px-4 py-2.5 text-center"><ScopeChip scope={e.scope} short /></td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-ink-700">{fmtNum(num(e.quantity))} <span className="text-xs text-ink-400">{unitLabel}</span></td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs tabular-nums text-ink-500">{fmtNum(num(e.factor_value), 4)} <span className="text-ink-400">kg/{unitLabel}</span></td>
                  <td className="whitespace-nowrap px-6 py-2.5 text-right font-semibold tabular-nums text-forest-900">{co2(num(e.total_co2eq))}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className={TFOOT_ROW}>
              <th scope="row" colSpan={6} className="px-6 py-3 text-left">
                Total · {plural(shown.length, 'poste')}{scope ? ` (Scope ${scope})` : ''}
              </th>
              <td className="px-6 py-3 text-right tabular-nums">{co2(shownTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </TableScroll>
    </Card>
  )
}
