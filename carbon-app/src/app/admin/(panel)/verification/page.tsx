'use client'

import { useState, useEffect } from 'react'
import {
  ShieldCheck, Search, Filter, X, ChevronDown, ChevronUp,
  Mail, Send, CheckCircle2, Clock, AlertTriangle, XCircle,
  Plus, Check, MessageSquare, FileText, Leaf
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VVBProject {
  id: number
  title: string
  project_type_mrv: string | null
  methodology_code: string | null
  standard: string | null
  country: string | null
  partner_name: string | null
  vvb_name: string | null
  vvb_contact_email: string | null
  vvb_assigned_at: string | null
  vvb_status: string | null
  vvb_opinion: string | null
  baseline_tco2_yr: number | null
  credits_eligible: number | null
}

interface Verification {
  id: number
  project_id: number
  vvb_name: string
  vvb_email: string
  vvb_contact: string | null
  status: string
  email_sent_at: string | null
  opinion: string | null
  opinion_text: string | null
  opinion_date: string | null
  cars: CAR[]
  cls: CL[]
  assigned_at: string
  first_name: string | null
  last_name: string | null
}

interface CAR { id: number; text: string; issued_at: string; resolved: boolean; resolved_at: string | null }
interface CL  { id: number; text: string; issued_at: string; answered_at: string | null; answer: string | null }

interface VVBRegistryEntry {
  id: number
  name: string
  short_name: string
  website: string | null
  standards: string[]
  contact_email: string | null
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  pending:                { label: 'En attente',          cls: 'bg-gray-100 text-gray-600 border-gray-300',    icon: <Clock className="w-3.5 h-3.5" /> },
  contacted:              { label: 'Contacté',            cls: 'bg-blue-50 text-blue-700 border-blue-200',     icon: <Mail className="w-3.5 h-3.5" /> },
  in_review:              { label: 'En révision',         cls: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: <FileText className="w-3.5 h-3.5" /> },
  site_visit:             { label: 'Visite de site',      cls: 'bg-purple-50 text-purple-700 border-purple-200', icon: <Leaf className="w-3.5 h-3.5" /> },
  approved:               { label: 'Approuvé',            cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  conditionally_approved: { label: 'Approuvé (cond.)',    cls: 'bg-teal-50 text-teal-700 border-teal-200',     icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  rejected:               { label: 'Rejeté',              cls: 'bg-red-50 text-red-700 border-red-200',        icon: <XCircle className="w-3.5 h-3.5" /> },
}

const OPINION_CONFIG: Record<string, { label: string; cls: string }> = {
  approved:               { label: 'FAVORABLE',              cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  conditionally_approved: { label: 'SOUS CONDITIONS',        cls: 'bg-teal-100 text-teal-800 border-teal-300' },
  rejected:               { label: 'DÉFAVORABLE',            cls: 'bg-red-100 text-red-800 border-red-300' },
}

const NEXT_STATUSES = ['pending', 'contacted', 'in_review', 'site_visit', 'approved', 'conditionally_approved', 'rejected']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VerificationPage() {
  const [projects, setProjects]       = useState<VVBProject[]>([])
  const [vvbList, setVvbList]         = useState<VVBRegistryEntry[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedId, setExpandedId]   = useState<number | null>(null)
  const [verifications, setVerifications] = useState<Record<number, Verification[]>>({})

  // Assign VVB form
  const [assigningId, setAssigningId] = useState<number | null>(null)
  const [vvbName, setVvbName]         = useState('')
  const [vvbEmail, setVvbEmail]       = useState('')
  const [vvbContact, setVvbContact]   = useState('')
  const [assigning, setAssigning]     = useState(false)
  const [assignMsg, setAssignMsg]     = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // CAR / CL form per verification
  const [addCarId, setAddCarId]       = useState<number | null>(null)
  const [addClId, setAddClId]         = useState<number | null>(null)
  const [itemText, setItemText]       = useState('')
  const [opinionId, setOpinionId]     = useState<number | null>(null)
  const [opinion, setOpinion]         = useState('')
  const [opinionText, setOpinionText] = useState('')
  const [opinionDate, setOpinionDate] = useState('')
  const [saving, setSaving]           = useState(false)

  useEffect(() => {
    loadProjects()
    fetch('/api/vvb-registry').then(r => r.json()).then(d => setVvbList(d.vvbs ?? []))
  }, [])

  async function loadProjects() {
    setLoading(true)
    const res = await fetch('/api/partner/projects')
    const data = await res.json()
    setProjects(data.projects ?? [])
    setLoading(false)
  }

  async function loadVerifications(projectId: number) {
    const res = await fetch(`/api/admin/projects/${projectId}/vvb-status`)
    const data = await res.json()
    setVerifications(prev => ({ ...prev, [projectId]: data.verifications ?? [] }))
  }

  async function handleExpand(id: number) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (!verifications[id]) await loadVerifications(id)
  }

  async function handleAssign(projectId: number) {
    if (!vvbName || !vvbEmail) { setAssignMsg({ type: 'err', text: 'Nom et email VVB requis' }); return }
    setAssigning(true)
    setAssignMsg(null)
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/assign-vvb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vvbName, vvbEmail, vvbContact: vvbContact || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAssignMsg({ type: 'err', text: data.error ?? 'Erreur' })
        return
      }
      const emailSent = data.email?.sent
      setAssignMsg({
        type: 'ok',
        text: emailSent
          ? `VVB assigné et email envoyé avec ${data.email.attachments.length} PDF(s) en pièce jointe.`
          : 'VVB assigné. Email non envoyé (SMTP non configuré — vérifiez .env.local).',
      })
      setVvbName(''); setVvbEmail(''); setVvbContact('')
      await loadProjects()
      await loadVerifications(projectId)
      setTimeout(() => { setAssigningId(null); setAssignMsg(null) }, 4000)
    } finally {
      setAssigning(false)
    }
  }

  async function handleUpdateStatus(projectId: number, verificationId: number, status: string) {
    await fetch(`/api/admin/projects/${projectId}/vvb-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_status', verificationId, status }),
    })
    await loadProjects()
    await loadVerifications(projectId)
  }

  async function handleAddItem(projectId: number, verificationId: number, type: 'car' | 'cl') {
    if (!itemText.trim()) return
    setSaving(true)
    await fetch(`/api/admin/projects/${projectId}/vvb-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: `add_${type}`, verificationId, text: itemText.trim() }),
    })
    setItemText('')
    setAddCarId(null)
    setAddClId(null)
    await loadVerifications(projectId)
    setSaving(false)
  }

  async function handleResolveCAR(projectId: number, verificationId: number, carId: number) {
    await fetch(`/api/admin/projects/${projectId}/vvb-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolve_car', verificationId, carId }),
    })
    await loadVerifications(projectId)
  }

  async function handleRecordOpinion(projectId: number, verificationId: number) {
    if (!opinion) return
    setSaving(true)
    await fetch(`/api/admin/projects/${projectId}/vvb-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'record_opinion', verificationId, opinion, opinionText, opinionDate }),
    })
    setOpinionId(null); setOpinion(''); setOpinionText(''); setOpinionDate('')
    await loadProjects()
    await loadVerifications(projectId)
    setSaving(false)
  }

  function prefillFromRegistry(vvb: VVBRegistryEntry) {
    setVvbName(vvb.name)
    setVvbEmail(vvb.contact_email ?? '')
  }

  const filtered = projects.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || (p.title ?? '').toLowerCase().includes(q)
      || (p.partner_name ?? '').toLowerCase().includes(q)
      || (p.vvb_name ?? '').toLowerCase().includes(q)
    const matchStatus = !statusFilter
      || (statusFilter === 'unassigned' ? !p.vvb_name : p.vvb_status === statusFilter)
    return matchSearch && matchStatus
  })

  const assigned = projects.filter(p => p.vvb_name).length
  const approved = projects.filter(p => p.vvb_opinion === 'approved' || p.vvb_opinion === 'conditionally_approved').length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-blue-600" /> Vérification VVB
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestion des vérificateurs tiers (VVB) et suivi des opinions de vérification</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Projets total',    value: projects.length.toString() },
          { label: 'VVB assignés',     value: assigned.toString() },
          { label: 'En cours',         value: projects.filter(p => p.vvb_status && !['approved','conditionally_approved','rejected'].includes(p.vvb_status)).length.toString() },
          { label: 'Opinions positives', value: approved.toString() },
        ].map(k => (
          <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">{k.label}</div>
            <div className="text-lg font-bold text-gray-900">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Known VVBs reference */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-3">VVBs accrédités — Référence rapide</p>
        <div className="flex flex-wrap gap-2">
          {vvbList.map(v => (
            <button
              key={v.id}
              onClick={() => { setAssigningId(-1); prefillFromRegistry(v) }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-sm text-blue-700 hover:bg-blue-100 transition-colors"
              title={v.standards?.join(', ')}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {v.short_name ?? v.name}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Rechercher projet, partenaire, VVB…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="relative">
          <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
          >
            <option value="">Tous</option>
            <option value="unassigned">Sans VVB</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        {(search || statusFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter('') }} className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg bg-white hover:text-gray-700">
            <X className="w-3.5 h-3.5" /> Effacer
          </button>
        )}
      </div>

      {/* Project list */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400">Chargement…</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const statusCfg = p.vvb_status ? STATUS_CONFIG[p.vvb_status] : null
            const isExpanded = expandedId === p.id
            const pvvbs = verifications[p.id] ?? []

            return (
              <div key={p.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                {/* Row */}
                <div className="flex items-center gap-4 p-4">
                  <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{p.title}</span>
                      {statusCfg ? (
                        <span className={`inline-flex items-center gap-1 text-xs border px-2 py-0.5 rounded-full ${statusCfg.cls}`}>
                          {statusCfg.icon} {statusCfg.label}
                        </span>
                      ) : (
                        <span className="text-xs border px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border-gray-200">Sans VVB</span>
                      )}
                      {p.vvb_opinion && OPINION_CONFIG[p.vvb_opinion] && (
                        <span className={`text-xs border px-2 py-0.5 rounded-full font-bold ${OPINION_CONFIG[p.vvb_opinion].cls}`}>
                          {OPINION_CONFIG[p.vvb_opinion].label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-gray-500">
                      <span className="font-medium text-gray-700">{p.partner_name}</span>
                      {p.methodology_code && <span className="font-mono">{p.methodology_code}</span>}
                      {p.vvb_name && <span className="text-blue-600">VVB: {p.vvb_name}</span>}
                      {p.credits_eligible != null && (
                        <span className="text-emerald-700 font-medium">{fmt(p.credits_eligible)} tCO₂e éligibles</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!p.vvb_name && (
                      <button
                        onClick={() => { setAssigningId(p.id); setAssignMsg(null) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                      >
                        <Send className="w-3.5 h-3.5" /> Assigner VVB
                      </button>
                    )}
                    <button onClick={() => handleExpand(p.id)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Assign VVB form */}
                {assigningId === p.id && (
                  <div className="border-t border-blue-100 bg-blue-50 p-4 space-y-3">
                    <p className="text-sm font-semibold text-blue-900">Assigner un VVB et envoyer le package de documents</p>

                    {/* Quick select from registry */}
                    <div className="flex flex-wrap gap-1.5">
                      {vvbList.map(v => (
                        <button key={v.id} onClick={() => prefillFromRegistry(v)}
                          className="text-xs px-2 py-1 bg-white border border-blue-200 rounded text-blue-700 hover:bg-blue-100">
                          {v.short_name ?? v.name}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input placeholder="Nom du VVB *" value={vvbName} onChange={e => setVvbName(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <input placeholder="Email VVB *" type="email" value={vvbEmail} onChange={e => setVvbEmail(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <input placeholder="Nom du contact (optionnel)" value={vvbContact} onChange={e => setVvbContact(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => handleAssign(p.id)} disabled={assigning}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
                        <Mail className="w-3.5 h-3.5" />
                        {assigning ? 'Envoi en cours…' : 'Assigner et envoyer PDD + Rapport'}
                      </button>
                      <button onClick={() => { setAssigningId(null); setAssignMsg(null) }}
                        className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg bg-white">
                        Annuler
                      </button>
                    </div>

                    {assignMsg && (
                      <div className={`text-sm px-3 py-2 rounded-lg ${assignMsg.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {assignMsg.text}
                      </div>
                    )}
                  </div>
                )}

                {/* Expanded verification detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
                    {pvvbs.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">Aucune vérification VVB pour ce projet.</p>
                    ) : pvvbs.map(v => (
                      <div key={v.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">

                        {/* VVB info + status */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <span className="font-semibold text-gray-900 text-sm">{v.vvb_name}</span>
                            <span className="text-gray-400 text-xs ml-2">&lt;{v.vvb_email}&gt;</span>
                            {v.vvb_contact && <span className="text-gray-500 text-xs ml-2">— {v.vvb_contact}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            {v.email_sent_at && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Mail className="w-3 h-3" /> Envoyé {fmtDate(v.email_sent_at)}
                              </span>
                            )}
                            <select
                              value={v.status}
                              onChange={e => handleUpdateStatus(p.id, v.id, e.target.value)}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              {NEXT_STATUSES.map(s => (
                                <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Opinion */}
                        {v.opinion ? (
                          <div className={`px-3 py-2 rounded-lg border text-sm font-bold ${OPINION_CONFIG[v.opinion]?.cls ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                            Opinion VVB : {OPINION_CONFIG[v.opinion]?.label ?? v.opinion}
                            {v.opinion_text && <span className="font-normal ml-2 text-xs">— {v.opinion_text}</span>}
                          </div>
                        ) : (
                          opinionId === v.id ? (
                            <div className="space-y-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <select value={opinion} onChange={e => setOpinion(e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                                <option value="">Sélectionner opinion…</option>
                                <option value="approved">Approuvé (FAVORABLE)</option>
                                <option value="conditionally_approved">Approuvé sous conditions</option>
                                <option value="rejected">Rejeté (DÉFAVORABLE)</option>
                              </select>
                              <textarea placeholder="Commentaires / conditions…" value={opinionText} onChange={e => setOpinionText(e.target.value)}
                                rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none" />
                              <div className="flex items-center gap-2">
                                <input type="date" value={opinionDate} onChange={e => setOpinionDate(e.target.value)}
                                  className="text-sm border border-gray-200 rounded-lg px-3 py-2" />
                                <button onClick={() => handleRecordOpinion(p.id, v.id)} disabled={saving || !opinion}
                                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg disabled:opacity-60">
                                  {saving ? '…' : 'Enregistrer'}
                                </button>
                                <button onClick={() => setOpinionId(null)} className="px-3 py-2 text-gray-500 text-xs border border-gray-200 rounded-lg">Annuler</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setOpinionId(v.id)}
                              className="text-xs flex items-center gap-1.5 text-blue-600 hover:text-blue-700">
                              <Plus className="w-3.5 h-3.5" /> Enregistrer opinion finale VVB
                            </button>
                          )
                        )}

                        {/* CARs */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                              CARs — Corrective Action Requests ({v.cars?.length ?? 0})
                            </p>
                            <button onClick={() => { setAddCarId(v.id); setItemText('') }}
                              className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1">
                              <Plus className="w-3 h-3" /> Ajouter
                            </button>
                          </div>
                          {v.cars?.map((car: CAR) => (
                            <div key={car.id} className={`flex items-start gap-2 text-xs p-2 rounded-lg mb-1 ${car.resolved ? 'bg-gray-50 text-gray-400' : 'bg-orange-50 border border-orange-100'}`}>
                              <span className="flex-1">{car.text}</span>
                              {!car.resolved && (
                                <button onClick={() => handleResolveCAR(p.id, v.id, car.id)}
                                  className="flex items-center gap-0.5 text-orange-600 hover:text-orange-700 flex-shrink-0">
                                  <Check className="w-3 h-3" /> Résoudre
                                </button>
                              )}
                              {car.resolved && <span className="text-green-600 flex-shrink-0">✓ Résolu</span>}
                            </div>
                          ))}
                          {addCarId === v.id && (
                            <div className="flex gap-2 mt-1">
                              <input value={itemText} onChange={e => setItemText(e.target.value)} placeholder="Description du CAR…"
                                className="flex-1 text-xs border border-orange-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-400" />
                              <button onClick={() => handleAddItem(p.id, v.id, 'car')} disabled={saving}
                                className="px-3 py-1.5 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 disabled:opacity-60">Ajouter</button>
                              <button onClick={() => setAddCarId(null)} className="px-2 py-1.5 text-gray-400 text-xs">✕</button>
                            </div>
                          )}
                        </div>

                        {/* CLs */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
                              CLs — Clarification Letters ({v.cls?.length ?? 0})
                            </p>
                            <button onClick={() => { setAddClId(v.id); setItemText('') }}
                              className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1">
                              <Plus className="w-3 h-3" /> Ajouter
                            </button>
                          </div>
                          {v.cls?.map((cl: CL) => (
                            <div key={cl.id} className={`text-xs p-2 rounded-lg mb-1 ${cl.answered_at ? 'bg-gray-50 text-gray-500' : 'bg-purple-50 border border-purple-100'}`}>
                              <p>{cl.text}</p>
                              {cl.answer && <p className="mt-1 text-purple-700 italic">Réponse : {cl.answer}</p>}
                            </div>
                          ))}
                          {addClId === v.id && (
                            <div className="flex gap-2 mt-1">
                              <input value={itemText} onChange={e => setItemText(e.target.value)} placeholder="Demande de clarification…"
                                className="flex-1 text-xs border border-purple-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-400" />
                              <button onClick={() => handleAddItem(p.id, v.id, 'cl')} disabled={saving}
                                className="px-3 py-1.5 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 disabled:opacity-60">Ajouter</button>
                              <button onClick={() => setAddClId(null)} className="px-2 py-1.5 text-gray-400 text-xs">✕</button>
                            </div>
                          )}
                        </div>

                      </div>
                    ))}

                    {/* Add VVB button if already has one but wants another */}
                    {p.vvb_name && (
                      <button onClick={() => { setAssigningId(p.id); setAssignMsg(null) }}
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700">
                        <Plus className="w-3.5 h-3.5" /> Soumettre à un autre VVB
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
