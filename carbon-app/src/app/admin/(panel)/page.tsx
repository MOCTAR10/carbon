'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Building2, Users, Award,
  AlertCircle, BarChart3, RefreshCw,
  UserCheck, CheckCircle2, XCircle, Activity,
  ArrowRight, Globe2, Send,
} from 'lucide-react'

interface Stats {
  companies: number
  users: number
  assessments: number
  totalEmissions: number
  certifications: number
  glCertifications: number
  experts: number
  certByStatus: Record<string, number>
  recentCompanies: {
    id: number; name: string; sector: string; createdAt: string
    userCount: number; assessmentCount: number
  }[]
  recentCerts: {
    id: number; status: string; requestedAt: string; updatedAt: string
    certificateNumber: string | null; expertName: string | null
    assessmentName: string; assessmentYear: number
    companyName: string; companySector: string
  }[]
  expertWorkload: { expert_name: string; total: number; active: number }[]
  cncStats: { pending: number; completed: number; total: number }
}

const SECTORS: Record<string, string> = {
  petrole_gaz: 'Pétrole & Gaz', mines: 'Mines', foresterie: 'Foresterie',
  agriculture: 'Agriculture', peche: 'Pêche', eau: 'Eau', energie: 'Énergie',
  industrie: 'Industrie', construction: 'Construction', chimie: 'Chimie',
  agroalimentaire: 'Agroalim.', emballage: 'Emballage',
  commerce: 'Commerce', transport: 'Transport', banque: 'Finance',
  telecom: 'Télécom', tech: 'Tech', sante: 'Santé', education: 'Éducation',
  immobilier: 'Immobilier', tourisme: 'Tourisme', medias: 'Médias',
  administration: 'Admin. publique', ong: 'ONG', organisations_int: 'Org. internationale',
  autre: 'Autre',
}

const CERT_STATUS: Record<string, { label: string; dot: string; badge: string }> = {
  pending:    { label: 'En attente',       dot: 'bg-yellow-400', badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  assigned:   { label: 'Assigné',          dot: 'bg-blue-400',   badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  in_progress:{ label: 'En cours',         dot: 'bg-violet-400', badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  audit_done: { label: 'Audit terminé',    dot: 'bg-purple-400', badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  submitted_to_cnc: { label: 'Déposé au CNC', dot: 'bg-amber-400', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  certified:  { label: 'Certifié ✓',      dot: 'bg-green-400',  badge: 'bg-green-500/15 text-green-300 border-green-500/30' },
  rejected:   { label: 'Rejeté',          dot: 'bg-red-400',    badge: 'bg-red-500/15 text-red-300 border-red-500/30' },
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtTons(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M tCO₂e`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K tCO₂e`
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} tCO₂e`
}

// Metric card for the dark theme
function KPI({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-3">
      <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        <p className="text-xs text-gray-400 mt-1">{label}</p>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        const data = await res.json()
        data.recentCompanies ??= []
        data.recentCerts     ??= []
        data.expertWorkload  ??= []
        data.certByStatus    ??= {}
        setStats(data)
        setLastRefresh(new Date())
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-gray-600 border-t-brand-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center gap-2 text-red-400 bg-red-900/20 border border-red-800 rounded-xl p-4">
        <AlertCircle className="w-5 h-5" />
        Impossible de charger les statistiques.
        <button onClick={() => load()} className="ml-auto text-sm underline">Réessayer</button>
      </div>
    )
  }

  const pendingCerts   = stats.certByStatus['pending']     || 0
  const assignedCerts  = (stats.certByStatus['assigned']   || 0) + (stats.certByStatus['in_progress'] || 0) + (stats.certByStatus['audit_done'] || 0)
  const certifiedCount = stats.certByStatus['certified']   || 0
  const rejectedCount  = stats.certByStatus['rejected']    || 0

  const pipelineSteps = [
    { label: 'En attente',  value: pendingCerts,   color: '#eab308' },
    { label: 'En cours',    value: assignedCerts,  color: '#8b5cf6' },
    { label: 'Certifiés',   value: certifiedCount, color: '#22c55e' },
    { label: 'Rejetés',     value: rejectedCount,  color: '#ef4444' },
  ]

  const certRate = stats.certifications > 0
    ? Math.round((certifiedCount / stats.certifications) * 100)
    : 0

  const cncPending  = stats.cncStats?.pending ?? 0
  const cncComplete = stats.cncStats?.completed ?? 0

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Vue d&apos;ensemble de la plateforme CarbonTrack
            {lastRefresh && (
              <span className="ml-2 text-gray-600">· {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 hover:border-brand-500 text-gray-400 hover:text-brand-400 rounded-xl text-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* ── Row 1: Platform KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KPI label="Entreprises"        value={stats.companies}           icon={Building2}  color="bg-blue-600"
             sub={`${stats.companies} inscrites`} />
        <KPI label="Utilisateurs"       value={stats.users}               icon={Users}      color="bg-indigo-600"
             sub={`${stats.experts} experts`} />
        <KPI label="Bilans carbone"     value={stats.assessments}         icon={BarChart3}  color="bg-orange-600"
             sub={`${fmtTons(stats.totalEmissions)}`} />
        <KPI label="Certifications"     value={stats.certifications}      icon={Award}      color="bg-yellow-600"
             sub={`${certRate}% succès · ${rejectedCount} rejeté${rejectedCount > 1 ? 's' : ''}`} />
        <KPI label="Certifications GreenLeaves" value={stats.glCertifications} icon={CheckCircle2} color="bg-emerald-600"
             sub={`${stats.certifications > 0 ? Math.round((stats.glCertifications / stats.certifications) * 100) : 0}% des demandes`} />
      </div>

      {/* ── Row 2: Key status indicators + CNC pipeline ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Globe2 className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Émissions comptabilisées</p>
            <p className="text-lg font-bold text-white">{fmtTons(stats.totalEmissions)}</p>
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Taux de certification</p>
            <p className="text-lg font-bold text-white">{certRate}%</p>
            <p className="text-xs text-gray-500">{certifiedCount} certifiés / {stats.certifications} total</p>
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <XCircle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">En attente d&apos;assignation</p>
            <p className="text-lg font-bold text-white">{pendingCerts}</p>
            <Link href="/admin/certifications" className="text-xs text-brand-400 hover:text-brand-300">Traiter →</Link>
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Send className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Déposés au CNC</p>
            <p className="text-lg font-bold text-white">{cncPending}</p>
            <span className="text-xs text-gray-500">{cncComplete} certificat{cncComplete > 1 ? 's' : ''} reçu{cncComplete > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* ── Row 3: Certification pipeline + Expert workload ── */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-400" />
              <h2 className="text-sm font-semibold text-white">Pipeline des certifications</h2>
            </div>
            <Link href="/admin/certifications" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              Gérer <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {pipelineSteps.map(s => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold text-white mb-1">{s.value}</div>
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                  <span className="text-xs text-gray-400">{s.label}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ backgroundColor: s.color, width: stats.certifications > 0 ? `${Math.min(100, (s.value / stats.certifications) * 100)}%` : '0%' }} />
                </div>
              </div>
            ))}
          </div>
          {pendingCerts > 0 && (
            <div className="mt-4 flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              <span className="text-xs text-yellow-300">
                <strong>{pendingCerts}</strong> certification{pendingCerts > 1 ? 's' : ''} en attente d&apos;assignation expert
              </span>
              <Link href="/admin/certifications" className="ml-auto text-xs text-yellow-400 underline">Assigner →</Link>
            </div>
          )}
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Charge des experts</h2>
          </div>
          {stats.expertWorkload.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">Aucun expert enregistré</p>
          ) : (
            <div className="space-y-3">
              {stats.expertWorkload.map(e => (
                <div key={e.expert_name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-300 truncate max-w-[140px]">{e.expert_name}</span>
                    <span className="text-xs text-gray-400">{e.active} actif{e.active > 1 ? 's' : ''} / {e.total}</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full transition-all"
                      style={{ width: e.total > 0 ? `${Math.min(100, (e.active / Math.max(...stats.expertWorkload.map(x => x.total), 1)) * 100)}%` : '0%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link href="/admin/experts" className="mt-4 flex items-center justify-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors">
            Gérer les experts <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* ── Row 4: CNC stats ── */}
      <div className="grid lg:grid-cols-1 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Dépôts au CNC (par les experts)</h2>
            </div>
            <Link href="/admin/certifications?status=submitted_to_cnc" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              Voir <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex items-center gap-6 py-6">
            <div className="text-center flex-1">
              <div className="text-3xl font-bold text-white">{cncPending}</div>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-xs text-gray-400">En attente du certificat</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-gray-700 overflow-hidden">
                <div className={`h-full rounded-full bg-amber-500 transition-all`}
                  style={{ width: stats.cncStats && stats.cncStats.total > 0 ? `${(cncPending / stats.cncStats.total) * 100}%` : '0%' }} />
              </div>
            </div>
            <div className="text-gray-600 text-2xl font-light">→</div>
            <div className="text-center flex-1">
              <div className="text-3xl font-bold text-white">{cncComplete}</div>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs text-gray-400">Certificats reçus</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-gray-700 overflow-hidden">
                <div className={`h-full rounded-full bg-emerald-500 transition-all`}
                  style={{ width: stats.cncStats && stats.cncStats.total > 0 ? `${(cncComplete / stats.cncStats.total) * 100}%` : '0%' }} />
              </div>
            </div>
          </div>
          {stats.cncStats && stats.cncStats.total > 0 && (
            <p className="text-center text-xs text-gray-500">{stats.cncStats.total} dossier{stats.cncStats.total > 1 ? 's' : ''} déposé{stats.cncStats.total > 1 ? 's' : ''} au CNC</p>
          )}
          {(!stats.cncStats || stats.cncStats.total === 0) && (
            <p className="text-center text-xs text-gray-500 py-4">Aucun dossier déposé au CNC pour le moment</p>
          )}
        </div>
      </div>

      {/* ── Row 5: Recent certifications ── */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-semibold text-white">Activité récente — Certifications</h2>
          </div>
          <Link href="/admin/certifications" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
            Voir tout <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {stats.recentCerts.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">Aucune certification.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-700">
                  <th className="text-left py-2 pr-4 font-medium">Entreprise</th>
                  <th className="text-left py-2 pr-4 font-medium">Bilan</th>
                  <th className="text-left py-2 pr-4 font-medium">Expert</th>
                  <th className="text-left py-2 pr-4 font-medium">Mise à jour</th>
                  <th className="text-left py-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {stats.recentCerts.map(c => {
                  const s = CERT_STATUS[c.status] ?? { label: c.status, dot: 'bg-gray-400', badge: 'bg-gray-700 text-gray-300 border-gray-600' }
                  return (
                    <tr key={c.id} className="hover:bg-gray-750 transition-colors">
                      <td className="py-2.5 pr-4">
                        <p className="font-medium text-white truncate max-w-[140px]">{c.companyName}</p>
                        <p className="text-xs text-gray-500">{SECTORS[c.companySector] || c.companySector || '—'}</p>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-300 text-xs">
                        <span className="truncate block max-w-[120px]">{c.assessmentName}</span>
                        <span className="text-gray-500">{c.assessmentYear}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-gray-400">
                        {c.expertName || <span className="text-gray-600 italic">Non assigné</span>}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-gray-500">{fmtDate(c.updatedAt)}</td>
                      <td className="py-2.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
