'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Building2, ClipboardList, Plus, ArrowRight, ArrowUpRight, Leaf, Upload, Award,
  Globe2, RefreshCw, Check, FileCheck2, Link2, ShieldCheck, PencilLine, Send,
  AlertTriangle, CalendarRange, type LucideIcon,
} from 'lucide-react'
import { cn, fmtCO2, fmtCO2Text, fmtDate, fmtPct, co2UnitFor, plural, SCOPES, type CO2Unit } from '@/lib/utils'
import { sectorLabel } from '@/lib/sectors'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { CertStatusBadge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Stagger, Reveal } from '@/components/ui/motion'
import { CertJourney } from '@/components/ui/cert-journey'

type YearRow = { year: number; total: number; scope1: number; scope2: number; scope3: number; assessments: number; siteIds?: number[] }
type Assessment = {
  id: number; name: string; year: number; status: string; created_at: string
  total_co2eq: number | string; scope1_co2eq: number | string; scope2_co2eq: number | string; scope3_co2eq: number | string
  site_name: string; site_country: string | null
}
type Cert = {
  id: number; status: string; requested_at: string; certified_at: string | null
  certificate_number: string | null; expert_name: string | null
  assessment_id?: number; assessment_name: string; assessment_year: number
}

interface DashboardData {
  company: { id: number; name: string; sector: string | null; rccm: string | null; logoUrl: string | null }
  byYear: YearRow[]
  sites: Array<{ id: number; name: string; type: string; country: string | null; assessment_count: number }>
  assessments: Assessment[]
  certifications: Cert[]
  certCounts: { pending: number; inProgress: number; atCnc?: number; certified: number; rejected: number }
}

const SITE_TYPE_FR: Record<string, string> = {
  agence: 'Agence', boutique: 'Boutique', bureau: 'Bureau / Siège', chantier: 'Chantier', clinique: 'Clinique',
  datacenter: 'Data center', ecole: 'École', entrepot: 'Entrepôt', exploitation_agricole: 'Exploitation agricole',
  garage: 'Garage / Atelier', hotel: 'Hôtel', laboratoire: 'Laboratoire', logistique: 'Plateforme logistique',
  magasin: 'Magasin', restaurant: 'Restaurant', supermarche: 'Supermarché', usine: 'Usine', autre: 'Autre',
}
const siteTypeLabel = (t: string) => SITE_TYPE_FR[t] ?? (t ? t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ') : '')

const ASSESSMENT_STATUS: Record<string, string> = { draft: 'Brouillon', in_progress: 'En cours', completed: 'Finalisé' }
const LIVE = ['pending', 'assigned', 'in_progress', 'audit_done', 'submitted_to_cnc']

const num = (v: number | string | null | undefined) => parseFloat(String(v ?? 0)) || 0
const certKey = (c: Cert) => (c.assessment_id ? `id:${c.assessment_id}` : `${c.assessment_name}|${c.assessment_year}`)
const assessmentKeys = (a: Assessment) => [`id:${a.id}`, `${a.name}|${a.year}`]
const maxUnit = (values: number[]): CO2Unit => co2UnitFor(Math.max(0, ...values))

function todayLabel() {
  const s = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const logoInput = useRef<HTMLInputElement>(null)

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else { setLoading(true); setError(false) }
    try {
      const res = await fetch('/api/dashboard/stats', { cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      setData(await res.json())
      setError(false)
    } catch {
      if (silent) toast.error('Impossible de rafraîchir les données')
      else setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('logo', file)
      const res = await fetch('/api/company/logo', { method: 'POST', body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Échec du téléversement du logo')
      setData(prev => prev ? { ...prev, company: { ...prev.company, logoUrl: d.logoUrl } } : prev)
      window.dispatchEvent(new Event('ct:company-updated'))
      toast.success('Logo mis à jour')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec du téléversement du logo')
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <DashboardSkeleton />
  if (!data) return <ErrorState onRetry={() => load()} show={error} />

  const { company, sites, assessments, certifications, certCounts } = data
  const byYear = data.byYear ?? []

  // Latest request per bilan (API returns newest first)
  const certByBilan = new Map<string, Cert>()
  for (const c of certifications) if (!certByBilan.has(certKey(c))) certByBilan.set(certKey(c), c)
  const latestCerts = Array.from(certByBilan.values())
  const certFor = (a: Assessment) => assessmentKeys(a).map(k => certByBilan.get(k)).find(Boolean)
  const latestCertified = certifications.find(c => c.status === 'certified' && c.certificate_number)

  const hasData = assessments.some(a => num(a.total_co2eq) > 0)
  const latestYear = byYear.find(y => y.total > 0)
  const next = nextStep(sites.length, assessments, certFor, certifications)

  // Country split for the headline year only
  const countryStats = latestYear
    ? Object.entries(
        assessments.filter(a => Number(a.year) === latestYear.year).reduce<Record<string, number>>((acc, a) => {
          const c = a.site_country || 'Non renseigné'
          acc[c] = (acc[c] || 0) + num(a.total_co2eq)
          return acc
        }, {}),
      ).sort((a, b) => b[1] - a[1])
    : []
  const countryUnit = maxUnit(countryStats.map(c => c[1]))
  const recent = assessments.slice(0, 5)
  const recentUnit = maxUnit(recent.map(a => num(a.total_co2eq)))

  return (
    <Stagger className="space-y-8">

      {/* ── Header ── */}
      <Reveal>
        <PageHeader
          eyebrow={todayLabel()}
          title={
            <span className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => logoInput.current?.click()}
                disabled={uploading}
                aria-label={company.logoUrl ? 'Changer le logo de l’entreprise' : 'Ajouter le logo de l’entreprise'}
                className="group relative flex size-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-ivory-300 bg-white shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2"
              >
                {company.logoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={company.logoUrl} alt="" className="h-full w-full object-contain p-1.5" />
                  : <Leaf className="size-6 text-forest-400" strokeWidth={1.6} />}
                <span className={cn(
                  'absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-forest-950/70 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100',
                  uploading && 'opacity-100',
                )}>
                  {uploading
                    ? <RefreshCw className="size-4 animate-spin text-ivory-50" />
                    : <><Upload className="size-4 text-ivory-50" /><span className="font-sans text-[9px] font-semibold text-ivory-50">Changer</span></>}
                </span>
              </button>
              <input ref={logoInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogoUpload} className="sr-only" tabIndex={-1} aria-hidden />
              <span className="min-w-0 break-words">{company.name}</span>
            </span>
          }
          description={
            <>
              {company.sector ? `${sectorLabel(company.sector)} · ` : ''}
              {plural(sites.length, 'site')} · {plural(assessments.length, 'bilan')} carbone
            </>
          }
          actions={
            <>
              <Button variant="outline" size="icon" onClick={() => load(true)} aria-label="Rafraîchir les données">
                <RefreshCw className={cn(refreshing && 'animate-spin')} />
              </Button>
              {sites.length > 0 && (
                <Button asChild>
                  <Link href="/dashboard/assessments?new=1"><Plus /> Nouveau bilan</Link>
                </Button>
              )}
            </>
          }
        />
      </Reveal>

      {!hasData ? (
        /* ── Onboarding (no data yet) ── */
        <Reveal><Onboarding sites={sites.length} assessments={assessments.length} next={next} /></Reveal>
      ) : (
        <>
          {latestCertified && <Reveal><CertifiedHero cert={latestCertified} /></Reveal>}

          {latestYear && <Reveal><FootprintHero byYear={byYear} latest={latestYear} /></Reveal>}
          <Reveal><NextStepCard next={next} /></Reveal>
        </>
      )}

      {/* ── Certification pipeline (only worth it with several requests) ── */}
      {certifications.length > 3 && (
        <Reveal>
          <Card className="grid grid-cols-2 divide-ivory-300 sm:grid-cols-5 sm:divide-x">
            {[
              { label: 'En attente',     value: certCounts.pending },
              { label: 'Audit en cours', value: certCounts.inProgress },
              { label: 'Déposés à la DGEPN', value: certCounts.atCnc ?? 0 },
              { label: 'Certifiés',      value: certCounts.certified, accent: true },
              { label: 'Refusées',       value: certCounts.rejected },
            ].map(s => (
              <div key={s.label} className="px-6 py-5">
                <p className={cn('font-display text-3xl tabular-nums', s.accent ? 'text-gold-600' : 'text-forest-900')}>{s.value}</p>
                <p className="mt-1 text-xs font-medium text-ink-500">{s.label}</p>
              </div>
            ))}
          </Card>
        </Reveal>
      )}

      {/* ── Emissions by country (headline year) ── */}
      {latestYear && countryStats.length > 1 && (
        <Reveal>
          <Card>
            <CardHeader
              eyebrow={`Répartition ${latestYear.year}`}
              title={<span className="flex items-center gap-2"><Globe2 className="size-4 text-gold-500" /> Émissions par pays</span>}
            />
            <CardContent className="space-y-4">
              {countryStats.map(([country, val]) => (
                <div key={country} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[160px_1fr_auto]">
                  <span className="truncate text-sm font-medium text-ink-700">{country}</span>
                  <div className="order-last col-span-2 h-2 overflow-hidden rounded-full bg-ivory-200 sm:order-none sm:col-span-1">
                    <div className="h-full rounded-full bg-forest-600" style={{ width: `${(val / latestYear.total) * 100}%` }} />
                  </div>
                  <span className="text-right text-sm tabular-nums text-ink-500 sm:w-44">
                    <span className="font-semibold text-forest-900">{fmtCO2Text(val, countryUnit)}</span> · {fmtPct(val, latestYear.total, 1)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </Reveal>
      )}

      {/* ── Lists ── */}
      {sites.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Reveal className="min-w-0">
            <Card className="h-full">
              <CardHeader eyebrow="Périmètre" title="Sites et entités" action={<SeeAll href="/dashboard/sites" />} />
              <CardContent>
                <ul className="-mx-2">
                  {sites.slice(0, 5).map(site => (
                    <li key={site.id}>
                      <Link href={`/dashboard/assessments?site=${site.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-ivory-100">
                        <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-600">
                          <Building2 className="size-4" strokeWidth={1.8} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink-800">{site.name}</span>
                          <span className="block truncate text-xs text-ink-400">
                            {siteTypeLabel(site.type)}{site.country ? ` · ${site.country}` : ''}
                          </span>
                        </span>
                        <span className="whitespace-nowrap text-xs tabular-nums text-ink-400">
                          {plural(site.assessment_count, 'bilan')}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal className="min-w-0">
            <Card className="h-full">
              <CardHeader eyebrow="Activité" title="Bilans récents" action={<SeeAll href="/dashboard/assessments" />} />
              <CardContent>
                {recent.length === 0 ? (
                  <EmptyState
                    icon={ClipboardList}
                    title="Aucun bilan carbone"
                    description="Créez votre premier bilan GES pour un de vos sites."
                    action={<Button asChild size="sm"><Link href="/dashboard/assessments?new=1"><Plus /> Créer un bilan</Link></Button>}
                  />
                ) : (
                  <ul className="-mx-2">
                    {recent.map(a => (
                      <li key={a.id}>
                        <Link href={`/dashboard/assessments/${a.id}`} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-ivory-100">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink-800">{a.name}</span>
                            <span className="block truncate text-xs text-ink-400">
                              {a.site_name} · {a.year} · {ASSESSMENT_STATUS[a.status] ?? a.status}
                            </span>
                          </span>
                          <span className="text-right">
                            <span className="block whitespace-nowrap text-sm font-semibold tabular-nums text-forest-900">
                              {num(a.total_co2eq) > 0 ? fmtCO2Text(num(a.total_co2eq), recentUnit) : '—'}
                            </span>
                            <span className="block text-[11px] text-ink-400">{fmtDate(a.created_at)}</span>
                          </span>
                          <ArrowUpRight className="hidden size-4 text-ink-400 opacity-0 transition-opacity group-hover:opacity-100 sm:block" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </Reveal>

          <Reveal className="min-w-0">
            <Card className="h-full">
              <CardHeader eyebrow="Conformité" title="Certifications" action={<SeeAll href="/dashboard/certifications" />} />
              <CardContent>
                {latestCerts.length === 0 ? (
                  <EmptyState
                    icon={Award}
                    title="Aucune certification"
                    description="Saisissez les données d’un bilan, puis demandez sa certification."
                  />
                ) : (
                  <ul className="-mx-2">
                    {latestCerts.slice(0, 5).map(c => (
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
                            <span className="block truncate text-xs text-ink-400">Exercice {c.assessment_year} · {fmtDate(c.requested_at)}</span>
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
      )}
    </Stagger>
  )
}

/* ─────────────────────────── Next step logic ─────────────────────────── */

type Next = {
  key: string
  icon: LucideIcon
  eyebrow: string
  title: string
  body: string
  cta?: { label: string; href: string }
  cert?: Cert
  context?: string
}

function nextStep(
  siteCount: number,
  assessments: Assessment[],
  certFor: (a: Assessment) => Cert | undefined,
  certifications: Cert[],
): Next {
  if (siteCount === 0) {
    return {
      key: 'site', icon: Building2, eyebrow: 'Étape 1 sur 3', title: 'Ajoutez votre premier site',
      body: 'Déclarez le siège, une usine ou une agence : chaque bilan carbone est rattaché à un site.',
      cta: { label: 'Ajouter votre premier site', href: '/dashboard/sites?new=1' },
    }
  }
  if (assessments.length === 0) {
    return {
      key: 'bilan', icon: ClipboardList, eyebrow: 'Étape 2 sur 3', title: 'Créez votre premier bilan',
      body: 'Choisissez un site et un exercice : vous saisirez ensuite vos consommations mois par mois.',
      cta: { label: 'Créer un bilan', href: '/dashboard/assessments?new=1' },
    }
  }

  // A request already moving through the journey takes priority — it is what the company waits on.
  const live = certifications.find(c => LIVE.includes(c.status))
  if (live) {
    const ctx = `${live.assessment_name} · exercice ${live.assessment_year}`
    const base = { key: `cert-${live.status}`, icon: ShieldCheck, eyebrow: 'Certification en cours', cert: live, context: ctx }
    switch (live.status) {
      case 'pending':
        return { ...base, title: 'Demande en cours d’examen', body: 'Votre demande est en cours d’examen par GreenLeaves. Un expert accrédité vous sera assigné prochainement.' }
      case 'assigned':
        return { ...base, title: 'Préparez l’audit terrain', body: `${live.expert_name ?? 'Votre expert'} va vous contacter pour planifier la visite. Rassemblez factures et justificatifs pour chaque source déclarée.` }
      case 'in_progress':
        return { ...base, title: 'Audit terrain en cours', body: `${live.expert_name ?? 'L’expert'} vérifie vos données sur site. Restez disponible pour répondre à ses questions.` }
      case 'audit_done':
        return { ...base, title: 'Audit validé', body: 'Le dossier est en préparation pour la DGEPN. L’expert le déposera en votre nom.' }
      default:
        return { ...base, title: 'Dossier déposé à la DGEPN', body: 'Dossier déposé à la DGEPN — avis du CNC puis délivrance du certificat. Vous serez notifié dès sa délivrance.' }
    }
  }

  const focus = assessments[0]
  const cert = certFor(focus)
  const ctx = `${focus.name} · exercice ${focus.year}`
  if (num(focus.total_co2eq) <= 0) {
    return {
      key: 'data', icon: PencilLine, eyebrow: 'Prochaine étape', title: 'Saisissez vos données', context: ctx,
      body: 'Renseignez vos consommations d’énergie, de carburant et vos achats pour calculer l’empreinte de ce bilan.',
      cta: { label: 'Saisir vos données', href: `/dashboard/assessments/${focus.id}` },
    }
  }
  if (cert?.status === 'rejected') {
    return {
      key: 'rejected', icon: AlertTriangle, eyebrow: 'Demande refusée', title: 'Corrigez puis soumettez à nouveau', context: ctx, cert,
      body: 'Consultez le motif du refus, complétez vos données ou justificatifs, puis renouvelez votre demande.',
      cta: { label: 'Voir le motif', href: '/dashboard/certifications' },
    }
  }
  if (!cert) {
    return {
      key: 'request', icon: Send, eyebrow: 'Prochaine étape', title: 'Demandez la certification', context: ctx,
      body: 'Votre bilan contient des données. Un expert accrédité réalisera l’audit terrain puis déposera votre dossier à la DGEPN.',
      cta: { label: 'Demander la certification', href: `/dashboard/assessments/${focus.id}` },
    }
  }
  return {
    key: 'new-year', icon: CalendarRange, eyebrow: 'Prochaine étape', title: 'Préparez votre prochain exercice',
    body: 'Votre dernier bilan est certifié. Ouvrez le bilan de l’exercice suivant pour suivre votre trajectoire.',
    cta: { label: 'Créer un bilan', href: '/dashboard/assessments?new=1' },
  }
}

/* ─────────────────────────── Blocks ─────────────────────────── */

function FootprintHero({ byYear, latest }: { byYear: YearRow[]; latest: YearRow }) {
  const prev = byYear.find(y => y.year < latest.year && y.total > 0)
  const unit = co2UnitFor(latest.total)
  const total = fmtCO2(latest.total, unit)
  // A % change is only honest for a closed year on the same sites; otherwise say why there is none
  const running = latest.year >= new Date().getFullYear()
  const samePerimeter = !!prev && [...(latest.siteIds ?? [])].sort().join() === [...(prev.siteIds ?? [])].sort().join()
  const delta = prev && !running && samePerimeter ? (latest.total - prev.total) / prev.total : null
  const trend = byYear.filter(y => y.total > 0).slice(0, 6).reverse()
  const trendMax = Math.max(...trend.map(y => y.total))
  const trendUnit = co2UnitFor(trendMax)
  const scopes = [latest.scope1, latest.scope2, latest.scope3]

  return (
    <section
      aria-label={`Empreinte carbone ${latest.year}`}
      className="relative overflow-hidden rounded-3xl bg-forest-900 bg-forest-grain p-6 text-ivory-50 shadow-lifted sm:p-8"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full border border-gold-400/10" />
      <div className="pointer-events-none absolute -right-4 -top-4 size-40 rounded-full border border-gold-400/10" />

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-300/90">Empreinte {latest.year}</p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-5xl font-light tracking-tight tabular-nums sm:text-6xl md:text-7xl">{total.value}</span>
            <span className="text-lg font-medium text-forest-100/70">{total.unit}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {delta === null || !prev ? (
              <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs font-semibold text-forest-100/80">
                {running ? 'Exercice en cours' : prev ? `Périmètre différent de ${prev.year}` : 'Premier exercice'}
              </span>
            ) : (
              <span className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums',
                delta <= 0 ? 'bg-forest-300/15 text-forest-200' : 'bg-gold-400/15 text-gold-300',
              )}>
                {delta <= 0 ? '▼' : '▲'} {Math.abs(delta * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %
                <span className="sr-only">par rapport à</span>
              </span>
            )}
            <span className="text-forest-100/60">
              {delta !== null && prev ? `vs ${prev.year} · ` : ''}{plural(latest.assessments, 'bilan')} sur l’exercice
            </span>
          </div>
        </div>

        {trend.length > 1 && (
          <figure className="flex-shrink-0" aria-label="Évolution annuelle">
            <div className="flex h-20 items-end gap-2">
              {trend.map(y => (
                <div key={y.year} className="flex flex-col items-center gap-1.5" title={`${y.year} : ${fmtCO2Text(y.total, trendUnit)}`}>
                  <div
                    className={cn('w-5 rounded-t-md', y.year === latest.year ? 'bg-gold-400' : 'bg-white/20')}
                    style={{ height: `${Math.max(6, (y.total / trendMax) * 64)}px` }}
                  />
                  <span className={cn('text-[10px] tabular-nums', y.year === latest.year ? 'font-semibold text-gold-300' : 'text-forest-100/50')}>
                    {String(y.year).slice(2)}
                  </span>
                </div>
              ))}
            </div>
            <figcaption className="sr-only">
              {trend.map(y => `${y.year} : ${fmtCO2Text(y.total, trendUnit)}`).join(', ')}
            </figcaption>
          </figure>
        )}
      </div>

      {/* Scope split */}
      <div className="mt-8 flex h-2.5 overflow-hidden rounded-full bg-white/10" role="img" aria-label="Répartition par scope">
        {SCOPES.map((s, i) => (
          <div key={s.scope} className={cn(s.onDark, 'h-full transition-all duration-700')} style={{ width: `${(scopes[i] / latest.total) * 100}%` }} />
        ))}
      </div>
      <dl className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-3 sm:gap-4">
        {SCOPES.map((s, i) => (
          <div key={s.scope} className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-3 last:border-0 last:pb-0 sm:block sm:border-0 sm:pb-0">
            <dt className="min-w-0">
              <span className="flex items-center gap-2">
                <span className={cn('size-2 rounded-full', s.onDark)} />
                <span className="text-xs font-semibold text-ivory-50">{s.label}</span>
                <span className="text-xs tabular-nums text-forest-100/60">{fmtPct(scopes[i], latest.total)}</span>
              </span>
              <span className="mt-0.5 hidden text-[11px] text-forest-100/50 sm:block">{s.name}</span>
            </dt>
            <dd className="whitespace-nowrap font-display text-lg tabular-nums sm:mt-1.5 sm:text-xl">{fmtCO2Text(scopes[i], unit)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function NextStepCard({ next }: { next: Next }) {
  const Icon = next.icon
  const journey = next.cert && next.cert.status !== 'rejected'
  return (
    <Card className="p-6 sm:p-8">
      <div className={cn('grid gap-6', !journey && 'md:grid-cols-[minmax(0,1fr)_auto] md:items-center')}>
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl border border-gold-200 bg-gold-50 text-gold-600">
            <Icon className="size-5" strokeWidth={1.7} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">{next.eyebrow}</p>
              {next.cert && <CertStatusBadge status={next.cert.status} />}
            </div>
            <h2 className="mt-1.5 font-display text-2xl text-forest-900">{next.title}</h2>
            {next.context && <p className="mt-1 truncate text-xs font-medium text-ink-500">{next.context}</p>}
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-600">{next.body}</p>
          </div>
        </div>

        {!journey && next.cta && (
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href={next.cta.href}>{next.cta.label} <ArrowRight /></Link>
          </Button>
        )}
      </div>

      {journey && next.cert && (
        <div className="mt-8 border-t border-ivory-200 pt-6">
          <CertJourney status={next.cert.status} />
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-ink-500">
              Demande du {fmtDate(next.cert.requested_at)}
              {next.cert.expert_name && <> · Expert : <span className="font-semibold text-ink-700">{next.cert.expert_name}</span></>}
            </p>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/dashboard/certifications">Suivre ma demande <ArrowRight /></Link>
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function Onboarding({ sites, assessments, next }: { sites: number; assessments: number; next: Next }) {
  const steps = [
    { title: 'Ajouter un site', body: 'Siège, usine, agence… le périmètre de votre bilan.', done: sites > 0 },
    { title: 'Bilan et données', body: 'Créez un bilan puis saisissez vos consommations mensuelles.', done: false, started: assessments > 0 },
    { title: 'Certification', body: 'Audit terrain par un expert accrédité, puis certificat délivré par la DGEPN.', done: false },
  ]
  const activeIdx = steps.findIndex(s => !s.done)
  const doneCount = steps.filter(s => s.done).length

  return (
    <section aria-label="Bien démarrer" className="relative overflow-hidden rounded-3xl bg-forest-900 bg-forest-grain p-6 text-ivory-50 shadow-lifted sm:p-10">
      <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full border border-gold-400/10" />
      <div className="pointer-events-none absolute -right-6 -top-6 size-44 rounded-full border border-gold-400/10" />

      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-300/90">Bien démarrer · {doneCount}/3</p>
          <h2 className="mt-3 font-display text-3xl font-light leading-tight sm:text-4xl">
            Votre bilan carbone certifié,<br className="hidden sm:block" /> en trois étapes.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-forest-100/70">{next.body}</p>
          {next.cta && (
            <Button asChild variant="gold" size="lg" className="mt-8">
              <Link href={next.cta.href}>{next.cta.label} <ArrowRight /></Link>
            </Button>
          )}
        </div>

        <ol className="space-y-3">
          {steps.map((s, i) => {
            const active = i === activeIdx
            return (
              <li
                key={s.title}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex items-start gap-4 rounded-2xl border p-4 transition-colors sm:p-5',
                  active ? 'border-gold-400/40 bg-white/[0.07]' : 'border-white/10 bg-white/[0.02]',
                )}
              >
                <span className={cn(
                  'flex size-9 flex-shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
                  s.done && 'border-gold-400 bg-gold-400 text-forest-950',
                  active && 'border-gold-400 text-gold-300',
                  !s.done && !active && 'border-white/20 text-forest-100/50',
                )}>
                  {s.done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={cn('block font-semibold', active || s.done ? 'text-ivory-50' : 'text-forest-100/60')}>
                    {s.title}
                    {s.done && <span className="sr-only"> (terminé)</span>}
                    {active && s.started && <span className="ml-2 text-xs font-medium text-gold-300">En cours</span>}
                  </span>
                  <span className="mt-0.5 block text-sm text-forest-100/60">{s.body}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

function CertifiedHero({ cert }: { cert: Cert }) {
  const copyLink = async () => {
    const url = `${window.location.origin}/verify/${encodeURIComponent(cert.certificate_number ?? '')}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Lien de vérification copié', { description: url })
    } catch {
      toast.error('Copie impossible', { description: url })
    }
  }

  return (
    <section
      aria-label="Certificat DGEPN"
      className="relative overflow-hidden rounded-3xl border border-gold-200 bg-gradient-to-br from-gold-50 via-ivory-50 to-white p-6 shadow-gold sm:p-8"
    >
      <div className="pointer-events-none absolute -right-10 top-1/2 size-56 -translate-y-1/2 rounded-full border border-gold-300/40" />
      <div className="pointer-events-none absolute -right-2 top-1/2 size-36 -translate-y-1/2 rounded-full border border-gold-300/30" />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gold-500 text-forest-950 shadow-soft">
            <Award className="size-7" strokeWidth={1.6} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-700">Bilan certifié par la DGEPN</p>
            <p className="mt-1 break-words font-display text-xl text-forest-900 sm:text-3xl">N° {cert.certificate_number}</p>
            <p className="mt-1 text-sm text-ink-600">
              {cert.assessment_name} · exercice {cert.assessment_year}
              {cert.certified_at && <> · délivré le {fmtDate(cert.certified_at)}</>}
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap md:flex-shrink-0">
          <Button asChild variant="primary">
            <Link href="/dashboard/certifications"><FileCheck2 /> Voir le certificat</Link>
          </Button>
          <Button variant="outline" onClick={copyLink}>
            <Link2 /> Lien de vérification
          </Button>
        </div>
      </div>
    </section>
  )
}

function ErrorState({ onRetry, show }: { onRetry: () => void; show: boolean }) {
  if (!show) return null
  return (
    <Card className="mx-auto mt-10 max-w-lg p-8 text-center" role="alert">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600">
        <AlertTriangle className="size-5" strokeWidth={1.8} />
      </span>
      <h1 className="mt-4 font-display text-2xl text-forest-900">Tableau de bord indisponible</h1>
      <p className="mt-2 text-sm text-ink-500">
        Nous n’avons pas pu charger vos données. Vérifiez votre connexion puis réessayez.
      </p>
      <Button className="mt-6" onClick={onRetry}><RefreshCw /> Réessayer</Button>
    </Card>
  )
}

function SeeAll({ href }: { href: string }) {
  return (
    <Link href={href} className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-forest-700 transition-colors hover:text-gold-600">
      Voir tout <ArrowRight className="size-3" />
    </Link>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Chargement du tableau de bord">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-10 w-72 max-w-full" />
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
