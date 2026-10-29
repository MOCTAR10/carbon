'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck, ShieldOff, RefreshCw, Building2, Coins,
  ArrowRightLeft, FileText, BookOpen, ChevronDown, ChevronUp,
  Plus, X, CheckCircle, AlertCircle, ExternalLink, Loader2,
  Save, Eye, EyeOff
} from 'lucide-react'

// ── Types matching Puro.earth API ───────────────────────────────────────────
interface PuroAccount {
  accountNumber: string
  accountName: string
  accountHolderId?: string
  status?: string
}

interface PuroCertBundle {
  certificateType?: string
  quantity: number
  vintage?: number
  methodology?: string
  productionFacilityCode?: string
  labels?: string[]
}

interface PuroFacility {
  productionFacilityCode: string
  name: string
  country?: string
  status?: string
  methodology?: { methodologyCode: string; name: string }
  geographicalLocation?: { latitude: number; longitude: number }
  address?: { city: string; countryCode: string }
}

interface PuroTransaction {
  transactionId: string
  transactionType: string
  transactionState: string
  quantity: number
  createdAt?: string
  certificateBundles?: PuroCertBundle[]
  label?: string
}

interface PuroMethodology {
  methodologyCode: string
  name: string
  description?: string
  url?: string
}

interface PartnerConfig {
  puroConnected: boolean
  puroAccountNumber: string | null
  puroFacilityCode: string | null
  puroKeyConfigured: boolean
  id: number
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function statusColor(state: string) {
  switch (state?.toUpperCase()) {
    case 'SUCCESS': case 'APPROVED': return 'text-emerald-400 bg-emerald-900/40 border-emerald-800'
    case 'PENDING_APPROVAL': case 'CREATED': return 'text-amber-400 bg-amber-900/40 border-amber-800'
    case 'FAILED': case 'REJECTED': return 'text-red-400 bg-red-900/40 border-red-800'
    default: return 'text-gray-400 bg-gray-800 border-gray-700'
  }
}

function txTypeLabel(type: string) {
  const labels: Record<string, string> = {
    Issuance: 'Issuance', Transfer: 'Transfert', InternalTransfer: 'Transfert Interne',
    Retirement: 'Retrait', Expiry: 'Expiration', Withdraw: 'Retrait',
  }
  return labels[type] || type
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function PuroDashboard() {
  // Config state
  const [partner, setPartner] = useState<PartnerConfig | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [facilityCode, setFacilityCode] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Puro data state
  const [accounts, setAccounts] = useState<PuroAccount[]>([])
  const [balance, setBalance] = useState<PuroCertBundle[]>([])
  const [facilities, setFacilities] = useState<PuroFacility[]>([])
  const [transactions, setTransactions] = useState<PuroTransaction[]>([])
  const [methodologies, setMethodologies] = useState<PuroMethodology[]>([])
  const [activeTab, setActiveTab] = useState<'balance' | 'facilities' | 'transactions' | 'methodologies'>('balance')

  // Loading / error per section
  const [fetching, setFetching] = useState(false)
  const [puroError, setPuroError] = useState<string | null>(null)

  // Retirement modal
  const [retireOpen, setRetireOpen] = useState(false)
  const [retireAccount, setRetireAccount] = useState('')
  const [retireQty, setRetireQty] = useState(1)
  const [retireReason, setRetireReason] = useState('')
  const [retireLoading, setRetireLoading] = useState(false)
  const [retireResult, setRetireResult] = useState<{ ok: boolean; msg: string } | null>(null)

  // ── Load partner config ───────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/auth/partner-me')
      .then(r => r.json())
      .then(d => {
        if (d.partner) {
          setPartner(d.partner)
          setAccountNumber(d.partner.puroAccountNumber || '')
          setFacilityCode(d.partner.puroFacilityCode || '')
          if (!d.partner.puroConnected) setConfigOpen(true)
        }
      })
  }, [])

  // ── Fetch Puro data ───────────────────────────────────────────────────────
  const loadPuroData = useCallback(async () => {
    if (!partner?.puroKeyConfigured) return
    setFetching(true)
    setPuroError(null)
    try {
      const [accsRes, facRes, txRes, methRes] = await Promise.allSettled([
        fetch('/api/puro/accounts').then(r => r.json()),
        fetch('/api/puro/production-facilities').then(r => r.json()),
        fetch('/api/puro/transactions?limit=20').then(r => r.json()),
        fetch('/api/puro/methodologies').then(r => r.json()),
      ])

      const accs: PuroAccount[] = accsRes.status === 'fulfilled' ? (accsRes.value.items || []) : []
      setAccounts(accs)

      if (accsRes.status === 'fulfilled') {
        // Fetch balance for first account (or configured account)
        const acct = accountNumber || accs[0]?.accountNumber
        if (acct) {
          const balRes = await fetch(`/api/puro/accounts/${acct}/balance`).then(r => r.json()).catch(() => null)
          setBalance(balRes?.items || [])
        }
      }

      setFacilities(facRes.status === 'fulfilled' ? (facRes.value.items || []) : [])
      setTransactions(txRes.status === 'fulfilled' ? (txRes.value.items || []) : [])
      setMethodologies(methRes.status === 'fulfilled' ? (methRes.value.items || []) : [])
    } catch (err) {
      setPuroError('Erreur lors de la connexion à Puro.earth UAT')
    } finally {
      setFetching(false)
    }
  }, [partner?.puroKeyConfigured, accountNumber])

  useEffect(() => {
    if (partner?.puroKeyConfigured) loadPuroData()
  }, [partner?.puroKeyConfigured, loadPuroData])

  // ── Save Puro credentials ─────────────────────────────────────────────────
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!partner) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch(`/api/partners/${partner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puro_api_key: apiKey || undefined,
          puro_api_secret: apiSecret || undefined,
          puro_account_number: accountNumber || undefined,
          puro_facility_code: facilityCode || undefined,
        }),
      })
      if (res.ok) {
        setSaveMsg({ type: 'ok', text: 'Configuration Puro.earth enregistrée !' })
        setPartner(prev => prev ? { ...prev, puroConnected: !!(apiKey && apiSecret), puroKeyConfigured: !!(apiKey && apiSecret), puroAccountNumber: accountNumber || prev.puroAccountNumber } : prev)
        setConfigOpen(false)
        setApiKey('')
        setApiSecret('')
        setTimeout(() => window.location.reload(), 1000)
      } else {
        setSaveMsg({ type: 'err', text: 'Erreur lors de l\'enregistrement.' })
      }
    } catch {
      setSaveMsg({ type: 'err', text: 'Erreur réseau.' })
    } finally {
      setSaving(false)
    }
  }

  // ── Submit retirement ─────────────────────────────────────────────────────
  const handleRetirement = async (e: React.FormEvent) => {
    e.preventDefault()
    setRetireLoading(true)
    setRetireResult(null)
    try {
      const acct = retireAccount || accountNumber || accounts[0]?.accountNumber
      if (!acct) throw new Error('Aucun compte sélectionné')

      const res = await fetch('/api/puro/transactions/retirement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNumber: acct,
          quantity: retireQty,
          retirementReason: retireReason || 'Voluntary retirement via CarbonTrack',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setRetireResult({ ok: true, msg: `Retrait soumis ! ID: ${data.transactionId || 'en cours'}` })
        setTimeout(() => { setRetireOpen(false); setRetireResult(null); loadPuroData() }, 3000)
      } else {
        setRetireResult({ ok: false, msg: data.message || data.error || 'Erreur Puro.earth' })
      }
    } catch (err: any) {
      setRetireResult({ ok: false, msg: err.message || 'Erreur réseau' })
    } finally {
      setRetireLoading(false)
    }
  }

  const totalCORCs = balance.reduce((s, b) => s + (b.quantity || 0), 0)
  const connectedAccount = accountNumber || accounts[0]?.accountNumber || ''

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full overflow-x-hidden space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-emerald-500" />
            Puro.earth — Retrait Carbone
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            CORCs (Carbon Removal Certificates) · UAT Sandbox · <span className="text-gray-500">mypuro.api.purouat.com</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {partner?.puroKeyConfigured && (
            <button
              onClick={loadPuroData}
              disabled={fetching}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          )}
          <button
            onClick={() => setConfigOpen(!configOpen)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
          >
            {partner?.puroKeyConfigured ? <><ShieldCheck className="w-4 h-4" /> Reconfigurer</> : <><Plus className="w-4 h-4" /> Connecter Puro.earth</>}
          </button>
        </div>
      </div>

      {/* Config form */}
      {configOpen && (
        <div className="bg-gray-900 border border-emerald-700/50 rounded-3xl p-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-white">Identifiants API Puro.earth (UAT)</h2>
              <p className="text-gray-500 text-xs mt-0.5">Vos clés sont chiffrées en base de données. Jamais exposées côté client.</p>
            </div>
            <button onClick={() => setConfigOpen(false)} className="text-gray-500 hover:text-white p-1"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">API Key</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={partner?.puroKeyConfigured ? '••••••• (laisser vide pour conserver)' : 'Votre API Key Puro.earth'}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 text-white rounded-xl text-sm outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">API Secret</label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={apiSecret}
                    onChange={e => setApiSecret(e.target.value)}
                    placeholder={partner?.puroKeyConfigured ? '••••••• (laisser vide pour conserver)' : 'Votre API Secret'}
                    className="w-full px-4 py-2.5 pr-10 bg-gray-800 border border-gray-700 text-white rounded-xl text-sm outline-none focus:border-emerald-500 font-mono"
                  />
                  <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Numéro de Compte (Account Number)</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  placeholder="Ex: ACC-12345"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 text-white rounded-xl text-sm outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Code Facility (optionnel)</label>
                <input
                  type="text"
                  value={facilityCode}
                  onChange={e => setFacilityCode(e.target.value)}
                  placeholder="Ex: FAC-67890"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 text-white rounded-xl text-sm outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
            {saveMsg && (
              <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl border ${saveMsg.type === 'ok' ? 'text-emerald-400 bg-emerald-900/30 border-emerald-800' : 'text-red-400 bg-red-900/30 border-red-800'}`}>
                {saveMsg.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {saveMsg.text}
              </div>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</> : <><Save className="w-4 h-4" /> Enregistrer la configuration Puro.earth</>}
            </button>
          </form>
        </div>
      )}

      {/* Not configured — placeholder */}
      {!partner?.puroKeyConfigured && !configOpen && (
        <div className="bg-gray-900 border border-dashed border-gray-700 rounded-3xl p-16 text-center">
          <ShieldOff className="w-14 h-14 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 font-bold text-base mb-1">Aucun compte Puro.earth configuré</p>
          <p className="text-gray-600 text-sm max-w-md mx-auto">
            Cliquez sur &ldquo;Connecter Puro.earth&rdquo; et entrez vos identifiants API (fournis par Puro.earth lors de votre inscription au programme UAT/Sandbox).
          </p>
          <button onClick={() => setConfigOpen(true)} className="mt-6 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Connecter maintenant
          </button>
        </div>
      )}

      {/* Puro data — shown when connected */}
      {partner?.puroKeyConfigured && (
        <>
          {/* Overview KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'CORCs Disponibles', value: totalCORCs.toLocaleString('fr-FR'), icon: Coins, color: 'emerald', sub: 'Certificats en portefeuille' },
              { label: 'Facilities', value: facilities.length, icon: Building2, color: 'blue', sub: 'Sites de production enregistrés' },
              { label: 'Transactions', value: transactions.length, icon: ArrowRightLeft, color: 'purple', sub: '20 dernières via Puro.earth' },
              { label: 'Méthodologies', value: methodologies.length, icon: BookOpen, color: 'amber', sub: 'Méthodes disponibles' },
            ].map(({ label, value, icon: Icon, color, sub }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-3xl p-5">
                <div className={`w-10 h-10 bg-${color}-500/10 rounded-2xl flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 text-${color}-500`} />
                </div>
                <p className="text-2xl font-black text-white">{fetching ? '...' : value}</p>
                <p className="text-xs font-bold text-gray-400 mt-1">{label}</p>
                <p className="text-xs text-gray-600 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Account info bar */}
          {accounts.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-widest">Puro.earth UAT Live</span>
              </div>
              {accounts.map(a => (
                <div key={a.accountNumber} className="flex items-center gap-2 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-lg">
                  <span className="text-gray-400 text-xs">Compte:</span>
                  <span className="text-white text-xs font-mono font-bold">{a.accountNumber}</span>
                  {a.accountName && <span className="text-gray-500 text-xs">· {a.accountName}</span>}
                </div>
              ))}
            </div>
          )}

          {puroError && (
            <div className="bg-red-900/30 border border-red-800 rounded-2xl p-4 flex items-center gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {puroError}
            </div>
          )}

          {/* Tabs */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-gray-800 overflow-x-auto">
              {[
                { key: 'balance', label: 'Solde CORCs', icon: Coins },
                { key: 'facilities', label: 'Facilities', icon: Building2 },
                { key: 'transactions', label: 'Transactions', icon: ArrowRightLeft },
                { key: 'methodologies', label: 'Méthodologies', icon: BookOpen },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 px-5 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Balance */}
            {activeTab === 'balance' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-base font-bold text-white">Certificats CORCs en Portefeuille</h3>
                    <p className="text-gray-500 text-xs mt-0.5">Compte: {connectedAccount || '—'}</p>
                  </div>
                  <button
                    onClick={() => setRetireOpen(true)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                  >
                    <ArrowRightLeft className="w-4 h-4" /> Soumettre un Retrait
                  </button>
                </div>
                {fetching ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
                ) : balance.length === 0 ? (
                  <div className="text-center py-12 text-gray-600">
                    <Coins className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aucun certificat CORC en portefeuille</p>
                    <p className="text-xs mt-1">Les CORCs apparaissent ici après issuance via Puro.earth</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {balance.map((b, i) => (
                      <div key={i} className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Coins className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-bold text-sm">{b.certificateType || 'CORC'}</p>
                            <div className="flex flex-wrap gap-x-3 mt-0.5">
                              {b.vintage && <span className="text-gray-500 text-xs">Millésime {b.vintage}</span>}
                              {b.methodology && <span className="text-gray-500 text-xs">· {b.methodology}</span>}
                              {b.productionFacilityCode && <span className="text-gray-500 text-xs">· Facility: {b.productionFacilityCode}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-2xl font-black text-emerald-400">{b.quantity.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">CORCs</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Facilities */}
            {activeTab === 'facilities' && (
              <div className="p-6">
                <h3 className="text-base font-bold text-white mb-5">Sites de Production Enregistrés</h3>
                {fetching ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
                ) : facilities.length === 0 ? (
                  <div className="text-center py-12 text-gray-600">
                    <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aucune facility enregistrée</p>
                    <p className="text-xs mt-1">Enregistrez vos sites via le portail Puro.earth</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {facilities.map((f) => (
                      <div key={f.productionFacilityCode} className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 min-w-0">
                            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Building2 className="w-5 h-5 text-blue-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-bold text-sm">{f.name}</p>
                              <p className="text-gray-500 text-xs mt-0.5 font-mono">{f.productionFacilityCode}</p>
                              {(f.address?.city || f.address?.countryCode) && (
                                <p className="text-gray-400 text-xs mt-1">{[f.address?.city, f.address?.countryCode].filter(Boolean).join(', ')}</p>
                              )}
                              {f.methodology?.name && (
                                <span className="inline-block mt-2 text-[10px] bg-blue-900/50 border border-blue-800 text-blue-400 px-2 py-0.5 rounded-full font-bold">
                                  {f.methodology.name}
                                </span>
                              )}
                            </div>
                          </div>
                          {f.status && (
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full border uppercase tracking-wide flex-shrink-0 ${statusColor(f.status)}`}>
                              {f.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Transactions */}
            {activeTab === 'transactions' && (
              <div>
                <div className="p-6 pb-0 flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">Historique des Transactions</h3>
                  <span className="text-gray-500 text-xs">{transactions.length} dernières transactions</span>
                </div>
                {fetching ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12 text-gray-600">
                    <ArrowRightLeft className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aucune transaction Puro.earth</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800 mt-4">
                    {transactions.map((tx) => (
                      <div key={tx.transactionId} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-800/30 transition-colors">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-8 h-8 bg-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <ArrowRightLeft className="w-4 h-4 text-purple-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium">{txTypeLabel(tx.transactionType)}</p>
                            <p className="text-gray-500 text-xs font-mono truncate">{tx.transactionId}</p>
                            {tx.createdAt && (
                              <p className="text-gray-600 text-xs">{new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full border uppercase tracking-wide ${statusColor(tx.transactionState)}`}>
                            {tx.transactionState}
                          </span>
                          <div className="text-right">
                            <p className="text-white font-black text-sm">{tx.quantity?.toLocaleString()}</p>
                            <p className="text-gray-600 text-xs">CORCs</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Methodologies */}
            {activeTab === 'methodologies' && (
              <div className="p-6">
                <h3 className="text-base font-bold text-white mb-5">Méthodologies de Retrait Carbone</h3>
                {fetching ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
                ) : methodologies.length === 0 ? (
                  <div className="text-center py-12 text-gray-600">
                    <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aucune méthodologie disponible</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {methodologies.map((m) => (
                      <div key={m.methodologyCode} className="bg-gray-800 border border-gray-700 rounded-2xl p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-white font-bold text-sm">{m.name}</p>
                          <span className="text-[10px] bg-amber-900/40 border border-amber-800 text-amber-400 px-2 py-0.5 rounded-full font-mono flex-shrink-0">{m.methodologyCode}</span>
                        </div>
                        {m.description && <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{m.description}</p>}
                        {m.url && (
                          <a href={m.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 text-xs mt-2 hover:text-blue-300 transition-colors">
                            Documentation <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Retirement Modal */}
      {retireOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Soumettre un Retrait CORC</h3>
              <button onClick={() => { setRetireOpen(false); setRetireResult(null) }} className="text-gray-500 hover:text-white p-1"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleRetirement} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Compte Puro.earth</label>
                <select
                  value={retireAccount}
                  onChange={e => setRetireAccount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 text-white rounded-xl text-sm outline-none focus:border-emerald-500"
                >
                  <option value="">— Sélectionner un compte —</option>
                  {accounts.map(a => <option key={a.accountNumber} value={a.accountNumber}>{a.accountNumber} {a.accountName ? `· ${a.accountName}` : ''}</option>)}
                  {accounts.length === 0 && accountNumber && <option value={accountNumber}>{accountNumber}</option>}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Quantité de CORCs à retirer</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setRetireQty(Math.max(1, retireQty - 1))} className="w-10 h-10 bg-gray-800 border border-gray-700 rounded-xl text-white font-bold hover:bg-gray-700 transition-colors flex items-center justify-center">−</button>
                  <input
                    type="number" min={1} value={retireQty}
                    onChange={e => setRetireQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 text-white rounded-xl text-sm outline-none focus:border-emerald-500 text-center font-bold"
                  />
                  <button type="button" onClick={() => setRetireQty(retireQty + 1)} className="w-10 h-10 bg-gray-800 border border-gray-700 rounded-xl text-white font-bold hover:bg-gray-700 transition-colors flex items-center justify-center">+</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Raison du retrait</label>
                <input
                  type="text"
                  value={retireReason}
                  onChange={e => setRetireReason(e.target.value)}
                  placeholder="Voluntary retirement via CarbonTrack"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 text-white rounded-xl text-sm outline-none focus:border-emerald-500"
                />
              </div>
              {retireResult && (
                <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl border ${retireResult.ok ? 'text-emerald-400 bg-emerald-900/30 border-emerald-800' : 'text-red-400 bg-red-900/30 border-red-800'}`}>
                  {retireResult.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                  <span>{retireResult.msg}</span>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setRetireOpen(false); setRetireResult(null) }} className="flex-1 py-2.5 border border-gray-700 text-gray-400 rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors">Annuler</button>
                <button
                  type="submit"
                  disabled={retireLoading || !!retireResult?.ok}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {retireLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</> : `Retirer ${retireQty} CORC${retireQty > 1 ? 's' : ''}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
