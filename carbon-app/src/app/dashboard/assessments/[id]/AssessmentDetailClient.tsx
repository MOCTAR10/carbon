'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  AlertTriangle, ArrowLeft, ArrowRight, Award, BarChart3, Calendar, Check, FileSearch, Info, Loader2,
  Lock, Paperclip, Plus, RotateCcw, Save, Search, Shield, Sparkles, Upload, X,
} from 'lucide-react'
import {
  cn, co2UnitFor, fmtCO2, fmtNum, fmtPct, plural, scopeStyle, SCOPES, MONTHS_FR, MONTHS_SHORT_FR, type CO2Unit,
} from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge, CertStatusBadge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Stagger, Reveal } from '@/components/ui/motion'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/field'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { EmissionFactor } from '@/lib/emission-factors'
import type { LibraryFactor } from '@/lib/factor-library'
import { TABS, buildSections, unitLabel, type SubSection } from './sections'
import { DocumentsSheet, type AuditDoc } from './DocumentsSheet'
import { FactorPicker } from './FactorPicker'
import { DetailSkeleton } from './DetailSkeleton'
import { CopilotCard, CopilotSheet, type CopilotView } from './Copilot'
import {
  analyse, buildHints, buildPlan, checklist, resolveAnswers, type Answers, type Context, type Hint, type Previous,
} from '@/lib/copilot'

/* ============================================================
   TYPES & HELPERS
   ============================================================ */
interface Assessment {
  id: number
  name: string
  year: number
  site_name: string
  status: string
  start_month: number | null
  end_month: number | null
  certification_lock: string | null
  site_type: string | null
  site_country: string | null
  site_surface: string | number | null
  company_sector: string | null
}

interface Profile {
  answers: Answers
  confirmed: boolean
  inherited: boolean
  previous: { id: number; year: number } | null
}

/** factorId → month (1-12) → quantity, for the bilan's single year */
type Quantities = Record<string, Record<number, number>>

/* Factor library (from /api/emission-factors), set by load() before any bilan data is read */
let FACTORS = new Map<string, LibraryFactor>()
function setLibrary(list: LibraryFactor[]) {
  FACTORS = new Map(list.map(f => [f.id, f]))
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Drops zero quantities so two maps with the same data compare equal */
function clean(q: Quantities): Quantities {
  const out: Quantities = {}
  for (const [fid, byMonth] of Object.entries(q)) {
    for (const [m, v] of Object.entries(byMonth)) {
      if (v > 0) (out[fid] ??= {})[Number(m)] = v
    }
  }
  return out
}

const signature = (q: Quantities) =>
  Object.entries(clean(q))
    .flatMap(([fid, byMonth]) => Object.entries(byMonth).map(([m, v]) => `${fid}:${m}:${v}`))
    .sort()
    .join('|')

const sumMonths = (byMonth: Record<number, number> | undefined) =>
  byMonth ? Object.values(byMonth).reduce((s, v) => s + (v || 0), 0) : 0

function totalsOf(q: Quantities) {
  const t = { total: 0, scopes: [0, 0, 0] }
  for (const [fid, byMonth] of Object.entries(q)) {
    const f = FACTORS.get(fid)
    if (!f) continue
    const kg = sumMonths(byMonth) * f.factorTotal
    t.total += kg
    t.scopes[f.scope - 1] += kg
  }
  return t
}

/** "12,4 tCO₂e" in a shared unit; tiny non-zero values show "< 0,01 t" instead of "0" */
function co2(kg: number, unit: CO2Unit) {
  if (!kg) return '–'
  const { value, unit: u } = fmtCO2(kg, unit)
  if (value === '0' || value === '-0') return `< ${unit === 'kg' ? '0,1' : '0,01'} ${u}`
  return `${value} ${u}`
}

const toInput = (v: number) => (v > 0 ? String(v).replace('.', ',') : '')

const OPEN_STATUSES = ['pending', 'assigned', 'in_progress', 'audit_done', 'submitted_to_cnc']

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function AssessmentDetailClient() {
  const params = useParams()
  const assessmentId = params.id as string

  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading')
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [certStatus, setCertStatus] = useState<string | null>(null)
  const [qty, setQty] = useState<Quantities>({})
  const [saved, setSaved] = useState<Quantities>({})
  /** Legacy rows outside the bilan's year/period: not editable, dropped by the next save */
  const [outOfPeriod, setOutOfPeriod] = useState(0)
  const [raw, setRaw] = useState<Record<string, string>>({})
  const [docs, setDocs] = useState<AuditDoc[]>([])

  const [activeTab, setActiveTab] = useState('energy')
  const [activeMonth, setActiveMonth] = useState(1) // 0 = cumul annuel (lecture seule)
  const [pinned, setPinned] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [focusId, setFocusId] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  const [docFactor, setDocFactor] = useState<{ id: string; name: string } | null>(null)
  const [docOpen, setDocOpen] = useState(false)
  const [pickerSection, setPickerSection] = useState<SubSection | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [certOpen, setCertOpen] = useState(false)
  const [certMessage, setCertMessage] = useState('')
  const [certSubmitting, setCertSubmitting] = useState(false)
  const [library, setLibraryState] = useState<LibraryFactor[]>([])
  /** Factors the bilan held when loaded: retired ones stay visible for them */
  const [usedAtLoad, setUsedAtLoad] = useState<Set<string>>(new Set())
  const [profile, setProfile] = useState<Profile>({ answers: {}, confirmed: false, inherited: false, previous: null })
  const [previous, setPrevious] = useState<Previous | null>(null)
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [copilotView, setCopilotView] = useState<CopilotView>('profile')
  const [searchOpen, setSearchOpen] = useState(false)

  /* ---- Load ---- */
  const loadDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents?assessmentId=${assessmentId}`)
      if (res.ok) {
        const data = await res.json()
        setDocs(Array.isArray(data) ? data : [])
      }
    } catch { /* keep the current list */ }
  }, [assessmentId])

  const load = useCallback(async () => {
    try {
      const aRes = await fetch(`/api/assessments/${assessmentId}`)
      if (aRes.status === 404 || aRes.status === 400) { setStatus('notfound'); return }
      if (!aRes.ok) throw new Error('assessment')
      const a: Assessment = await aRes.json()

      const [eRes, cRes, fRes] = await Promise.all([
        fetch(`/api/emissions?assessmentId=${assessmentId}`),
        fetch(`/api/certifications/${assessmentId}`).catch(() => null),
        fetch('/api/emission-factors'),
      ])
      // Never open the editor on partial data: saving would replace the stored entries
      if (!eRes.ok || !fRes.ok) throw new Error('emissions')
      const rows = await eRes.json()
      const lib: LibraryFactor[] = (await fRes.json()).factors ?? []
      if (!lib.length) throw new Error('factors')
      setLibrary(lib)
      const cert = cRes?.ok ? await cRes.json().catch(() => null) : null

      const start = a.start_month || 1
      const end = a.end_month || 12
      const map: Quantities = {}
      let ignored = 0
      for (const e of Array.isArray(rows) ? rows : []) {
        const fid = String(e.emission_factor_id)
        const m = Number(e.month) || start // legacy rows stored month 0
        const y = Number(e.year) || a.year
        const q = Number(e.quantity) || 0
        if (!FACTORS.has(fid) || y !== a.year || m < start || m > end) { ignored++; continue }
        ;(map[fid] ??= {})[m] = (map[fid][m] || 0) + q
      }

      setLibraryState(lib)
      setUsedAtLoad(new Set(Object.keys(map)))
      setAssessment(a)
      setCertStatus(cert?.certification?.status ?? null)
      setQty(map)
      setSaved(clean(map))
      setOutOfPeriod(ignored)
      setRaw({})
      setActiveMonth(prev => (prev >= start && prev <= end) || prev === 0 ? prev : start)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [assessmentId])

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/profile`)
      if (!res.ok) return
      const p: Profile = await res.json()
      setProfile(p)
      if (p.previous) {
        const e = await fetch(`/api/emissions?assessmentId=${p.previous.id}`)
        if (!e.ok) return
        const kgByFactor: Record<string, number> = {}
        for (const r of await e.json()) kgByFactor[r.emission_factor_id] = (kgByFactor[r.emission_factor_id] || 0) + (Number(r.total_co2eq) || 0)
        setPrevious({ year: p.previous.year, kgByFactor })
      }
    } catch { /* Copilote unavailable: data entry still works */ }
  }, [assessmentId])

  useEffect(() => { load(); loadDocuments(); loadProfile() }, [load, loadDocuments, loadProfile])

  /* ---- Derived ---- */
  const locked = !!assessment?.certification_lock
  const year = assessment?.year ?? new Date().getFullYear()
  const startMonth = assessment?.start_month || 1
  const endMonth = assessment?.end_month || 12
  const months = useMemo(
    () => Array.from({ length: endMonth - startMonth + 1 }, (_, i) => startMonth + i),
    [startMonth, endMonth],
  )
  const fullYear = startMonth === 1 && endMonth === 12
  const periodLabel = fullYear
    ? `Année ${year}`
    : `${cap(MONTHS_FR[startMonth - 1])} – ${MONTHS_FR[endMonth - 1]} ${year}`

  const dirty = useMemo(() => signature(qty) !== signature(saved), [qty, saved])
  // library is a dependency: totals and sections must follow the factor list once it arrives
  const totals = useMemo(() => totalsOf(qty), [qty, library]) // eslint-disable-line react-hooks/exhaustive-deps
  const sectionsByTab = useMemo(() => buildSections(library, usedAtLoad), [library, usedAtLoad])
  const savedTotal = useMemo(() => totalsOf(saved).total, [saved])
  const unit = co2UnitFor(totals.total)

  const monthsWithData = useMemo(() => {
    const s = new Set<number>()
    Object.values(qty).forEach(byMonth => Object.entries(byMonth).forEach(([m, v]) => { if (v > 0) s.add(Number(m)) }))
    return s
  }, [qty])

  const hasData = useCallback((fid: string) => sumMonths(qty[fid]) > 0, [qty])
  const viewQty = (fid: string) => (activeMonth === 0 ? sumMonths(qty[fid]) : qty[fid]?.[activeMonth] ?? 0)
  const rowKg = (f: EmissionFactor) => viewQty(f.id) * f.factorTotal
  const sectionKg = (s: SubSection) => s.factors.reduce((sum, f) => sum + rowKg(f), 0)

  const tabStats = useMemo(() => {
    const stats: Record<string, number> = {}
    for (const fid of Object.keys(qty)) {
      if (!hasData(fid)) continue
      const tab = FACTORS.get(fid)?.category
      if (tab) stats[tab] = (stats[tab] || 0) + 1
    }
    return stats
  }, [qty, hasData])
  const filledSources = Object.values(tabStats).reduce((s, n) => s + n, 0)

  const visibleFactors = (s: SubSection) =>
    showAll && !locked ? s.factors : s.factors.filter(f => hasData(f.id) || pinned.has(f.id))

  const docsFor = (fid: string) =>
    docs.filter(d => d.emission_factor_id === fid && d.year === year && (activeMonth === 0 || d.month === activeMonth))

  const ghgBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    const iso: Record<string, number> = {}
    for (const [fid, byMonth] of Object.entries(qty)) {
      const si = FACTORS.get(fid)
      if (!si?.ghgCategory) continue
      const kg = sumMonths(byMonth) * si.factorTotal
      if (!kg) continue
      map[si.ghgCategory] = (map[si.ghgCategory] || 0) + kg
      const isoKey = `${si.isoCategory} — ${si.ghgCategory.split(' ').slice(1).join(' ')}`
      iso[isoKey] = (iso[isoKey] || 0) + kg
    }
    return {
      ghg: Object.entries(map).sort((a, b) => b[1] - a[1]),
      iso: Object.entries(iso).sort((a, b) => a[0].localeCompare(b[0])),
    }
  }, [qty])

  /* ---- Copilote ---- */
  const ctx: Context = useMemo(() => ({
    sector: assessment?.company_sector ?? null,
    siteType: assessment?.site_type ?? null,
    country: assessment?.site_country ?? null,
    surface: Number(assessment?.site_surface) || null,
  }), [assessment])
  const answers = useMemo(() => resolveAnswers(profile.answers, ctx), [profile.answers, ctx])
  const plan = useMemo(() => buildPlan(answers, ctx, library, qty), [answers, ctx, library, qty])
  const hints = useMemo(
    () => buildHints({ plan, factors: library, qty, docs, year, months, ctx, previous }),
    [plan, library, qty, docs, year, months, ctx, previous],
  )
  const analysis = useMemo(() => analyse(plan, library, qty), [plan, library, qty])
  const checks = useMemo(
    () => checklist({ profileConfirmed: profile.confirmed, plan, hints, saved: !dirty, hasData: totals.total > 0, hasPrevious: !!previous }),
    [profile.confirmed, plan, hints, dirty, totals.total, previous],
  )
  const factorsById = useMemo(() => new Map(library.map(f => [f.id, f])), [library])
  const openCopilot = (view: CopilotView) => { setCopilotView(view); setCopilotOpen(true) }

  /* ---- Editing ---- */
  const setQuantity = (fid: string, month: number, value: number) =>
    setQty(prev => ({ ...prev, [fid]: { ...prev[fid], [month]: value } }))

  const onInput = (fid: string, value: string) => {
    if (value !== '' && !/^\d*[.,]?\d*$/.test(value)) return
    const key = `${fid}_${activeMonth}`
    setRaw(prev => ({ ...prev, [key]: value }))
    const parsed = parseFloat(value.replace(',', '.'))
    setQuantity(fid, activeMonth, Number.isFinite(parsed) ? parsed : 0)
  }

  const onBlurInput = (fid: string) => {
    const key = `${fid}_${activeMonth}`
    setRaw(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  const addFactor = (f: EmissionFactor) => {
    setPinned(prev => new Set(prev).add(f.id))
    if (activeMonth === 0) setActiveMonth(startMonth)
    setFocusId(f.id)
  }

  /** Copilote / global search: show a factor in its tab, ready to type */
  const revealFactor = (f: EmissionFactor, month?: number) => {
    setActiveTab(f.category)
    setPinned(prev => new Set(prev).add(f.id))
    setActiveMonth(month ?? (activeMonth === 0 ? startMonth : activeMonth))
    setFocusId(f.id)
  }

  const saveProfile = async (next: Answers) => {
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/profile`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: next }),
      })
      if (!res.ok) throw new Error()
      const p = await res.json()
      setProfile(prev => ({ ...prev, answers: p.answers, confirmed: true, inherited: false }))
      toast.success('Profil d’activité enregistré', { description: 'Votre plan de collecte est prêt.' })
      return true
    } catch {
      toast.error('Enregistrement du profil impossible.')
      return false
    }
  }

  const gotoHint = (h: Hint) => {
    const f = h.factorId ? FACTORS.get(h.factorId) : undefined
    if (!f) return
    setCopilotOpen(false)
    if (h.id.startsWith('proof:')) {
      if (h.month) setActiveMonth(h.month)
      setDocFactor({ id: f.id, name: f.nameFr })
      setDocOpen(true)
      return
    }
    revealFactor(f, h.month)
  }

  const replaceFactor = async (fromId: string, toId: string) => {
    try {
      const res = await fetch('/api/emissions/replace', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId: Number(assessmentId), from: fromId, to: toId }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { toast.error('Remplacement impossible', { description: data?.error }); return }
      toast.success('Facteur remplacé', { description: 'Quantités et justificatifs transférés, bilan recalculé.' })
      await Promise.all([load(), loadDocuments()])
    } catch {
      toast.error('Erreur de connexion au serveur.')
    }
  }

  const unpin = (fid: string) => setPinned(prev => { const next = new Set(prev); next.delete(fid); return next })

  useEffect(() => {
    if (!focusId) return
    const t = setTimeout(() => {
      const el = document.getElementById(`qty-${focusId}`) as HTMLInputElement | null
      el?.focus()
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      setFocusId(null)
    }, 80)
    return () => clearTimeout(t)
  }, [focusId])

  const discard = () => { setQty(saved); setRaw({}) }

  /* ---- Save ---- */
  const save = useCallback(async () => {
    if (!assessment || locked || saving) return
    setSaving(true)
    const snapshot = clean(qty)
    const entries = Object.entries(snapshot).flatMap(([fid, byMonth]) =>
      Object.entries(byMonth).map(([m, v]) => ({ emissionFactorId: fid, quantity: v, month: Number(m), year: assessment.year })),
    )
    try {
      const res = await fetch('/api/emissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId: assessment.id, entries }),
      })
      if (res.ok) {
        setQty(snapshot)
        setSaved(snapshot)
        setRaw({})
        setOutOfPeriod(0)
        setSavedAt(new Date())
        toast.success('Bilan enregistré', { description: `${plural(entries.length, 'saisie')} sur ${periodLabel.toLowerCase()}.` })
      } else {
        const data = await res.json().catch(() => null)
        toast.error(res.status === 409 ? 'Bilan verrouillé' : 'Enregistrement impossible', {
          description: data?.error || 'Réessayez dans un instant.',
        })
        if (res.status === 409) load()
      }
    } catch {
      toast.error('Erreur de connexion au serveur.', { description: 'Vos saisies sont conservées sur cette page.' })
    } finally {
      setSaving(false)
    }
  }, [assessment, locked, saving, qty, periodLabel, load])

  /* ---- Unsaved-changes guards: tab close, in-app links, Ctrl/⌘+S ---- */
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || a.origin !== window.location.origin) return
      if (a.pathname === window.location.pathname) return
      if (!window.confirm('Vous avez des modifications non enregistrées. Quitter la page sans enregistrer ?')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [dirty])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (dirty) save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dirty, save])

  /* ---- Certification request ---- */
  const canRequest = !locked && !dirty && savedTotal > 0
  const requestBlocker = savedTotal <= 0
    ? 'Saisissez et enregistrez au moins une donnée d’activité pour demander la certification.'
    : dirty ? 'Enregistrez vos modifications avant de demander la certification.' : null

  const handleCertRequest = async () => {
    setCertSubmitting(true)
    try {
      const res = await fetch('/api/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId: Number(assessmentId), message: certMessage }),
      })
      if (res.ok) {
        setCertOpen(false)
        setCertMessage('')
        toast.success('Demande de certification envoyée', { description: 'Un expert accrédité va être assigné à votre bilan.' })
        await load()
      } else {
        const data = await res.json().catch(() => null)
        toast.error('Demande impossible', { description: data?.error || 'Réessayez dans un instant.' })
      }
    } catch {
      toast.error('Erreur de connexion au serveur.')
    }
    setCertSubmitting(false)
  }

  /* ============================================================
     STATES
     ============================================================ */
  if (status === 'loading') return <DetailSkeleton />

  if (status === 'notfound' || status === 'error') {
    return (
      <div className="mx-auto max-w-lg py-16">
        <EmptyState
          icon={status === 'notfound' ? FileSearch : AlertTriangle}
          title={status === 'notfound' ? 'Bilan introuvable' : 'Impossible de charger le bilan'}
          description={status === 'notfound'
            ? 'Ce bilan n’existe pas ou n’appartient pas à votre entreprise.'
            : 'Vérifiez votre connexion puis réessayez.'}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {status === 'error' && (
                <Button onClick={() => { setStatus('loading'); load(); loadDocuments() }}><RotateCcw /> Réessayer</Button>
              )}
              <Button asChild variant="outline"><Link href="/dashboard/assessments"><ArrowLeft /> Bilans carbone</Link></Button>
            </div>
          }
        />
      </div>
    )
  }

  const a = assessment!
  const total = fmtCO2(totals.total, unit)
  const tabSections = sectionsByTab[activeTab] || []
  const tabMeta = TABS.find(t => t.id === activeTab)!
  const tabKg = tabSections.reduce((s, sec) => s + sectionKg(sec), 0)
  const viewLabel = activeMonth === 0 ? `cumul ${fullYear ? year : 'de la période'}` : `${MONTHS_FR[activeMonth - 1]} ${year}`
  const readOnlyCells = locked || activeMonth === 0

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <Stagger className="space-y-6">
      {/* ---- HEADER ---- */}
      <Reveal>
        <Link
          href="/dashboard/assessments"
          className="mb-4 inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-ink-500 transition-colors hover:text-forest-800"
        >
          <ArrowLeft className="size-3.5" /> Bilans carbone
        </Link>
        <PageHeader
          eyebrow="Bilan carbone"
          title={<span className="[text-wrap:balance]">{a.name}</span>}
          description={<>{a.site_name} · {periodLabel}</>}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {!locked && (
                <span className="mr-1 hidden items-center gap-1.5 text-xs text-ink-500 sm:inline-flex" aria-live="polite">
                  {dirty ? (
                    <><span className="size-1.5 rounded-full bg-amber-500" /> Modifications non enregistrées</>
                  ) : savedAt ? (
                    <><Check className="size-3.5 text-forest-600" /> Enregistré à {savedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</>
                  ) : null}
                </span>
              )}
              <Button variant={showSummary ? 'primary' : 'outline'} onClick={() => setShowSummary(v => !v)} aria-pressed={showSummary}>
                <BarChart3 /> Synthèse
              </Button>
              {!locked && (
                <Button variant="gold" onClick={save} disabled={!dirty || saving}>
                  {saving ? <Loader2 className="animate-spin" /> : <Save />}
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              )}
            </div>
          }
        />
      </Reveal>

      {/* ---- CERTIFICATION / LOCK BANNER ---- */}
      <Reveal>
        {a.certification_lock === 'certified' ? (
          <Card className="flex flex-col gap-4 border-gold-200 bg-gradient-to-r from-gold-50 to-white px-5 py-4 sm:flex-row sm:items-center sm:px-6">
            <div className="flex min-w-0 flex-1 items-start gap-4 sm:items-center">
              <span className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-forest-900 text-gold-300">
                <Award className="size-5" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <p className="font-display text-lg text-forest-900">Bilan certifié</p>
                <p className="text-xs text-ink-500">Audité par un expert accrédité et certifié par la DGEPN. Ses données sont figées.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CertStatusBadge status="certified" />
              <Button asChild variant="outline" size="sm" className="h-10 sm:h-8">
                <Link href="/dashboard/certifications">Voir le certificat <ArrowRight /></Link>
              </Button>
            </div>
          </Card>
        ) : locked ? (
          <Card className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
            <div className="flex min-w-0 flex-1 items-start gap-4 sm:items-center">
              <span className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-ivory-100 text-gold-600 ring-1 ring-ivory-300">
                <Lock className="size-5" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <p className="font-display text-lg text-forest-900">Données verrouillées pendant la certification</p>
                <p className="text-xs text-ink-500">L’expert audite exactement ce qui a été soumis. Vous pouvez consulter vos saisies et vos justificatifs.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CertStatusBadge status={a.certification_lock!} />
              <Button asChild variant="outline" size="sm" className="h-10 sm:h-8">
                <Link href="/dashboard/certifications">Suivre <ArrowRight /></Link>
              </Button>
            </div>
          </Card>
        ) : (
          <Card
            className={cn(
              'flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6',
              certStatus === 'rejected' ? 'border-red-200' : 'border-transparent bg-forest-900 bg-forest-grain text-ivory-50 shadow-lifted',
            )}
          >
            <div className="flex min-w-0 flex-1 items-start gap-4 sm:items-center">
              <span className={cn(
                'flex size-11 flex-shrink-0 items-center justify-center rounded-xl',
                certStatus === 'rejected' ? 'bg-red-50 text-red-600 ring-1 ring-red-100' : 'bg-gold-500/15 text-gold-300 ring-1 ring-gold-400/40',
              )}>
                <Shield className="size-5" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <p className={cn('font-display text-lg', certStatus === 'rejected' ? 'text-forest-900' : 'text-ivory-50')}>
                  {certStatus === 'rejected' ? 'Certification refusée' : 'Faire certifier ce bilan carbone'}
                </p>
                <p className={cn('text-xs', certStatus === 'rejected' ? 'text-ink-500' : 'text-forest-100/75')}>
                  {requestBlocker ?? (certStatus === 'rejected'
                    ? 'Corrigez vos données et vos justificatifs, puis soumettez une nouvelle demande.'
                    : 'Audit terrain par un expert accrédité, puis dépôt de votre dossier à la DGEPN.')}
                </p>
              </div>
            </div>
            <Button
              variant={certStatus === 'rejected' ? 'primary' : 'gold'}
              onClick={() => setCertOpen(true)}
              disabled={!canRequest}
              className="h-11 sm:h-10"
            >
              {certStatus === 'rejected' ? 'Nouvelle demande' : 'Demander la certification'} <ArrowRight />
            </Button>
          </Card>
        )}
      </Reveal>

      {outOfPeriod > 0 && !locked && (
        <Reveal>
          <p className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-xs leading-relaxed text-amber-800">
            <AlertTriangle className="mt-0.5 size-4 flex-shrink-0" />
            <span>
              {plural(outOfPeriod, 'saisie ancienne', 'saisies anciennes')} hors de la période du bilan ({periodLabel.toLowerCase()})
              {outOfPeriod > 1 ? ' ne sont pas affichées et seront retirées' : ' n’est pas affichée et sera retirée'} à la prochaine sauvegarde.
            </span>
          </p>
        </Reveal>
      )}

      {/* ---- TOTALS ---- */}
      <Reveal className="grid grid-cols-3 gap-2.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <div className="relative col-span-3 overflow-hidden rounded-2xl sm:col-span-1 bg-forest-900 bg-forest-grain p-5 text-ivory-50 shadow-lifted">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-300/90">
            {fullYear ? `Total annuel ${year}` : 'Total de la période'}
          </p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-4xl font-light tabular-nums">{total.value}</span>
            <span className="text-sm text-forest-100/70">{total.unit}</span>
          </p>
          <p className="mt-1 text-[11px] text-forest-100/60">
            {filledSources ? plural(filledSources, 'source renseignée', 'sources renseignées') : 'Aucune donnée saisie'} · {periodLabel}
          </p>
        </div>
        {SCOPES.map(s => {
          const kg = totals.scopes[s.scope - 1]
          const pct = totals.total > 0 ? (kg / totals.total) * 100 : 0
          return (
            <Card key={s.scope} className="p-3.5 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs sm:gap-2 font-semibold text-ink-700">
                  <span className={cn('size-2.5 rounded-full', s.bg)} />
                  <span className={s.text}>{s.label}</span>
                </span>
                <span className="hidden text-xs tabular-nums text-ink-400 sm:inline">{fmtPct(kg, totals.total)}</span>
              </div>
              <p className="mt-2 font-display text-xl sm:text-2xl tabular-nums text-forest-900">
                {fmtCO2(kg, unit).value} <span className="block font-sans text-[11px] text-ink-400 sm:inline sm:text-xs">{fmtCO2(kg, unit).unit}</span>
              </p>
              <p className="hidden text-[11px] text-ink-400 sm:block">{s.name}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-ivory-200">
                <div className={cn('h-full rounded-full transition-all duration-700', s.bg)} style={{ width: `${pct}%` }} />
              </div>
            </Card>
          )
        })}
      </Reveal>

      {/* ---- COPILOTE ---- */}
      {!locked && library.length > 0 && (
        <Reveal>
          <CopilotCard confirmed={profile.confirmed} plan={plan} hints={hints} checks={checks} analysis={analysis} onOpen={openCopilot} />
        </Reveal>
      )}

      {/* ---- GHG / ISO SUMMARY ---- */}
      {showSummary && (
        <Card className="animate-in fade-in-0 slide-in-from-top-2">
          <CardHeader
            eyebrow="Synthèse"
            title="GHG Protocol · ISO 14069"
            action={
              <Button variant="ghost" size="icon" onClick={() => setShowSummary(false)} aria-label="Fermer la synthèse"><X /></Button>
            }
          />
          <CardContent className="grid gap-8 md:grid-cols-2">
            {([['GHG Protocol — catégories', ghgBreakdown.ghg], ['ISO 14069 — postes', ghgBreakdown.iso]] as const).map(([heading, rows]) => (
              <div key={heading}>
                <h3 className="mb-3 border-b border-ivory-300 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">{heading}</h3>
                <div className="space-y-1">
                  {rows.map(([cat, kg]) => (
                    <div key={cat} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-ivory-50">
                      <span className="min-w-0 text-ink-700">{cat}</span>
                      <span className="flex flex-shrink-0 items-baseline gap-2">
                        <span className="text-[11px] tabular-nums text-ink-400">{fmtPct(kg, totals.total)}</span>
                        <span className="w-28 text-right font-semibold tabular-nums text-forest-900">{co2(kg, unit)}</span>
                      </span>
                    </div>
                  ))}
                  {rows.length === 0 && <p className="text-sm text-ink-400">Aucune donnée saisie</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ---- PERIOD (year fixed, months of the period) ---- */}
      <Reveal>
        <Card className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-5 sm:px-5">
          <div className="flex flex-shrink-0 items-center gap-2">
            <Calendar className="size-4 text-gold-500" />
            <span className="text-xs font-semibold text-ink-500">Année</span>
            <span className="rounded-lg bg-ivory-100 px-2.5 py-1 text-sm font-semibold tabular-nums text-forest-900">{year}</span>
          </div>
          <span className="hidden h-6 w-px flex-shrink-0 bg-ivory-300 sm:block" />
          <div
            role="group"
            aria-label="Mois affiché"
            className="-mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {[0, ...months].map(m => {
              const isActive = activeMonth === m
              const filled = m !== 0 && monthsWithData.has(m)
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setActiveMonth(m)}
                  aria-pressed={isActive}
                  title={m === 0 ? `Cumul ${periodLabel.toLowerCase()}` : `${cap(MONTHS_FR[m - 1])}${filled ? ' · données saisies' : ''}`}
                  className={cn(
                    'relative flex h-10 min-w-[44px] flex-shrink-0 items-center justify-center rounded-lg px-2.5 text-xs font-semibold transition-all sm:h-9',
                    isActive
                      ? m === 0 ? 'bg-gold-500 text-forest-950 shadow-soft' : 'bg-forest-900 text-ivory-50 shadow-soft'
                      : m === 0 ? 'text-gold-700 hover:bg-gold-50' : 'text-ink-500 hover:bg-ivory-100 hover:text-forest-900',
                  )}
                >
                  {m === 0 ? 'Cumul' : cap(MONTHS_SHORT_FR[m - 1])}
                  {filled && (
                    <span
                      className={cn('absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full', isActive ? 'bg-gold-300' : 'bg-forest-500')}
                      aria-hidden
                    />
                  )}
                </button>
              )
            })}
          </div>
          {activeMonth === 0 && (
            <Badge tone="gold" className="self-start sm:self-auto">Lecture seule · cumul</Badge>
          )}
        </Card>
      </Reveal>

      {/* ---- CATEGORY TABS ---- */}
      <Reveal>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList aria-label="Catégories d’émissions">
            {TABS.map(tab => {
              const n = tabStats[tab.id] || 0
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="group">
                  <tab.icon className="text-ink-400 group-data-[state=active]:text-gold-500" strokeWidth={1.8} />
                  {tab.label}
                  {n > 0 ? (
                    <span
                      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-forest-50 px-1.5 text-[11px] font-semibold tabular-nums text-forest-700 ring-1 ring-forest-100"
                      aria-label={plural(n, 'source renseignée', 'sources renseignées')}
                    >
                      {n}
                    </span>
                  ) : (
                    <span className="size-1.5 rounded-full bg-ivory-400" aria-label="Aucune source renseignée" />
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
      </Reveal>

      {/* ---- TAB CONTENT ---- */}
      <section aria-label={tabMeta.label} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <p className="text-sm text-ink-500">
            <span className="font-semibold text-forest-900">{tabMeta.label}</span>
            {' · '}{plural(tabStats[activeTab] || 0, 'source renseignée', 'sources renseignées')}
            {tabKg > 0 && <> · <span className="font-semibold tabular-nums text-forest-900">{co2(tabKg, unit)}</span> ({viewLabel})</>}
          </p>
          {!locked && (
            <div className="flex flex-wrap items-center gap-1">
            <Button variant="outline" size="sm" className="h-10 sm:h-8" onClick={() => setSearchOpen(true)}>
              <Search /> Rechercher une source
            </Button>
            <button
              type="button"
              role="switch"
              aria-checked={showAll}
              onClick={() => setShowAll(v => !v)}
              className="inline-flex min-h-10 items-center gap-2.5 rounded-xl px-2 text-xs font-semibold text-ink-600 hover:text-forest-900"
            >
              <span className={cn('relative h-5 w-9 rounded-full transition-colors', showAll ? 'bg-forest-700' : 'bg-ivory-400')}>
                <span className={cn('absolute top-0.5 size-4 rounded-full bg-white shadow-soft transition-all', showAll ? 'left-[18px]' : 'left-0.5')} />
              </span>
              Afficher tous les facteurs
            </button>
            </div>
          )}
        </div>

        {locked && tabSections.every(s => visibleFactors(s).length === 0) && (
          <EmptyState icon={tabMeta.icon} title="Aucune donnée dans cette catégorie" description="Rien n’a été saisi ici avant la demande de certification." />
        )}

        {tabSections.map(section => {
          const rows = visibleFactors(section)
          if (locked && rows.length === 0) return null
          const sc = scopeStyle(section.scope)
          const kg = sectionKg(section)
          return (
            <Card key={section.id} className="overflow-hidden">
              {/* Section header */}
              <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
                <div className="flex min-w-0 items-start gap-3.5">
                  <span className={cn('flex size-9 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold', sc.bg, sc.chipText)}>
                    S{section.scope}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-[17px] leading-snug text-forest-900">{section.label}</h3>
                    {section.description && <p className="mt-0.5 text-xs text-ink-400">{section.description}</p>}
                  </div>
                </div>
                {kg > 0 && <span className="flex-shrink-0 pt-1 text-sm font-semibold tabular-nums text-forest-900">{co2(kg, unit)}</span>}
              </div>

              {rows.length > 0 && (
                <div className="border-t border-ivory-300">
                  {/* Column headers (desktop) */}
                  <div className="hidden grid-cols-[minmax(0,1fr)_200px_150px_130px_110px] gap-4 bg-ivory-100 px-6 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400 md:grid">
                    <span>Source d’émission</span>
                    <span className="text-right">Quantité · {activeMonth === 0 ? 'cumul' : MONTHS_SHORT_FR[activeMonth - 1]}</span>
                    <span className="text-right">Facteur d’émission</span>
                    <span className="text-right">Total</span>
                    <span className="text-center">Justificatifs</span>
                  </div>
                  <ul className="divide-y divide-ivory-200">
                    {rows.map(f => (
                      <FactorRow
                        key={f.id}
                        factor={f}
                        unit={unit}
                        quantity={viewQty(f.id)}
                        raw={raw[`${f.id}_${activeMonth}`]}
                        kg={rowKg(f)}
                        readOnly={readOnlyCells}
                        docCount={docsFor(f.id).length}
                        removable={!locked && !hasData(f.id) && pinned.has(f.id) && !showAll}
                        onInput={v => onInput(f.id, v)}
                        onBlur={() => onBlurInput(f.id)}
                        onRemove={() => unpin(f.id)}
                        onDocs={() => { setDocFactor({ id: f.id, name: f.nameFr }); setDocOpen(true) }}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {!locked && !showAll && (
                <div className={cn('flex items-center justify-between gap-3 px-5 py-3 sm:px-6', rows.length > 0 ? 'border-t border-ivory-200 bg-ivory-50/60' : 'border-t border-dashed border-ivory-300')}>
                  {rows.length === 0 && <p className="text-xs text-ink-400">Aucune source renseignée.</p>}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 sm:h-8"
                    onClick={() => { setPickerSection(section); setPickerOpen(true) }}
                  >
                    <Plus /> Ajouter une source
                  </Button>
                </div>
              )}
            </Card>
          )
        })}
      </section>

      {/* ---- Reference standards ---- */}
      <Reveal>
        <Card>
          <CardHeader eyebrow="Méthodologie" title="Normes et standards de référence" />
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { name: 'ISO 14064', text: 'Spécification et lignes directrices pour la quantification et la déclaration des émissions de GES.' },
              { name: 'ISO 14069', text: 'Lignes directrices pour l’application de l’ISO 14064-1 — catégories d’émissions.' },
              { name: 'GHG Protocol', text: 'Corporate Standard — scopes 1, 2 et 3, catégories 1 à 15 du protocole.' },
              { name: 'Bilan Carbone®', text: 'Méthode de l’ADEME — Base Carbone, facteurs d’émission France et Europe.' },
            ].map(s => (
              <div key={s.name} className="rounded-xl border border-ivory-300 bg-ivory-50 p-4">
                <p className="font-display text-base text-forest-900">{s.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-500">{s.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </Reveal>

      {/* ---- Sticky unsaved-changes bar ---- */}
      {dirty && !locked && (
        <div className="sticky bottom-4 z-30 animate-in fade-in-0 slide-in-from-bottom-4">
          <div
            role="status"
            className="mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl border border-forest-800 bg-forest-900 px-5 py-3.5 text-ivory-50 shadow-lifted sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="flex items-center gap-2.5 text-sm">
              <span className="size-2 flex-shrink-0 rounded-full bg-gold-400" />
              Modifications non enregistrées
              <kbd className="hidden rounded-md border border-forest-700 px-1.5 py-0.5 text-[10px] text-forest-100/70 lg:inline">Ctrl S</kbd>
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={discard} disabled={saving} className="flex-1 text-ivory-100 hover:bg-forest-800 hover:text-ivory-50 sm:flex-none">
                Annuler
              </Button>
              <Button variant="gold" onClick={save} disabled={saving} className="flex-1 sm:flex-none">
                {saving ? <Loader2 className="animate-spin" /> : <Save />}
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Dialogs ---- */}
      <DocumentsSheet
        open={docOpen}
        onOpenChange={setDocOpen}
        assessmentId={assessmentId}
        factor={docFactor}
        year={year}
        months={months}
        initialMonth={activeMonth}
        docs={docs}
        locked={locked}
        onChanged={loadDocuments}
      />

      <FactorPicker
        section={pickerSection}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        visibleIds={new Set(pickerSection ? visibleFactors(pickerSection).map(f => f.id) : [])}
        onPick={addFactor}
      />

      <FactorPicker
        section={searchOpen ? {
          id: 'all', label: 'Toutes les sources d’émission', scope: 1,
          description: 'Recherchez dans toute la bibliothèque : mots courants acceptés (gasoil, clim, groupe, bouteille, billet d’avion…).',
          factors: library,
        } : null}
        open={searchOpen}
        onOpenChange={setSearchOpen}
        visibleIds={new Set(Object.keys(qty).filter(hasData))}
        onPick={f => revealFactor(f)}
        global
      />

      {!locked && (
        <CopilotSheet
          open={copilotOpen}
          onOpenChange={setCopilotOpen}
          view={copilotView}
          onViewChange={setCopilotView}
          ctx={ctx}
          siteName={a.site_name}
          savedAnswers={profile.answers}
          answers={answers}
          confirmed={profile.confirmed}
          inherited={profile.inherited}
          locked={locked}
          dirty={dirty}
          plan={plan}
          hints={hints}
          checks={checks}
          analysis={analysis}
          factorsById={factorsById}
          previousYear={previous?.year ?? null}
          onSaveProfile={saveProfile}
          onAddFactor={f => { setCopilotOpen(false); revealFactor(f) }}
          onGoto={gotoHint}
          onReplace={replaceFactor}
        />
      )}

      <Dialog open={certOpen} onOpenChange={setCertOpen}>
        <DialogContent
          eyebrow="Certification"
          title="Certifier ce bilan carbone"
          description="Demande d’audit par un expert accrédité GreenLeaves."
          meta={<Badge tone="forest">{co2(savedTotal, co2UnitFor(savedTotal))} · {periodLabel}</Badge>}
          footer={
            <>
              <Button variant="ghost" onClick={() => setCertOpen(false)}>Annuler</Button>
              <Button onClick={handleCertRequest} disabled={certSubmitting || !canRequest}>
                {certSubmitting ? <Loader2 className="animate-spin" /> : <Shield />}
                {certSubmitting ? 'Envoi en cours…' : 'Envoyer la demande'}
              </Button>
            </>
          }
        >
          <div className="space-y-5">
            <div className="rounded-2xl border border-ivory-300 bg-ivory-50 p-5">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">Processus de certification</p>
              <ol className="space-y-3">
                {[
                  'Votre demande est transmise à l’équipe GreenLeaves',
                  'Un expert accrédité est assigné et fixe la date d’audit',
                  'Audit terrain et vérification de vos données',
                  'Dépôt du dossier à la DGEPN, puis délivrance du certificat après avis du CNC',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-ink-700">
                    <span className="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-forest-900 text-[10px] font-bold text-gold-200">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            {profile.confirmed && (
              <div className="rounded-2xl border border-ivory-300 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">
                    <Sparkles className="size-3.5" /> Contrôles du Copilote
                  </p>
                  <Badge tone={checks.every(c => c.ok) ? 'forest' : 'amber'}>{checks.filter(c => c.ok).length}/{checks.length}</Badge>
                </div>
                <ul className="space-y-1">
                  {checks.filter(c => !c.ok).map(c => (
                    <li key={c.id} className="flex items-start gap-2 text-xs text-ink-600">
                      <AlertTriangle className="mt-0.5 size-3.5 flex-shrink-0 text-amber-600" />
                      <span><span className="font-semibold text-forest-900">{c.label}</span> — {c.detail}</span>
                    </li>
                  ))}
                  {checks.every(c => c.ok) && <li className="text-xs text-forest-700">Tous les contrôles sont validés : dossier prêt pour l’audit.</li>}
                </ul>
                {!checks.every(c => c.ok) && (
                  <Button variant="link" size="sm" className="mt-1 h-auto" onClick={() => { setCertOpen(false); openCopilot('checks') }}>
                    Corriger avec le Copilote <ArrowRight />
                  </Button>
                )}
              </div>
            )}
            <p className="flex items-start gap-2 text-xs text-ink-500">
              <Lock className="mt-0.5 size-3.5 flex-shrink-0 text-gold-600" />
              Pendant la certification, les données et justificatifs de ce bilan seront verrouillés.
            </p>
            <div>
              <label htmlFor="cert-message" className="mb-1.5 block text-[13px] font-semibold text-ink-700">
                Message pour l’expert <span className="font-normal text-ink-400">(optionnel)</span>
              </label>
              <Textarea
                id="cert-message"
                value={certMessage}
                onChange={e => setCertMessage(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Précisions sur votre bilan, contraintes d’accès au site, questions…"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Stagger>
  )
}

/* ============================================================
   FACTOR ROW — grid on desktop, stacked card below md
   ============================================================ */
function FactorRow({
  factor, unit, quantity, raw, kg, readOnly, docCount, removable, onInput, onBlur, onRemove, onDocs,
}: {
  factor: EmissionFactor
  unit: CO2Unit
  quantity: number
  raw: string | undefined
  kg: number
  readOnly: boolean
  docCount: number
  removable: boolean
  onInput: (v: string) => void
  onBlur: () => void
  onRemove: () => void
  onDocs: () => void
}) {
  const u = unitLabel(factor.unit)
  const docButton = (
    <button
      type="button"
      onClick={onDocs}
      aria-label={`Justificatifs — ${factor.nameFr} (${docCount})`}
      className={cn(
        'inline-flex h-10 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition-all md:h-8',
        docCount > 0
          ? 'border-forest-200 bg-forest-50 text-forest-700 hover:bg-forest-100'
          : quantity > 0 && !readOnly
            ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
            : 'border-ivory-300 bg-white text-ink-400 hover:border-ivory-400 hover:text-ink-600',
      )}
    >
      {docCount > 0 ? <><Paperclip className="size-3.5" /> {docCount}</> : quantity > 0 && !readOnly ? <><Upload className="size-3.5" /> Ajouter</> : <Paperclip className="size-3.5" />}
    </button>
  )

  return (
    <li className={cn(
      'grid grid-cols-2 items-center gap-x-4 gap-y-3 px-5 py-4 transition-colors sm:px-6 md:grid-cols-[minmax(0,1fr)_200px_150px_130px_110px] md:py-3',
      quantity > 0 ? 'bg-forest-50/40' : 'hover:bg-ivory-50',
    )}>
      {/* Source */}
      <div className="col-span-2 flex min-w-0 items-start gap-2 md:col-span-1">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-ink-800">{factor.nameFr}</p>
          <p className="mt-0.5 truncate text-[11px] text-ink-400">{factor.region}</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex size-10 flex-shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ivory-100 hover:text-forest-800 md:size-8"
              aria-label={`Détails du facteur — ${factor.nameFr}`}
            >
              <Info className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[min(320px,calc(100vw-24px))] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">Facteur d’émission</p>
            <p className="mt-1 font-display text-base text-forest-900">{factor.nameFr}</p>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
              <dt className="text-ink-400">Valeur</dt>
              <dd className="text-right font-semibold tabular-nums text-ink-800">{fmtNum(factor.factorTotal, 4)} kgCO₂e/{u}</dd>
              <dt className="text-ink-400">Source</dt>
              <dd className="text-right text-ink-700">{factor.source}</dd>
              <dt className="text-ink-400">Référence</dt>
              <dd className="text-right font-mono text-[11px] text-ink-700">{factor.sourceRef}</dd>
              <dt className="text-ink-400">Zone</dt>
              <dd className="text-right text-ink-700">{factor.region}</dd>
              <dt className="text-ink-400">Incertitude</dt>
              <dd className="text-right tabular-nums text-ink-700">± {fmtNum(factor.uncertainty * 100, 0)} %</dd>
            </dl>
          </PopoverContent>
        </Popover>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="flex size-10 flex-shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ivory-100 hover:text-ink-700 md:size-8"
            aria-label={`Retirer ${factor.nameFr}`}
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Quantity */}
      <div className="col-span-2 md:col-span-1">
        <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400 md:hidden">Quantité</span>
        {readOnly ? (
          <div className="flex h-11 items-center justify-end gap-1.5 rounded-xl border border-ivory-300 bg-ivory-100 px-3 text-sm tabular-nums text-ink-700 md:h-10">
            {quantity > 0 ? fmtNum(quantity, 4) : '–'}
            <span className="text-xs text-ink-400">{u}</span>
          </div>
        ) : (
          <div className="relative">
            <input
              id={`qty-${factor.id}`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={raw ?? toInput(quantity)}
              onChange={e => onInput(e.target.value)}
              onBlur={onBlur}
              placeholder="0"
              aria-label={`Quantité en ${u} — ${factor.nameFr}`}
              className="h-11 w-full rounded-xl border border-ivory-400 bg-white pl-3 pr-16 text-right text-sm tabular-nums text-ink-800 outline-none transition placeholder:text-ink-400 hover:border-forest-300 focus:border-forest-500 focus:ring-4 focus:ring-forest-100 md:h-10"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 max-w-[52px] -translate-y-1/2 truncate text-xs text-ink-400">{u}</span>
          </div>
        )}
      </div>

      {/* Factor */}
      <p className="text-xs tabular-nums text-ink-500 md:text-right">
        <span className="md:hidden">FE </span>{fmtNum(factor.factorTotal, 4)}
        <span className="block text-[11px] text-ink-400">kgCO₂e/{u}</span>
      </p>

      {/* Total */}
      <p className="text-right text-sm font-semibold tabular-nums text-forest-900">
        {kg > 0 ? co2(kg, unit) : <span className="font-normal text-ink-400">–</span>}
      </p>

      {/* Documents */}
      <div className="col-span-2 flex justify-end md:col-span-1 md:justify-center">{docButton}</div>
    </li>
  )
}
