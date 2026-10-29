'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FolderOpen, CheckCircle, AlertCircle, Clock, Eye,
  X, MessageSquare, Filter, RefreshCw
} from 'lucide-react'

interface Doc {
  id: number
  partner_id: number
  partner_name: string
  project_id: number | null
  project_title: string | null
  category: string
  title: string
  description: string | null
  file_url: string
  file_name: string | null
  file_size_kb: number | null
  status: string
  admin_note: string | null
  reviewed_at: string | null
  created_at: string
}

const CATEGORIES: Record<string, { label: string; icon: string }> = {
  permit:        { label: 'Permis', icon: '📋' },
  report:        { label: 'Rapport', icon: '📊' },
  photo:         { label: 'Photo', icon: '📷' },
  certification: { label: 'Certification', icon: '🏅' },
  legal:         { label: 'Légal', icon: '⚖️' },
  financial:     { label: 'Financier', icon: '💰' },
  other:         { label: 'Autre', icon: '📎' },
}

const STATUS_CFG: Record<string, { label: string; cls: string; dot: string }> = {
  pending:  { label: 'En attente', cls: 'bg-amber-900/30 border-amber-800 text-amber-300',   dot: 'bg-amber-500' },
  approved: { label: 'Approuvé',   cls: 'bg-emerald-900/30 border-emerald-800 text-emerald-300', dot: 'bg-emerald-500' },
  rejected: { label: 'Refusé',     cls: 'bg-red-900/30 border-red-800 text-red-300',         dot: 'bg-red-500' },
}

export default function AdminDocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCat, setFilterCat] = useState('all')
  const [reviewId, setReviewId] = useState<number | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/partner/documents')
      const data = await res.json()
      setDocs(data.documents || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleReview = async (docId: number, status: 'approved' | 'rejected') => {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/partner/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_note: reviewNote || null })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setMsg({ type: 'ok', text: `Document ${status === 'approved' ? 'approuvé' : 'refusé'}` })
      setReviewId(null)
      setReviewNote('')
      load()
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  const filtered = docs.filter(d => {
    if (filterStatus !== 'all' && d.status !== filterStatus) return false
    if (filterCat !== 'all' && d.category !== filterCat) return false
    return true
  })

  const counts = {
    pending: docs.filter(d => d.status === 'pending').length,
    approved: docs.filter(d => d.status === 'approved').length,
    rejected: docs.filter(d => d.status === 'rejected').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FolderOpen className="w-7 h-7 text-emerald-400" />
            Documents Partenaires
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Validez les permis, rapports, certifications et photos soumis par les ONG
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 hover:text-white rounded-xl text-sm transition-colors">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* Status KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: 'pending',  icon: Clock,         label: 'En attente', color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { key: 'approved', icon: CheckCircle,    label: 'Approuvés',  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { key: 'rejected', icon: AlertCircle,    label: 'Refusés',    color: 'text-red-400', bg: 'bg-red-500/10' },
        ].map(s => (
          <button key={s.key} onClick={() => setFilterStatus(filterStatus === s.key ? 'all' : s.key)}
            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
              filterStatus === s.key ? 'bg-gray-800 border-gray-600' : 'bg-gray-900 border-gray-800 hover:border-gray-700'
            }`}>
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div className="text-left">
              <p className={`text-2xl font-black ${s.color}`}>{counts[s.key as keyof typeof counts]}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
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

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <Filter className="w-4 h-4 text-gray-500" />
        <button onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${filterStatus === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'}`}>
          Tous statuts
        </button>
        {Object.entries(STATUS_CFG).map(([k, v]) => (
          <button key={k} onClick={() => setFilterStatus(filterStatus === k ? 'all' : k)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${filterStatus === k ? 'bg-gray-700 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />{v.label}
          </button>
        ))}
        <span className="text-gray-700">|</span>
        <button onClick={() => setFilterCat('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${filterCat === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'}`}>
          Toutes catégories
        </button>
        {Object.entries(CATEGORIES).map(([k, v]) => (
          <button key={k} onClick={() => setFilterCat(filterCat === k ? 'all' : k)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${filterCat === k ? 'bg-gray-700 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'}`}>
            {v.icon} {v.label}
          </button>
        ))}
      </div>

      {/* Documents list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl h-20 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-2xl">
          <FolderOpen className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">Aucun document</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(doc => {
            const sc = STATUS_CFG[doc.status] || STATUS_CFG.pending
            const cat = CATEGORIES[doc.category] || { label: doc.category, icon: '📎' }
            const isReviewing = reviewId === doc.id

            return (
              <div key={doc.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="p-4 flex items-start gap-4">
                  {/* Category icon */}
                  <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
                    {cat.icon}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold">{doc.title}</span>
                      <span className={`text-xs border px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                      <span className="font-medium text-gray-400">{doc.partner_name}</span>
                      <span>·</span>
                      <span>{cat.icon} {cat.label}</span>
                      {doc.project_title && <><span>·</span><span>{doc.project_title}</span></>}
                      <span>·</span>
                      <span>{new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {doc.description && <p className="text-sm text-gray-400 mt-1">{doc.description}</p>}
                    {doc.admin_note && (
                      <p className={`text-xs mt-1 ${doc.status === 'rejected' ? 'text-red-400' : 'text-blue-400'}`}>
                        Note: {doc.admin_note}
                      </p>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Ouvrir le fichier">
                      <Eye className="w-4 h-4" />
                    </a>
                    {doc.status === 'pending' && (
                      <button onClick={() => { setReviewId(isReviewing ? null : doc.id); setReviewNote('') }}
                        className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-gray-800 rounded-lg transition-colors" title="Évaluer">
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Review panel */}
                {isReviewing && (
                  <div className="border-t border-gray-800 bg-gray-950/60 p-4 space-y-3">
                    <p className="text-sm font-medium text-gray-300">Évaluation du document</p>
                    <textarea
                      value={reviewNote}
                      onChange={e => setReviewNote(e.target.value)}
                      rows={2}
                      placeholder="Note optionnelle pour le partenaire (motif de refus, commentaire...)"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleReview(doc.id, 'approved')} disabled={saving}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                        <CheckCircle className="w-4 h-4" /> Approuver
                      </button>
                      <button onClick={() => handleReview(doc.id, 'rejected')} disabled={saving}
                        className="flex items-center gap-2 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                        <X className="w-4 h-4" /> Refuser
                      </button>
                      <button onClick={() => setReviewId(null)} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                        Annuler
                      </button>
                    </div>
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
