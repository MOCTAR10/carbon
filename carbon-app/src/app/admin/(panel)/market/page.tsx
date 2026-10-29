'use client'

import { useState, useEffect } from 'react'
import {
  Globe, Activity, TrendingUp, DollarSign, BarChart3, Leaf,
  MapPin, ArrowUpRight, RefreshCw, ExternalLink, Database,
  ShieldCheck, Coins, CircleDot
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'

// ── Types ────────────────────────────────────────────────────────────────────
interface Project {
  id: string | number
  title: string
  project_type: string
  category?: string
  country: string
  price_per_ton: number
  image_url: string
  is_local: boolean
  vintage?: string | null
  standard?: string
  tons_available?: number
}

interface AdminStats {
  monthly: { month: string; totalTons: number; totalAmount: number; totalCommission: number; transactions: number }[]
  byType: { type: string; tons: number; amount: number }[]
  byCountry: { country: string; tons: number; count: number }[]
  totals: { totalTons: number; totalAmount: number; totalCommission: number; totalTransactions: number }
}

const FCFA_PER_USD = 600
const PIE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#ec4899', '#f97316']

// ── Source badge config ───────────────────────────────────────────────────────
// 3 data sources, each has a consistent color + label used across the page
const SOURCES = {
  platform: {
    label: 'CarbonTrack — Base de données',
    short: 'CarbonTrack DB',
    desc: 'Transactions, commissions et projets locaux enregistrés sur votre plateforme.',
    dot: 'bg-emerald-500',
    border: 'border-emerald-800',
    bg: 'bg-emerald-900/30',
    text: 'text-emerald-400',
  },
  carbonmark: {
    label: 'KlimaDAO Carbonmark API',
    short: 'Carbonmark',
    desc: 'Marché mondial de tokens TCO2 certifiés VCS (Toucan Protocol) sur Polygon. Annonces, retraits, catégories.',
    dot: 'bg-blue-500',
    border: 'border-blue-800',
    bg: 'bg-blue-900/30',
    text: 'text-blue-400',
  },
  coingecko: {
    label: 'CoinGecko — Prix DeFi',
    short: 'CoinGecko',
    desc: 'Prix spot des tokens NCT & BCT (Toucan Protocol) sur le marché DeFi Polygon. ≠ prix de vente Carbonmark.',
    dot: 'bg-purple-500',
    border: 'border-purple-800',
    bg: 'bg-purple-900/30',
    text: 'text-purple-400',
  },
} as const

type SourceKey = keyof typeof SOURCES

function SourceBadge({ source }: { source: SourceKey }) {
  const s = SOURCES[source]
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${s.bg} ${s.border} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
      {s.short}
    </span>
  )
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 shadow-xl text-sm">
      {label && <p className="text-gray-400 mb-1 font-medium">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-bold">
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString('fr-FR') : p.value}
          {p.name === 'Tonnes CO₂' ? ' T' : p.name === 'Commissions (FCFA)' ? ' F' : ''}
        </p>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminMarketPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [marketStats, setMarketStats] = useState<any>(null)
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null)
  const [carbonmarkMeta, setCarbonmarkMeta] = useState<any>(null)
  const [priceHistory, setPriceHistory] = useState<{ date: string; nct: number; bct: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/market/projects').then(r => r.json()),
      fetch('/api/market/admin-stats').then(r => r.json()).catch(() => null),
      fetch('/api/market/carbonmark-meta').then(r => r.json()).catch(() => null),
      fetch('https://api.coingecko.com/api/v3/coins/toucan-protocol-nature-carbon-tonne/market_chart?vs_currency=usd&days=7&interval=daily').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('https://api.coingecko.com/api/v3/coins/toucan-protocol-base-carbon-tonne/market_chart?vs_currency=usd&days=7&interval=daily').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([marketData, stats, cmMeta, nctHistory, bctHistory]) => {
      setProjects(marketData.projects || [])
      setMarketStats(marketData.market || null)
      if (stats && !stats.error) setAdminStats(stats)
      if (cmMeta && !cmMeta.error) setCarbonmarkMeta(cmMeta)
      if (nctHistory?.prices) {
        setPriceHistory(nctHistory.prices.map((pt: [number, number], i: number) => ({
          date: new Date(pt[0]).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          nct: Math.round(pt[1] * FCFA_PER_USD),
          bct: bctHistory?.prices?.[i] ? Math.round(bctHistory.prices[i][1] * FCFA_PER_USD) : 0,
        })))
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filteredProjects = projects.filter(p =>
    search === '' ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.country.toLowerCase().includes(search.toLowerCase()) ||
    (p.project_type || '').toLowerCase().includes(search.toLowerCase())
  )
  const maxCountryTons = adminStats?.byCountry[0]?.tons || 1

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Activity className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-hidden space-y-8 animate-in fade-in duration-500">

      {/* ═══════════════════════════════════════════════════════════════
          HEADER
      ════════════════════════════════════════════════════════════════ */}
      <div>
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <Globe className="w-8 h-8 text-emerald-500" />
          Marché Carbone — Administration
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SOURCE LEGEND — ce qui vient d'où
      ════════════════════════════════════════════════════════════════ */}
      <div className="bg-gray-900 border border-gray-700 rounded-3xl p-5">
        <p className="text-[10px] uppercase font-black text-gray-500 tracking-widest mb-4">
          Sources de données — ce dashboard agrège 3 sources distinctes
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(Object.keys(SOURCES) as SourceKey[]).map(key => {
            const s = SOURCES[key]
            const icons: Record<SourceKey, React.ReactNode> = {
              platform: <Database className="w-4 h-4" />,
              carbonmark: <RefreshCw className="w-4 h-4" />,
              coingecko: <Coins className="w-4 h-4" />,
            }
            return (
              <div key={key} className={`rounded-2xl border p-4 ${s.bg} ${s.border}`}>
                <div className={`flex items-center gap-2 mb-2 ${s.text}`}>
                  {icons[key]}
                  <span className="text-xs font-black uppercase tracking-wider">{s.short}</span>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">{s.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1 — VOTRE PLATEFORME (CarbonTrack DB)
      ════════════════════════════════════════════════════════════════ */}
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-800" />
          <div className="flex items-center gap-2">
            <CircleDot className="w-4 h-4 text-emerald-500" />
            <span className="text-emerald-400 text-xs font-black uppercase tracking-widest">Section 1 — Activité CarbonTrack</span>
            <SourceBadge source="platform" />
          </div>
          <div className="h-px flex-1 bg-gray-800" />
        </div>
        <p className="text-gray-500 text-xs">Transactions, commissions et volumes générés directement sur votre plateforme. Données PostgreSQL temps réel.</p>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: DollarSign, color: 'emerald',
              label: 'Commissions Perçues',
              value: adminStats ? (adminStats.totals.totalCommission / 1000).toFixed(1) + 'k FCFA' : '—',
              sub: '20% local · 10% global',
            },
            {
              icon: Leaf, color: 'blue',
              label: 'CO₂ Total Compensé',
              value: adminStats ? adminStats.totals.totalTons.toLocaleString('fr-FR') + ' T' : '—',
              sub: 'Tonnes certifiées achetées',
            },
            {
              icon: ArrowUpRight, color: 'amber',
              label: 'Transactions Complétées',
              value: adminStats ? String(adminStats.totals.totalTransactions) : '—',
              sub: 'Achats réussis sur la plateforme',
            },
            {
              icon: BarChart3, color: 'purple',
              label: 'Projets Catalogués',
              value: String(projects.length),
              sub: `${projects.filter(p => p.is_local).length} ONG locaux · ${projects.filter(p => !p.is_local).length} Carbonmark`,
            },
          ].map(({ icon: Icon, color, label, value, sub }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-3xl p-5">
              <div className={`w-10 h-10 bg-${color}-500/10 rounded-2xl flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 text-${color}-500`} />
              </div>
              <p className="text-2xl font-black text-white">{value}</p>
              <p className="text-xs font-bold text-gray-400 mt-1">{label}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Monthly volume chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-white">Volume Mensuel — Plateforme CarbonTrack</h2>
              <p className="text-gray-500 text-xs mt-0.5">Tonnes CO₂ compensées par mois + commissions perçues (FCFA)</p>
            </div>
            <SourceBadge source="platform" />
          </div>
          {adminStats && adminStats.monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={adminStats.monthly} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="totalTons" fill="#10b981" radius={[4, 4, 0, 0]} name="Tonnes CO₂" />
                <Bar dataKey="totalCommission" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Commissions (FCFA)" />
                <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 11, paddingTop: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center gap-3 text-gray-700">
              <BarChart3 className="w-10 h-10 opacity-20" />
              <p className="text-sm">Aucune transaction encore enregistrée sur la plateforme</p>
              <p className="text-xs text-gray-600">Les données apparaîtront dès le premier achat de crédit carbone.</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2 — MARCHÉ MONDIAL (KlimaDAO Carbonmark)
      ════════════════════════════════════════════════════════════════ */}
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-800" />
          <div className="flex items-center gap-2">
            <CircleDot className="w-4 h-4 text-blue-500" />
            <span className="text-blue-400 text-xs font-black uppercase tracking-widest">Section 2 — Marché Mondial Carbonmark</span>
            <SourceBadge source="carbonmark" />
          </div>
          <div className="h-px flex-1 bg-gray-800" />
        </div>
        <p className="text-gray-500 text-xs">
          Données live issues de <strong className="text-gray-400">api.carbonmark.com</strong> — tokens TCO2 Toucan Protocol certifiés VCS, listés sur Polygon. Ce sont les projets que vos entreprises clientes voient dans l&apos;onglet &quot;Marché Global&quot;.
        </p>

        {/* Carbonmark stats banner */}
        {carbonmarkMeta?.stats && (
          <div className="bg-blue-950/30 border border-blue-800/50 rounded-2xl p-5 flex flex-wrap items-center gap-6">
            {[
              { label: 'Annonces actives', value: carbonmarkMeta.stats.activeListings, desc: 'projets en vente sur Carbonmark' },
              { label: 'TCO2 disponibles', value: (carbonmarkMeta.stats.totalAvailableTons / 1000).toFixed(0) + 'k', desc: 'tonnes de CO₂ à acheter' },
              { label: 'Retraits blockchain', value: carbonmarkMeta.stats.retirementCount, desc: 'transactions vérifiées sur Polygon' },
              { label: 'Tonnes retirées', value: carbonmarkMeta.stats.totalRetiredTons.toLocaleString(), desc: 'CO₂ définitivement compensé' },
            ].map(s => (
              <div key={s.label} className="min-w-[120px]">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-blue-400 text-xs font-bold">{s.label}</p>
                <p className="text-gray-600 text-[10px]">{s.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Charts row: Category pie + Retirement timeline */}
        {carbonmarkMeta && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* Category distribution */}
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-white">Répartition par Catégorie de Projet</h2>
                  <p className="text-gray-500 text-xs mt-0.5">
                    Types de crédits carbone en vente sur Carbonmark — {carbonmarkMeta.stats.activeListings} annonces actives
                  </p>
                </div>
                <SourceBadge source="carbonmark" />
              </div>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={150} height={150}>
                  <PieChart>
                    <Pie data={carbonmarkMeta.categoryDistribution} cx="50%" cy="50%" innerRadius={42} outerRadius={70} dataKey="count" paddingAngle={2}>
                      {carbonmarkMeta.categoryDistribution.map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number, n: string, p: any) => [`${v} annonces`, p.payload.name]} contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {carbonmarkMeta.categoryDistribution.map((c: any, i: number) => (
                    <div key={c.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-gray-400 text-xs truncate flex-1">{c.name}</span>
                      <span className="text-gray-300 text-xs font-bold">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Retirement timeline */}
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-white">Retraits Blockchain — Timeline Mensuelle</h2>
                  <p className="text-gray-500 text-xs mt-0.5">
                    Tonnes de CO₂ définitivement retirées chaque mois via smart contracts Polygon
                  </p>
                </div>
                <SourceBadge source="carbonmark" />
              </div>
              {carbonmarkMeta.retirementTimeline?.length > 0 ? (
                <ResponsiveContainer width="100%" height={175}>
                  <AreaChart data={carbonmarkMeta.retirementTimeline}>
                    <defs>
                      <linearGradient id="retirGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="tons" stroke="#3b82f6" strokeWidth={2} fill="url(#retirGrad)" name="Tonnes CO₂ Retirées" dot={{ fill: '#3b82f6', r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[175px] flex items-center justify-center text-gray-600 text-sm">Données indisponibles</div>
              )}
            </div>
          </div>
        )}

        {/* Geographic + Price distribution */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Geographic */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-base font-bold text-white">Répartition Géographique</h2>
                  <p className="text-gray-500 text-xs mt-0.5">
                    Pays d&apos;origine des projets carbone listés sur Carbonmark — Top 10
                  </p>
                </div>
              </div>
              <SourceBadge source="carbonmark" />
            </div>
            {carbonmarkMeta?.countryDistribution?.length > 0 ? (
              <div className="space-y-3">
                {carbonmarkMeta.countryDistribution.map((c: any) => {
                  const max = carbonmarkMeta.countryDistribution[0].count
                  return (
                    <div key={c.name}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300 text-sm font-medium">{c.name}</span>
                        <span className="text-gray-500 text-xs">{c.count} annonce{c.count > 1 ? 's' : ''}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${Math.max(4, (c.count / max) * 100)}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (adminStats?.byCountry?.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {adminStats!.byCountry.map((c) => (
                  <div key={c.country}>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-300 text-sm font-medium">{c.country}</span>
                      <span className="text-gray-500 text-xs">{c.tons.toLocaleString()} T</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.max(4, (c.tons / maxCountryTons) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-600 text-sm">Aucune donnée disponible</div>
            )}
          </div>

          {/* Price range */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-base font-bold text-white">Fourchettes de Prix — Annonces Carbonmark</h2>
                  <p className="text-gray-500 text-xs mt-0.5">
                    Prix de vente réels (USD / tonne CO₂) des listings actifs — ce que paie l&apos;acheteur
                  </p>
                </div>
              </div>
              <SourceBadge source="carbonmark" />
            </div>
            {carbonmarkMeta?.priceRanges ? (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={carbonmarkMeta.priceRanges} barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Annonces', angle: -90, position: 'insideLeft', fill: '#4b5563', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} formatter={(v: number) => [v + ' annonces', 'Nombre de projets']} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Annonces">
                      {carbonmarkMeta.priceRanges.map((_: any, i: number) => (
                        <Cell key={i} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444'][i % 4]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-4 gap-2 mt-3 border-t border-gray-800 pt-3">
                  {carbonmarkMeta.priceRanges.map((r: any) => (
                    <div key={r.label} className="text-center">
                      <p className="text-xs text-gray-500 font-medium">{r.label}</p>
                      <p className="text-xl font-black text-white">{r.count}</p>
                      <p className="text-[10px] text-gray-600">projets</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-600 text-sm">Données indisponibles</div>
            )}
          </div>
        </div>

        {/* Live retirement feed */}
        {carbonmarkMeta?.liveFeed?.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">Retraits Blockchain Récents</h2>
                <p className="text-gray-500 text-xs mt-0.5">
                  Dernières transactions de compensation vérifiées sur Polygon — tokens TCO2 brûlés définitivement
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <SourceBadge source="carbonmark" />
                <div className="flex items-center gap-2 text-blue-400 text-xs font-bold bg-blue-900/40 border border-blue-800 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  Live Polygon
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-800">
              {carbonmarkMeta.liveFeed.slice(0, 10).map((r: any) => (
                <div key={r.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Leaf className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-bold truncate">{r.beneficiaryName}</p>
                      <p className="text-gray-500 text-xs font-mono truncate">{r.tokenName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-blue-400 font-black text-sm">{r.amount.toFixed(3)} T CO₂</p>
                      <p className="text-gray-600 text-xs">{r.date}</p>
                    </div>
                    {r.polygonscanUrl && (
                      <a href={r.polygonscanUrl} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-400 transition-colors p-1.5 rounded-lg hover:bg-blue-900/20" title="Voir sur Polygonscan">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3 — PRIX DeFi BLOCKCHAIN (CoinGecko)
      ════════════════════════════════════════════════════════════════ */}
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-800" />
          <div className="flex items-center gap-2">
            <CircleDot className="w-4 h-4 text-purple-500" />
            <span className="text-purple-400 text-xs font-black uppercase tracking-widest">Section 3 — Prix Tokens DeFi (NCT & BCT)</span>
            <SourceBadge source="coingecko" />
          </div>
          <div className="h-px flex-1 bg-gray-800" />
        </div>
        <p className="text-gray-500 text-xs">
          NCT et BCT sont des <strong className="text-gray-400">tokens ERC-20 sur Polygon</strong> créés par Toucan Protocol. Leur prix fluctue sur les marchés DeFi (Uniswap, SushiSwap).
          Ces prix sont <strong className="text-amber-400">inférieurs aux prix de vente Carbonmark</strong> car ils représentent des pools génériques sans prime de qualité.
        </p>

        {/* NCT / BCT explanation cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {marketStats && [
            {
              key: 'NCT',
              fullName: 'Nature Carbon Tonne',
              value: marketStats.nctPriceFCFA,
              usd: (marketStats.nctPriceFCFA / FCFA_PER_USD).toFixed(3),
              color: 'emerald',
              desc: 'Pool de crédits carbone issus de projets nature (forêts, REDD+, reforestation). Standard VCS Verra. Projets post-2016.',
            },
            {
              key: 'BCT',
              fullName: 'Base Carbon Tonne',
              value: marketStats.bctPriceFCFA,
              usd: (marketStats.bctPriceFCFA / FCFA_PER_USD).toFixed(3),
              color: 'purple',
              desc: 'Pool générique de crédits carbone VCS (tous types de projets). Standard de base Toucan. Projets post-2008.',
            },
          ].map(t => (
            <div key={t.key} className={`bg-gray-900 border border-gray-800 rounded-3xl p-5`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-black px-2 py-0.5 rounded-md bg-${t.color}-900/50 text-${t.color}-400 border border-${t.color}-800`}>{t.key}</span>
                    <span className="text-gray-400 text-xs font-bold">{t.fullName}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-black text-white">{t.value.toLocaleString()}</p>
                    <span className="text-gray-400 text-sm">FCFA / tonne</span>
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">= ${t.usd} USD · Taux 1 USD = 600 FCFA</p>
                </div>
                <SourceBadge source="coingecko" />
              </div>
              <p className="text-gray-500 text-xs leading-relaxed border-t border-gray-800 pt-3">{t.desc}</p>
            </div>
          ))}
        </div>

        {/* Price history chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-white">Évolution des Prix NCT & BCT — 7 derniers jours</h2>
              <p className="text-gray-500 text-xs mt-0.5">
                Prix spot en FCFA / tonne CO₂ sur le marché DeFi Polygon · <span className="text-amber-400">≠ prix de vente retail Carbonmark</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-emerald-500 rounded inline-block" /><span className="text-gray-400">NCT (Nature)</span></span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-purple-500 rounded inline-block" /><span className="text-gray-400">BCT (Base)</span></span>
              </div>
              <SourceBadge source="coingecko" />
            </div>
          </div>
          {priceHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={priceHistory}>
                <defs>
                  <linearGradient id="nctGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bctGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v.toLocaleString()} label={{ value: 'FCFA/T', angle: -90, position: 'insideLeft', fill: '#4b5563', fontSize: 9 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="nct" stroke="#10b981" strokeWidth={2} fill="url(#nctGrad)" name="NCT (Nature Carbon Tonne)" dot={false} />
                <Area type="monotone" dataKey="bct" stroke="#8b5cf6" strokeWidth={2} fill="url(#bctGrad)" name="BCT (Base Carbon Tonne)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-gray-600">
              <Coins className="w-8 h-8 opacity-20" />
              <p className="text-sm">Données CoinGecko indisponibles</p>
              <p className="text-xs">Rate limit atteint — réessayez dans quelques minutes</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          INVENTAIRE COMPLET — toutes sources combinées
      ════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-800" />
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-xs font-black uppercase tracking-widest">Inventaire complet — tous projets</span>
          </div>
          <div className="h-px flex-1 bg-gray-800" />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">Tous les Projets Carbone</h2>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />{projects.filter(p => p.is_local).length} ONG Locaux (CarbonTrack DB)
                </span>
                <span className="text-gray-700">·</span>
                <span className="flex items-center gap-1.5 text-[10px] text-blue-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />{projects.filter(p => !p.is_local).length} Globaux (Carbonmark TCO2)
                </span>
              </div>
            </div>
            <input
              type="text"
              placeholder="Rechercher par nom, pays, type..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-600 w-full sm:w-72"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-800/50 text-gray-400 text-[10px] uppercase tracking-widest">
                  <th className="px-6 py-4 font-bold">Projet</th>
                  <th className="px-6 py-4 font-bold">Source</th>
                  <th className="px-6 py-4 font-bold">Catégorie</th>
                  <th className="px-6 py-4 font-bold">Pays</th>
                  <th className="px-6 py-4 font-bold">Millésime</th>
                  <th className="px-6 py-4 font-bold">Disponible</th>
                  <th className="px-6 py-4 font-bold">Prix / Tonne</th>
                  <th className="px-6 py-4 font-bold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredProjects.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-600 text-sm">Aucun résultat</td></tr>
                ) : filteredProjects.map(p => (
                  <tr key={p.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                          <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                        </div>
                        <p className="font-bold text-white text-sm line-clamp-1 max-w-[180px]">{p.title}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {p.is_local ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full border bg-emerald-900/30 border-emerald-800 text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />ONG Local
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full border bg-blue-900/30 border-blue-800 text-blue-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Toucan TCO2
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-800 text-gray-400 text-[10px] font-bold px-2 py-1 rounded-md uppercase">{p.category || p.project_type}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-300 text-sm">{p.country}</td>
                    <td className="px-6 py-4 text-gray-400 text-sm font-mono">{p.vintage || '—'}</td>
                    <td className="px-6 py-4 text-gray-300 text-sm">{p.tons_available ? p.tons_available.toLocaleString() + ' T' : '—'}</td>
                    <td className="px-6 py-4">
                      <p className="font-black text-white text-sm">{p.price_per_ton.toLocaleString()} FCFA</p>
                      <p className="text-gray-600 text-[10px]">≈ ${(p.price_per_ton / FCFA_PER_USD).toFixed(2)} USD</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-emerald-500 text-xs font-bold">En Vente</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
