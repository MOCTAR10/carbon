'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ArrowDownToLine, CheckCircle, AlertCircle, Clock,
  X, MessageSquare, RefreshCw, Wallet, Filter
} from 'lucide-react'

interface Withdrawal {
  id: number
  partner_id: number
  partner_name: string
  amount_fcfa: number
  method: string
  recipient_info: string | null
  status: string
  admin_note: string | null
  processed_at: string | null
  created_at: string
}

const STATUS_CFG: Record<string, { label: string; cls: string; dot: string }> = {
  pending:  { label: 'En attente', cls: 'bg-amber-900/30 border-amber-800 text-amber-300',   dot: 'bg-amber-500' },
  approved: { label: 'Approuvé',   cls: 'bg-blue-900/30 border-blue-800 text-blue-300',      dot: 'bg-blue-500' },
  paid:     { label: 'Payé',       cls: 'bg-emerald-900/30 border-emerald-800 text-emerald-300', dot: 'bg-emerald-500' },
  rejected: { label: 'Refusé',     cls: 'bg-red-900/30 border-red-800 text-red-300',         dot: 'bg-red-500' },
}

const METHOD_LABELS: Record<string, string> = {
  mobile_money:  'Mobile Money',
  bank_transfer: 'Virement Bancaire',
  check:         'Chèque',
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString('fr-FR')
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('pending')
  const [actionId, setActionId] = useState<number | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/partner/withdrawals')
      const data = await res.json()
      setWithdrawals(data.withdrawals || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAction = async (id: number, status: 'approved' | 'paid' | 'rejected') => {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/partner/withdrawals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_note: adminNote || null })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      const labels: Record<string, string> = { approved: 'approuvé', paid: 'marqué comme payé', rejected: 'refusé' }
      setMsg({ type: 'ok', text: `Retrait ${labels[status]}` })
      setActionId(null)
      setAdminNote('')
      load()
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  const filtered = filterStatus === 'all' ? withdrawals : withdrawals.filter(w => w.status === filterStatus)

  const counts = {
    pending:  withdrawals.filter(w => w.status === 'pending').length,
    approved: withdrawals.filter(w => w.status === 'approved').length,
    paid:     withdrawals.filter(w => w.status === 'paid').length,
    rejected: withdrawals.filter(w => w.status === 'rejected').length,
  }

  const totalPending = withdrawals.filter(w => w.status === 'pending').reduce((s, w) => s + w.amount_fcfa, 0)
  const totalPaid    = withdrawals.filter(w => w.status === 'paid').reduce((s, w) => s + w.amount_fcfa, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ArrowDownToLine className="w-7 h-7 text-emerald-400" />
            Demandes de Retrait
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Approuvez et traitez les retraits de fonds demandés par les ONG partenaires
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 hover:text-white rounded-xl text-sm transition-colors">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'En attente', value: counts.pending,  amount: totalPending, color: 'text-amber-400',   bg: 'bg-amber-500/10',   icon: Clock },
          { label: 'Approuvés', value: counts.approved,  amount: null,         color: 'text-blue-400',    bg: 'bg-blue-500/10',    icon: CheckCircle },
          { label: 'Payés',     value: counts.paid,      amount: totalPaid,    color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: Wallet },
          { label: 'Refusés',   value: counts.rejected,  amount: null,         color: 'text-red-400',     bg: 'bg-red-500/10',     icon: AlertCircle },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-2`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
            {s.amount !== null && s.amount > 0 && (
              <p className="text-xs text-gray-600 mt-0.5">{fmt(s.amount)} FCFA</p>
            )}
          </div>
        ))}
      </div>

      {/* Alert for pending */}
      {counts.pending > 0 && (
        <div className="flex items-center gap-3 bg-amber-900/20 border border-amber-800/50 rounded-xl px-4 py-3">
          <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <span className="text-amber-300 text-sm font-medium">
            {counts.pending} demande{counts.pending > 1 ? 's' : ''} en attente — {fmt(totalPending)} FCFA à traiter
          </span>
        </div>
      )}

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

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap items-center">
        <Filter className="w-4 h-4 text-gray-500" />
        {[
          { key: 'all',      label: 'Tous' },
          { key: 'pending',  label: `En attente (${counts.pending})` },
          { key: 'approved', label: `Approuvés (${counts.approved})` },
          { key: 'paid',     label: `Payés (${counts.paid})` },
          { key: 'rejected', label: `Refusés (${counts.rejected})` },
        ].map(f => (
          <button key={f.key} onClick={() => setFilterStatus(f.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${filterStatus === f.key ? 'bg-gray-700 text-white' : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Withdrawals list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl h-20 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-2xl">
          <ArrowDownToLine className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">Aucune demande de retrait</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(w => {
            const sc = STATUS_CFG[w.status] || STATUS_CFG.pending
            const isActing = actionId === w.id

            return (
              <div key={w.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="p-5 flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ArrowDownToLine className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold">{w.partner_name}</span>
                      <span className={`text-xs border px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                      <span>{METHOD_LABELS[w.method] || w.method}</span>
                      {w.recipient_info && <><span>·</span><span className="font-mono">{w.recipient_info}</span></>}
                      <span>·</span>
                      <span>{new Date(w.created_at).toLocaleDateString('fr-FR')}</span>
                      {w.processed_at && <><span>·</span><span>Traité le {new Date(w.processed_at).toLocaleDateString('fr-FR')}</span></>}
                    </div>
                    {w.admin_note && <p className="text-xs text-gray-400 mt-1">Note: {w.admin_note}</p>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-white font-black text-lg">{fmt(w.amount_fcfa)}</p>
                      <p className="text-gray-500 text-xs">FCFA</p>
                    </div>
                    {(w.status === 'pending' || w.status === 'approved') && (
                      <button onClick={() => { setActionId(isActing ? null : w.id); setAdminNote('') }}
                        className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-gray-800 rounded-lg transition-colors">
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Action panel */}
                {isActing && (
                  <div className="border-t border-gray-800 bg-gray-950/60 p-4 space-y-3">
                    <p className="text-sm font-medium text-gray-300">Traitement du retrait</p>
                    <textarea
                      value={adminNote}
                      onChange={e => setAdminNote(e.target.value)}
                      rows={2}
                      placeholder="Note interne ou message pour le partenaire (optionnel)"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
                    />
                    <div className="flex gap-2 flex-wrap">
                      {w.status === 'pending' && (
                        <button onClick={() => handleAction(w.id, 'approved')} disabled={saving}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                          <CheckCircle className="w-4 h-4" /> Approuver
                        </button>
                      )}
                      {(w.status === 'pending' || w.status === 'approved') && (
                        <button onClick={() => handleAction(w.id, 'paid')} disabled={saving}
                          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                          <Wallet className="w-4 h-4" /> Marquer comme Payé
                        </button>
                      )}
                      <button onClick={() => handleAction(w.id, 'rejected')} disabled={saving}
                        className="flex items-center gap-2 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                        <X className="w-4 h-4" /> Refuser
                      </button>
                      <button onClick={() => setActionId(null)} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
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
