'use client'

import { useState, useEffect } from 'react'
import {
  Coins, Plus, ChevronDown, ChevronUp, Search, X,
  CheckCircle2, Archive, AlertTriangle, Leaf,
  RotateCcw, ShieldAlert, Link2, Filter
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Credit {
  id: number
  project_id: number
  project_title: string
  partner_name: string | null
  serial_number: string
  verra_project_id: string | null
  verra_credit_ref: string | null
  vintage_year: number
  vintage_start: string | null
  vintage_end: string | null
  quantity_issued: number
  quantity_active: number
  quantity_retired: number
  quantity_cancelled: number
  quantity_buffer: number
  methodology_code: string | null
  standard: string | null
  project_type: string | null
  is_afolu: boolean
  status: string
  issuance_date: string
  liability_expires_at: string | null
  notes: string | null
}

interface RegistrySummaryRow {
  project_id: number
  project_title: string
  partner_name: string | null
  methodology_code: string | null
  standard: string | null
  total_issued: number
  total_active: number
  total_retired: number
  total_cancelled: number
  total_buffer: number
  first_vintage: number | null
  last_vintage: number | null
}

interface Transaction {
  id: number
  tx_type: string
  quantity: number
  from_holder: string | null
  to_holder: string | null
  beneficial_owner: string | null
  retirement_reason: string | null
  price_per_ton_usd: number | null
  price_per_ton_fcfa: number | null
  total_value_usd: number | null
  tx_date: string
  notes: string | null
  performed_by_name: string | null
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  active:             { label: 'Actif',              cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  partially_retired:  { label: 'Partiellement retiré', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Archive className="w-3.5 h-3.5" /> },
  fully_retired:      { label: 'Entièrement retiré', cls: 'bg-gray-100 text-gray-600 border-gray-200', icon: <Archive className="w-3.5 h-3.5" /> },
  cancelled:          { label: 'Annulé',             cls: 'bg-red-50 text-red-700 border-red-200', icon: <X className="w-3.5 h-3.5" /> },
  disputed:           { label: 'Contesté',           cls: 'bg-orange-50 text-orange-700 border-orange-200', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
}

const TX_CFG: Record<string, { label: string; cls: string }> = {
  issuance:       { label: 'Émission',           cls: 'text-emerald-700 bg-emerald-50' },
  transfer:       { label: 'Transfert',          cls: 'text-blue-700 bg-blue-50' },
  retirement:     { label: 'Retraite',           cls: 'text-purple-700 bg-purple-50' },
  cancellation:   { label: 'Annulation',         cls: 'text-red-700 bg-red-50' },
  buffer_deposit: { label: 'Pool tampon',        cls: 'text-orange-700 bg-orange-50' },
  dispute_flag:   { label: 'Contestation',       cls: 'text-orange-700 bg-orange-50' },
}

const STANDARD_LABELS: Record<string, string> = {
  verra_vcs:     'Verra VCS',
  gold_standard: 'Gold Standard',
  ogec:          'OGEC',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | string | null | undefined, dec = 2) {
  if (n == null || n === '') return '—'
  const num = typeof n === 'string' ? parseFloat(n) : n
  return num.toLocaleString('fr-FR', { maximumFractionDigits: dec })
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

// ─── Issue form ───────────────────────────────────────────────────────────────

interface IssueFormProps {
  onClose: () => void
  onIssued: () => void
}

function IssueForm({ onClose, onIssued }: IssueFormProps) {
  const [projects, setProjects]   = useState<{ id: number; title: string; project_type_mrv: string; credits_eligible: number | null }[]>([])
  const [projectId, setProjectId] = useState('')
  const [vintageYear, setVintageYear] = useState(new Date().getFullYear().toString())
  const [vintageStart, setVintageStart] = useState('')
  const [vintageEnd, setVintageEnd] = useState('')
  const [quantity, setQuantity]   = useState('')
  const [verraSerial, setVerraSerial] = useState('')
  const [notes, setNotes]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState('')

  useEffect(() => {
    fetch('/api/partner/projects')
      .then(r => r.json())
      .then(d => setProjects(d.projects ?? []))
  }, [])

  const selectedProject = projects.find(p => p.id === parseInt(projectId))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr('')
    try {
      const res = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: parseInt(projectId),
          vintageYear: parseInt(vintageYear),
          vintageStart: vintageStart || undefined,
          vintageEnd:   vintageEnd   || undefined,
          quantity: parseFloat(quantity),
          verraSerial:  verraSerial  || undefined,
          notes: notes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error ?? 'Erreur'); return }
      onIssued()
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
      <div>
        <h3 className="font-bold text-gray-900">Enregistrer une émission de crédits</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Saisissez les crédits émis par Verra / Gold Standard / OGEC suite à leur validation de votre dossier MRV.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Projet *</label>
          <select value={projectId} onChange={e => setProjectId(e.target.value)} required
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Sélectionner un projet…</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          {selectedProject?.credits_eligible != null && (
            <p className="text-xs text-emerald-600 mt-1">
              MRV éligibles : {fmt(selectedProject.credits_eligible)} tCO₂e
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Vintage (année) *</label>
          <input type="number" min="2000" max="2050" value={vintageYear} onChange={e => setVintageYear(e.target.value)} required
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Période début</label>
          <input type="date" value={vintageStart} onChange={e => setVintageStart(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Période fin</label>
          <input type="date" value={vintageEnd} onChange={e => setVintageEnd(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Quantité émise par le registre (tCO₂e) *</label>
          <input type="number" min="0.01" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} required
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">N° de série Verra / GS</label>
          <input type="text" value={verraSerial} onChange={e => setVerraSerial(e.target.value)}
            placeholder="ex: VCS-4271-2024-001 (optionnel si pas encore reçu)"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Notes</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="ex: Confirmation reçue le 15/04/2026 par email Verra…"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        <strong>Rappel :</strong> CarbonTrack enregistre ici ce que le registre officiel a émis.
        Si le numéro de série Verra n&apos;est pas encore disponible, laissez le champ vide — vous pourrez le renseigner plus tard via &quot;Lier au registre Verra&quot;.
      </div>

      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">
          {saving ? 'Enregistrement…' : 'Enregistrer l\'émission'}
        </button>
        <button type="button" onClick={onClose}
          className="px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:text-gray-700 bg-white">
          Annuler
        </button>
      </div>
    </form>
  )
}

// ─── Transaction modal ────────────────────────────────────────────────────────

type TxAction = 'retire' | 'cancel' | 'dispute' | 'link_verra'

interface TxModalProps {
  credit: Credit
  action: TxAction
  onClose: () => void
  onDone: () => void
}

function TxModal({ credit, action, onClose, onDone }: TxModalProps) {
  const [quantity, setQuantity]         = useState('')
  const [beneficialOwner, setBeneOwner] = useState('')
  const [beneficialEmail, setBeneEmail] = useState('')
  const [retirementReason, setReason]   = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [disputeReason, setDisputeReason] = useState('')
  const [verraProjectId, setVerraId]    = useState(credit.verra_project_id ?? '')
  const [verraCreditRef, setVerraRef]   = useState(credit.verra_credit_ref ?? '')
  const [saving, setSaving]             = useState(false)
  const [err, setErr]                   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr('')
    const body: Record<string, unknown> = { action }
    if (action === 'retire')     Object.assign(body, { quantity: parseFloat(quantity), beneficialOwner, beneficialOwnerEmail: beneficialEmail || undefined, retirementReason })
    if (action === 'cancel')     Object.assign(body, { quantity: parseFloat(quantity), reason: cancelReason })
    if (action === 'dispute')    Object.assign(body, { reason: disputeReason })
    if (action === 'link_verra') Object.assign(body, { verraProjectId, verraCreditRef })

    try {
      const res = await fetch(`/api/admin/credits/${credit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error ?? 'Erreur'); return }
      onDone()
    } finally { setSaving(false) }
  }

  const titles: Record<TxAction, string> = {
    retire:     'Enregistrer une retraite (via Verra)',
    cancel:     'Annuler des crédits',
    dispute:    'Signaler un problème',
    link_verra: 'Lier au registre Verra',
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">{titles[action]}</h3>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X className="w-4 h-4" /></button>
        </div>

        <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs font-mono text-gray-600">
          {credit.serial_number} · {credit.vintage_year} · {fmt(credit.quantity_active)} tCO₂e actifs
        </div>

        {/* Retire fields */}
        {action === 'retire' && (<>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Quantité *</label>
              <input type="number" min="0.01" step="0.01" max={credit.quantity_active} value={quantity} onChange={e => setQuantity(e.target.value)} required
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Propriétaire bénéficiaire *</label>
              <input type="text" value={beneficialOwner} onChange={e => setBeneOwner(e.target.value)} required
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Email bénéficiaire</label>
              <input type="email" value={beneficialEmail} onChange={e => setBeneEmail(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Raison de la retraite *</label>
              <textarea value={retirementReason} onChange={e => setReason(e.target.value)} required rows={2}
                placeholder="ex: Compensation volontaire des émissions 2024, conformité réglementaire…"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-800">
            La retraite se fait via le registre Verra. Enregistrez ici la confirmation reçue — ces informations sont publiquement divulguées par Verra (bénéficiaire, raison, quantité, numéro de série).
          </div>
        </>)}

        {/* Cancel fields */}
        {action === 'cancel' && (<>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Quantité *</label>
              <input type="number" min="0.01" step="0.01" max={credit.quantity_active} value={quantity} onChange={e => setQuantity(e.target.value)} required
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Raison *</label>
              <input type="text" value={cancelReason} onChange={e => setCancelReason(e.target.value)} required
                placeholder="Surémission, annulation Verra…"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
          </div>
        </>)}

        {/* Dispute field */}
        {action === 'dispute' && (
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Description du problème</label>
            <textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)} rows={2}
              placeholder="ex: Verra a signalé une anomalie sur ce lot de crédits…"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
        )}

        {/* Link Verra */}
        {action === 'link_verra' && (<>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">ID Projet Verra</label>
              <input type="text" value={verraProjectId} onChange={e => setVerraId(e.target.value)} placeholder="ex: 4271"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Référence crédit Verra</label>
              <input type="text" value={verraCreditRef} onChange={e => setVerraRef(e.target.value)} placeholder="ex: VCS-4271-2024-001"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Une fois votre projet enregistré dans le registre Verra, renseignez ici les références officielles pour synchronisation.
          </p>
        </>)}

        {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}

        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">
            {saving ? 'En cours…' : 'Confirmer'}
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:text-gray-700 bg-white">
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CreditsPage() {
  const [credits, setCredits]       = useState<Credit[]>([])
  const [summary, setSummary]       = useState<RegistrySummaryRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [txHistory, setTxHistory]   = useState<Record<number, Transaction[]>>({})
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [txModal, setTxModal]       = useState<{ credit: Credit; action: TxAction } | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/credits')
    const d = await res.json()
    setCredits(d.credits ?? [])
    setSummary(d.summary ?? [])
    setLoading(false)
  }

  async function loadTx(creditId: number) {
    const res = await fetch(`/api/admin/credits/${creditId}`)
    const d = await res.json()
    setTxHistory(prev => ({ ...prev, [creditId]: d.transactions ?? [] }))
  }

  async function handleExpand(id: number) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (!txHistory[id]) await loadTx(id)
  }

  const totalIssued   = summary.reduce((s, r) => s + Number(r.total_issued),   0)
  const totalActive   = summary.reduce((s, r) => s + Number(r.total_active),   0)
  const totalRetired  = summary.reduce((s, r) => s + Number(r.total_retired),  0)
  const totalBuffer   = summary.reduce((s, r) => s + Number(r.total_buffer),   0)

  const filtered = credits.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || c.serial_number.toLowerCase().includes(q)
      || (c.project_title ?? '').toLowerCase().includes(q)
      || (c.partner_name ?? '').toLowerCase().includes(q)
      || (c.verra_project_id ?? '').includes(q)
    const matchStatus = !statusFilter || c.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Coins className="w-6 h-6 text-emerald-600" /> Suivi des Crédits Carbone
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Crédits émis par Verra / Gold Standard / OGEC — enregistrement et suivi des retraites
          </p>
        </div>
        <button onClick={() => setShowIssueForm(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Enregistrer une émission
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total émis',      value: fmt(totalIssued, 1), unit: 'tCO₂e', cls: 'text-gray-900' },
          { label: 'Crédits actifs',  value: fmt(totalActive, 1), unit: 'tCO₂e', cls: 'text-emerald-700' },
          { label: 'Retirés',         value: fmt(totalRetired, 1), unit: 'tCO₂e', cls: 'text-blue-700' },
          { label: 'Pool tampon',     value: fmt(totalBuffer, 1), unit: 'tCO₂e', cls: 'text-orange-700' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">{k.label}</div>
            <div className={`text-lg font-bold ${k.cls}`}>{k.value}</div>
            <div className="text-xs text-gray-400">{k.unit}</div>
          </div>
        ))}
      </div>

      {/* Issue form */}
      {showIssueForm && (
        <IssueForm onClose={() => setShowIssueForm(false)} onIssued={() => { setShowIssueForm(false); load() }} />
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="N° série, projet, partenaire, Verra ID…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div className="relative">
          <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none">
            <option value="">Tous statuts</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        {(search || statusFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter('') }}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg bg-white hover:text-gray-700">
            <X className="w-3.5 h-3.5" /> Effacer
          </button>
        )}
      </div>

      {/* Credits list */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <Coins className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Aucun crédit émis</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const statusCfg = STATUS_CFG[c.status] ?? { label: c.status, cls: 'bg-gray-100 text-gray-600 border-gray-200', icon: null }
            const txs = txHistory[c.id] ?? []
            const isExpanded = expandedId === c.id

            return (
              <div key={c.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                {/* Row */}
                <div className="flex items-center gap-4 p-4">
                  <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Coins className="w-4 h-4 text-emerald-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-gray-900">{c.serial_number}</span>
                      <span className={`inline-flex items-center gap-1 text-xs border px-2 py-0.5 rounded-full ${statusCfg.cls}`}>
                        {statusCfg.icon} {statusCfg.label}
                      </span>
                      {c.is_afolu && (
                        <span className="text-xs bg-orange-50 border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Leaf className="w-3 h-3" /> AFOLU
                        </span>
                      )}
                      {c.verra_project_id && (
                        <span className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full">
                          Verra #{c.verra_project_id}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-gray-500">
                      <span className="font-medium text-gray-700">{c.project_title}</span>
                      <span>{c.partner_name}</span>
                      <span>Vintage {c.vintage_year}</span>
                      {c.methodology_code && <span className="font-mono">{c.methodology_code}</span>}
                      <span>{STANDARD_LABELS[c.standard ?? ''] ?? c.standard}</span>
                    </div>
                  </div>

                  {/* Qty summary */}
                  <div className="hidden md:flex items-center gap-5 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-gray-900">{fmt(c.quantity_active, 1)}</div>
                      <div className="text-xs text-gray-400">actifs</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-blue-600">{fmt(c.quantity_retired, 1)}</div>
                      <div className="text-xs text-gray-400">retirés</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-orange-600">{fmt(c.quantity_buffer, 1)}</div>
                      <div className="text-xs text-gray-400">buffer</div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {c.status === 'active' && (<>
                      <button onClick={() => setTxModal({ credit: c, action: 'retire' })}
                        className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg" title="Enregistrer retraite Verra">
                        <Archive className="w-4 h-4" />
                      </button>
                      <button onClick={() => setTxModal({ credit: c, action: 'cancel' })}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Annuler">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </>)}
                    {c.status !== 'disputed' && (
                      <button onClick={() => setTxModal({ credit: c, action: 'dispute' })}
                        className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg" title="Contester">
                        <ShieldAlert className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => setTxModal({ credit: c, action: 'link_verra' })}
                      className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Lier à Verra">
                      <Link2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleExpand(c.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded: quantities + tx history */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
                    {/* Quantity breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        { label: 'Émis',        value: c.quantity_issued,    cls: 'text-gray-900' },
                        { label: 'Actifs',       value: c.quantity_active,    cls: 'text-emerald-700' },
                        { label: 'Retirés',      value: c.quantity_retired,   cls: 'text-blue-700' },
                        { label: 'Annulés',      value: c.quantity_cancelled, cls: 'text-red-700' },
                        { label: 'Pool tampon',  value: c.quantity_buffer,    cls: 'text-orange-700' },
                      ].map(q => (
                        <div key={q.label} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                          <div className={`font-bold text-sm ${q.cls}`}>{fmt(q.value, 1)}</div>
                          <div className="text-xs text-gray-500">{q.label} (tCO₂e)</div>
                        </div>
                      ))}
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <span>Émission : {fmtDate(c.issuance_date)}</span>
                      {c.vintage_start && <span>Période : {fmtDate(c.vintage_start)} → {fmtDate(c.vintage_end)}</span>}
                      {c.liability_expires_at && <span>Responsabilité expire : {fmtDate(c.liability_expires_at)}</span>}
                      {c.verra_project_id && <span className="text-blue-600">Verra Project ID: {c.verra_project_id}</span>}
                      {c.verra_credit_ref && <span className="text-blue-600">Verra Ref: {c.verra_credit_ref}</span>}
                    </div>

                    {/* Transaction history */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Historique des transactions</p>
                      {txs.length === 0 ? (
                        <p className="text-xs text-gray-400">Aucune transaction</p>
                      ) : (
                        <div className="space-y-1">
                          {txs.map(tx => {
                            const txCfg = TX_CFG[tx.tx_type] ?? { label: tx.tx_type, cls: 'text-gray-600 bg-gray-50' }
                            return (
                              <div key={tx.id} className="flex items-start gap-3 text-xs bg-white border border-gray-100 rounded-lg p-2.5">
                                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${txCfg.cls}`}>
                                  {txCfg.label}
                                </span>
                                <span className="font-semibold text-gray-900">{fmt(tx.quantity, 2)} tCO₂e</span>
                                {tx.to_holder && <span className="text-gray-500">→ {tx.to_holder}</span>}
                                {tx.beneficial_owner && <span className="text-purple-600">Bénéficiaire: {tx.beneficial_owner}</span>}
                                {tx.retirement_reason && <span className="text-gray-400 italic">{tx.retirement_reason}</span>}
                                {tx.total_value_usd != null && (
                                  <span className="text-gray-500">${fmt(tx.total_value_usd, 0)} USD</span>
                                )}
                                <span className="text-gray-400 ml-auto">{fmtDate(tx.tx_date)}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Transaction modal */}
      {txModal && (
        <TxModal
          credit={txModal.credit}
          action={txModal.action}
          onClose={() => setTxModal(null)}
          onDone={() => { setTxModal(null); load(); if (txModal.credit.id === expandedId) loadTx(txModal.credit.id) }}
        />
      )}
    </div>
  )
}
