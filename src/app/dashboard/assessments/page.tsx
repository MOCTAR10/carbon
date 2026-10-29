'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ClipboardList, Plus, X, Calendar, Building2, MapPin, Filter, ArrowUpRight, Loader2 } from 'lucide-react'
import { cn, fmtCO2Text } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge, CertStatusBadge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Stagger, Reveal } from '@/components/ui/motion'

interface Site { id: number; name: string; type: string; country?: string | null; address?: string | null }
interface Assessment {
  id: number; name: string; year: number; status: string;
  total_co2eq: number; site_name: string; site_type: string;
  site_country?: string | null; site_address?: string | null;
  scope1_co2eq: number; scope2_co2eq: number; scope3_co2eq: number;
  start_month?: number; end_month?: number;
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function monthRange(start?: number, end?: number) {
  if (!start || !end) return null
  if (start === 1 && end === 12) return 'Année complète'
  if (start === end) return MONTHS[start - 1]
  return `${MONTHS[start - 1]} – ${MONTHS[end - 1]}`
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i)

const ASSESSMENT_STATUS: Record<string, { label: string; tone: 'neutral' | 'sky' | 'forest' }> = {
  draft:       { label: 'Brouillon', tone: 'neutral' },
  in_progress: { label: 'En cours',  tone: 'sky' },
  completed:   { label: 'Finalisé',  tone: 'forest' },
}

const FIELD = 'h-11 w-full rounded-xl border border-ivory-400 bg-white px-3.5 text-sm text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-forest-500 focus:ring-4 focus:ring-forest-100'
const LABEL = 'mb-1.5 block text-[13px] font-semibold text-ink-700'
const FILTER = 'h-9 rounded-xl border border-ivory-400 bg-white px-3 text-sm text-ink-700 outline-none transition focus:border-forest-500 focus:ring-4 focus:ring-forest-100'

const num = (v: number) => parseFloat(String(v)) || 0

export default function AssessmentsPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    siteId: '', name: '', year: CURRENT_YEAR,
    approach: 'operational_control',
    start_month: 1, end_month: 12,
  })
  const [loading, setLoading] = useState(false)
  const [certStatuses, setCertStatuses] = useState<Record<number, string>>({})

  // Filters
  const [filterSite, setFilterSite] = useState('')
  const [filterYear, setFilterYear] = useState('')

  // Deep link from the dashboard: /dashboard/assessments?new=1 opens the creation form
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new') === '1') setShowForm(true)
  }, [])

  useEffect(() => {
    fetch('/api/sites').then(r => r.json()).then(d => { if (Array.isArray(d)) setSites(d) }).catch(() => {})
    fetch('/api/assessments')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setAssessments(d) })
      .catch(() => {})
      .finally(() => setLoaded(true))
    fetch('/api/certifications').then(r => r.json()).then((certs: { assessmentId: number; status: string }[]) => {
      if (Array.isArray(certs)) {
        // API returns newest first — keep the latest request per assessment
        const map: Record<number, string> = {}
        certs.forEach(c => { if (!(c.assessmentId in map)) map[c.assessmentId] = c.status })
        setCertStatuses(map)
      }
    }).catch(() => {})
  }, [])

  // Auto-generate bilan name from selections
  useEffect(() => {
    const site = sites.find(s => String(s.id) === form.siteId)
    if (!site) return
    const period = monthRange(form.start_month, form.end_month) ?? 'Année complète'
    setForm(p => ({ ...p, name: `Bilan Carbone ${form.year} – ${site.name}${period !== 'Année complète' ? ` (${period})` : ''}` }))
  }, [form.siteId, form.year, form.start_month, form.end_month, sites])

  const filtered = useMemo(() => assessments.filter(a => {
    if (filterSite && String(a.site_name) !== filterSite) return false
    if (filterYear && String(a.year) !== filterYear) return false
    return true
  }), [assessments, filterSite, filterYear])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setShowForm(false)
        setForm({ siteId: '', name: '', year: CURRENT_YEAR, approach: 'operational_control', start_month: 1, end_month: 12 })
        fetch('/api/assessments').then(r => r.json()).then(d => { if (Array.isArray(d)) setAssessments(d) })
        toast.success('Bilan créé')
      } else {
        const d = await res.json().catch(() => null)
        toast.error(d?.error ?? 'Impossible de créer le bilan')
      }
    } finally { setLoading(false) }
  }

  const uniqueSiteNames = Array.from(new Set(assessments.map(a => a.site_name)))
  const uniqueYears = Array.from(new Set(assessments.map(a => a.year))).sort((a, b) => b - a)
  const activeFilters = (filterSite ? 1 : 0) + (filterYear ? 1 : 0)
  const filteredTotal = filtered.reduce((s, a) => s + num(a.total_co2eq), 0)

  return (
    <Stagger className="space-y-8">
      <Reveal>
        <PageHeader
          eyebrow="Inventaire GES"
          title="Bilans Carbone"
          description="Créez et gérez vos bilans d’émissions par site et par période."
          actions={<Button onClick={() => setShowForm(true)}><Plus /> Nouveau bilan</Button>}
        />
      </Reveal>

      {/* Filter bar */}
      {assessments.length > 0 && (
        <Reveal>
          <Card className="flex flex-wrap items-center gap-3 px-5 py-3.5">
            <div className="flex items-center gap-2 text-sm text-ink-500">
              <Filter className="size-4 text-gold-500" />
              <span className="font-semibold text-ink-700">Filtrer</span>
            </div>
            <select value={filterSite} onChange={e => setFilterSite(e.target.value)} className={FILTER}>
              <option value="">Tous les sites</option>
              {uniqueSiteNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className={FILTER}>
              <option value="">Toutes les années</option>
              {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {activeFilters > 0 && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterSite(''); setFilterYear('') }}>
                Réinitialiser ({activeFilters})
              </Button>
            )}
            <span className="ml-auto text-xs text-ink-500">
              <span className="font-semibold text-forest-900">{filtered.length}</span> bilan{filtered.length !== 1 ? 's' : ''}
              {' · '}
              <span className="font-semibold tabular-nums text-forest-900">{fmtCO2Text(filteredTotal)}</span>
            </span>
          </Card>
        </Reveal>
      )}

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-950/40 p-4 font-sans backdrop-blur-sm animate-in fade-in-0">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-lifted animate-in zoom-in-95">

            {/* Header */}
            <div className="flex flex-shrink-0 items-start justify-between border-b border-ivory-300 px-8 pb-5 pt-7">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">Nouveau bilan</p>
                <h2 className="font-display text-2xl text-forest-900">Nouveau bilan carbone</h2>
                <p className="mt-1 text-xs text-ink-500">Sélectionnez un site et définissez la période.</p>
              </div>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ivory-100 hover:text-ink-700" aria-label="Fermer">
                <X className="size-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <form id="assessment-form" onSubmit={handleCreate} className="space-y-5">

                {/* Site */}
                <div>
                  <label className={LABEL}>Site concerné *</label>
                  <select
                    value={form.siteId}
                    onChange={e => setForm(p => ({ ...p, siteId: e.target.value }))}
                    className={FIELD}
                    required
                  >
                    <option value="">Sélectionner un site…</option>
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.country ? ` — ${s.country}` : ''}
                      </option>
                    ))}
                  </select>
                  {sites.length === 0 && (
                    <p className="mt-1.5 text-xs text-amber-700">
                      Vous devez d&apos;abord <Link href="/dashboard/sites" className="font-semibold underline">créer un site</Link>.
                    </p>
                  )}
                  {form.siteId && (() => {
                    const s = sites.find(x => String(x.id) === form.siteId)
                    return s && (s.country || s.address) ? (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-500">
                        <MapPin className="size-3 text-gold-500" />
                        {[s.address, s.country].filter(Boolean).join(', ')}
                      </p>
                    ) : null
                  })()}
                </div>

                {/* Year + Approach */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>Année *</label>
                    <select
                      value={form.year}
                      onChange={e => setForm(p => ({ ...p, year: parseInt(e.target.value) }))}
                      className={FIELD}
                      required
                    >
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Approche</label>
                    <select value={form.approach} onChange={e => setForm(p => ({ ...p, approach: e.target.value }))} className={FIELD}>
                      <option value="operational_control">Contrôle opérationnel</option>
                      <option value="financial_control">Contrôle financier</option>
                      <option value="equity_share">Part du capital</option>
                    </select>
                  </div>
                </div>

                {/* Period */}
                <div>
                  <label className={LABEL}>Période couverte</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="mb-1 block text-xs text-ink-400">Mois de début</span>
                      <select
                        value={form.start_month}
                        onChange={e => setForm(p => ({ ...p, start_month: parseInt(e.target.value) }))}
                        className={FIELD}
                      >
                        {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <span className="mb-1 block text-xs text-ink-400">Mois de fin</span>
                      <select
                        value={form.end_month}
                        onChange={e => setForm(p => ({ ...p, end_month: parseInt(e.target.value) }))}
                        className={FIELD}
                      >
                        {MONTHS.map((m, i) => <option key={i + 1} value={i + 1} disabled={i + 1 < form.start_month}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  {form.start_month && form.end_month && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest-700">
                      <Calendar className="size-3" /> Période : {monthRange(form.start_month, form.end_month)}
                    </p>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label className={LABEL}>Nom du bilan *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className={FIELD}
                    placeholder="Ex : Bilan Carbone 2024 – Siège Libreville"
                    required
                  />
                  <p className="mt-1.5 text-xs text-ink-400">Généré automatiquement, modifiable.</p>
                </div>

              </form>
            </div>

            {/* Footer */}
            <div className="flex flex-shrink-0 gap-3 border-t border-ivory-300 px-8 py-5">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">Annuler</Button>
              <Button type="submit" form="assessment-form" disabled={loading || sites.length === 0} className="flex-1">
                {loading ? <><Loader2 className="animate-spin" /> Création…</> : 'Créer le bilan'}
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* List */}
      {!loaded ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : assessments.length === 0 ? (
        <Reveal>
          <Card className="p-10">
            <EmptyState
              icon={ClipboardList}
              title="Aucun bilan carbone"
              description="Créez votre premier bilan pour commencer à mesurer vos émissions."
              action={<Button onClick={() => setShowForm(true)}><Plus /> Nouveau bilan</Button>}
            />
          </Card>
        </Reveal>
      ) : filtered.length === 0 ? (
        <Card className="p-10">
          <EmptyState
            icon={Filter}
            title="Aucun bilan pour ces filtres"
            action={<Button variant="outline" size="sm" onClick={() => { setFilterSite(''); setFilterYear('') }}>Réinitialiser les filtres</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => {
            const total = num(a.total_co2eq)
            const scopes = [
              { label: 'S1', value: num(a.scope1_co2eq), bar: 'bg-forest-700' },
              { label: 'S2', value: num(a.scope2_co2eq), bar: 'bg-gold-500' },
              { label: 'S3', value: num(a.scope3_co2eq), bar: 'bg-forest-300' },
            ]
            const st = ASSESSMENT_STATUS[a.status]
            const partial = a.start_month && a.end_month && !(a.start_month === 1 && a.end_month === 12)
            return (
              <Reveal key={a.id}>
                <Link
                  href={`/dashboard/assessments/${a.id}`}
                  className="group flex flex-col gap-5 rounded-2xl border border-ivory-300/80 bg-white p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-forest-200 hover:shadow-lifted md:flex-row md:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="flex size-12 flex-shrink-0 items-center justify-center rounded-xl bg-forest-900 text-gold-300">
                      <ClipboardList className="size-5" strokeWidth={1.7} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-display text-lg text-forest-900">{a.name}</h3>
                        {st && <Badge tone={st.tone}>{st.label}</Badge>}
                        {certStatuses[a.id] && <CertStatusBadge status={certStatuses[a.id]} />}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                        <span className="flex items-center gap-1"><Building2 className="size-3 text-ink-400" /> {a.site_name}</span>
                        {a.site_country && (
                          <span className="flex items-center gap-1"><MapPin className="size-3 text-ink-400" /> {a.site_country}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3 text-ink-400" /> {a.year}
                          {partial && <span className="text-ink-400">· {monthRange(a.start_month, a.end_month)}</span>}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 md:w-[500px] md:flex-shrink-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex h-1.5 overflow-hidden rounded-full bg-ivory-200">
                        {scopes.map(s => (
                          <div key={s.label} className={s.bar} style={{ width: `${total > 0 ? (s.value / total) * 100 : 0}%` }} />
                        ))}
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-3 text-[11px] text-ink-500">
                        {scopes.map(s => (
                          <span key={s.label} className="min-w-0">
                            <span className="flex items-center gap-1">
                              <span className={cn('size-1.5 flex-shrink-0 rounded-full', s.bar)} />
                              {s.label}
                            </span>
                            <span className="block whitespace-nowrap font-semibold tabular-nums text-ink-700">{fmtCO2Text(s.value)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="whitespace-nowrap font-display text-xl tabular-nums text-forest-900">{fmtCO2Text(total)}</p>
                      <p className="text-[11px] text-ink-400">Total</p>
                    </div>
                    <ArrowUpRight className="size-4 flex-shrink-0 text-ink-400 transition-colors group-hover:text-gold-600" />
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>
      )}
    </Stagger>
  )
}
