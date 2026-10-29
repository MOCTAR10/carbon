'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart3, Wallet, Leaf, ArrowDownToLine, CheckCircle,
  AlertCircle, Clock, X, TrendingUp, Plus, Minus
} from 'lucide-react'

interface Transaction {
  id: number
  projectTitle: string
  tonsPurchased: number
  amountPaid: number
  partnerCredited: number
  status: string
  createdAt: string
}

interface Withdrawal {
  id: number
  amount_fcfa: number
  method: string
  status: string
  admin_note: string | null
  created_at: string
  processed_at: string | null
}

interface SalesData {
  partner: {
    id: number
    name: string
    walletBalance: number
  } | null
  stats: {
    totalTonsSold: number
    totalEarned: number
    totalTransactions: number
  }
  recentTransactions: Transaction[]
}

const STATUS_TX: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Complété',  cls: 'text-emerald-400' },
  pending:   { label: 'En cours',  cls: 'text-amber-400' },
  cancelled: { label: 'Annulé',    cls: 'text-red-400' },
}

const STATUS_W: Record<string, { label: string; icon: typeof Clock; cls: string }> = {
  pending:  { label: 'En attente', icon: Clock,       cls: 'bg-amber-900/30 border-amber-800 text-amber-300' },
  approved: { label: 'Approuvé',   icon: CheckCircle, cls: 'bg-blue-900/30 border-blue-800 text-blue-300' },
  paid:     { label: 'Payé',       icon: CheckCircle, cls: 'bg-emerald-900/30 border-emerald-800 text-emerald-300' },
  rejected: { label: 'Refusé',     icon: AlertCircle, cls: 'bg-red-900/30 border-red-800 text-red-300' },
}

const METHODS = [
  { value: 'mobile_money', label: 'Mobile Money (MTN, Airtel)' },
  { value: 'bank_transfer', label: 'Virement Bancaire' },
  { value: 'check', label: 'Chèque' },
]

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString('fr-FR')
}

export default function PartnerSalesPage() {
  const [data, setData] = useState<SalesData | null>(null)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'transactions' | 'withdrawals'>('transactions')
  const [showWForm, setShowWForm] = useState(false)
  const [wAmount, setWAmount] = useState('')
  const [wMethod, setWMethod] = useState('mobile_money')
  const [wRecipient, setWRecipient] = useState('')
  const [wSaving, setWSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [meRes, wRes] = await Promise.all([
        fetch('/api/auth/partner-me'),
        fetch('/api/partner/withdrawals')
      ])
      const [me, wData] = await Promise.all([meRes.json(), wRes.json()])
      setData(me)
      setWithdrawals(wData.withdrawals || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleWithdrawal = async () => {
    const amount = parseInt(wAmount)
    if (!amount || amount < 1000) {
      setMsg({ type: 'err', text: 'Montant minimum: 1 000 FCFA' })
      return
    }
    setWSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/partner/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_fcfa: amount, method: wMethod, recipient_info: wRecipient })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Erreur')
      setMsg({ type: 'ok', text: 'Demande de retrait soumise, traitement sous 48h' })
      setShowWForm(false)
      setWAmount('')
      setWRecipient('')
      loadData()
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setWSaving(false)
    }
  }

  const balance = data?.partner?.walletBalance || 0
  const hasPending = withdrawals.some(w => w.status === 'pending')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-emerald-400" />
            Mes Ventes &amp; Revenus
          </h1>
          <p className="text-gray-400 text-sm mt-1">Suivi des transactions et gestion des retraits</p>
        </div>
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

      {/* KPI strip */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl h-24 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-3">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-white">{fmt(balance)} <span className="text-sm text-gray-500">FCFA</span></p>
            <p className="text-xs text-gray-500 mt-1">Solde disponible</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center mb-3">
              <Leaf className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-2xl font-black text-white">{data?.stats.totalTonsSold.toLocaleString('fr-FR') || 0} <span className="text-sm text-gray-500">tCO₂</span></p>
            <p className="text-xs text-gray-500 mt-1">Tonnes vendues</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="w-9 h-9 bg-purple-500/10 rounded-xl flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-2xl font-black text-white">{fmt(data?.stats.totalEarned || 0)} <span className="text-sm text-gray-500">FCFA</span></p>
            <p className="text-xs text-gray-500 mt-1">Revenus totaux ({data?.stats.totalTransactions || 0} ventes)</p>
          </div>
        </div>
      )}

      {/* Wallet action */}
      {!loading && (
        <div className="bg-gradient-to-r from-emerald-950/50 to-green-950/50 border border-emerald-800/50 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-white font-bold">Solde disponible: <span className="text-emerald-400">{fmt(balance)} FCFA</span></p>
            <p className="text-gray-400 text-sm mt-0.5">Demandez un retrait vers votre compte Mobile Money ou bancaire</p>
            {hasPending && <p className="text-amber-400 text-xs mt-1">⚠ Une demande de retrait est en cours de traitement</p>}
          </div>
          <button
            onClick={() => { setShowWForm(true); setMsg(null) }}
            disabled={balance < 1000 || hasPending}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors flex-shrink-0"
          >
            <ArrowDownToLine className="w-4 h-4" /> Retirer des fonds
          </button>
        </div>
      )}

      {/* Withdrawal form */}
      {showWForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Demande de retrait</h2>
            <button onClick={() => setShowWForm(false)} className="text-gray-500 hover:text-gray-300"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Montant (FCFA) *</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setWAmount(a => Math.max(1000, parseInt(a || '0') - 1000).toString())}
                  className="w-9 h-9 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors flex-shrink-0">
                  <Minus className="w-4 h-4" />
                </button>
                <input value={wAmount} onChange={e => setWAmount(e.target.value)} type="number" min="1000" step="1000"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm text-center focus:outline-none focus:border-emerald-500"
                  placeholder="50000" />
                <button onClick={() => setWAmount(a => (parseInt(a || '0') + 1000).toString())}
                  className="w-9 h-9 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors flex-shrink-0">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Solde: {fmt(balance)} FCFA</p>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Méthode de paiement</label>
              <select value={wMethod} onChange={e => setWMethod(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
                {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">
                {wMethod === 'mobile_money' ? 'Numéro Mobile Money' : wMethod === 'bank_transfer' ? 'IBAN / Numéro de compte' : 'Destinataire du chèque'}
              </label>
              <input value={wRecipient} onChange={e => setWRecipient(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                placeholder={wMethod === 'mobile_money' ? '+241 XX XX XX XX' : ''} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleWithdrawal} disabled={wSaving}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
              <ArrowDownToLine className="w-4 h-4" />
              {wSaving ? 'Envoi...' : 'Demander le retrait'}
            </button>
            <button onClick={() => setShowWForm(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {[
          { key: 'transactions', label: 'Transactions' },
          { key: 'withdrawals', label: `Retraits${withdrawals.length > 0 ? ` (${withdrawals.length})` : ''}` },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as typeof activeTab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t.key ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Transactions list */}
      {activeTab === 'transactions' && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-800 rounded-xl animate-pulse" />)}
            </div>
          ) : !data?.recentTransactions.length ? (
            <div className="text-center py-14">
              <BarChart3 className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Aucune transaction encore</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {data.recentTransactions.map(tx => {
                const st = STATUS_TX[tx.status] || STATUS_TX.completed
                return (
                  <div key={tx.id} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-800/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Leaf className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{tx.projectTitle}</p>
                        <p className="text-gray-500 text-xs">
                          {new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          &nbsp;· <span className={st.cls}>{st.label}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-emerald-400 font-bold text-sm">{tx.tonsPurchased.toFixed(2)} tCO₂</p>
                      <p className="text-gray-400 text-xs">+{fmt(tx.partnerCredited)} FCFA</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Withdrawals list */}
      {activeTab === 'withdrawals' && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {withdrawals.length === 0 ? (
            <div className="text-center py-14">
              <ArrowDownToLine className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Aucune demande de retrait</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {withdrawals.map(w => {
                const sc = STATUS_W[w.status] || STATUS_W.pending
                return (
                  <div key={w.id} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-800/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
                        <ArrowDownToLine className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium">
                          {METHODS.find(m => m.value === w.method)?.label || w.method}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {new Date(w.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {w.processed_at && ` · Traité le ${new Date(w.processed_at).toLocaleDateString('fr-FR')}`}
                        </p>
                        {w.admin_note && <p className="text-xs text-amber-400 mt-0.5">{w.admin_note}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-white font-bold text-sm">{w.amount_fcfa.toLocaleString('fr-FR')} FCFA</p>
                      </div>
                      <span className={`text-xs border px-2 py-1 rounded-full flex items-center gap-1 ${sc.cls}`}>
                        <sc.icon className="w-3 h-3" />{sc.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
