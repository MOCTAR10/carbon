'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ClipboardList, Plus, Calendar, Building2, MapPin, Filter, ArrowUpRight, Loader2, AlertTriangle } from 'lucide-react'
import { cn, co2UnitFor, fmtCO2, fmtCO2Text, plural, SCOPES, MONTHS_FR } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge, CertStatusBadge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Stagger, Reveal } from '@/components/ui/motion'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Field, Input } from '@/components/ui/field'

interface Site { id: number; name: string; type: string; country?: string | null; address?: string | null }
interface Assessment {
  id: number; site_id: number; name: string; year: number; status: string;
  total_co2eq: number; site_name: string; site_type: string;
  site_country?: string | null; site_address?: string | null;
  scope1_co2eq: number; scope2_co2eq: number; scope3_co2eq: number;
  start_month?: number; end_month?: number;
}

const MONTHS = MONTHS_FR.map(m => m.charAt(0).toUpperCase() + m.slice(1))
const MONTH_OPTIONS = MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))

function monthRange(start?: number, end?: number) {
  if (!start || !end) return null
  if (start === 1 && end === 12) return 'Année complète'
  if (start === end) return MONTHS[start - 1]
  return `${MONTHS[start - 1]} – ${MONTHS[end - 1]}`
}

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => ({ value: String(CURRENT_YEAR - i), label: String(CURRENT_YEAR - i) }))

const APPROACHES = [
  { value: 'operational_control', label: 'Contrôle opérationnel', hint: 'Recommandé' },
  { value: 'financial_control', label: 'Contrôle financier' },
  { value: 'equity_share', label: 'Part du capital' },
]

const ASSESSMENT_STATUS: Record<string, { label: string; tone: 'neutral' | 'sky' | 'forest' }> = {
  draft:       { label: 'Brouillon', tone: 'neutral' },
  in_progress: { label: 'En cours',  tone: 'sky' },
  completed:   { label: 'Finalisé',  tone: 'forest' },
}

const num = (v: number) => parseFloat(String(v)) || 0

type FormState = { siteId: string; name: string; year: number; approach: string; start_month: number; end_month: number }
const EMPTY_FORM: FormState = { siteId: '', name: '', year: CURRENT_YEAR, approach: 'operational_control', start_month: 1, end_month: 12 }

/** Short default name: the site is already shown as metadata on every row. */
const defaultName = (f: FormState) => {
  const period = monthRange(f.start_month, f.end_month)
  return `Exercice ${f.year}${period && period !== 'Année complète' ? ` · ${period}` : ''}`
}

export default function AssessmentsPage() {
  const router = useRouter()
  const [sites, setSites] = useState<Site[]>([])
  const [sitesLoaded, setSitesLoaded] = useState(false)
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [presetSite, setPresetSite] = useState('')
  const [certStatuses, setCertStatuses] = useState<Record<number, string>>({})

  // Filters (site filter by id so homonymous sites don't merge)
  const [filterSite, setFilterSite] = useState('')
  const [filterYear, setFilterYear] = useState('')

  // Deep links: ?new=1 opens the creation dialog, ?site=<id> pre-filters (and preselects the site in the form)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const site = params.get('site')
    if (site && /^\d+$/.test(site)) { setFilterSite(site); setPresetSite(site) }
    if (params.get('new') === '1') {
      setShowForm(true)
      params.delete('new')
      const qs = params.toString()
      router.replace(`/dashboard/assessments${qs ? `?${qs}` : ''}`, { scroll: false })
    }
  }, [router])

  const loadAssessments = useCallback(() => {
    setFailed(false)
    return fetch('/api/assessments')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { if (Array.isArray(d)) setAssessments(d) })
      .catch(() => setFailed(true))
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    fetch('/api/sites').then(r => (r.ok ? r.json() : [])).then(d => { if (Array.isArray(d)) setSites(d) })
      .catch(() => {}).finally(() => setSitesLoaded(true))
    loadAssessments()
    fetch('/api/certifications').then(r => (r.ok ? r.json() : [])).then((certs: { assessmentId: number; status: string }[]) => {
      if (Array.isArray(certs)) {
        // API returns newest first — keep the latest request per assessment
        const map: Record<number, string> = {}
        certs.forEach(c => { if (!(c.assessmentId in map)) map[c.assessmentId] = c.status })
        setCertStatuses(map)
      }
    }).catch(() => {})
  }, [loadAssessments])

  const filtered = useMemo(() => assessments.filter(a => {
    if (filterSite && String(a.site_id) !== filterSite) return false
    if (filterYear && String(a.year) !== filterYear) return false
    return true
  }), [assessments, filterSite, filterYear])

  const siteOptions = useMemo(() => {
    const withBilans = new Set(assessments.map(a => a.site_id))
    return sites.filter(s => withBilans.has(s.id) || String(s.id) === filterSite).map(s => ({ value: String(s.id), label: s.name }))
  }, [sites, assessments, filterSite])
  const yearOptions = Array.from(new Set(assessments.map(a => a.year))).sort((a, b) => b - a).map(y => ({ value: String(y), label: String(y) }))
  const activeFilters = (filterSite ? 1 : 0) + (filterYear ? 1 : 0)
  const filteredTotal = filtered.reduce((s, a) => s + num(a.total_co2eq), 0)
  const resetFilters = () => {
    setFilterSite(''); setFilterYear('')
    if (window.location.search) router.replace('/dashboard/assessments', { scroll: false })
  }

  const noSites = sitesLoaded && sites.length === 0
  const addSiteButton = <Button asChild><Link href="/dashboard/sites?new=1"><Plus /> Ajouter un site</Link></Button>

  return (
    <Stagger className="space-y-8">
      <Reveal>
        <PageHeader
          eyebrow="Inventaire GES"
          title="Bilans carbone"
          description="Un bilan par site et par exercice : saisissez vos données, puis demandez la certification."
          actions={noSites ? addSiteButton : <Button onClick={() => setShowForm(true)}><Plus /> Nouveau bilan</Button>}
        />
      </Reveal>

      {/* Filter bar */}
      {assessments.length > 0 && (
        <Reveal>
          <Card className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2 text-sm">
              <Filter className="size-4 text-gold-600" />
              <span className="font-semibold text-ink-700">Filtrer</span>
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:flex sm:flex-none">
              <Select
                size="sm" className="sm:w-52" aria-label="Filtrer par site"
                value={filterSite} onValueChange={setFilterSite} options={siteOptions}
                allowEmpty emptyLabel="Tous les sites" placeholder="Tous les sites"
              />
              <Select
                size="sm" className="sm:w-44" aria-label="Filtrer par année"
                value={filterYear} onValueChange={setFilterYear} options={yearOptions}
                allowEmpty emptyLabel="Toutes les années" placeholder="Toutes les années"
              />
            </div>
            {activeFilters > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>Réinitialiser ({activeFilters})</Button>
            )}
            <span className="w-full text-xs text-ink-500 sm:ml-auto sm:w-auto">
              <span className="font-semibold text-forest-900">{plural(filtered.length, 'bilan')}</span>
              {' · '}
              <span className="font-semibold tabular-nums text-forest-900">{fmtCO2Text(filteredTotal)}</span>
            </span>
          </Card>
        </Reveal>
      )}

      {/* List */}
      {!loaded ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : failed && assessments.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <AlertTriangle className="size-6 text-amber-600" />
          <p className="text-sm font-semibold text-ink-800">Impossible de charger vos bilans</p>
          <Button variant="outline" size="sm" onClick={loadAssessments}>Réessayer</Button>
        </Card>
      ) : assessments.length === 0 ? (
        <Reveal>
          <Card className="p-10">
            {noSites ? (
              <EmptyState
                icon={Building2}
                title="Ajoutez d’abord un site"
                description="Chaque bilan est rattaché à un site. Déclarez votre premier site pour créer votre bilan."
                action={addSiteButton}
              />
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="Aucun bilan carbone"
                description="Créez votre premier bilan pour commencer à mesurer vos émissions."
                action={<Button onClick={() => setShowForm(true)}><Plus /> Nouveau bilan</Button>}
              />
            )}
          </Card>
        </Reveal>
      ) : filtered.length === 0 ? (
        <Card className="p-10">
          <EmptyState
            icon={Filter}
            title="Aucun bilan pour ces filtres"
            action={<Button variant="outline" size="sm" onClick={resetFilters}>Réinitialiser les filtres</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => <AssessmentRow key={a.id} a={a} certStatus={certStatuses[a.id]} />)}
        </div>
      )}

      <CreateDialog
        open={showForm}
        onOpenChange={setShowForm}
        sites={sites}
        presetSite={presetSite}
        onCreated={(created) => {
          setShowForm(false)
          loadAssessments()
          toast.success('Bilan créé', {
            description: 'Saisissez maintenant vos données d’activité.',
            action: created?.id ? { label: 'Ouvrir', onClick: () => router.push(`/dashboard/assessments/${created.id}`) } : undefined,
          })
        }}
      />
    </Stagger>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function AssessmentRow({ a, certStatus }: { a: Assessment; certStatus?: string }) {
  const total = num(a.total_co2eq)
  // One unit per row, chosen from the row total, so the total and its scopes compare at a glance
  const unit = co2UnitFor(total)
  const scopes = SCOPES.map(s => ({ ...s, value: num(a[`scope${s.scope}_co2eq` as 'scope1_co2eq']) }))
  const st = ASSESSMENT_STATUS[a.status]
  const partial = a.start_month && a.end_month && !(a.start_month === 1 && a.end_month === 12)
  const t = fmtCO2(total, unit)

  return (
    <Reveal>
      <Link
        href={`/dashboard/assessments/${a.id}`}
        className="group flex flex-col gap-4 rounded-2xl border border-ivory-300/80 bg-white p-5 shadow-soft transition-all duration-200 hover:border-forest-200 hover:shadow-lifted md:flex-row md:items-center md:gap-6"
      >
        <div className="flex min-w-0 flex-1 items-start gap-4 md:items-center">
          <div className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-forest-900 text-gold-300 sm:size-12">
            <ClipboardList className="size-5" strokeWidth={1.7} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-lg text-forest-900">{a.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
              <span className="flex min-w-0 items-center gap-1"><Building2 className="size-3 flex-shrink-0 text-ink-400" /> <span className="truncate">{a.site_name}</span></span>
              {a.site_country && (
                <span className="flex items-center gap-1"><MapPin className="size-3 text-ink-400" /> {a.site_country}</span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="size-3 text-ink-400" /> {a.year}
                {partial && <span>· {monthRange(a.start_month, a.end_month)}</span>}
              </span>
            </div>
            {(st || certStatus) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {st && <Badge tone={st.tone}>{st.label}</Badge>}
                {certStatus && <CertStatusBadge status={certStatus} />}
              </div>
            )}
          </div>
          <ArrowUpRight className="size-4 flex-shrink-0 text-ink-400 transition-colors group-hover:text-gold-600 md:hidden" />
        </div>

        <div className="flex flex-col gap-3 border-t border-ivory-200 pt-4 md:w-[460px] md:flex-shrink-0 md:flex-row-reverse md:items-center md:gap-6 md:border-t-0 md:pt-0">
          <div className="hidden md:block"><ArrowUpRight className="size-4 text-ink-400 transition-colors group-hover:text-gold-600" /></div>
          <div className="flex items-baseline justify-between gap-3 md:w-36 md:flex-shrink-0 md:flex-col-reverse md:items-end md:gap-0">
            <p className="text-[11px] font-medium text-ink-500">Total</p>
            <p className="whitespace-nowrap font-display text-xl tabular-nums text-forest-900">
              {t.value} <span className="text-sm text-ink-500">{t.unit}</span>
            </p>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex h-1.5 overflow-hidden rounded-full bg-ivory-200">
              {scopes.map(s => (
                <div key={s.scope} className={s.bg} style={{ width: `${total > 0 ? (s.value / total) * 100 : 0}%` }} />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-3 text-[11px] text-ink-500">
              {scopes.map(s => (
                <span key={s.scope} className="min-w-0">
                  <span className="flex items-center gap-1">
                    <span className={cn('size-1.5 flex-shrink-0 rounded-full', s.bg)} />
                    {s.label}
                  </span>
                  <span className="block truncate font-semibold tabular-nums text-ink-700">{fmtCO2(s.value, unit).value}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </Link>
    </Reveal>
  )
}

// ─── Create dialog ────────────────────────────────────────────────────────────

function CreateDialog({
  open, onOpenChange, sites, presetSite, onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  sites: Site[]
  presetSite: string
  onCreated: (created: { id: number } | null) => void
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [nameEdited, setNameEdited] = useState(false)
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Fresh form on every open; preselect the site from ?site= or when there is only one
  useEffect(() => {
    if (!open) return
    const siteId = sites.some(s => String(s.id) === presetSite) ? presetSite : sites.length === 1 ? String(sites[0].id) : ''
    const f = { ...EMPTY_FORM, siteId }
    setForm({ ...f, name: defaultName(f) })
    setNameEdited(false)
    setTouched(false)
    setError('')
  }, [open, presetSite, sites])

  const update = (patch: Partial<FormState>) => setForm(prev => {
    const next = { ...prev, ...patch }
    if (next.end_month < next.start_month) next.end_month = next.start_month
    if (!nameEdited) next.name = defaultName(next)
    return next
  })

  const site = sites.find(s => String(s.id) === form.siteId)
  const siteError = touched && !form.siteId ? 'Choisissez le site concerné.' : undefined
  const nameError = touched && !form.name.trim() ? 'Indiquez un nom.' : undefined

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!form.siteId || !form.name.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, name: form.name.trim() }),
      })
      const d = await res.json().catch(() => null)
      if (!res.ok) { setError(d?.error ?? 'Impossible de créer le bilan.'); return }
      onCreated(d)
    } catch {
      setError('Impossible de joindre le serveur.')
    } finally {
      setSaving(false)
    }
  }

  const noSites = sites.length === 0

  return (
    <Dialog open={open} onOpenChange={o => { if (!saving) onOpenChange(o) }}>
      <DialogContent
        eyebrow="Nouveau bilan"
        title="Nouveau bilan carbone"
        description={noSites ? undefined : 'Choisissez le site et la période couverte.'}
        footer={noSites ? undefined : (
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
            <Button type="submit" form="assessment-form" disabled={saving}>
              {saving ? <><Loader2 className="animate-spin" /> Création…</> : 'Créer le bilan'}
            </Button>
          </>
        )}
      >
        {noSites ? (
          <EmptyState
            icon={Building2}
            title="Aucun site enregistré"
            description="Un bilan est toujours rattaché à un site. Ajoutez-en un pour continuer."
            action={<Button asChild><Link href="/dashboard/sites?new=1"><Plus /> Ajouter un site</Link></Button>}
          />
        ) : (
          <form id="assessment-form" onSubmit={submit} noValidate className="space-y-5">
            {error && (
              <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 size-4 flex-shrink-0" /> {error}
              </p>
            )}
            <Field
              label="Site concerné"
              error={siteError}
              hint={site && (site.address || site.country) ? <span className="inline-flex items-center gap-1"><MapPin className="size-3 text-gold-600" />{[site.address, site.country].filter(Boolean).join(', ')}</span> : undefined}
            >
              {p => (
                <Select
                  id={p.id} value={form.siteId} onValueChange={v => update({ siteId: v })} invalid={!!siteError}
                  placeholder="Choisir un site…"
                  options={sites.map(s => ({ value: String(s.id), label: s.name, hint: s.country ?? undefined }))}
                />
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Année">
                {p => <Select id={p.id} value={String(form.year)} onValueChange={v => update({ year: parseInt(v) })} options={YEAR_OPTIONS} />}
              </Field>
              <Field label="Approche de consolidation">
                {p => <Select id={p.id} value={form.approach} onValueChange={v => update({ approach: v })} options={APPROACHES} />}
              </Field>
            </div>

            <div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mois de début">
                  {p => <Select id={p.id} value={String(form.start_month)} onValueChange={v => update({ start_month: parseInt(v) })} options={MONTH_OPTIONS} />}
                </Field>
                <Field label="Mois de fin">
                  {p => (
                    <Select
                      id={p.id} value={String(form.end_month)} onValueChange={v => update({ end_month: parseInt(v) })}
                      options={MONTH_OPTIONS.map(o => ({ ...o, disabled: Number(o.value) < form.start_month }))}
                    />
                  )}
                </Field>
              </div>
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest-700">
                <Calendar className="size-3" /> {monthRange(form.start_month, form.end_month)} {form.year}
              </p>
            </div>

            <Field label="Nom du bilan" error={nameError} hint={nameEdited ? undefined : 'Proposé automatiquement — modifiable.'}>
              {p => (
                <Input
                  {...p} value={form.name} maxLength={255}
                  onChange={e => { setNameEdited(true); setForm(prev => ({ ...prev, name: e.target.value })) }}
                  placeholder="Ex. : Exercice 2025"
                />
              )}
            </Field>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
