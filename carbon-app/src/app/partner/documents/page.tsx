'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileText, Upload, CheckCircle, AlertCircle, Clock, X,
  Download, Plus, Eye, Trash2, FolderOpen
} from 'lucide-react'

interface Doc {
  id: number
  partner_id: number
  project_id: number | null
  project_title: string | null
  category: string
  title: string
  description: string | null
  file_url: string
  file_name: string | null
  file_size_kb: number | null
  mime_type: string | null
  status: string
  admin_note: string | null
  created_at: string
}

const CATEGORIES = [
  { value: 'permit', label: 'Permis & Autorisations', icon: '📋' },
  { value: 'report', label: 'Rapport de Terrain', icon: '📊' },
  { value: 'photo', label: 'Photos & Médias', icon: '📷' },
  { value: 'certification', label: 'Certificat & Audit', icon: '🏅' },
  { value: 'legal', label: 'Documents Légaux', icon: '⚖️' },
  { value: 'financial', label: 'Documents Financiers', icon: '💰' },
  { value: 'other', label: 'Autre', icon: '📎' },
]

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; cls: string }> = {
  pending:  { label: 'En attente', icon: Clock,         cls: 'bg-amber-900/30 border-amber-800 text-amber-300' },
  approved: { label: 'Approuvé',   icon: CheckCircle,   cls: 'bg-emerald-900/30 border-emerald-800 text-emerald-300' },
  rejected: { label: 'Refusé',     icon: AlertCircle,   cls: 'bg-red-900/30 border-red-800 text-red-300' },
}

function formatSize(kb: number | null) {
  if (!kb) return ''
  if (kb < 1024) return `${kb} Ko`
  return `${(kb / 1024).toFixed(1)} Mo`
}

function catLabel(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.label || cat
}
function catIcon(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.icon || '📎'
}

export default function PartnerDocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCat, setFilterCat] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: 'report', file_url: '', file_name: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const loadDocs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/partner/documents')
      const data = await res.json()
      setDocs(data.documents || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDocs() }, [loadDocs])

  const handleSubmit = async () => {
    if (!form.title || !form.file_url) {
      setMsg({ type: 'err', text: 'Titre et URL du fichier requis' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/partner/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setMsg({ type: 'ok', text: 'Document soumis, en attente de validation' })
      setShowForm(false)
      setForm({ title: '', description: '', category: 'report', file_url: '', file_name: '' })
      loadDocs()
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  const filtered = docs.filter(d => {
    if (filterCat !== 'all' && d.category !== filterCat) return false
    if (filterStatus !== 'all' && d.status !== filterStatus) return false
    return true
  })

  const counts = { pending: docs.filter(d => d.status === 'pending').length, approved: docs.filter(d => d.status === 'approved').length, rejected: docs.filter(d => d.status === 'rejected').length }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FolderOpen className="w-7 h-7 text-emerald-400" />
            Documents
          </h1>
          <p className="text-gray-400 text-sm mt-1">Soumettez vos permis, rapports, photos et certifications pour validation</p>
        </div>
        <button onClick={() => { setShowForm(true); setMsg(null) }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> Ajouter un document
        </button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
              filterStatus === key ? cfg.cls : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
            }`}>
            <cfg.icon className="w-5 h-5 flex-shrink-0" />
            <div className="text-left">
              <div className="text-xl font-bold">{counts[key as keyof typeof counts]}</div>
              <div className="text-xs opacity-80">{cfg.label}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Flash */}
      {msg && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
          msg.type === 'ok' ? 'bg-emerald-900/30 border-emerald-800 text-emerald-300' : 'bg-red-900/30 border-red-800 text-red-300'
        }`}>
          {msg.type === 'ok' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm">{msg.text}</span>
          <button onClick={() => setMsg(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Soumettre un document</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-300"><X className="w-5 h-5" /></button>
          </div>
          <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-3 text-sm text-blue-300">
            <strong>Note:</strong> Hébergez d&apos;abord votre fichier sur un service (Google Drive, Dropbox, etc.) et collez l&apos;URL ci-dessous. L&apos;équipe CarbonTrack validera le document sous 48h.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Titre du document *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                placeholder="Rapport MRV Q1 2025" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Catégorie *</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">URL du fichier *</label>
              <input value={form.file_url} onChange={e => setForm(p => ({ ...p, file_url: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                placeholder="https://drive.google.com/file/d/..." />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Description (optionnel)</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
                placeholder="Contexte, période couverte, note pour le validateur..." />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={saving}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
              <Upload className="w-4 h-4" />
              {saving ? 'Envoi...' : 'Soumettre'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCat('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${filterCat === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
          Tous
        </button>
        {CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setFilterCat(filterCat === c.value ? 'all' : c.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${filterCat === c.value ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Docs list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 h-20 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-2xl">
          <div className="w-14 h-14 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-gray-600" />
          </div>
          <h3 className="text-white font-semibold mb-1">Aucun document</h3>
          <p className="text-gray-500 text-sm">Soumettez vos permis, rapports et certifications pour validation</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(doc => {
            const sc = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending
            return (
              <div key={doc.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
                  {catIcon(doc.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium">{doc.title}</span>
                    <span className={`text-xs border px-2 py-0.5 rounded-full flex items-center gap-1 ${sc.cls}`}>
                      <sc.icon className="w-3 h-3" />{sc.label}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3 flex-wrap">
                    <span>{catLabel(doc.category)}</span>
                    {doc.project_title && <span>· {doc.project_title}</span>}
                    {doc.file_size_kb && <span>· {formatSize(doc.file_size_kb)}</span>}
                    <span>· {new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                  {doc.description && <p className="text-sm text-gray-400 mt-1">{doc.description}</p>}
                  {doc.admin_note && (
                    <div className={`mt-2 text-xs px-3 py-2 rounded-lg border ${doc.status === 'rejected' ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-blue-900/20 border-blue-800 text-blue-300'}`}>
                      <strong>Note admin:</strong> {doc.admin_note}
                    </div>
                  )}
                </div>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Ouvrir">
                  <Eye className="w-4 h-4" />
                </a>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
