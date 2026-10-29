'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Building2, ClipboardList, Plus, ArrowRight, ArrowUpRight,
  Leaf, Upload, Award, Globe2, RefreshCw, Check, FileCheck2,
} from 'lucide-react'
import { cn, fmtCO2, fmtCO2Text, fmtDate } from '@/lib/utils'
import { sectorLabel } from '@/lib/sectors'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { CertStatusBadge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Stagger, Reveal } from '@/components/ui/motion'

interface DashboardData {
  company: {
    id: number; name: string; sector: string | null
    rccm: string | null; logoUrl: string | null
  }
  totals: { totalCo2eq: number; totalScope1: number; totalScope2: number; totalScope3: number }
  byCountry: Record<string, number>
  sites: Array<{ id: number; name: string; type: string; country: string | null; assessment_count: number }>
  assessments: Array<{
    id: number; name: string; year: number; status: string; created_at: string
    total_co2eq: number; scope1_co2eq: number; scope2_co2eq: number; scope3_co2eq: number
    site_name: string; site_country: string | null
  }>
  certifications: Array<{
    id: number; status: string; requested_at: string; certified_at: string | null
    certificate_number: string | null; expert_name: string | null
    assessment_name: string; assessment_year: number
  }>
  certCounts: { pending: number; inProgress: number; atCnc?: number; certified: number; rejected: number }
}

const SCOPES = [
  { key: 'totalScope1', label: 'Scope 1', sub: 'Émissions directes',      bar: 'bg-gold-400',   dot: 'bg-gold-400' },
  { key: 'totalScope2', label: 'Scope 2', sub: 'Énergie indirecte',       bar: 'bg-ivory-200',  dot: 'bg-ivory-200' },
  { key: 'totalScope3', label: 'Scope 3', sub: 'Autres indirectes',       bar: 'bg-forest-400', dot: 'bg-forest-400' },
] as const

const JOURNEY = [
  { status: 'pending',          label: 'Demande' },
  { status: 'assigned',         label: 'Expert' },
  { status: 'in_progress',      label: 'Audit terrain' },
  { status: 'audit_done',       label: 'Audit validé' },
  { status: 'submitted_to_cnc', label: 'Dépôt CNC' },
  { status: 'certified',        label: 'Certificat' },
]

const ASSESSMENT_STATUS: Record<string, string> = {
  draft: 'Brouillon', in_progress: 'En cours', completed: 'Finalisé',
}

function todayLabel() {
  const s = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch('/api/dashboard/stats')
      if (res.ok) setData(await res.json())
      else if (silent) toast.error('Impossible de rafraîchir les données')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('logo', file)
    const res = await fetch('/api/company/logo', { method: 'POST', body: fd })
    if (res.ok) {
      const d = await res.json()
      setData(prev => prev ? { ...prev, company: { ...prev.company, logoUrl: d.logoUrl } } : prev)
      toast.success('Logo mis à jour')
    } else {
      toast.error('Échec du téléversement du logo')
    }
  }

  if (loading) return <DashboardSkeleton />
  if (!data) return null

  const { company, totals, byCountry, sites, assessments, certifications, certCounts } = data
  const countryStats = Object.entries(byCountry).sort((a, b) => b[1] - a[1])
  const total = fmtCO2(totals.totalCo2eq)
  const share = (v: number) => (totals.totalCo2eq > 0 ? (v / totals.totalCo2eq) * 100 : 0)
  const latestCert = certifications[0]
  const completedCount = assessments.filter(a => a.status === 'completed').length

  return (
    <Stagger className="space-y-8">

      {/* ── Header ── */}
      <Reveal>
        <PageHeader
          eyebrow={todayLabel()}
          title={
            <span className="flex items-center gap-4">
              <label className="group relative flex size-14 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-ivory-300 bg-white shadow-soft">
                {company.logoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={company.logoUrl} alt={company.name} className="h-full w-full object-contain p-1.5" />
                  : <Leaf className="size-6 text-forest-400" strokeWidth={1.6} />}
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-forest-950/70 opacity-0 transition-opacity group-hover:opacity-100">
                  <Upload className="size-4 text-ivory-50" />
                  <span className="font-sans text-[9px] font-semibold text-ivory-50">Changer</span>
                </span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogoUpload} className="hidden" />
              </label>
              <span className="truncate">{company.name}</span>
            </span>
          }
          description={
            <>
              {company.sector ? `${sectorLabel(company.sector)} · ` : ''}
              {sites.length} site{sites.length > 1 ? 's' : ''} · {assessments.length} bilan{assessments.length > 1 ? 's' : ''} carbone
            </>
          }
          actions={
            <>
              <Button variant="outline" size="icon" onClick={() => load(true)} aria-label="Rafraîchir">
                <RefreshCw className={cn(refreshing && 'animate-spin')} />
              </Button>
              <Button asChild>
                <Link href="/dashboard/assessments?new=1"><Plus /> Nouveau bilan</Link>
              </Button>
            </>
          }
        />
      </Reveal>

      {/* ── Hero: footprint + certification journey ── */}
      <div className="grid gap-6 xl:grid-cols-5">
        <Reveal className="xl:col-span-3">
          <div className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-forest-900 bg-forest-grain p-8 text-ivory-50 shadow-lifted">
            <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full border border-gold-400/10" />
            <div className="pointer-events-none absolute -right-4 -top-4 size-40 rounded-full border border-gold-400/10" />

            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-300/90">Empreinte carbone totale</p>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="font-display text-6xl font-light tracking-tight tabular-nums md:text-7xl">{total.value}</span>
              <span className="text-lg font-medium text-forest-100/70">{total.unit}</span>
            </div>
            <p className="mt-2 text-sm text-forest-100/60">Cumul de l&apos;ensemble des bilans, tous sites confondus</p>

            <dl className="mb-10 mt-8 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-6">
              {[
                { label: 'Bilans finalisés', value: `${completedCount}/${assessments.length}` },
                { label: 'Sites couverts',   value: String(sites.length) },
                { label: 'Dernier bilan',    value: assessments[0] ? String(assessments[0].year) : '—' },
              ].map(f => (
                <div key={f.label}>
                  <dt className="text-[11px] text-forest-100/50">{f.label}</dt>
                  <dd className="mt-1 font-display text-2xl tabular-nums text-ivory-50">{f.value}</dd>
                </div>
              ))}
            </dl>

            {/* Scope split */}
            <div className="mt-auto flex h-2.5 overflow-hidden rounded-full bg-white/10">
              {SCOPES.map(s => (
                <div key={s.key} className={cn(s.bar, 'h-full transition-all duration-700')} style={{ width: `${share(totals[s.key])}%` }} />
              ))}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              {SCOPES.map(s => (
                <div key={s.key} className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('size-2 rounded-full', s.dot)} />
                    <span className="text-xs font-semibold text-ivory-50">{s.label}</span>
                    <span className="text-xs tabular-nums text-forest-100/50">{share(totals[s.key]).toFixed(0)} %</span>
                  </div>
                  <p className="mt-1.5 truncate font-display text-xl tabular-nums">{fmtCO2Text(totals[s.key])}</p>
                  <p className="text-[11px] text-forest-100/50">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal className="xl:col-span-2">
          <Card className="flex h-full flex-col p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">Parcours de certification</p>
                <h2 className="mt-1 font-display text-xl text-forest-900">
                  {latestCert ? latestCert.assessment_name : 'Faites certifier votre bilan'}
                </h2>
              </div>
              {latestCert && <CertStatusBadge status={latestCert.status} />}
            </div>

            {latestCert ? (
              <>
                <JourneyStepper status={latestCert.status} />
                <p className="mt-auto pt-6 text-xs text-ink-500">
                  {latestCert.status === 'certified' && latestCert.certificate_number
                    ? <>Certificat n° <span className="font-semibold text-forest-800">{latestCert.certificate_number}</span></>
                    : latestCert.expert_name
                      ? <>Expert : <span className="font-semibold text-ink-700">{latestCert.expert_name}</span></>
                      : <>Demande du {fmtDate(latestCert.requested_at)}</>}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-ink-500">
                Finalisez un bilan puis soumettez-le : un expert accrédité réalise l&apos;audit terrain
                et dépose votre dossier auprès du CNC.
              </p>
            )}

            <Button asChild variant="outline" className="mt-6 w-full">
              <Link href="/dashboard/certifications">
                {latestCert ? 'Suivre mes demandes' : 'Voir les certifications'} <ArrowRight />
              </Link>
            </Button>
          </Card>
        </Reveal>
      </div>

      {/* ── Certification pipeline ── */}
      {certifications.length > 0 && (
        <Reveal>
          <Card className="grid grid-cols-2 divide-ivory-300 sm:grid-cols-5 sm:divide-x">
            {[
              { label: 'En attente',     value: certCounts.pending },
              { label: 'Audit en cours', value: certCounts.inProgress },
              { label: 'Déposés au CNC', value: certCounts.atCnc ?? 0 },
              { label: 'Certifiés',      value: certCounts.certified, accent: true },
              { label: 'Rejetés',        value: certCounts.rejected },
            ].map(s => (
              <div key={s.label} className="px-6 py-5">
                <p className={cn('font-display text-3xl tabular-nums', s.accent ? 'text-gold-600' : 'text-forest-900')}>{s.value}</p>
                <p className="mt-1 text-xs font-medium text-ink-500">{s.label}</p>
              </div>
            ))}
          </Card>
        </Reveal>
      )}

      {/* ── Emissions by country ── */}
      {countryStats.length > 1 && (
        <Reveal>
          <Card>
            <CardHeader eyebrow="Répartition" title={<span className="flex items-center gap-2"><Globe2 className="size-4 text-gold-500" /> Émissions par pays</span>} />
            <CardContent className="space-y-3">
              {countryStats.map(([country, val]) => (
                <div key={country} className="grid grid-cols-[140px_1fr_auto] items-center gap-4">
                  <span className="truncate text-sm font-medium text-ink-700">{country}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-ivory-200">
                    <div className="h-full rounded-full bg-forest-600" style={{ width: `${share(val)}%` }} />
                  </div>
                  <span className="w-40 text-right text-sm tabular-nums text-ink-600">
                    <span className="font-semibold text-forest-900">{fmtCO2Text(val)}</span> · {share(val).toFixed(1)} %
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </Reveal>
      )}

      {/* ── Lists ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Reveal>
          <Card className="h-full">
            <CardHeader eyebrow="Périmètre" title="Sites & Entités" action={<SeeAll href="/dashboard/sites" />} />
            <CardContent>
              {sites.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="Aucun site enregistré"
                  description="Ajoutez vos sites pour structurer vos bilans."
                  action={<Button asChild size="sm"><Link href="/dashboard/sites"><Plus /> Ajouter un site</Link></Button>}
                />
              ) : (
                <ul className="-mx-2">
                  {sites.slice(0, 5).map(site => (
                    <li key={site.id}>
                      <Link href="/dashboard/sites" className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-ivory-100">
                        <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-600">
                          <Building2 className="size-4" strokeWidth={1.8} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink-800">{site.name}</span>
                          <span className="block truncate text-xs text-ink-400 first-letter:uppercase">
                            {site.type}{site.country ? ` · ${site.country}` : ''}
                          </span>
                        </span>
                        <span className="text-xs tabular-nums text-ink-400">{site.assessment_count} bilan{site.assessment_count > 1 ? 's' : ''}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </Reveal>

        <Reveal>
          <Card className="h-full">
            <CardHeader eyebrow="Activité" title="Bilans récents" action={<SeeAll href="/dashboard/assessments" />} />
            <CardContent>
              {assessments.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Aucun bilan carbone"
                  description="Créez votre premier bilan GES."
                  action={<Button asChild size="sm"><Link href="/dashboard/assessments?new=1"><Plus /> Créer un bilan</Link></Button>}
                />
              ) : (
                <ul className="-mx-2">
                  {assessments.slice(0, 5).map(a => (
                    <li key={a.id}>
                      <Link href={`/dashboard/assessments/${a.id}`} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-ivory-100">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink-800">{a.name}</span>
                          <span className="block truncate text-xs text-ink-400">
                            {a.site_name} · {a.year} · {ASSESSMENT_STATUS[a.status] ?? a.status}
                          </span>
                        </span>
                        <span className="text-right">
                          <span className="block text-sm font-semibold tabular-nums text-forest-900">
                            {fmtCO2Text(parseFloat(String(a.total_co2eq)) || 0)}
                          </span>
                          <span className="block text-[11px] text-ink-400">{fmtDate(a.created_at)}</span>
                        </span>
                        <ArrowUpRight className="size-4 text-ink-400 opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </Reveal>

        <Reveal>
          <Card className="h-full">
            <CardHeader eyebrow="Conformité" title="Certifications" action={<SeeAll href="/dashboard/certifications" />} />
            <CardContent>
              {certifications.length === 0 ? (
                <EmptyState
                  icon={Award}
                  title="Aucune certification"
                  description="Finalisez un bilan puis soumettez-le à certification."
                />
              ) : (
                <ul className="-mx-2">
                  {certifications.slice(0, 5).map(c => (
                    <li key={c.id}>
                      <Link href="/dashboard/certifications" className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-ivory-100">
                        <span className={cn(
                          'flex size-9 flex-shrink-0 items-center justify-center rounded-lg',
                          c.status === 'certified' ? 'bg-gold-50 text-gold-600' : 'bg-ivory-200 text-ink-500',
                        )}>
                          {c.status === 'certified' ? <FileCheck2 className="size-4" strokeWidth={1.8} /> : <Award className="size-4" strokeWidth={1.8} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink-800">{c.assessment_name}</span>
                          <span className="block truncate text-xs text-ink-400">{c.assessment_year} · {fmtDate(c.requested_at)}</span>
                        </span>
                        <CertStatusBadge status={c.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </Stagger>
  )
}

function SeeAll({ href }: { href: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-forest-700 transition-colors hover:text-gold-600">
      Voir tout <ArrowRight className="size-3" />
    </Link>
  )
}

function JourneyStepper({ status }: { status: string }) {
  const rejected = status === 'rejected'
  const idx = JOURNEY.findIndex(s => s.status === status)
  return (
    <ol className="mt-6 space-y-0">
      {JOURNEY.map((step, i) => {
        const done = !rejected && (i < idx || status === 'certified')
        const active = !rejected && i === idx && status !== 'certified'
        return (
          <li key={step.status} className="relative flex items-center gap-3 pb-3 last:pb-0">
            {i < JOURNEY.length - 1 && (
              <span className={cn('absolute left-[11px] top-6 h-[calc(100%-12px)] w-px', done ? 'bg-forest-600' : 'bg-ivory-300')} />
            )}
            <span className={cn(
              'relative z-10 flex size-6 flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-bold',
              done   && 'border-forest-700 bg-forest-700 text-ivory-50',
              active && 'border-gold-500 bg-gold-50 text-gold-700 ring-4 ring-gold-100',
              !done && !active && 'border-ivory-400 bg-white text-ink-400',
            )}>
              {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
            </span>
            <span className={cn(
              'text-sm',
              done ? 'text-ink-700' : active ? 'font-semibold text-forest-900' : 'text-ink-400',
            )}>
              {step.label}
            </span>
          </li>
        )
      })}
      {rejected && (
        <p className="pt-2 text-xs text-red-600">Demande rejetée — consultez le motif dans vos certifications.</p>
      )}
    </ol>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid gap-6 xl:grid-cols-5">
        <Skeleton className="h-72 rounded-3xl xl:col-span-3" />
        <Skeleton className="h-72 rounded-2xl xl:col-span-2" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  )
}
