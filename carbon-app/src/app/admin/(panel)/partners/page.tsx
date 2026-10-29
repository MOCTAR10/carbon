'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Globe, Plus, CreditCard, Printer, Wallet, Leaf, TrendingUp, Users, X, ChevronDown, ChevronUp, ShieldCheck, ShieldOff, Eye, EyeOff, Save, CheckCircle, AlertCircle, Loader2, FolderOpen, ArrowDownToLine, Trees } from 'lucide-react'

interface Partner {
  id: number
  name: string
  type: string
  country: string
  virtual_card_number: string
  wallet_balance: number
  total_projects: number
  total_tons_available: number
  total_tons_sold: number
  puro_connected: boolean
  puro_account_number: string | null
  puro_api_key: string | null
  created_at: string
}

interface Stats {
  total_partners: number
  total_wallet_balance: number
  total_tons_sold: number
  total_revenue_generated: number
}

const MISSION_TYPES = [
  { value: 'Reforestation', label: '🌳 Reforestation (Planter des arbres)' },
  { value: 'Conservation', label: '🛡️ Conservation des Forêts (REDD+)' },
  { value: 'Protection Côtière', label: '🌊 Protection Côtière & Mangroves' },
  { value: 'Énergie Solaire', label: '☀️ Énergie Solaire Rurale' },
  { value: 'Agroforesterie', label: '🌾 Agroforesterie & Agriculture Durable' },
  { value: 'Gestion des Déchets', label: '♻️ Gestion des Déchets & Recyclage' },
  { value: 'Eau & Assainissement', label: '💧 Eau Propre & Assainissement' },
  { value: 'Biodiversité', label: '🦁 Protection de la Biodiversité' },
  { value: 'Transport Vert', label: '🚲 Mobilité Verte & Transport Propre' },
  { value: 'Éducation Environnementale', label: '📚 Éducation Environnementale' },
  { value: 'Énergie Hydroélectrique', label: '💡 Micro-Hydroélectricité' },
  { value: 'Agriculture Régénérative', label: '🌱 Agriculture Régénérative' },
]

const MISSION_ICONS: Record<string, string> = Object.fromEntries(MISSION_TYPES.map(t => [t.value, t.label.split(' ')[0]]))

const AFRICAN_COUNTRIES = [
  'Angola','Bénin','Botswana','Burkina Faso','Burundi','Cameroun','Cap-Vert',
  'Centrafrique','Comores','Congo (Brazzaville)','Congo (RDC)','Côte d\'Ivoire',
  'Djibouti','Égypte','Érythrée','Éthiopie','Gabon','Gambie','Ghana','Guinée',
  'Guinée-Bissau','Guinée Équatoriale','Kenya','Lesotho','Libéria','Libye',
  'Madagascar','Malawi','Mali','Maroc','Maurice','Mauritanie','Mozambique',
  'Namibie','Niger','Nigéria','Ouganda','Rwanda','São Tomé & Príncipe','Sénégal',
  'Sierra Leone','Somalie','Soudan','Soudan du Sud','Tanzanie','Tchad','Togo',
  'Tunisie','Zambie','Zimbabwe',
]

const ALL_COUNTRIES = [...AFRICAN_COUNTRIES, '---', 'Brésil','Inde','Indonésie','Pérou','Colombie','Mexique','Vietnam','Thaïlande']

function formatFCFA(n: number) {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n/1_000).toFixed(0)}K`
  return n.toLocaleString('fr-FR')
}

export default function AdminPartnersPage() {
  const [data, setData] = useState<{ partners: Partner[], stats: Stats } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('Reforestation')
  const [country, setCountry] = useState('Gabon')
  const [loading, setLoading] = useState(false)

  // Puro config state per partner
  const [puroConfigId, setPuroConfigId] = useState<number | null>(null)
  const [puroKey, setPuroKey] = useState('')
  const [puroSecret, setPuroSecret] = useState('')
  const [puroAccount, setPuroAccount] = useState('')
  const [puroFacility, setPuroFacility] = useState('')
  const [showPuroSecret, setShowPuroSecret] = useState(false)
  const [puroSaving, setPuroSaving] = useState(false)
  const [puroMsg, setPuroMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const fetchAll = () => {
    fetch('/api/partners').then(r => r.json()).then(setData).catch(console.error)
  }

  useEffect(() => { fetchAll() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, country })
    })
    if (res.ok) {
      setName(''); setShowForm(false); fetchAll()
    }
    setLoading(false)
  }

  const openPuroConfig = (p: Partner) => {
    setPuroConfigId(p.id)
    setPuroKey('')
    setPuroSecret('')
    setPuroAccount(p.puro_account_number || '')
    setPuroFacility('')
    setPuroMsg(null)
  }

  const handleSavePuro = async (e: React.FormEvent, partnerId: number) => {
    e.preventDefault()
    setPuroSaving(true)
    setPuroMsg(null)
    try {
      const res = await fetch(`/api/partners/${partnerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puro_api_key: puroKey || undefined,
          puro_api_secret: puroSecret || undefined,
          puro_account_number: puroAccount || undefined,
          puro_facility_code: puroFacility || undefined,
        }),
      })
      if (res.ok) {
        setPuroMsg({ type: 'ok', text: 'Configuration Puro.earth enregistrée !' })
        fetchAll()
        setTimeout(() => { setPuroConfigId(null); setPuroMsg(null) }, 2000)
      } else {
        setPuroMsg({ type: 'err', text: 'Erreur lors de l\'enregistrement.' })
      }
    } catch {
      setPuroMsg({ type: 'err', text: 'Erreur réseau.' })
    } finally {
      setPuroSaving(false)
    }
  }

  const printCard = (partner: Partner) => {
    window.open(
      `/dashboard/partners/card?id=${partner.id}&name=${encodeURIComponent(partner.name)}&num=${partner.virtual_card_number}&type=${encodeURIComponent(partner.type)}`,
      'PrintCard', 'width=900,height=700'
    )
  }

  const stats = data?.stats
  const partners = data?.partners || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Globe className="w-7 h-7 text-emerald-400" />
            Partenaires ONG · Marché Carbone Local
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Chaque ONG validée ici reçoit un <strong className="text-emerald-400">Wallet Fintech</strong> + une <strong className="text-emerald-400">Carte Physique CR-80</strong>. 
            Son projet apparaît automatiquement dans l&apos;onglet <strong className="text-white">&ldquo;Marché Carbone&rdquo;</strong> du tableau de bord de vos entreprises clientes, où elles peuvent acheter les crédits directement.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> Ajouter une ONG
        </button>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'ONG Partenaires', value: stats.total_partners, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Wallet Total (FCFA)', value: formatFCFA(stats.total_wallet_balance), icon: Wallet, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Tonnes Compensées', value: `${stats.total_tons_sold.toLocaleString()} T`, icon: Leaf, color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'Revenu Généré (FCFA)', value: formatFCFA(stats.total_revenue_generated), icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          ].map(s => (
            <div key={s.label} className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Creation Form (Slide-in) */}
      {showForm && (
        <div className="bg-gray-800 border border-emerald-700/50 rounded-2xl p-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">Nouvelle ONG Partenaire</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Nom de l&apos;ONG</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 text-white rounded-xl outline-none focus:border-emerald-500"
                placeholder="Action Forêt Gabon" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Type de Mission</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 text-white rounded-xl outline-none focus:border-emerald-500">
                {MISSION_TYPES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Pays d&apos;opération</label>
              <select value={country} onChange={e => setCountry(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 text-white rounded-xl outline-none focus:border-emerald-500">
                {ALL_COUNTRIES.map(c => c === '---'
                  ? <option key="sep" disabled>── Hors Afrique ──</option>
                  : <option key={c} value={c}>{c}</option>
                )}
              </select>
            </div>
            <div className="sm:col-span-3">
              <button type="submit" disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors">
                {loading ? 'Création & Publication...' : '✅ Créer l\'ONG et Publier sur le Marché Carbone'}
              </button>
              <p className="text-xs text-gray-600 text-center mt-2">Un Wallet Fintech + une Carte CR-80 seront générés automatiquement.</p>
            </div>
          </form>
        </div>
      )}

      {/* Partner List */}
      {partners.length === 0 ? (
        <div className="bg-gray-800 border border-dashed border-gray-700 rounded-2xl p-16 text-center">
          <Globe className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Aucune ONG Partenaire</p>
          <p className="text-gray-600 text-sm mt-1">Ajoutez votre première association pour démarrer le Marché Carbone Local.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {partners.map(p => {
            const isExpanded = expandedId === p.id
            const progress = p.total_tons_available > 0 ? Math.min((p.total_tons_sold / p.total_tons_available) * 100, 100) : 0

            return (
              <div key={p.id} className={`bg-gray-800 border rounded-2xl overflow-hidden transition-colors ${isExpanded ? 'border-emerald-700' : 'border-gray-700 hover:border-gray-600'}`}>
                {/* Partner Header Row */}
                <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-14 h-14 bg-emerald-900/50 border border-emerald-800 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl">
                      {MISSION_ICONS[p.type] || '🌿'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-white truncate">{p.name}</h3>
                        <span className="bg-emerald-900/50 text-emerald-300 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-700">
                          {p.type}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mt-0.5">{p.country}</p>
                      <div className="flex items-center gap-2 mt-2 bg-gray-900 px-3 py-1.5 rounded-lg w-max border border-gray-700">
                        <CreditCard className="w-3.5 h-3.5 text-gray-500" />
                        <span className="font-mono text-xs tracking-widest text-gray-300">{p.virtual_card_number}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full sm:w-auto flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Solde Wallet</p>
                      <p className="text-2xl font-black text-emerald-400">{formatFCFA(Number(p.wallet_balance))}</p>
                      <p className="text-xs text-gray-600">FCFA</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => printCard(p)}
                        className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl font-medium text-xs transition-colors">
                        <Printer className="w-3.5 h-3.5" /> Carte CR-80
                      </button>
                      <button
                        onClick={() => { if (puroConfigId === p.id) { setPuroConfigId(null) } else { openPuroConfig(p) } }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-xs transition-colors ${p.puro_connected ? 'bg-emerald-900/50 border border-emerald-800 text-emerald-400 hover:bg-emerald-900' : 'bg-amber-900/40 border border-amber-800/60 text-amber-400 hover:bg-amber-900/60'}`}
                      >
                        {p.puro_connected ? <><ShieldCheck className="w-3.5 h-3.5" /> Puro ✓</> : <><ShieldOff className="w-3.5 h-3.5" /> Config Puro</>}
                      </button>
                      <button onClick={() => setExpandedId(isExpanded ? null : p.id)}
                        className="flex items-center gap-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl font-medium text-xs transition-colors justify-center">
                        {isExpanded ? <><ChevronUp className="w-3.5 h-3.5" /> Réduire</> : <><ChevronDown className="w-3.5 h-3.5" /> Détails</>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Puro.earth Config Panel */}
                {puroConfigId === p.id && (
                  <div className="border-t border-amber-800/40 bg-amber-950/20 p-5 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-bold text-white">Configuration Puro.earth UAT</span>
                        {p.puro_connected && <span className="text-[10px] bg-emerald-900/60 border border-emerald-800 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Connecté</span>}
                      </div>
                      <button onClick={() => setPuroConfigId(null)} className="text-gray-500 hover:text-white p-0.5"><X className="w-4 h-4" /></button>
                    </div>
                    <form onSubmit={e => handleSavePuro(e, p.id)} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">API Key</label>
                        <input type="text" value={puroKey} onChange={e => setPuroKey(e.target.value)}
                          placeholder={p.puro_api_key ? '••••• (conserver)' : 'Clé API Puro.earth'}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-xl text-xs outline-none focus:border-emerald-500 font-mono" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">API Secret</label>
                        <div className="relative">
                          <input type={showPuroSecret ? 'text' : 'password'} value={puroSecret} onChange={e => setPuroSecret(e.target.value)}
                            placeholder={p.puro_api_key ? '••••• (conserver)' : 'Secret API Puro.earth'}
                            className="w-full px-3 py-2 pr-8 bg-gray-900 border border-gray-700 text-white rounded-xl text-xs outline-none focus:border-emerald-500 font-mono" />
                          <button type="button" onClick={() => setShowPuroSecret(!showPuroSecret)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
                            {showPuroSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Account Number</label>
                        <input type="text" value={puroAccount} onChange={e => setPuroAccount(e.target.value)}
                          placeholder="Ex: ACC-12345"
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-xl text-xs outline-none focus:border-emerald-500 font-mono" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Facility Code (opt.)</label>
                        <input type="text" value={puroFacility} onChange={e => setPuroFacility(e.target.value)}
                          placeholder="Ex: FAC-67890"
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-xl text-xs outline-none focus:border-emerald-500 font-mono" />
                      </div>
                      {puroMsg && (
                        <div className={`sm:col-span-2 flex items-center gap-2 text-xs px-3 py-2 rounded-xl border ${puroMsg.type === 'ok' ? 'text-emerald-400 bg-emerald-900/30 border-emerald-800' : 'text-red-400 bg-red-900/30 border-red-800'}`}>
                          {puroMsg.type === 'ok' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                          {puroMsg.text}
                        </div>
                      )}
                      <div className="sm:col-span-2">
                        <button type="submit" disabled={puroSaving}
                          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition-colors">
                          {puroSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enregistrement...</> : <><Save className="w-3.5 h-3.5" /> Enregistrer la configuration Puro.earth</>}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-700 p-5 bg-gray-900/50 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Projets Actifs</p>
                      <p className="text-3xl font-black text-white">{p.total_projects}</p>
                      <p className="text-gray-500 text-xs mt-1">publiés sur le Marché Carbone</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Progression des Ventes</p>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">{p.total_tons_sold.toLocaleString()} Tonnes vendues</span>
                        <span className="text-gray-500">/ {p.total_tons_available.toLocaleString()} disponibles</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-3 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-emerald-400 text-xs font-bold">{progress.toFixed(1)}% vendu</span>
                        <span className={`text-xs font-bold ${progress > 80 ? 'text-orange-400' : 'text-gray-500'}`}>
                          {progress > 80 ? '⚠️ Stock faible' : 'Stock disponible'}
                        </span>
                      </div>
                    </div>
                    {/* Puro.earth status in expanded view */}
                    <div className="sm:col-span-3 pt-2 border-t border-gray-700">
                      <div className="flex items-center gap-3">
                        {p.puro_connected ? (
                          <div className="flex items-center gap-2 bg-emerald-900/40 border border-emerald-800 px-3 py-1.5 rounded-xl">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 text-xs font-bold">Puro.earth connecté</span>
                            {p.puro_account_number && <span className="text-emerald-600 text-xs font-mono">· {p.puro_account_number}</span>}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-xl">
                            <ShieldOff className="w-3.5 h-3.5 text-gray-500" />
                            <span className="text-gray-500 text-xs">Puro.earth non configuré</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Quick actions for partner workflows */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/admin/documents"
          className="flex items-center gap-4 bg-gray-900 border border-gray-800 hover:border-emerald-700 rounded-2xl p-5 transition-colors group">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <FolderOpen className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-white font-bold text-sm group-hover:text-emerald-300 transition-colors">Valider les Documents</p>
            <p className="text-gray-500 text-xs mt-0.5">Permis, rapports, certifications ONG</p>
          </div>
        </Link>
        <Link href="/admin/withdrawals"
          className="flex items-center gap-4 bg-gray-900 border border-gray-800 hover:border-blue-700 rounded-2xl p-5 transition-colors group">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <ArrowDownToLine className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-white font-bold text-sm group-hover:text-blue-300 transition-colors">Traiter les Retraits</p>
            <p className="text-gray-500 text-xs mt-0.5">Approuver et payer les demandes ONG</p>
          </div>
        </Link>
        <Link href="/admin/market"
          className="flex items-center gap-4 bg-gray-900 border border-gray-800 hover:border-purple-700 rounded-2xl p-5 transition-colors group">
          <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Trees className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-white font-bold text-sm group-hover:text-purple-300 transition-colors">Marché Carbone</p>
            <p className="text-gray-500 text-xs mt-0.5">Inventaire et analytics projets</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
