'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ClipboardList, Plus, X, Calendar, Building2, Award, Shield, MapPin, Filter } from 'lucide-react'

interface Site { id: number; name: string; type: string; country?: string | null; address?: string | null }
interface Assessment {
  id: number; name: string; year: number; status: string;
  total_co2eq: number; site_name: string; site_type: string;
  site_country?: string | null; site_address?: string | null;
  scope1_co2eq: number; scope2_co2eq: number; scope3_co2eq: number;
  start_month?: number; end_month?: number;
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function monthRange(start?: number, end?: number) {
  if (!start || !end) return null
  if (start === 1 && end === 12) return 'Année complète'
  if (start === end) return MONTHS[start - 1]
  return `${MONTHS[start - 1]} – ${MONTHS[end - 1]}`
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i)

export default function AssessmentsPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    siteId: '', name: '', year: CURRENT_YEAR,
    approach: 'operational_control',
    start_month: 1, end_month: 12,
  })
  const [loading, setLoading] = useState(false)
  const [certStatuses, setCertStatuses] = useState<Record<number, string>>({})

  // Filters
  const [filterSite, setFilterSite] = useState('')
  const [filterYear, setFilterYear] = useState('')

  // Deep link from the dashboard: /dashboard/assessments?new=1 opens the creation form
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new') === '1') setShowForm(true)
  }, [])

  useEffect(() => {
    fetch('/api/sites').then(r => r.json()).then(d => { if (Array.isArray(d)) setSites(d) }).catch(() => {})
    fetch('/api/assessments').then(r => r.json()).then(d => { if (Array.isArray(d)) setAssessments(d) }).catch(() => {})
    fetch('/api/certifications').then(r => r.json()).then((certs: { assessmentId: number; status: string }[]) => {
      if (Array.isArray(certs)) {
        const map: Record<number, string> = {}
        certs.forEach(c => { map[c.assessmentId] = c.status })
        setCertStatuses(map)
      }
    }).catch(() => {})
  }, [])

  // Auto-generate bilan name from selections
  useEffect(() => {
    const site = sites.find(s => String(s.id) === form.siteId)
    if (!site) return
    const period = monthRange(form.start_month, form.end_month) ?? 'Année complète'
    setForm(p => ({ ...p, name: `Bilan Carbone ${form.year} – ${site.name}${period !== 'Année complète' ? ` (${period})` : ''}` }))
  }, [form.siteId, form.year, form.start_month, form.end_month, sites])

  const filtered = useMemo(() => assessments.filter(a => {
    if (filterSite && String(a.site_name) !== filterSite) return false
    if (filterYear && String(a.year) !== filterYear) return false
    return true
  }), [assessments, filterSite, filterYear])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setShowForm(false)
        setForm({ siteId: '', name: '', year: CURRENT_YEAR, approach: 'operational_control', start_month: 1, end_month: 12 })
        fetch('/api/assessments').then(r => r.json()).then(d => { if (Array.isArray(d)) setAssessments(d) })
      }
    } finally { setLoading(false) }
  }

  const formatCO2 = (v: number) => {
    const val = parseFloat(String(v)) || 0
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)} ktCO2eq`
    if (val >= 1000) return `${(val / 1000).toFixed(1)} tCO2eq`
    return `${val.toFixed(0)} kgCO2eq`
  }

  const uniqueSiteNames = Array.from(new Set(assessments.map(a => a.site_name)))
  const uniqueYears = Array.from(new Set(assessments.map(a => a.year))).sort((a, b) => b - a)
  const activeFilters = (filterSite ? 1 : 0) + (filterYear ? 1 : 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bilans Carbone</h1>
          <p className="text-gray-500 mt-1">Créez et gérez vos bilans d&apos;émissions par site et période</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouveau bilan
        </button>
      </div>

      {/* Filter bar */}
      {assessments.length > 0 && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filtrer :</span>
          </div>
          <select
            value={filterSite}
            onChange={e => setFilterSite(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          >
            <option value="">Tous les sites</option>
            {uniqueSiteNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          >
            <option value="">Toutes les années</option>
            {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {activeFilters > 0 && (
            <button
              onClick={() => { setFilterSite(''); setFilterYear('') }}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors"
            >
              Réinitialiser ({activeFilters})
            </button>
          )}
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} bilan{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-7 pb-5 flex-shrink-0 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Nouveau bilan carbone</h2>
                <p className="text-xs text-gray-400 mt-0.5">Sélectionnez un site et définissez la période</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-8 py-6">
              <form id="assessment-form" onSubmit={handleCreate} className="space-y-4">

                {/* Site */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Site concerné *</label>
                  <select
                    value={form.siteId}
                    onChange={e => setForm(p => ({ ...p, siteId: e.target.value }))}
                    className="input-field"
                    required
                  >
                    <option value="">Sélectionner un site...</option>
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.country ? ` — ${s.country}` : ''}
                      </option>
                    ))}
                  </select>
                  {sites.length === 0 && (
                    <p className="text-xs text-orange-500 mt-1">Vous devez d&apos;abord <a href="/dashboard/sites" className="underline">créer un site</a>.</p>
                  )}
                  {form.siteId && (() => {
                    const s = sites.find(x => String(x.id) === form.siteId)
                    return s && (s.country || s.address) ? (
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {[s.address, s.country].filter(Boolean).join(', ')}
                      </p>
                    ) : null
                  })()}
                </div>

                {/* Year + Approach */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Année *</label>
                    <select
                      value={form.year}
                      onChange={e => setForm(p => ({ ...p, year: parseInt(e.target.value) }))}
                      className="input-field"
                      required
                    >
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Approche</label>
                    <select value={form.approach} onChange={e => setForm(p => ({ ...p, approach: e.target.value }))} className="input-field">
                      <option value="operational_control">Contrôle opérationnel</option>
                      <option value="financial_control">Contrôle financier</option>
                      <option value="equity_share">Part du capital</option>
                    </select>
                  </div>
                </div>

                {/* Period */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Période couverte</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-gray-400 mb-1 block">Mois de début</span>
                      <select
                        value={form.start_month}
                        onChange={e => setForm(p => ({ ...p, start_month: parseInt(e.target.value) }))}
                        className="input-field"
                      >
                        {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 mb-1 block">Mois de fin</span>
                      <select
                        value={form.end_month}
                        onChange={e => setForm(p => ({ ...p, end_month: parseInt(e.target.value) }))}
                        className="input-field"
                      >
                        {MONTHS.map((m, i) => <option key={i + 1} value={i + 1} disabled={i + 1 < form.start_month}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  {form.start_month && form.end_month && (
                    <p className="text-xs text-brand-600 mt-1.5 font-medium">
                      Période : {monthRange(form.start_month, form.end_month)}
                    </p>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom du bilan *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="input-field"
                    placeholder="Ex: Bilan Carbone 2024 – Siège Libreville"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">Généré automatiquement, modifiable.</p>
                </div>

              </form>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-8 py-5 border-t border-gray-100 flex-shrink-0">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Annuler</button>
              <button
                type="submit"
                form="assessment-form"
                disabled={loading || sites.length === 0}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Créer le bilan'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* List */}
      {assessments.length === 0 ? (
        <div className="card p-16 text-center">
          <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun bilan carbone</h3>
          <p className="text-gray-500 mb-6">Créez votre premier bilan pour commencer à mesurer vos émissions.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nouveau bilan
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Filter className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-700 mb-1">Aucun bilan pour ces filtres</h3>
          <button onClick={() => { setFilterSite(''); setFilterYear('') }} className="text-sm text-brand-600 hover:underline mt-2">
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <Link key={a.id} href={`/dashboard/assessments/${a.id}`} className="card p-5 flex items-center justify-between hover:border-brand-200 block">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{a.name}</h3>
                    {certStatuses[a.id] === 'certified' && (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                        <Award className="w-3 h-3" /> Certifié
                      </span>
                    )}
                    {['pending', 'assigned', 'in_progress'].includes(certStatuses[a.id]) && (
                      <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                        <Shield className="w-3 h-3" /> Certification en cours
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {a.site_name}
                    </span>
                    {a.site_country && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {a.site_country}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {a.year}
                      {a.start_month && a.end_month && !(a.start_month === 1 && a.end_month === 12) && (
                        <span className="text-gray-300">·</span>
                      )}
                      {a.start_month && a.end_month && !(a.start_month === 1 && a.end_month === 12) && (
                        <span>{monthRange(a.start_month, a.end_month)}</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="text-lg font-bold text-gray-900">{formatCO2(a.total_co2eq)}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">S1: {formatCO2(a.scope1_co2eq)}</span>
                  <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">S2: {formatCO2(a.scope2_co2eq)}</span>
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">S3: {formatCO2(a.scope3_co2eq)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
