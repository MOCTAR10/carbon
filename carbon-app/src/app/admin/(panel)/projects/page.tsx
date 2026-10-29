'use client'

import { useState, useEffect } from 'react'
import {
  Leaf, Search, Filter, ChevronDown, ChevronUp, X,
  Globe2, MapPin, BarChart3
} from 'lucide-react'

interface Project {
  id: number
  title: string
  project_type: string
  project_type_mrv: string | null
  standard: string | null
  methodology: string | null
  methodology_code: string | null
  country: string | null
  location_name: string | null
  status: string
  area_ha: number | null
  baseline_tco2_yr: number | null
  credits_eligible: number | null
  partner_name: string | null
  partner_id: number | null
  tons_available: number
  tons_sold: number
  price_per_ton: number
  start_date: string | null
  end_date: string | null
  created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft:        { label: 'Brouillon',       cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  active:       { label: 'Actif',           cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  under_review: { label: 'En révision',     cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  registered:   { label: 'Enregistré',      cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  rejected:     { label: 'Rejeté',          cls: 'bg-red-50 text-red-700 border-red-200' },
  paused:       { label: 'Suspendu',        cls: 'bg-orange-50 text-orange-700 border-orange-200' },
}

const TYPE_LABELS: Record<string, string> = {
  redd_plus:    'REDD+',
  arr:          'ARR',
  reforestation:'Reforestation',
  cookstoves:   'Foyers améliorés',
  mangrove:     'Mangrove',
  blue_carbon:  'Carbone bleu',
  solar:        'Solaire',
  industrial:   'Industriel',
  commercial:   'Commercial',
}

const METHOD_BADGE: Record<string, string> = {
  VM0048: 'bg-green-50 text-green-700 border-green-200',
  VM0047: 'bg-teal-50 text-teal-700 border-teal-200',
  VM0050: 'bg-orange-50 text-orange-700 border-orange-200',
  VM0033: 'bg-blue-50 text-blue-700 border-blue-200',
  'OGEC-GHG-001': 'bg-purple-50 text-purple-700 border-purple-200',
}

function fmt(n: number | null | undefined, unit = '') {
  if (n == null) return '—'
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}${unit ? ' ' + unit : ''}`
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/partner/projects')
      .then(r => r.json())
      .then(d => setProjects(d.projects ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const statuses = Array.from(new Set(projects.map(p => p.status)))

  const filtered = projects.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || p.title.toLowerCase().includes(q)
      || (p.partner_name ?? '').toLowerCase().includes(q)
      || (p.country ?? '').toLowerCase().includes(q)
      || (p.methodology_code ?? '').toLowerCase().includes(q)
    const matchStatus = !statusFilter || p.status === statusFilter
    return matchSearch && matchStatus
  })

  // Aggregate KPIs
  const totalBaseline = projects.reduce((s, p) => s + (p.baseline_tco2_yr ?? 0), 0)
  const totalCredits  = projects.reduce((s, p) => s + (p.credits_eligible ?? 0), 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Projets Carbone NGO</h1>
          <p className="text-sm text-gray-500 mt-0.5">{projects.length} projet{projects.length !== 1 ? 's' : ''} enregistrés</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total projets',       value: projects.length.toString(),           sub: 'tous statuts' },
          { label: 'Projets actifs',       value: projects.filter(p => p.status === 'active').length.toString(), sub: 'statut actif' },
          { label: 'Baseline cumulé',     value: fmt(totalBaseline, 'tCO₂e/an'),      sub: 'tous projets' },
          { label: 'Crédits éligibles',   value: fmt(totalCredits, 'tCO₂e'),          sub: 'dernier calcul MRV' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">{k.label}</div>
            <div className="text-lg font-bold text-gray-900">{k.value}</div>
            <div className="text-xs text-gray-400">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher projet, partenaire, méthodologie…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="relative">
          <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
          >
            <option value="">Tous les statuts</option>
            {statuses.map(s => (
              <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>
            ))}
          </select>
        </div>
        {(search || statusFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter('') }} className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg bg-white">
            <X className="w-3.5 h-3.5" /> Effacer
          </button>
        )}
      </div>

      {/* Table / cards */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400">
          Chargement…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <Leaf className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Aucun projet trouvé</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const statusCfg = STATUS_CONFIG[p.status] ?? { label: p.status, cls: 'bg-gray-100 text-gray-600 border-gray-200' }
            const methodCls = p.methodology_code ? (METHOD_BADGE[p.methodology_code] ?? 'bg-gray-50 text-gray-600 border-gray-200') : ''
            const expanded = expandedId === p.id

            return (
              <div key={p.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                {/* Row */}
                <div className="flex items-start gap-4 p-4">
                  {/* Icon */}
                  <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Leaf className="w-4 h-4 text-emerald-600" />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{p.title}</span>
                      <span className={`text-xs border px-2 py-0.5 rounded-full ${statusCfg.cls}`}>{statusCfg.label}</span>
                      {p.methodology_code && (
                        <span className={`text-xs border px-2 py-0.5 rounded-full font-mono ${methodCls}`}>{p.methodology_code}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-gray-500">
                      {p.partner_name && (
                        <span className="font-medium text-gray-700">{p.partner_name}</span>
                      )}
                      {p.project_type_mrv && (
                        <span>{TYPE_LABELS[p.project_type_mrv] ?? p.project_type_mrv}</span>
                      )}
                      {p.country && (
                        <span className="flex items-center gap-0.5">
                          <Globe2 className="w-3 h-3" />{p.country}
                        </span>
                      )}
                      {p.area_ha != null && (
                        <span>{fmt(p.area_ha, 'ha')}</span>
                      )}
                    </div>
                  </div>

                  {/* MRV KPIs */}
                  <div className="hidden md:flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-gray-900 text-sm">{fmt(p.baseline_tco2_yr)}</div>
                      <div className="text-xs text-gray-400">tCO₂e/an baseline</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-emerald-700 text-sm">{fmt(p.credits_eligible)}</div>
                      <div className="text-xs text-gray-400">crédits éligibles</div>
                    </div>
                  </div>

                  {/* Expand */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setExpandedId(expanded ? null : p.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Type projet</div>
                        <div className="text-gray-800">{TYPE_LABELS[p.project_type_mrv ?? ''] ?? p.project_type ?? '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Standard</div>
                        <div className="text-gray-800">{p.standard ?? '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Méthodologie</div>
                        <div className="text-gray-800">{p.methodology ?? p.methodology_code ?? '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Superficie</div>
                        <div className="text-gray-800">{fmt(p.area_ha, 'ha')}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Baseline (tCO₂e/an)</div>
                        <div className="text-gray-800">{fmt(p.baseline_tco2_yr)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Crédits éligibles</div>
                        <div className="font-semibold text-emerald-700">{fmt(p.credits_eligible, 'tCO₂e')}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Tonnes disponibles</div>
                        <div className="text-gray-800">{fmt(p.tons_available, 't')}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Tonnes vendues</div>
                        <div className="text-gray-800">{fmt(p.tons_sold, 't')}</div>
                      </div>
                      {p.start_date && (
                        <div>
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Période</div>
                          <div className="text-gray-800">
                            {new Date(p.start_date).toLocaleDateString('fr-FR')}
                            {p.end_date ? ` → ${new Date(p.end_date).toLocaleDateString('fr-FR')}` : ''}
                          </div>
                        </div>
                      )}
                      {p.location_name && (
                        <div>
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Localisation</div>
                          <div className="text-gray-800 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400" />{p.location_name}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Enregistré le</div>
                        <div className="text-gray-800">{new Date(p.created_at).toLocaleDateString('fr-FR')}</div>
                      </div>
                    </div>

                    {/* MRV note */}
                    <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 bg-gray-100 rounded-lg px-3 py-2">
                      <BarChart3 className="w-3.5 h-3.5 flex-shrink-0" />
                      Les données Baseline MRV et suivi sont gérées par le partenaire ONG depuis son portail.
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
