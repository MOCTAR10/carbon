'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Building2, ClipboardList, TrendingDown, Plus, ArrowRight,
  Leaf, Upload, Award, CheckCircle2, Clock, AlertCircle,
  BarChart3, Globe2, RefreshCw, XCircle,
} from 'lucide-react'

interface DashboardData {
  company: {
    id: number; name: string; sector: string | null
    rccm: string | null; logoUrl: string | null
  }
  totals: { totalCo2eq: number; totalScope1: number; totalScope2: number; totalScope3: number }
  byCountry: Record<string, number>
  sites: Array<{ id: number; name: string; type: string; country: string | null; assessment_count: number }>
  assessments: Array<{
    id: number; name: string; year: number; status: string; created_at: string
    total_co2eq: number; scope1_co2eq: number; scope2_co2eq: number; scope3_co2eq: number
    site_name: string; site_country: string | null
  }>
  certifications: Array<{
    id: number; status: string; requested_at: string; certified_at: string | null
    certificate_number: string | null; expert_name: string | null
    assessment_name: string; assessment_year: number
  }>
  certCounts: { pending: number; inProgress: number; certified: number; rejected: number }
}

const CERT_STATUS: Record<string, { label: string; color: string }> = {
  pending:    { label: 'En attente',   color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  assigned:   { label: 'Assigné',      color: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress:{ label: 'En cours',     color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  audit_done: { label: 'Audit terminé',color: 'bg-purple-50 text-purple-700 border-purple-200' },
  certified:  { label: 'Certifié ✓',  color: 'bg-green-50 text-green-700 border-green-200' },
  rejected:   { label: 'Rejeté',       color: 'bg-red-50 text-red-700 border-red-200' },
}

function fmtCO2(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} MtCO₂e`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(2)} tCO₂e`
  return `${v.toFixed(0)} kgCO₂e`
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch('/api/dashboard/stats')
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('logo', file)
    const res = await fetch('/api/company/logo', { method: 'POST', body: fd })
    if (res.ok) {
      const d = await res.json()
      setData(prev => prev ? { ...prev, company: { ...prev.company, logoUrl: d.logoUrl } } : prev)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const { company, totals, byCountry, sites, assessments, certifications, certCounts } = data
  const countryStats = Object.entries(byCountry).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-6">

      {/* ── Welcome banner ── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-5 shadow-sm">
        <div className="relative group flex-shrink-0">
          <div className="h-14 min-w-[56px] max-w-[200px] px-2 flex items-center justify-center">
            {company.logoUrl
              ? <img src={company.logoUrl} alt={company.name} className="h-full w-auto object-contain" />
              : <div className="w-14 h-14 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-center"><Leaf className="w-7 h-7 text-brand-400" /></div>}
          </div>
          <label className="absolute inset-0 rounded-xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer gap-0.5">
            <Upload className="w-4 h-4 text-white" />
            <span className="text-white text-[9px] font-medium">Changer</span>
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          </label>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{company.name}</h1>
          <p className="text-gray-400 text-sm">
            {company.sector ? `${company.sector} · ` : ''}
            {sites.length} site{sites.length > 1 ? 's' : ''} ·{' '}
            {assessments.length} bilan{assessments.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => load(true)}
            className={`p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors ${refreshing ? 'animate-spin' : ''}`}
            title="Rafraîchir"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link href="/dashboard/assessments/new" className="btn-primary inline-flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Nouveau bilan
          </Link>
        </div>
      </div>

      {/* ── Emissions KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Émissions totales', value: fmtCO2(totals.totalCo2eq), icon: TrendingDown, bg: 'bg-brand-50', ico: 'text-brand-600' },
          { label: 'Scope 1 — Direct',  value: fmtCO2(totals.totalScope1), icon: BarChart3,   bg: 'bg-red-50',   ico: 'text-red-500' },
          { label: 'Scope 2 — Énergie', value: fmtCO2(totals.totalScope2), icon: BarChart3,   bg: 'bg-orange-50',ico: 'text-orange-500' },
          { label: 'Scope 3 — Indirect',value: fmtCO2(totals.totalScope3), icon: BarChart3,   bg: 'bg-blue-50',  ico: 'text-blue-500' },
        ].map((s, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500">{s.label}</span>
              <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center`}>
                <s.icon className={`w-4 h-4 ${s.ico}`} />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Certification KPIs ── */}
      {certifications.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'En attente',    value: certCounts.pending,    icon: Clock,         bg: 'bg-yellow-50', ico: 'text-yellow-600' },
            { label: 'En cours',      value: certCounts.inProgress, icon: AlertCircle,   bg: 'bg-blue-50',   ico: 'text-blue-600' },
            { label: 'Certifiés ✓',   value: certCounts.certified,  icon: CheckCircle2,  bg: 'bg-green-50',  ico: 'text-green-600' },
            { label: 'Rejetés',       value: certCounts.rejected,   icon: XCircle,       bg: 'bg-red-50',    ico: 'text-red-500' },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 shadow-sm">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.ico}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Emissions by country ── */}
      {countryStats.length > 1 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe2 className="w-4 h-4 text-brand-600" />
            <h2 className="font-semibold text-gray-900">Émissions par pays</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {countryStats.map(([country, val]) => (
              <div key={country} className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs font-semibold text-gray-600 mb-1">{country}</p>
                <p className="text-base font-bold text-brand-600">{fmtCO2(val)}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {totals.totalCo2eq > 0 ? ((val / totals.totalCo2eq) * 100).toFixed(1) + ' %' : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── Sites ── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Sites & Entités</h2>
            <Link href="/dashboard/sites" className="text-brand-600 hover:text-brand-700 text-xs font-medium flex items-center gap-1">
              Voir tout <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {sites.length === 0 ? (
            <div className="text-center py-6">
              <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm mb-3">Aucun site enregistré</p>
              <Link href="/dashboard/sites" className="btn-primary inline-flex items-center gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {sites.slice(0, 5).map(site => (
                <div key={site.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-brand-50 transition-colors">
                  <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{site.name}</p>
                    <p className="text-xs text-gray-400">{site.type}{site.country ? ` · ${site.country}` : ''} · {site.assessment_count} bilan{site.assessment_count > 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
              {sites.length > 5 && (
                <Link href="/dashboard/sites" className="block text-center text-xs text-brand-600 hover:text-brand-700 py-1">
                  +{sites.length - 5} de plus
                </Link>
              )}
            </div>
          )}
        </div>

        {/* ── Recent assessments ── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Bilans récents</h2>
            <Link href="/dashboard/assessments" className="text-brand-600 hover:text-brand-700 text-xs font-medium flex items-center gap-1">
              Voir tout <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {assessments.length === 0 ? (
            <div className="text-center py-6">
              <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm mb-3">Aucun bilan carbone</p>
              <Link href="/dashboard/assessments" className="btn-primary inline-flex items-center gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" /> Créer
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {assessments.slice(0, 5).map(a => (
                <Link key={a.id} href={`/dashboard/assessments/${a.id}`}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 hover:bg-brand-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.site_name} · {a.year}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-sm font-semibold text-gray-900">{fmtCO2(parseFloat(String(a.total_co2eq)) || 0)}</p>
                    <p className="text-[10px] text-gray-400">{fmtDate(a.created_at)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Certifications ── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Certifications</h2>
            <Link href="/dashboard/certifications" className="text-brand-600 hover:text-brand-700 text-xs font-medium flex items-center gap-1">
              Voir tout <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {certifications.length === 0 ? (
            <div className="text-center py-6">
              <Award className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm mb-1">Aucune certification</p>
              <p className="text-xs text-gray-400">Finalisez un bilan puis soumettez-le</p>
            </div>
          ) : (
            <div className="space-y-2">
              {certifications.slice(0, 5).map(c => {
                const s = CERT_STATUS[c.status] ?? { label: c.status, color: 'bg-gray-50 text-gray-700 border-gray-200' }
                return (
                  <Link key={c.id} href={`/dashboard/certifications`}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 hover:bg-brand-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.assessment_name}</p>
                      <p className="text-xs text-gray-400">{c.assessment_year} · {fmtDate(c.requested_at)}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ml-2 ${s.color}`}>
                      {s.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
