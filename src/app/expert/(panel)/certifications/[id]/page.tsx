'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  CheckCircle, XCircle, PlayCircle, FileText, Building2,
  AlertCircle, ChevronDown, ChevronUp, Award, TrendingUp, BarChart3,
  Layers, ListChecks, Save, ClipboardList, ShieldCheck, AlertTriangle,
  Info, FileCheck, Download
} from 'lucide-react'
import InspectionCard from '@/components/InspectionCard'
import CncDepositCard, { CertDocument } from '@/components/CncDepositCard'
import CertEmissionCharts from '@/components/CertEmissionCharts'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Entry {
  id: number; scope: number; category: string; subcategory: string
  factorName: string; quantity: number; unit: string; factorValue: number
  totalCo2eq: number; month: number | null; year: number | null
  ghgCategory: string | null; description: string | null; sourceCharacterization: string | null
}
interface MonthRow { month: number; label: string; total: number; scope1: number; scope2: number; scope3: number }
interface CatRow   { category: string; total: number; scope: number; count: number }
interface TopRow   { name: string; total: number; scope: number; category: string; quantity: number; unit: string; factorValue: number }
interface AuditDocRow { id: number; factorId: string | null; factorName: string | null; category: string | null; scope: number | null; originalName: string; fileSize: number; mimeType: string; createdAt: string }

export interface AuditChecklistData {
  eligibility: {
    threshold_applicable: boolean
    legal_entity_verified: boolean
    previous_declaration_exists: boolean
    notes: string
  }
  data_quality: {
    data_sources_documented: boolean
    consolidation_method_correct: boolean
    emission_factors_appropriate: boolean
    scope_boundaries_correct: boolean
    notes: string
  }
  calculations: {
    scope1_verified: boolean
    scope2_verified: boolean
    scope3_verified: boolean
    methodology_followed: boolean
    calculation_errors_found: boolean
    errors_description: string
    notes: string
  }
  site_visit: {
    visit_conducted: boolean
    visit_date: string
    visit_location: string
    energy_meters_checked: boolean
    waste_records_checked: boolean
    travel_records_checked: boolean
    key_informants_interviewed: boolean
    notes: string
  }
  ogec_compliance: {
    art24_applicable: boolean
    art25_applicable: boolean
    art26_applicable: boolean
    monitoring_plan_required: boolean
    monitoring_plan_present: boolean
    reduction_targets_set: boolean
    notes: string
  }
  opinion: {
    overall_opinion: 'favorable' | 'favorable_with_reservations' | 'unfavorable' | 'with_reservations'
    certification_recommended: boolean
    reservations: string[]
    major_findings: string
    recommendations: string
  }
}

interface CertDetail {
  id: number; status: string; requestedAt: string; updatedAt: string
  inspectionDate: string | null; inspectionNotes: string | null
  auditChecklist: AuditChecklistData | null
  auditScheduledDate: string | null; auditLocation: string | null
  inspectionConfirmed: boolean; inspectionProposedDate: string | null; inspectionProposedBy: string | null
  certifiedAt: string | null; certificateNumber: string | null
  rejectionReason: string | null; adminNotes: string | null; companyMessage: string | null
  assessmentId: number; assessmentName: string; assessmentYear: number; approach: string | null
  totalCo2eq: number; scope1: number; scope2: number; scope3: number
  siteName: string; siteType: string; siteAddress: string | null
  companyName: string; sector: string; rccm: string | null
  entries: Entry[]; byMonth: MonthRow[]; byCategory: CatRow[]; topEmitters: TopRow[]
  auditDocuments: AuditDocRow[]
  expertReportPdfUrl: string | null
  submittedToCncAt: string | null; cncDepositReference: string | null
  documents: CertDocument[]
}

// ─── Default checklist ────────────────────────────────────────────────────────

function defaultChecklist(cert?: CertDetail | null): AuditChecklistData {
  return {
    eligibility: {
      threshold_applicable: false,
      legal_entity_verified: false,
      previous_declaration_exists: false,
      notes: '',
    },
    data_quality: {
      data_sources_documented: false,
      consolidation_method_correct: false,
      emission_factors_appropriate: false,
      scope_boundaries_correct: false,
      notes: '',
    },
    calculations: {
      scope1_verified: false,
      scope2_verified: false,
      scope3_verified: false,
      methodology_followed: false,
      calculation_errors_found: false,
      errors_description: '',
      notes: '',
    },
    site_visit: {
      visit_conducted: false,
      visit_date: cert?.auditScheduledDate?.slice(0, 10) ?? cert?.inspectionDate?.slice(0, 10) ?? '',
      visit_location: cert?.auditLocation ?? '',
      energy_meters_checked: false,
      waste_records_checked: false,
      travel_records_checked: false,
      key_informants_interviewed: false,
      notes: '',
    },
    ogec_compliance: {
      art24_applicable: false,
      art25_applicable: false,
      art26_applicable: false,
      monitoring_plan_required: false,
      monitoring_plan_present: false,
      reduction_targets_set: false,
      notes: '',
    },
    opinion: {
      overall_opinion: 'with_reservations',
      certification_recommended: false,
      reservations: [],
      major_findings: '',
      recommendations: '',
    },
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number | null) {
  if (!n) return '—'
  if (n >= 1000) return (n / 1000).toFixed(2) + ' tCO₂e'
  return n.toFixed(2) + ' kgCO₂e'
}
function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const SCOPE_COLORS = ['', '#22c55e', '#3b82f6', '#f59e0b']
const SCOPE_TEXT   = ['', 'text-green-400', 'text-blue-400', 'text-amber-400']
const SCOPE_BG     = ['', 'bg-green-500/20', 'bg-blue-500/20', 'bg-amber-500/20']
const MONTH_NAMES  = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const CAT_LABELS: Record<string, string> = {
  energy: 'Énergie', transport: 'Transport', freight: 'Fret',
  waste: 'Déchets', water: 'Eau', materials: 'Matériaux', other: 'Autre',
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending:     { label: 'En attente',           cls: 'bg-gray-700 text-gray-400' },
  assigned:    { label: 'Assigné',              cls: 'bg-blue-500/20 text-blue-400' },
  in_progress: { label: "En cours d'inspection", cls: 'bg-violet-500/20 text-violet-400' },
  audit_done:  { label: 'Audit finalisé',        cls: 'bg-teal-500/20 text-teal-400' },
  submitted_to_cnc: { label: 'Déposé au CNC',     cls: 'bg-amber-500/20 text-amber-400' },
  certified:   { label: 'Certifié',              cls: 'bg-green-500/20 text-green-400' },
  rejected:    { label: 'Rejeté',                cls: 'bg-red-500/20 text-red-400' },
}

// ─── Pre-validation checks ────────────────────────────────────────────────────

type CheckStatus = 'pass' | 'warning' | 'fail' | 'info'
interface PreCheck { status: CheckStatus; label: string; detail: string }

function computePreChecks(cert: CertDetail): PreCheck[] {
  const checks: PreCheck[] = []
  const entries = cert.entries
  const total   = Number(cert.totalCo2eq) || 0
  const s1      = Number(cert.scope1) || 0
  const s2      = Number(cert.scope2) || 0
  const s3      = Number(cert.scope3) || 0

  if (total === 0) {
    checks.push({ status: 'fail', label: 'Total CO₂ nul', detail: 'Aucune émission enregistrée dans ce bilan' })
  } else {
    const sumScopes = s1 + s2 + s3
    const diffPct   = Math.abs(sumScopes - total) / total * 100
    if (diffPct < 1) {
      checks.push({ status: 'pass', label: 'Cohérence des totaux', detail: `S1+S2+S3 = ${fmt(sumScopes)} ≈ total (écart ${diffPct.toFixed(2)}%)` })
    } else {
      checks.push({ status: 'fail', label: 'Incohérence des totaux', detail: `S1+S2+S3 = ${fmt(sumScopes)} ≠ total ${fmt(total)} (écart ${diffPct.toFixed(1)}%)` })
    }
  }

  for (const sc of [1, 2, 3] as const) {
    const scopeEntries = entries.filter(e => e.scope === sc)
    const scopeTotal   = scopeEntries.reduce((s, e) => s + e.totalCo2eq, 0)
    if (scopeEntries.length > 0) {
      checks.push({ status: 'info', label: `Scope ${sc} présent`, detail: `${scopeEntries.length} source${scopeEntries.length > 1 ? 's' : ''} — ${fmt(scopeTotal)}` })
    } else {
      checks.push({ status: 'info', label: `Scope ${sc} absent`, detail: 'Aucune donnée — absence à justifier si applicable' })
    }
  }

  const zeroEntries = entries.filter(e => e.quantity === 0 || e.totalCo2eq === 0)
  if (zeroEntries.length === 0) {
    checks.push({ status: 'pass', label: 'Entrées valides', detail: `Toutes les ${entries.length} sources ont des valeurs non nulles` })
  } else {
    const names = zeroEntries.slice(0, 3).map(e => e.factorName).join(', ') + (zeroEntries.length > 3 ? '…' : '')
    checks.push({ status: 'warning', label: `${zeroEntries.length} entrée${zeroEntries.length > 1 ? 's' : ''} sans valeur`, detail: names })
  }

  const zeroFactor = entries.filter(e => e.factorValue === 0)
  if (zeroFactor.length === 0) {
    checks.push({ status: 'pass', label: 'Facteurs d\'émission', detail: 'Tous les facteurs sont renseignés (> 0)' })
  } else {
    const names = zeroFactor.slice(0, 3).map(e => e.factorName).join(', ') + (zeroFactor.length > 3 ? '…' : '')
    checks.push({ status: 'warning', label: `${zeroFactor.length} facteur${zeroFactor.length > 1 ? 's' : ''} manquant${zeroFactor.length > 1 ? 's' : ''}`, detail: names })
  }

  const hasMonthly = entries.some(e => e.month && e.month > 0)
  if (hasMonthly) {
    const monthsWithData = new Set(entries.filter(e => e.month && e.month > 0).map(e => e.month)).size
    const pct = Math.round(monthsWithData / 12 * 100)
    if (monthsWithData >= 10) {
      checks.push({ status: 'pass', label: 'Couverture mensuelle', detail: `${monthsWithData}/12 mois couverts (${pct}%)` })
    } else {
      checks.push({ status: 'warning', label: 'Couverture mensuelle partielle', detail: `${monthsWithData}/12 mois (${pct}%) — lacunes à justifier` })
    }
  } else {
    checks.push({ status: 'info', label: 'Données annuelles', detail: 'Aucune ventilation mensuelle — saisie annuelle uniquement' })
  }

  // Emission threshold check
  const totalTons = total / 1000
  if (totalTons >= 50000) {
    checks.push({ status: 'pass', label: 'Seuil élevé (≥50 000 tCO₂e)', detail: `${totalTons.toFixed(0)} tCO₂e — Scope 1+2+3 + plan de surveillance requis` })
  } else if (totalTons >= 10000) {
    checks.push({ status: 'pass', label: 'Seuil intermédiaire (≥10 000 tCO₂e)', detail: `${totalTons.toFixed(0)} tCO₂e — Scope 1+2 obligatoire` })
  } else {
    checks.push({ status: 'warning', label: 'Seuil de certification à vérifier', detail: `${totalTons.toFixed(0)} tCO₂e < 10 000 — vérifier l'assujettissement` })
  }

  return checks
}

const CHECK_STYLE: Record<CheckStatus, { icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  pass:    { icon: CheckCircle,   cls: 'text-green-400' },
  warning: { icon: AlertTriangle, cls: 'text-amber-400' },
  fail:    { icon: XCircle,       cls: 'text-red-400'   },
  info:    { icon: Info,          cls: 'text-blue-400'  },
}

// ─── Small components ─────────────────────────────────────────────────────────

function ScopeBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-medium">{fmt(value)} <span className="text-gray-500">({pct.toFixed(1)}%)</span></span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function Card({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2"><Icon className="w-4 h-4" />{title}</h2>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
        checked ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-gray-600 hover:border-gray-400'
      } ${disabled ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
    >
      {checked && <CheckCircle className="w-3.5 h-3.5 text-white" />}
    </button>
  )
}

function CheckRow({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
      checked ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-gray-700/20 border-gray-700/50 hover:border-gray-600'
    }`} onClick={disabled ? undefined : onChange}>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
      <span className={`text-sm leading-snug ${checked ? 'text-emerald-300' : 'text-gray-300'}`}>{label}</span>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExpertCertDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [cert, setCert]             = useState<CertDetail | null>(null)
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [savingChecklist, setSavingChecklist] = useState(false)
  const [generatingPdf, setGeneratingPdf]     = useState(false)
  const [error, setError]           = useState('')
  const [notes, setNotes]           = useState('')
  const [checklist, setChecklist]   = useState<AuditChecklistData | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm]   = useState(false)
  const [openScope, setOpenScope]   = useState<number | null>(null)
  const [openSection, setOpenSection] = useState<string | null>('eligibility')

  const loadCert = useCallback(() => {
    fetch(`/api/expert/certifications/${params.id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => {
        setCert(data)
        setNotes(data.inspectionNotes || '')
        setChecklist(data.auditChecklist ?? defaultChecklist(data))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.id])

  useEffect(() => { loadCert() }, [loadCert])

  const action = async (body: object) => {
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch(`/api/expert/certifications/${params.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur'); return }
      loadCert()
      setShowRejectForm(false)
    } catch { setError('Erreur de connexion.') }
    finally { setSubmitting(false) }
  }

  // Auto-save checklist after changes
  const saveChecklist = async (next: AuditChecklistData) => {
    setSavingChecklist(true)
    await fetch(`/api/expert/certifications/${params.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'checklist', checklist: next }),
    }).finally(() => setSavingChecklist(false))
  }

  const updateChecklist = (next: AuditChecklistData) => {
    setChecklist(next)
    saveChecklist(next)
  }

  const patchSection = <K extends keyof AuditChecklistData>(
    section: K,
    field: keyof AuditChecklistData[K],
    value: unknown
  ) => {
    if (!checklist) return
    const next: AuditChecklistData = {
      ...checklist,
      [section]: { ...checklist[section], [field]: value },
    }
    updateChecklist(next)
  }

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true)
    try {
      const res = await fetch(
        `/api/admin/certifications/${params.id}/generate-pdf`,
        { method: 'POST' }
      )
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Erreur génération PDF')
        return
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `rapport-expert-certification-${params.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch { setError('Erreur téléchargement PDF') }
    finally { setGeneratingPdf(false) }
  }

  if (loading) return <div className="text-center py-20 text-gray-500">Chargement...</div>
  if (!cert)   return <div className="text-center py-20 text-gray-500">Certification introuvable.</div>

  const s        = STATUS_LABELS[cert.status] || { label: cert.status, cls: 'bg-gray-700 text-gray-400' }
  const isReadOnly = ['certified', 'rejected', 'audit_done', 'submitted_to_cnc'].includes(cert.status)
  const canFinalizeAudit = ['assigned', 'in_progress'].includes(cert.status)
  const total    = Number(cert.totalCo2eq) || 0
  const cl       = checklist ?? defaultChecklist(cert)

  const entriesByScope: Record<number, Entry[]> = { 1: [], 2: [], 3: [] }
  for (const e of cert.entries) { if (entriesByScope[e.scope]) entriesByScope[e.scope].push(e) }
  const activeMonths = cert.byMonth.filter(m => m.total > 0)
  const maxMonth = Math.max(...cert.byMonth.map(m => m.total), 0.001)
  const annualEntries = cert.entries.filter(e => !e.month)
  const annualByScope: Record<number, Entry[]> = { 1: [], 2: [], 3: [] }
  for (const e of annualEntries) { if (annualByScope[e.scope]) annualByScope[e.scope].push(e) }
  const monthlyTotal  = cert.byMonth.reduce((s, m) => s + m.total,  0)
  const monthlyScope1 = cert.byMonth.reduce((s, m) => s + m.scope1, 0)
  const monthlyScope2 = cert.byMonth.reduce((s, m) => s + m.scope2, 0)
  const monthlyScope3 = cert.byMonth.reduce((s, m) => s + m.scope3, 0)
  const monthlyEntryCount = cert.entries.filter(e => e.month).length

  // Checklist completion score
  const boolFields: boolean[] = [
    cl.eligibility.threshold_applicable, cl.eligibility.legal_entity_verified, cl.eligibility.previous_declaration_exists,
    cl.data_quality.data_sources_documented, cl.data_quality.consolidation_method_correct, cl.data_quality.emission_factors_appropriate, cl.data_quality.scope_boundaries_correct,
    cl.calculations.scope1_verified, cl.calculations.scope2_verified, cl.calculations.scope3_verified, cl.calculations.methodology_followed,
    cl.site_visit.visit_conducted, cl.site_visit.energy_meters_checked, cl.site_visit.waste_records_checked,
    cl.ogec_compliance.art24_applicable, cl.ogec_compliance.art25_applicable, cl.ogec_compliance.art26_applicable,
  ]
  const completedCount = boolFields.filter(Boolean).length
  const completionPct  = Math.round(completedCount / boolFields.length * 100)

  const SECTIONS = [
    { key: 'eligibility',    icon: FileCheck,   label: '1 — Éligibilité réglementaire' },
    { key: 'data_quality',   icon: FileText,    label: '2 — Qualité des données' },
    { key: 'calculations',   icon: BarChart3,   label: '3 — Vérification des calculs' },
    { key: 'site_visit',     icon: Building2,   label: '4 — Visite de site' },
    { key: 'ogec_compliance',icon: ShieldCheck, label: '5 — Conformité réglementaire' },
    { key: 'opinion',        icon: Award,       label: '6 — Avis motivé' },
  ]

  // Per-section completion counts
  const sectionStats: Record<string, { done: number; total: number } | null> = {
    eligibility:     { done: [cl.eligibility.threshold_applicable, cl.eligibility.legal_entity_verified, cl.eligibility.previous_declaration_exists].filter(Boolean).length, total: 3 },
    data_quality:    { done: [cl.data_quality.data_sources_documented, cl.data_quality.consolidation_method_correct, cl.data_quality.emission_factors_appropriate, cl.data_quality.scope_boundaries_correct].filter(Boolean).length, total: 4 },
    calculations:    { done: [cl.calculations.scope1_verified, cl.calculations.scope2_verified, cl.calculations.scope3_verified, cl.calculations.methodology_followed].filter(Boolean).length, total: 4 },
    site_visit:      { done: [cl.site_visit.visit_conducted, cl.site_visit.energy_meters_checked, cl.site_visit.waste_records_checked, cl.site_visit.travel_records_checked, cl.site_visit.key_informants_interviewed].filter(Boolean).length, total: 5 },
    ogec_compliance: { done: [cl.ogec_compliance.art24_applicable, cl.ogec_compliance.art25_applicable, cl.ogec_compliance.art26_applicable, cl.ogec_compliance.monitoring_plan_required, cl.ogec_compliance.reduction_targets_set].filter(Boolean).length, total: 5 },
    opinion:         null,
  }

  return (
    <div className="space-y-5 max-w-4xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.back()} className="text-xs text-gray-500 hover:text-gray-300 mb-2 flex items-center gap-1">← Retour</button>
          <h1 className="text-2xl font-bold text-white">{cert.assessmentName}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{cert.companyName} · {cert.assessmentYear}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs px-3 py-1.5 rounded-full ${s.cls}`}>{s.label}</span>
          <button
            onClick={handleDownloadPdf}
            disabled={generatingPdf}
            className="flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {generatingPdf ? 'Génération…' : 'Rapport PDF'}
          </button>
        </div>
      </div>

      {/* ── Result banners ── */}
      {cert.status === 'certified' && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-green-400">Bilan certifié par le CNC</p>
            <p className="text-xs text-green-500 mt-0.5">{fmtDate(cert.certifiedAt)}{cert.certificateNumber && ` · Certificat n° ${cert.certificateNumber}`}</p>
          </div>
        </div>
      )}
      {cert.status === 'audit_done' && (
        <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-4 flex items-center gap-3">
          <FileCheck className="w-5 h-5 text-teal-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-teal-400">Audit finalisé — dossier prêt pour le CNC</p>
            <p className="text-xs text-teal-500 mt-0.5">Téléchargez le dossier complet, déposez-le au CNC, puis enregistrez le dépôt ci-dessous.</p>
          </div>
        </div>
      )}
      {cert.status === 'submitted_to_cnc' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
          <Award className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-400">Dossier déposé au CNC — en attente du certificat</p>
            <p className="text-xs text-amber-500 mt-0.5">Dès réception, téléversez la copie numérique du certificat CNC ci-dessous.</p>
          </div>
        </div>
      )}
      {cert.status === 'rejected' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-400">Bilan rejeté</p>
            {cert.rejectionReason && <p className="text-xs text-red-400/80 mt-0.5">{cert.rejectionReason}</p>}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* ── CO₂ Summary ── */}
      <Card title="Bilan carbone — Synthèse" icon={FileText}>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {([1, 2, 3] as const).map(sc => (
            <div key={sc} className={`rounded-xl p-3 ${SCOPE_BG[sc]}`}>
              <p className="text-xs text-gray-400">Scope {sc}</p>
              <p className={`text-sm font-bold mt-0.5 ${SCOPE_TEXT[sc]}`}>
                {fmt(sc === 1 ? Number(cert.scope1) : sc === 2 ? Number(cert.scope2) : Number(cert.scope3))}
              </p>
            </div>
          ))}
        </div>
        <div className="space-y-2.5 mb-4">
          <ScopeBar label="Scope 1 — Émissions directes"   value={Number(cert.scope1)} total={total} color={SCOPE_COLORS[1]} />
          <ScopeBar label="Scope 2 — Énergie indirecte"    value={Number(cert.scope2)} total={total} color={SCOPE_COLORS[2]} />
          <ScopeBar label="Scope 3 — Autres indirectes"    value={Number(cert.scope3)} total={total} color={SCOPE_COLORS[3]} />
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-gray-700">
          <span className="text-xs text-gray-500">{cert.entries.length} source{cert.entries.length !== 1 ? 's' : ''} · {cert.approach ?? 'contrôle opérationnel'}</span>
          <span className="text-lg font-bold text-brand-400">{fmt(total)}</span>
        </div>
      </Card>

      {/* ── Pre-validation automatique ── */}
      {(() => {
        const checks    = computePreChecks(cert)
        const passCount = checks.filter(c => c.status === 'pass').length
        const warnCount = checks.filter(c => c.status === 'warning').length
        const failCount = checks.filter(c => c.status === 'fail').length
        return (
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />Pré-validation automatique
              </h2>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />{passCount} OK</span>
                {warnCount > 0 && <span className="flex items-center gap-1 text-amber-400"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />{warnCount} avert.</span>}
                {failCount  > 0 && <span className="flex items-center gap-1 text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />{failCount} échec</span>}
              </div>
            </div>
            <div className="divide-y divide-gray-700/40">
              {checks.map((chk, i) => {
                const { icon: Icon, cls } = CHECK_STYLE[chk.status]
                return (
                  <div key={i} className="flex items-start gap-3 px-5 py-3">
                    <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cls}`} />
                    <div>
                      <p className={`text-sm font-medium ${cls}`}>{chk.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{chk.detail}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ── Visual analytics (charts) ── */}
      <CertEmissionCharts
        byMonth={cert.byMonth}
        byCategory={cert.byCategory}
        topEmitters={cert.topEmitters}
        entries={cert.entries}
        scope1={cert.scope1}
        scope2={cert.scope2}
        scope3={cert.scope3}
        totalCo2eq={cert.totalCo2eq}
      />

      {/* ── By category ── */}
      {cert.byCategory.length > 0 && (
        <Card title="Répartition par catégorie" icon={BarChart3}>
          <div className="space-y-2.5">
            {cert.byCategory.map(cat => {
              const pct = total > 0 ? (cat.total / total) * 100 : 0
              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${SCOPE_BG[cat.scope]} ${SCOPE_TEXT[cat.scope]}`}>S{cat.scope}</span>
                      <span className="text-gray-300">{CAT_LABELS[cat.category] ?? cat.category}</span>
                    </div>
                    <span className="text-white font-medium">{fmt(cat.total)} <span className="text-gray-500">({pct.toFixed(1)}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500/70 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ── Monthly breakdown ── */}
      {activeMonths.length > 0 && (
        <Card title="Ventilation mensuelle" icon={TrendingUp}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-500 pb-2 pr-3">Mois</th>
                  <th className="text-right text-green-400/80 pb-2 px-2">Scope 1</th>
                  <th className="text-right text-blue-400/80 pb-2 px-2">Scope 2</th>
                  <th className="text-right text-amber-400/80 pb-2 px-2">Scope 3</th>
                  <th className="text-right text-gray-300 pb-2 pl-2">Total</th>
                  <th className="w-20 pb-2 pl-4" />
                </tr>
              </thead>
              <tbody>
                {cert.byMonth.map(m => (
                  <tr key={m.month} className={`border-b border-gray-700/30 ${m.total === 0 ? 'opacity-25' : ''}`}>
                    <td className="py-1.5 pr-3 text-gray-300 font-medium">{m.label}</td>
                    <td className="py-1.5 px-2 text-right text-green-400">{m.scope1 > 0 ? fmt(m.scope1) : '—'}</td>
                    <td className="py-1.5 px-2 text-right text-blue-400">{m.scope2 > 0 ? fmt(m.scope2) : '—'}</td>
                    <td className="py-1.5 px-2 text-right text-amber-400">{m.scope3 > 0 ? fmt(m.scope3) : '—'}</td>
                    <td className="py-1.5 pl-2 text-right text-white font-semibold">{m.total > 0 ? fmt(m.total) : '—'}</td>
                    <td className="py-1.5 pl-4">
                      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden w-20">
                        <div className="h-full bg-brand-500/60 rounded-full" style={{ width: `${(m.total / maxMonth) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-600 font-semibold">
                  <td className="py-2 pr-3 text-gray-200 text-xs">Total annuel</td>
                  <td className="py-2 px-2 text-right text-green-400 text-xs">{monthlyScope1 > 0 ? fmt(monthlyScope1) : '—'}</td>
                  <td className="py-2 px-2 text-right text-blue-400 text-xs">{monthlyScope2 > 0 ? fmt(monthlyScope2) : '—'}</td>
                  <td className="py-2 px-2 text-right text-amber-400 text-xs">{monthlyScope3 > 0 ? fmt(monthlyScope3) : '—'}</td>
                  <td className="py-2 pl-2 text-right text-white text-xs">{fmt(monthlyTotal)}</td>
                  <td className="py-2 pl-4" />
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Annual entries ── */}
      {annualEntries.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <h2 className="text-sm font-semibold text-gray-300 px-5 py-4 flex items-center justify-between border-b border-gray-700">
            <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4" />Données annuelles</span>
            <span className="text-xs text-gray-500">{annualEntries.length} source{annualEntries.length > 1 ? 's' : ''}</span>
          </h2>
          {([1, 2, 3] as const).map(scope => {
            const scopeAnnual = annualByScope[scope]
            if (!scopeAnnual?.length) return null
            const scopeTotal = scopeAnnual.reduce((s, e) => s + e.totalCo2eq, 0)
            return (
              <div key={scope} className="border-b border-gray-700/50 last:border-0">
                <div className="flex items-center justify-between px-5 py-2.5 bg-gray-700/20">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${SCOPE_BG[scope]} ${SCOPE_TEXT[scope]}`}>Scope {scope}</span>
                  <span className={`text-sm font-bold ${SCOPE_TEXT[scope]}`}>{fmt(scopeTotal)}</span>
                </div>
                <div className="px-5 pb-3 overflow-x-auto">
                  <table className="w-full text-xs mt-2">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left text-gray-500 font-medium pb-2 pr-2">Source</th>
                        <th className="text-right text-gray-500 font-medium pb-2 px-2">Quantité</th>
                        <th className="text-right text-gray-500 font-medium pb-2 pl-2">CO₂ éq.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scopeAnnual.map(e => (
                        <tr key={e.id} className="border-b border-gray-700/20 last:border-0">
                          <td className="py-2 pr-2">
                            <p className="text-gray-200">{e.factorName}</p>
                            {e.subcategory && <p className="text-gray-600">{e.subcategory}</p>}
                          </td>
                          <td className="py-2 px-2 text-right text-gray-300">{e.quantity.toFixed(2)} <span className="text-gray-500">{e.unit}</span></td>
                          <td className={`py-2 pl-2 text-right font-semibold ${SCOPE_TEXT[e.scope]}`}>{fmt(e.totalCo2eq)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Top emitters ── */}
      {cert.topEmitters.length > 0 && (
        <Card title="Top émetteurs" icon={Award}>
          <div className="space-y-1">
            {cert.topEmitters.map((e, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-700/40 last:border-0">
                <span className="text-xs text-gray-600 w-5 flex-shrink-0">{i + 1}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${SCOPE_BG[e.scope]} ${SCOPE_TEXT[e.scope]}`}>S{e.scope}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-200 truncate">{e.name}</p>
                  <p className="text-xs text-gray-500">{CAT_LABELS[e.category] ?? e.category}</p>
                </div>
                <span className="text-xs font-semibold text-white flex-shrink-0">{fmt(e.total)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Justificatifs du bilan ── */}
      {cert.auditDocuments && cert.auditDocuments.length > 0 && (
        <Card title={`Justificatifs du bilan (${cert.auditDocuments.length})`} icon={FileCheck}>
          <div className="space-y-2">
            {cert.auditDocuments.map(doc => {
              const kb = Math.round(doc.fileSize / 1024)
              return (
                <div key={doc.id} className="flex items-center justify-between gap-3 bg-gray-700/30 rounded-xl px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-200 truncate">{doc.originalName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {doc.scope != null && <span className={`mr-1.5 px-1.5 py-0.5 rounded ${SCOPE_BG[doc.scope]} ${SCOPE_TEXT[doc.scope]}`}>S{doc.scope}</span>}
                      {doc.category && <span>{CAT_LABELS[doc.category] ?? doc.category}</span>}
                      {doc.factorName && <span className="ml-1.5 text-gray-600">· {doc.factorName}</span>}
                      <span className="ml-1.5">{kb} Ko</span>
                    </p>
                  </div>
                  <a
                    href={`/api/documents/${doc.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />Ouvrir
                  </a>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ── Emission entries by scope (expandable) ── */}
      {cert.entries.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <h2 className="text-sm font-semibold text-gray-300 px-5 py-4 flex items-center gap-2 border-b border-gray-700">
            <Layers className="w-4 h-4" />Détail des entrées ({cert.entries.length} source{cert.entries.length !== 1 ? 's' : ''})
          </h2>
          {([1, 2, 3] as const).map(scope => {
            const scopeEntries = entriesByScope[scope]
            if (!scopeEntries?.length) return null
            const scopeTotal = scopeEntries.reduce((s, e) => s + e.totalCo2eq, 0)
            const isOpen = openScope === scope
            return (
              <div key={scope} className="border-b border-gray-700/50 last:border-0">
                <button
                  onClick={() => setOpenScope(isOpen ? null : scope)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${SCOPE_BG[scope]} ${SCOPE_TEXT[scope]}`}>Scope {scope}</span>
                    <span className="text-sm text-gray-300">{scopeEntries.length} source{scopeEntries.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${SCOPE_TEXT[scope]}`}>{fmt(scopeTotal)}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left text-gray-500 font-medium pb-2 pr-2">Source</th>
                          <th className="text-right text-gray-500 font-medium pb-2 px-2">Quantité</th>
                          <th className="text-right text-gray-500 font-medium pb-2 px-2 hidden sm:table-cell">Mois</th>
                          <th className="text-right text-gray-500 font-medium pb-2 pl-2">CO₂ éq.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scopeEntries.map(e => (
                          <tr key={e.id} className="border-b border-gray-700/20 last:border-0">
                            <td className="py-2 pr-2">
                              <p className="text-gray-200">{e.factorName}</p>
                              {e.subcategory && <p className="text-gray-600">{e.subcategory}</p>}
                            </td>
                            <td className="py-2 px-2 text-right text-gray-300">{e.quantity.toFixed(2)} <span className="text-gray-500">{e.unit}</span></td>
                            <td className="py-2 px-2 text-right text-gray-400 hidden sm:table-cell">
                              {e.month ? MONTH_NAMES[e.month] : '—'}
                            </td>
                            <td className={`py-2 pl-2 text-right font-semibold ${SCOPE_TEXT[e.scope]}`}>{fmt(e.totalCo2eq)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Company info ── */}
      <Card title="Entreprise" icon={Building2}>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-gray-500">Nom</p><p className="text-white">{cert.companyName}</p></div>
          <div><p className="text-xs text-gray-500">Secteur</p><p className="text-white">{cert.sector || '—'}</p></div>
          <div><p className="text-xs text-gray-500">Site</p><p className="text-white">{cert.siteName}</p></div>
          {cert.rccm && <div><p className="text-xs text-gray-500">RCCM</p><p className="text-white font-mono text-xs">{cert.rccm}</p></div>}
          {cert.siteAddress && <div className="col-span-2"><p className="text-xs text-gray-500">Adresse</p><p className="text-white">{cert.siteAddress}</p></div>}
        </div>
        {cert.companyMessage && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <p className="text-xs text-gray-500 mb-1">Message de l&apos;entreprise</p>
            <p className="text-sm text-gray-300 italic">{cert.companyMessage}</p>
          </div>
        )}
        {cert.adminNotes && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <p className="text-xs text-gray-500 mb-1">Notes de l&apos;administrateur</p>
            <p className="text-sm text-gray-300">{cert.adminNotes}</p>
          </div>
        )}
      </Card>

      {/* ── CNC deposit & certificate (after the field audit) ── */}
      {['audit_done', 'submitted_to_cnc', 'certified'].includes(cert.status) && (
        <CncDepositCard cert={cert} role="expert" onRefresh={loadCert} />
      )}

      {/* ── Inspection planning ── */}
      <InspectionCard
        data={{
          certId: cert.id,
          status: cert.status,
          auditScheduledDate: cert.auditScheduledDate,
          auditLocation: cert.auditLocation,
          inspectionDate: cert.inspectionDate,
          inspectionConfirmed: cert.inspectionConfirmed,
          inspectionProposedDate: cert.inspectionProposedDate,
          inspectionProposedBy: cert.inspectionProposedBy,
        }}
        role="expert"
        onRefresh={loadCert}
        theme="dark"
      />

      {/* ══════════════════════════════════════════════════════════════════════
          ─── GRILLE D'AUDIT — 6 sections ─────────────────────────────────────
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <ListChecks className="w-4 h-4" />Grille d&apos;audit GreenLeaves — Méthodologie nationale GHG-001
          </h2>
          <div className="flex items-center gap-3">
            {savingChecklist && <span className="text-xs text-gray-500 animate-pulse">Sauvegarde…</span>}
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${completionPct}%` }} />
              </div>
              <span className="text-xs font-medium text-gray-400">{completedCount}/{boolFields.length}</span>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-700/30">
          {SECTIONS.map(({ key, icon: Icon, label }) => {
            const isOpen = openSection === key
            const stat = sectionStats[key]
            const allDone = stat ? stat.done === stat.total : false
            const someDone = stat ? stat.done > 0 : false
            return (
              <div key={key} className={isOpen ? 'bg-emerald-950/20' : ''}>
                <button
                  onClick={() => setOpenSection(isOpen ? null : key)}
                  className={`w-full flex items-center justify-between px-5 py-3.5 transition-all border-l-4 ${
                    isOpen
                      ? 'border-l-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/15'
                      : 'border-l-transparent hover:bg-gray-700/30 hover:border-l-gray-600'
                  }`}
                >
                  <span className="flex items-center gap-3 text-sm font-medium">
                    <span className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
                      isOpen ? 'bg-emerald-500/25' : 'bg-gray-700/60'
                    }`}>
                      <Icon className={`w-3.5 h-3.5 ${isOpen ? 'text-emerald-300' : 'text-gray-400'}`} />
                    </span>
                    <span className={isOpen ? 'text-white font-semibold' : 'text-gray-300'}>{label}</span>
                  </span>
                  <div className="flex items-center gap-2.5">
                    {stat && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold tabular-nums ${
                        allDone
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : someDone
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-gray-700/60 text-gray-500'
                      }`}>
                        {stat.done}/{stat.total}
                      </span>
                    )}
                    {isOpen
                      ? <ChevronUp className="w-4 h-4 text-emerald-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 space-y-3 border-l-4 border-l-emerald-500/40 bg-gray-900/40">

                    {/* ── Section 1: Eligibility ── */}
                    {key === 'eligibility' && (
                      <>
                        <CheckRow label="Les seuils d'assujettissement (art. 24-26 ord. N°019) s'appliquent à l'entité" checked={cl.eligibility.threshold_applicable} disabled={isReadOnly}
                          onChange={() => patchSection('eligibility', 'threshold_applicable', !cl.eligibility.threshold_applicable)} />
                        <CheckRow label="La personnalité morale de l'entité est vérifiée (RCCM, statuts juridiques)" checked={cl.eligibility.legal_entity_verified} disabled={isReadOnly}
                          onChange={() => patchSection('eligibility', 'legal_entity_verified', !cl.eligibility.legal_entity_verified)} />
                        <CheckRow label="Une déclaration précédente existe ou il s'agit de la première déclaration (justifié)" checked={cl.eligibility.previous_declaration_exists} disabled={isReadOnly}
                          onChange={() => patchSection('eligibility', 'previous_declaration_exists', !cl.eligibility.previous_declaration_exists)} />
                        <textarea
                          rows={2} disabled={isReadOnly} placeholder="Observations complémentaires sur l'éligibilité…"
                          value={cl.eligibility.notes}
                          onChange={e => patchSection('eligibility', 'notes', e.target.value)}
                          className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 resize-none disabled:opacity-50"
                        />
                      </>
                    )}

                    {/* ── Section 2: Data Quality ── */}
                    {key === 'data_quality' && (
                      <>
                        <CheckRow label="Les sources de données sont documentées et traçables (factures, compteurs, relevés)" checked={cl.data_quality.data_sources_documented} disabled={isReadOnly}
                          onChange={() => patchSection('data_quality', 'data_sources_documented', !cl.data_quality.data_sources_documented)} />
                        <CheckRow label="La méthode de consolidation (contrôle opérationnel/financier) est correctement appliquée" checked={cl.data_quality.consolidation_method_correct} disabled={isReadOnly}
                          onChange={() => patchSection('data_quality', 'consolidation_method_correct', !cl.data_quality.consolidation_method_correct)} />
                        <CheckRow label="Les facteurs d'émission utilisés sont appropriés, reconnus (GHG Protocol, IPCC, ADEME) et à jour" checked={cl.data_quality.emission_factors_appropriate} disabled={isReadOnly}
                          onChange={() => patchSection('data_quality', 'emission_factors_appropriate', !cl.data_quality.emission_factors_appropriate)} />
                        <CheckRow label="Les frontières organisationnelles et opérationnelles (Scope 1, 2, 3) sont correctement définies" checked={cl.data_quality.scope_boundaries_correct} disabled={isReadOnly}
                          onChange={() => patchSection('data_quality', 'scope_boundaries_correct', !cl.data_quality.scope_boundaries_correct)} />
                        <textarea
                          rows={2} disabled={isReadOnly} placeholder="Observations sur la qualité des données…"
                          value={cl.data_quality.notes}
                          onChange={e => patchSection('data_quality', 'notes', e.target.value)}
                          className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 resize-none disabled:opacity-50"
                        />
                      </>
                    )}

                    {/* ── Section 3: Calculations ── */}
                    {key === 'calculations' && (
                      <>
                        <CheckRow label="Les calculs Scope 1 sont vérifiés (combustion stationnaire, mobile, procédés, fuites)" checked={cl.calculations.scope1_verified} disabled={isReadOnly}
                          onChange={() => patchSection('calculations', 'scope1_verified', !cl.calculations.scope1_verified)} />
                        <CheckRow label="Les calculs Scope 2 sont vérifiés (électricité, vapeur, chaleur achetée)" checked={cl.calculations.scope2_verified} disabled={isReadOnly}
                          onChange={() => patchSection('calculations', 'scope2_verified', !cl.calculations.scope2_verified)} />
                        <CheckRow label="Les calculs Scope 3 sont vérifiés (amont/aval, déplacements professionnels, achats)" checked={cl.calculations.scope3_verified} disabled={isReadOnly}
                          onChange={() => patchSection('calculations', 'scope3_verified', !cl.calculations.scope3_verified)} />
                        <CheckRow label="La méthodologie GreenLeaves-GHG-001 est suivie (approche activité × facteur)" checked={cl.calculations.methodology_followed} disabled={isReadOnly}
                          onChange={() => patchSection('calculations', 'methodology_followed', !cl.calculations.methodology_followed)} />
                        <CheckRow label="Des erreurs de calcul ont été détectées (si oui, décrire ci-dessous)" checked={cl.calculations.calculation_errors_found} disabled={isReadOnly}
                          onChange={() => patchSection('calculations', 'calculation_errors_found', !cl.calculations.calculation_errors_found)} />
                        {cl.calculations.calculation_errors_found && (
                          <textarea
                            rows={2} disabled={isReadOnly} placeholder="Description des erreurs identifiées…"
                            value={cl.calculations.errors_description}
                            onChange={e => patchSection('calculations', 'errors_description', e.target.value)}
                            className="w-full bg-red-900/20 border border-red-700/50 text-red-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 resize-none disabled:opacity-50"
                          />
                        )}
                        <textarea
                          rows={2} disabled={isReadOnly} placeholder="Observations sur les calculs…"
                          value={cl.calculations.notes}
                          onChange={e => patchSection('calculations', 'notes', e.target.value)}
                          className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 resize-none disabled:opacity-50"
                        />
                      </>
                    )}

                    {/* ── Section 4: Site Visit ── */}
                    {key === 'site_visit' && (
                      <>
                        <CheckRow label="La visite de site a été effectuée" checked={cl.site_visit.visit_conducted} disabled={isReadOnly}
                          onChange={() => patchSection('site_visit', 'visit_conducted', !cl.site_visit.visit_conducted)} />
                        {cl.site_visit.visit_conducted && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Date de la visite</label>
                              <input type="date" disabled={isReadOnly} value={cl.site_visit.visit_date}
                                onChange={e => patchSection('site_visit', 'visit_date', e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Lieu de la visite</label>
                              <input type="text" disabled={isReadOnly} placeholder="Adresse / site…" value={cl.site_visit.visit_location}
                                onChange={e => patchSection('site_visit', 'visit_location', e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                              />
                            </div>
                          </div>
                        )}
                        <CheckRow label="Les compteurs d'énergie / carburant ont été vérifiés sur site" checked={cl.site_visit.energy_meters_checked} disabled={isReadOnly}
                          onChange={() => patchSection('site_visit', 'energy_meters_checked', !cl.site_visit.energy_meters_checked)} />
                        <CheckRow label="Les registres de déchets ont été contrôlés" checked={cl.site_visit.waste_records_checked} disabled={isReadOnly}
                          onChange={() => patchSection('site_visit', 'waste_records_checked', !cl.site_visit.waste_records_checked)} />
                        <CheckRow label="Les registres de déplacements professionnels ont été vérifiés" checked={cl.site_visit.travel_records_checked} disabled={isReadOnly}
                          onChange={() => patchSection('site_visit', 'travel_records_checked', !cl.site_visit.travel_records_checked)} />
                        <CheckRow label="Des entretiens ont été conduits avec les informateurs clés de l'entreprise" checked={cl.site_visit.key_informants_interviewed} disabled={isReadOnly}
                          onChange={() => patchSection('site_visit', 'key_informants_interviewed', !cl.site_visit.key_informants_interviewed)} />
                        <textarea
                          rows={3} disabled={isReadOnly} placeholder="Notes de visite de site…"
                          value={cl.site_visit.notes}
                          onChange={e => patchSection('site_visit', 'notes', e.target.value)}
                          className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 resize-none disabled:opacity-50"
                        />
                      </>
                    )}

                    {/* ── Section 5: Regulatory Compliance ── */}
                    {key === 'ogec_compliance' && (
                      <>
                        <CheckRow label="Obligation Scope 1+2 applicable (seuil ≥ 10 000 tCO₂e)" checked={cl.ogec_compliance.art24_applicable} disabled={isReadOnly}
                          onChange={() => patchSection('ogec_compliance', 'art24_applicable', !cl.ogec_compliance.art24_applicable)} />
                        <CheckRow label="Obligation Scope 1+2+3 applicable (seuil ≥ 50 000 tCO₂e)" checked={cl.ogec_compliance.art25_applicable} disabled={isReadOnly}
                          onChange={() => patchSection('ogec_compliance', 'art25_applicable', !cl.ogec_compliance.art25_applicable)} />
                        <CheckRow label="Plan de surveillance et objectifs de réduction requis" checked={cl.ogec_compliance.art26_applicable} disabled={isReadOnly}
                          onChange={() => patchSection('ogec_compliance', 'art26_applicable', !cl.ogec_compliance.art26_applicable)} />
                        <CheckRow label="Un plan de surveillance des émissions est requis" checked={cl.ogec_compliance.monitoring_plan_required} disabled={isReadOnly}
                          onChange={() => patchSection('ogec_compliance', 'monitoring_plan_required', !cl.ogec_compliance.monitoring_plan_required)} />
                        {cl.ogec_compliance.monitoring_plan_required && (
                          <CheckRow label="Le plan de surveillance fourni est conforme et présent dans le dossier" checked={cl.ogec_compliance.monitoring_plan_present} disabled={isReadOnly}
                            onChange={() => patchSection('ogec_compliance', 'monitoring_plan_present', !cl.ogec_compliance.monitoring_plan_present)} />
                        )}
                        <CheckRow label="Des objectifs de réduction ont été définis et sont mesurables" checked={cl.ogec_compliance.reduction_targets_set} disabled={isReadOnly}
                          onChange={() => patchSection('ogec_compliance', 'reduction_targets_set', !cl.ogec_compliance.reduction_targets_set)} />
                        <textarea
                          rows={2} disabled={isReadOnly} placeholder="Remarques sur la conformité réglementaire…"
                          value={cl.ogec_compliance.notes}
                          onChange={e => patchSection('ogec_compliance', 'notes', e.target.value)}
                          className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 resize-none disabled:opacity-50"
                        />
                      </>
                    )}

                    {/* ── Section 6: Opinion ── */}
                    {key === 'opinion' && (
                      <>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Constatations principales</label>
                          <textarea rows={3} disabled={isReadOnly} placeholder="Résumé des principaux faits constatés lors de l'audit…"
                            value={cl.opinion.major_findings}
                            onChange={e => patchSection('opinion', 'major_findings', e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 resize-none disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Recommandations pour l&apos;entreprise</label>
                          <textarea rows={3} disabled={isReadOnly} placeholder="Actions correctives recommandées, axes d'amélioration…"
                            value={cl.opinion.recommendations}
                            onChange={e => patchSection('opinion', 'recommendations', e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 resize-none disabled:opacity-50"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Expert notes ── */}
      {!isReadOnly && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />Notes générales & décision
          </h2>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Notes d&apos;inspection (synthèse libre)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Observations générales, résultats de vérification, remarques complémentaires…" />
            <button onClick={() => action({ action: 'notes', inspectionNotes: notes })} disabled={submitting}
              className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
              <Save className="w-3.5 h-3.5" />Sauvegarder les notes
            </button>
          </div>

          <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-700">
            {cert.status === 'assigned' && (
              <button onClick={() => action({ action: 'start_review' })} disabled={submitting}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
                <PlayCircle className="w-4 h-4" />Démarrer l&apos;audit
              </button>
            )}
            {canFinalizeAudit && (
              <button
                onClick={() => action({ action: 'audit_done', auditChecklist: cl, inspectionNotes: notes })}
                disabled={submitting}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                <FileCheck className="w-4 h-4" />Finaliser le rapport d&apos;audit
              </button>
            )}
            {!showRejectForm && (
              <button onClick={() => setShowRejectForm(true)}
                className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
                <XCircle className="w-4 h-4" />Rejeter
              </button>
            )}
          </div>

          {showRejectForm && (
            <div className="border border-red-500/30 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-red-400">Motif du rejet</p>
              <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={3}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 resize-none"
                placeholder="Expliquer le motif du rejet (données insuffisantes, seuil non applicable, refus de coopération…)" />
              <div className="flex gap-2">
                <button onClick={() => { setShowRejectForm(false); setRejectionReason('') }}
                  className="px-4 py-2 rounded-xl bg-gray-700 text-gray-300 text-sm hover:text-white transition-colors">Annuler</button>
                <button onClick={() => action({ action: 'reject', rejectionReason })} disabled={submitting || !rejectionReason.trim()}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50 transition-colors">
                  Confirmer le rejet
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
