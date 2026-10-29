'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Leaf, Globe, ShieldCheck, ArrowRight, PieChart, Activity, Download,
  CheckCircle2, X, Minus, Plus, Search, ExternalLink,
  Zap, Droplets, Wind, Flame, Factory, TreePine, ChevronDown, SlidersHorizontal
} from 'lucide-react'
import jsPDF from 'jspdf'

interface Project {
  id: string | number
  title: string
  description: string
  project_type: string
  category?: string
  country: string
  vintage?: string | null
  standard?: string
  methodology?: string | null
  price_per_ton: number
  price_per_ton_usd?: number
  tons_available?: number
  image_url: string
  is_local: boolean
  source?: string
}

// Keyed to project_type (French mapped values from the API)
const TYPE_ICONS: Record<string, any> = {
  'Conservation (REDD+)': TreePine,
  'Carbone Bleu': Droplets,
  'Agriculture Régénérative': Leaf,
  'Gestion des Déchets': Flame,
  'Efficacité Énergétique': Zap,
  'Énergie Renouvelable': Wind,
  'Industrie': Factory,
  'Autre': Leaf,
}

const SORT_OPTIONS = [
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'tons_desc', label: 'Plus disponible' },
  { value: 'vintage_desc', label: 'Millésime récent' },
]

// Map raw English Carbonmark categories to French project_type equivalents for filter display
const CAT_LABEL: Record<string, string> = {
  'Renewable Energy': 'Énergie Renouvelable',
  'Renewable Energy, Other': 'Énergie Renouvelable',
  'Renewable Energy, Renewable Energy': 'Énergie Renouvelable',
  'Forestry': 'Conservation (REDD+)',
  'Blue Carbon': 'Carbone Bleu',
  'Agriculture': 'Agriculture Régénérative',
  'Biochar': 'Agriculture Régénérative',
  'Energy Efficiency': 'Efficacité Énergétique',
  'Industrial Processing': 'Industrie',
  'Waste Disposal': 'Gestion des Déchets',
  'Other': 'Autre',
}

export default function MarketPage() {
  const [activeTab, setActiveTab] = useState<'catalogue' | 'portfolio' | 'live'>('catalogue')

  const [projects, setProjects] = useState<Project[]>([])
  const [marketStats, setMarketStats] = useState<any>(null)
  const [filterMeta, setFilterMeta] = useState<{ categories: string[]; countries: string[]; vintages: string[] } | null>(null)
  const [portfolio, setPortfolio] = useState<any>(null)
  const [liveFeed, setLiveFeed] = useState<any[]>([])
  const [carbonmarkStats, setCarbonmarkStats] = useState<any>(null)

  const [loading, setLoading] = useState(true)
  const [loadingPortfolio, setLoadingPortfolio] = useState(false)
  const [loadingLive, setLoadingLive] = useState(false)
  const [buyLoading, setBuyLoading] = useState<string | number | null>(null)

  const [buyModal, setBuyModal] = useState<Project | null>(null)
  const [buyTons, setBuyTons] = useState(10)
  const [buySuccess, setBuySuccess] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('')   // uses project_type (French)
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedVintage, setSelectedVintage] = useState('')
  const [sortBy, setSortBy] = useState('price_asc')

  useEffect(() => {
    fetch('/api/market/projects')
      .then(r => r.json())
      .then(data => {
        setProjects(data.projects || [])
        setMarketStats(data.market)
        setFilterMeta(data.filters || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (activeTab === 'portfolio' && !portfolio) {
      setLoadingPortfolio(true)
      fetch('/api/market/stats')
        .then(r => r.json())
        .then(data => { setPortfolio(data); setLoadingPortfolio(false) })
        .catch(() => setLoadingPortfolio(false))
    }
    if (activeTab === 'live' && liveFeed.length === 0) {
      setLoadingLive(true)
      fetch('/api/market/carbonmark-meta')
        .then(r => r.json())
        .then(data => {
          setLiveFeed(data.liveFeed || [])
          setCarbonmarkStats(data.stats)
          setLoadingLive(false)
        })
        .catch(() => setLoadingLive(false))
    }
  }, [activeTab])

  // Unique project_types and countries for filter chips/dropdowns
  const allTypes = useMemo(() =>
    Array.from(new Set(projects.filter(p => !p.is_local).map(p => p.project_type))).sort(),
    [projects]
  )
  const allCountries = useMemo(() =>
    Array.from(new Set(projects.filter(p => !p.is_local).map(p => p.country))).sort(),
    [projects]
  )
  const allVintages = useMemo(() =>
    Array.from(new Set(projects.filter(p => p.vintage).map(p => p.vintage!))).sort().reverse(),
    [projects]
  )

  const filteredProjects = useMemo(() => {
    let list = [...projects]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        (p.methodology || '').toLowerCase().includes(q)
      )
    }
    if (selectedType) list = list.filter(p => p.project_type === selectedType)
    if (selectedCountry) list = list.filter(p => p.country === selectedCountry)
    if (selectedVintage) list = list.filter(p => p.vintage === selectedVintage)

    switch (sortBy) {
      case 'price_desc': list.sort((a, b) => b.price_per_ton - a.price_per_ton); break
      case 'tons_desc': list.sort((a, b) => (b.tons_available || 0) - (a.tons_available || 0)); break
      case 'vintage_desc': list.sort((a, b) => (b.vintage || '0').localeCompare(a.vintage || '0')); break
      default: list.sort((a, b) => {
        // Local projects always first
        if (a.is_local && !b.is_local) return -1
        if (!a.is_local && b.is_local) return 1
        return a.price_per_ton - b.price_per_ton
      })
    }
    return list
  }, [projects, search, selectedType, selectedCountry, selectedVintage, sortBy])

  const hasActiveFilters = !!(search || selectedType || selectedCountry || selectedVintage)
  const clearFilters = () => { setSearch(''); setSelectedType(''); setSelectedCountry(''); setSelectedVintage('') }

  const handleBuyClick = (p: Project) => { setBuyTons(10); setBuySuccess(false); setBuyModal(p) }

  const handleConfirmBuy = async () => {
    if (!buyModal || buyTons <= 0) return
    setBuyLoading(buyModal.id)
    try {
      const res = await fetch('/api/market/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: buyModal.id, tons: buyTons,
          price_per_ton: buyModal.price_per_ton, is_local: buyModal.is_local,
          project_title: buyModal.title, project_type: buyModal.project_type,
          payment_method: 'AFG Bank'
        })
      })
      if (res.ok) {
        setBuySuccess(true)
        setPortfolio(null)
        setTimeout(() => { setBuyModal(null); setBuySuccess(false) }, 2200)
      }
    } catch { }
    finally { setBuyLoading(null) }
  }

  const handleDownloadCert = (tx: any) => {
    const doc = new jsPDF()
    doc.setFillColor(16, 185, 129); doc.rect(0, 0, 210, 40, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(22)
    doc.text('CarbonTrack', 14, 20); doc.setFontSize(11); doc.setFont('helvetica', 'normal')
    doc.text('Certificat de Compensation Carbone', 14, 32)
    doc.setTextColor(30, 30, 30); doc.setFontSize(14); doc.setFont('helvetica', 'bold')
    doc.text('CERTIFICAT OFFICIEL', 105, 60, { align: 'center' })
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
    doc.text('Ce document certifie la compensation vérifiée des émissions de gaz à effet de serre.', 105, 70, { align: 'center' })
    doc.setDrawColor(16, 185, 129); doc.setLineWidth(0.5); doc.line(14, 78, 196, 78)
    const rows = [
      ['N° Transaction', `#${tx.id}`], ['Projet', tx.display_name || 'Projet Certifié'],
      ['Type', tx.display_type || 'Reforestation'], ['Tonnes CO₂', `${tx.tons_purchased.toLocaleString('fr-FR')} tCO₂eq`],
      ['Montant', `${tx.amount_paid.toLocaleString('fr-FR')} FCFA`], ['Date', tx.date],
      ['Standard', 'VCS / Toucan Protocol TCO2'], ['Statut', 'COMPLÉTÉ ET VÉRIFIÉ'],
    ]
    let y = 90
    for (const [label, value] of rows) {
      doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60); doc.setFontSize(9)
      doc.text(label + ' :', 14, y)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30); doc.setFontSize(10)
      doc.text(String(value), 80, y); y += 12
    }
    doc.setFillColor(245, 245, 245); doc.rect(0, 255, 210, 42, 'F')
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(130, 130, 130)
    doc.text('© CarbonTrack · Toucan Protocol TCO2 · KlimaDAO Carbonmark · Polygon Network', 105, 276, { align: 'center' })
    doc.save(`certificat-carbone-${tx.id}.pdf`)
  }

  // ─── PORTFOLIO ─────────────────────────────────────────────────────────────
  const renderPortfolio = () => {
    if (loadingPortfolio) return <div className="p-12 text-center"><Activity className="w-8 h-8 text-emerald-500 animate-spin mx-auto" /></div>
    if (!portfolio || portfolio.transactions.length === 0) return (
      <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6"><Leaf className="w-10 h-10 text-gray-300" /></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Portefeuille vide</h2>
        <p className="text-gray-500 mb-6">Vous n&apos;avez pas encore acheté de crédits carbone.</p>
        <button onClick={() => setActiveTab('catalogue')} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold">Explorer le Catalogue</button>
      </div>
    )
    const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-indigo-500']
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-8 text-white relative overflow-hidden">
            <Leaf className="absolute -right-8 -bottom-8 w-40 h-40 text-white/5" />
            <p className="text-gray-400 uppercase text-xs font-bold tracking-widest mb-3">Volume Compensé</p>
            <h2 className="text-6xl font-black text-emerald-400 mb-2">{portfolio.stats.totalTons.toLocaleString()} <span className="text-2xl opacity-50">T</span></h2>
            <p className="text-gray-400 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Certifié conforme</p>
          </div>
          <div className="bg-white rounded-3xl p-8 border border-gray-100 flex flex-col justify-center">
            <p className="text-gray-500 uppercase text-xs font-bold tracking-widest mb-3">Impact Financier</p>
            <h2 className="text-4xl font-black text-gray-900 mb-2">{portfolio.stats.totalInvested.toLocaleString('fr-FR')} <span className="text-xl text-gray-400">FCFA</span></h2>
            <span className="text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg w-max text-sm font-bold border border-emerald-100">Transférés via AFG Bank</span>
          </div>
        </div>
        {portfolio.stats.chartData.length > 0 && (
          <div className="bg-white rounded-3xl p-8 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2"><PieChart className="w-5 h-5 text-emerald-600" /> Répartition du Portefeuille</h3>
            <div className="flex w-full h-5 rounded-full overflow-hidden mb-6">
              {portfolio.stats.chartData.map((d: any, i: number) => (
                <div key={d.name} style={{ width: d.percentage + '%' }} className={`${colors[i % colors.length]} hover:opacity-80 transition-all`} title={`${d.name}: ${d.percentage}%`} />
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {portfolio.stats.chartData.map((d: any, i: number) => (
                <div key={d.name}>
                  <div className="flex items-center gap-2 mb-1"><div className={`w-3 h-3 rounded-full ${colors[i % colors.length]}`} /><p className="text-gray-500 text-xs font-bold uppercase truncate">{d.name}</p></div>
                  <p className="text-2xl font-black text-gray-900">{d.percentage}%</p>
                  <p className="text-gray-400 text-sm">{d.value.toLocaleString()} T</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50"><h3 className="text-lg font-bold text-gray-900">Historique des Transactions</h3></div>
          <div className="divide-y divide-gray-100">
            {portfolio.transactions.map((tx: any) => (
              <div key={tx.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 flex items-center justify-center rounded-2xl flex-shrink-0"><Leaf className="w-5 h-5" /></div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{tx.display_name}</p>
                    <p className="text-gray-500 text-sm">{tx.date} · {tx.payment_method}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="font-black text-emerald-600 text-lg">+{tx.tons_purchased} <span className="text-sm">T</span></p>
                    <p className="text-gray-400 text-xs font-mono">{tx.amount_paid.toLocaleString('fr-FR')} F</p>
                  </div>
                  <button onClick={() => handleDownloadCert(tx)} className="text-blue-600 hover:bg-blue-50 p-2.5 rounded-xl border border-blue-100 transition-colors" title="Télécharger le Certificat PDF">
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── LIVE FEED ─────────────────────────────────────────────────────────────
  const renderLive = () => {
    if (loadingLive) return <div className="p-12 text-center"><Activity className="w-8 h-8 text-emerald-500 animate-spin mx-auto" /></div>
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {carbonmarkStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Annonces Actives', value: carbonmarkStats.activeListings },
              { label: 'Tonnes Disponibles', value: (carbonmarkStats.totalAvailableTons / 1000000).toFixed(1) + 'M tCO₂' },
              { label: 'Retraits On-Chain', value: carbonmarkStats.retirementCount },
              { label: 'Total Retiré', value: carbonmarkStats.totalRetiredTons.toLocaleString('fr-FR') + ' T' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-5">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{s.label}</p>
                <p className="text-xl font-black text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>
        )}
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Retraits Blockchain — Live</h3>
              <p className="text-gray-400 text-sm mt-0.5">Tokens Toucan TCO2 retirés sur Polygon · KlimaDAO Carbonmark</p>
            </div>
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-100 flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />Polygon Live
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {liveFeed.length === 0
              ? <div className="p-12 text-center text-gray-400">Aucune donnée disponible</div>
              : liveFeed.map(r => (
                <div key={r.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"><Leaf className="w-4 h-4 text-emerald-600" /></div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{r.beneficiaryName}</p>
                      <p className="text-gray-500 text-xs truncate">{r.tokenName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-black text-emerald-600 text-sm">{r.amount.toFixed(3)} T</p>
                      <p className="text-gray-400 text-xs">{r.date}</p>
                    </div>
                    {r.polygonscanUrl && (
                      <a href={r.polygonscanUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── CATALOGUE ─────────────────────────────────────────────────────────────
  const renderCatalogue = () => {
    if (loading) return <div className="p-12 text-center"><Leaf className="w-8 h-8 text-emerald-500 animate-spin mx-auto" /></div>

    return (
      <div className="space-y-4 animate-in fade-in duration-300">

        {/* DATA SOURCE BANNER */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3.5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-blue-700">
            <Globe className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-bold">Source des données :</span>
          </div>
          <span className="text-blue-600 text-sm">Crédits carbone réels — <strong>Tokens Toucan Protocol TCO2</strong> (standard VCS, certifiés sur Polygon) en vente sur <strong>KlimaDAO Carbonmark</strong>. Données live, aucune donnée fictive.</span>
        </div>

        {/* HORIZONTAL FILTER BAR */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Rechercher un projet..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Type */}
          <div className="relative min-w-[170px]">
            <select
              value={selectedType} onChange={e => setSelectedType(e.target.value)}
              className="w-full appearance-none py-2.5 pl-3 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-emerald-400"
            >
              <option value="">Tous les types</option>
              {allTypes.map(t => {
                const Icon = TYPE_ICONS[t]
                return <option key={t} value={t}>{t}</option>
              })}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Country */}
          <div className="relative min-w-[150px]">
            <select
              value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)}
              className="w-full appearance-none py-2.5 pl-3 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-emerald-400"
            >
              <option value="">Tous les pays</option>
              {allCountries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Vintage */}
          {allVintages.length > 0 && (
            <div className="relative min-w-[130px]">
              <select
                value={selectedVintage} onChange={e => setSelectedVintage(e.target.value)}
                className="w-full appearance-none py-2.5 pl-3 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-emerald-400"
              >
                <option value="">Millésime</option>
                {allVintages.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* Sort */}
          <div className="relative min-w-[160px]">
            <select
              value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="w-full appearance-none py-2.5 pl-3 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-emerald-400"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Clear */}
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 transition-colors flex-shrink-0">
              <X className="w-4 h-4" /> Effacer
            </button>
          )}
        </div>

        {/* Result count + type chips */}
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-gray-500 text-sm">
            <span className="font-bold text-gray-900">{filteredProjects.length}</span> projet{filteredProjects.length !== 1 ? 's' : ''}
            {hasActiveFilters && <span className="ml-1.5 text-emerald-600 font-medium">(filtré{filteredProjects.length !== 1 ? 's' : ''})</span>}
          </p>
          {/* Quick type chips */}
          <div className="flex flex-wrap gap-2 ml-auto">
            {allTypes.slice(0, 5).map(t => {
              const Icon = TYPE_ICONS[t] || Leaf
              return (
                <button
                  key={t}
                  onClick={() => setSelectedType(selectedType === t ? '' : t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${selectedType === t ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-200 hover:text-emerald-600'}`}
                >
                  <Icon className="w-3 h-3" />{t}
                </button>
              )
            })}
          </div>
        </div>

        {/* Project Grid — full width, no sidebar */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-gray-400 mb-4">Aucun projet ne correspond à vos critères.</p>
            <button onClick={clearFilters} className="text-emerald-600 font-bold hover:underline">Effacer les filtres</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProjects.map(p => {
              const Icon = TYPE_ICONS[p.project_type] || Leaf
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-all hover:-translate-y-0.5 group">
                  {/* Image */}
                  <div className="h-40 relative overflow-hidden flex-shrink-0">
                    <img src={p.image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Source badge */}
                    <div className={`absolute top-2.5 right-2.5 text-white text-[10px] font-black px-2 py-1 rounded-lg flex gap-1 items-center shadow-sm uppercase tracking-tight ${p.is_local ? 'bg-emerald-500' : 'bg-blue-600'}`}>
                      {p.is_local ? <><ShieldCheck className="w-3 h-3" />Local</> : <><Globe className="w-3 h-3" />Toucan TCO2</>}
                    </div>

                    {/* Vintage badge */}
                    {p.vintage && (
                      <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-lg">
                        {p.vintage}
                      </div>
                    )}

                    {/* Type bottom left */}
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1">
                      <Icon className="w-3 h-3 text-white flex-shrink-0" />
                      <span className="text-white text-[10px] font-bold leading-none truncate max-w-[120px]">{p.project_type}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex-1 flex flex-col gap-3">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{p.title}</h3>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                        <span className="text-gray-400 text-xs">{p.country}</span>
                        {p.standard && <span className="text-gray-400 text-xs">· {p.standard}</span>}
                        {p.methodology && <span className="text-gray-400 text-[10px] font-mono">· {p.methodology}</span>}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 mt-auto">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-gray-400 font-medium uppercase">Prix / tonne</p>
                          <p className="text-base font-black text-emerald-600 leading-tight">
                            {p.price_per_ton.toLocaleString('fr-FR')} <span className="text-xs font-normal text-gray-400">F</span>
                          </p>
                          {p.price_per_ton_usd !== undefined && (
                            <p className="text-[10px] text-gray-400">${p.price_per_ton_usd.toFixed(2)}</p>
                          )}
                        </div>
                        {p.tons_available !== undefined && (
                          <div className="text-right">
                            <p className="text-[10px] text-gray-400 font-medium uppercase">Stock</p>
                            <p className="text-sm font-bold text-gray-700">{p.tons_available >= 1000 ? (p.tons_available / 1000).toFixed(0) + 'k' : p.tons_available} <span className="text-xs font-normal text-gray-400">T</span></p>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleBuyClick(p)}
                      disabled={buyLoading === p.id}
                      className="w-full bg-gray-900 hover:bg-black text-white rounded-xl py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2 group/btn disabled:opacity-50"
                    >
                      {buyLoading === p.id
                        ? <Activity className="w-4 h-4 animate-spin" />
                        : <>Acheter & Compenser <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" /></>
                      }
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ─── MAIN RENDER ───────────────────────────────────────────────────────────
  return (
    <div className="w-full pb-12 overflow-x-hidden">

      {/* HERO HEADER */}
      <div className="bg-emerald-900 border border-emerald-800 rounded-3xl p-7 mb-7 text-white overflow-hidden relative">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
          <Globe className="w-80 h-80" />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold mb-2 tracking-tight">Plateforme Carbone Mondiale</h1>
            <p className="text-emerald-100 text-sm max-w-xl">
              {marketStats?.activeListings || '...'} projets certifiés — Tokens <strong>Toucan Protocol TCO2</strong> sur Polygon, via <strong>KlimaDAO Carbonmark</strong>.
            </p>
            {marketStats && (
              <div className="mt-4 flex flex-wrap gap-2.5">
                <div className="bg-emerald-800/50 border border-emerald-700/50 rounded-xl px-4 py-2 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-[9px] uppercase font-bold text-emerald-300 tracking-widest leading-none">NCT Live</p>
                    <p className="text-sm font-black">{marketStats.nctPriceFCFA.toLocaleString()} <span className="text-xs font-normal opacity-70">F/T</span></p>
                  </div>
                </div>
                <div className="bg-blue-900/50 border border-blue-700/50 rounded-xl px-4 py-2 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="text-[9px] uppercase font-bold text-blue-300 tracking-widest leading-none">BCT Index</p>
                    <p className="text-sm font-black">{marketStats.bctPriceFCFA.toLocaleString()} <span className="text-xs font-normal opacity-70">F/T</span></p>
                  </div>
                </div>
                {marketStats.totalAvailableTons > 0 && (
                  <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                    <div>
                      <p className="text-[9px] uppercase font-bold text-emerald-200 tracking-widest leading-none">Stock global</p>
                      <p className="text-sm font-black">{(marketStats.totalAvailableTons / 1000000).toFixed(1)}M <span className="text-xs font-normal opacity-70">tCO₂</span></p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TABS */}
          <div className="flex bg-emerald-800/70 p-1 rounded-xl border border-emerald-700/50 w-full lg:w-auto flex-shrink-0">
            {(['catalogue', 'portfolio', 'live'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-emerald-900 shadow' : 'text-emerald-100 hover:text-white hover:bg-emerald-700/50'}`}
              >
                {tab === 'catalogue' ? 'Catalogue' : tab === 'portfolio' ? 'Mon Portefeuille' : '⚡ Live'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'catalogue' ? renderCatalogue() : activeTab === 'portfolio' ? renderPortfolio() : renderLive()}

      {/* BUY MODAL */}
      {buyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="h-36 relative flex-shrink-0">
              <img src={buyModal.image_url} alt={buyModal.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <button onClick={() => setBuyModal(null)} className="absolute top-3 right-3 w-8 h-8 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-4 right-12">
                <p className="text-white font-black text-base leading-tight line-clamp-1">{buyModal.title}</p>
                <p className="text-white/70 text-xs mt-0.5">{buyModal.country}{buyModal.vintage ? ` · ${buyModal.vintage}` : ''} · {buyModal.project_type}</p>
              </div>
            </div>
            <div className="p-5">
              {buySuccess ? (
                <div className="text-center py-5">
                  <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  </div>
                  <p className="text-xl font-black text-gray-900 mb-1">Transaction Réussie !</p>
                  <p className="text-gray-500 text-sm">{buyTons} tCO₂ compensées via AFG Bank</p>
                </div>
              ) : (
                <>
                  <p className="text-gray-500 text-sm mb-4">Sélectionnez le nombre de tonnes à compenser :</p>
                  <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <button onClick={() => setBuyTons(t => Math.max(1, t - 1))} className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors">
                        <Minus className="w-4 h-4 text-gray-700" />
                      </button>
                      <div className="text-center">
                        <p className="text-4xl font-black text-gray-900">{buyTons}</p>
                        <p className="text-gray-400 text-xs uppercase tracking-wider">Tonnes CO₂</p>
                      </div>
                      <button onClick={() => setBuyTons(t => t + 1)} className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors">
                        <Plus className="w-4 h-4 text-gray-700" />
                      </button>
                    </div>
                    <input type="range" min={1} max={Math.min(buyModal.tons_available || 500, 500)} value={buyTons} onChange={e => setBuyTons(parseInt(e.target.value))} className="w-full accent-emerald-600" />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>1 T</span><span>{Math.min(buyModal.tons_available || 500, 500)} T max</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mb-4 bg-emerald-50 rounded-2xl px-4 py-3 border border-emerald-100">
                    <span className="text-gray-600 font-medium text-sm">Total</span>
                    <div className="text-right">
                      <p className="text-xl font-black text-emerald-600">{(buyTons * buyModal.price_per_ton).toLocaleString('fr-FR')} <span className="text-sm font-normal text-emerald-400">FCFA</span></p>
                      {buyModal.price_per_ton_usd !== undefined && (
                        <p className="text-xs text-gray-400">${(buyTons * buyModal.price_per_ton_usd).toFixed(2)} USD</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setBuyModal(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors text-sm">Annuler</button>
                    <button onClick={handleConfirmBuy} disabled={buyLoading === buyModal.id} className="flex-1 py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                      {buyLoading === buyModal.id ? <Activity className="w-4 h-4 animate-spin" /> : <>Confirmer <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
