'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Award, Clock, CheckCircle2, XCircle, Search,
  Building2, Leaf, ArrowRight, AlertCircle,
  BarChart3, FileCheck, RefreshCw, CalendarClock,
} from 'lucide-react'
import Link from 'next/link'

interface CertRow {
  id: number
  status: string
  requestedAt: string
  updatedAt: string
  inspectionDate: string | null
  certifiedAt: string | null
  certificateNumber: string | null
  rejectionReason: string | null
  adminNotes: string | null
  assessmentId: number
  assessmentName: string
  assessmentYear: number
  totalCo2eq: number
  scope1: number
  scope2: number
  scope3: number
  siteName: string
  siteType: string
  companyId: number
  companyName: string
  sector: string
}

const STATUS: Record<string, { label: string; dot: string; badge: string }> = {
  assigned:    { label: 'Assigné',       dot: 'bg-blue-400',   badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  in_progress: { label: 'En cours',      dot: 'bg-violet-400', badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  audit_done:  { label: 'Audit terminé', dot: 'bg-purple-400', badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  submitted_to_cnc: { label: 'Déposé au CNC', dot: 'bg-amber-400', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  certified:   { label: 'Certifié ✓',   dot: 'bg-green-400',  badge: 'bg-green-500/15 text-green-300 border-green-500/30' },
  rejected:    { label: 'Rejeté',        dot: 'bg-red-400',    badge: 'bg-red-500/15 text-red-300 border-red-500/30' },
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

function fmtCO2(n: number) {
  if (!n) return '0 kgCO₂e'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M tCO₂e`
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)} tCO₂e`
  return `${n.toFixed(1)} kgCO₂e`
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, dot: 'bg-gray-400', badge: 'bg-gray-700/50 text-gray-300 border-gray-600' }
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  )
}

export default function ExpertDashboard() {
  const router = useRouter()
  const [certs, setCerts] = useState<CertRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const r = await fetch('/api/expert/certifications')
      if (r.status === 403) { router.push('/expert/login'); return }
      const data = await r.json()
      setCerts(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Derived data
  const active     = certs.filter(c => ['assigned', 'in_progress', 'audit_done', 'submitted_to_cnc'].includes(c.status))
  const certified  = certs.filter(c => c.status === 'certified')
  const rejected   = certs.filter(c => c.status === 'rejected')

  const totalEmissions = active.reduce((s, c) => s + (c.totalCo2eq || 0), 0)

  // Sort active: assigned first, then in_progress, then audit_done, newest first within each
  const sortedActive = [...active].sort((a, b) => {
    const order: Record<string, number> = { assigned: 0, in_progress: 1, audit_done: 2, submitted_to_cnc: 3 }
    const diff = (order[a.status] ?? 9) - (order[b.status] ?? 9)
    if (diff !== 0) return diff
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  const recentDone = [...certified, ...rejected]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-gray-600 border-t-brand-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tableau de bord Expert</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            GreenLeaves — Inspections &amp; Certification ISO 14064
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

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Dossiers actifs',  value: active.length,     icon: Clock,        color: 'bg-blue-600' },
          { label: 'Certifiés',        value: certified.length,  icon: CheckCircle2, color: 'bg-green-600' },
          { label: 'Rejetés',          value: rejected.length,   icon: XCircle,      color: 'bg-red-600' },
          { label: 'Total',            value: certs.length,      icon: Award,        color: 'bg-violet-600' },
        ].map(s => (
          <div key={s.label} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-3">
            <div className={`w-9 h-9 ${s.color} rounded-lg flex items-center justify-center`}>
              <s.icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white leading-none">{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Emissions + completion rate row ── */}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Leaf className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Émissions sous inspection</p>
            <p className="text-lg font-bold text-white">{fmtCO2(totalEmissions)}</p>
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Taux de certification</p>
            <p className="text-lg font-bold text-white">
              {certs.length > 0 ? Math.round((certified.length / certs.length) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-500">{certified.length} / {certs.length}</p>
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileCheck className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Dossiers à déposer au CNC</p>
            <p className="text-lg font-bold text-white">
              {certs.filter(c => c.status === 'audit_done').length}
            </p>
            <p className="text-xs text-gray-500">{certs.filter(c => c.status === 'submitted_to_cnc').length} en attente du certificat</p>
          </div>
        </div>
      </div>

      {/* ── Active dossiers ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            Dossiers actifs
            <span className="text-sm font-normal text-gray-500">({active.length})</span>
          </h2>
          <Link href="/expert/certifications" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
            Voir tout <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {sortedActive.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <Award className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Aucun dossier actif.</p>
            <p className="text-gray-600 text-sm mt-1">Vous serez notifié lors d&apos;une nouvelle assignation.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedActive.map(c => {
              const scope1Pct = c.totalCo2eq > 0 ? Math.round((c.scope1 / c.totalCo2eq) * 100) : 0
              const scope2Pct = c.totalCo2eq > 0 ? Math.round((c.scope2 / c.totalCo2eq) * 100) : 0
              const scope3Pct = 100 - scope1Pct - scope2Pct
              return (
                <Link
                  key={c.id}
                  href={`/expert/certifications/${c.id}`}
                  className="block bg-gray-800 border border-gray-700 hover:border-brand-500/50 rounded-xl p-4 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <StatusBadge status={c.status} />
                        {c.adminNotes && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-1.5 py-0.5">
                            <AlertCircle className="w-2.5 h-2.5" /> Note admin
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-white text-sm group-hover:text-brand-300 transition-colors">{c.assessmentName}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Building2 className="w-3 h-3" /> {c.companyName}
                        </span>
                        <span className="text-xs text-gray-600">{SECTORS[c.sector] || c.sector}</span>
                        <span className="text-xs text-gray-600">{c.assessmentYear}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-brand-400">{fmtCO2(c.totalCo2eq)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{fmtDate(c.updatedAt)}</p>
                    </div>
                  </div>

                  {/* Scope breakdown bar */}
                  {c.totalCo2eq > 0 && (
                    <div className="mt-3">
                      <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
                        <div className="bg-blue-500 transition-all" style={{ width: `${scope1Pct}%` }} />
                        <div className="bg-violet-500 transition-all" style={{ width: `${scope2Pct}%` }} />
                        <div className="bg-orange-500 transition-all" style={{ width: `${Math.max(0, scope3Pct)}%` }} />
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />S1 {scope1Pct}%</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" />S2 {scope2Pct}%</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" />S3 {Math.max(0, scope3Pct)}%</span>
                      </div>
                    </div>
                  )}

                  {c.inspectionDate && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500">
                      <CalendarClock className="w-3 h-3" />
                      Inspection programmée: {fmtDate(c.inspectionDate)}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Recent completed ── */}
      {recentDone.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-gray-500" />
            <h2 className="text-base font-semibold text-white">
              Activité récente
              <span className="text-sm font-normal text-gray-500 ml-2">({recentDone.length} dossiers clôturés)</span>
            </h2>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-700 bg-gray-800/80">
                  <th className="text-left py-2.5 px-4 font-medium">Entreprise</th>
                  <th className="text-left py-2.5 px-4 font-medium">Bilan</th>
                  <th className="text-left py-2.5 px-4 font-medium">Émissions</th>
                  <th className="text-left py-2.5 px-4 font-medium">Date</th>
                  <th className="text-left py-2.5 px-4 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {recentDone.map(c => (
                  <tr key={c.id} className="hover:bg-gray-750 transition-colors">
                    <td className="py-2.5 px-4">
                      <p className="font-medium text-white text-xs">{c.companyName}</p>
                      <p className="text-[10px] text-gray-500">{SECTORS[c.sector] || c.sector}</p>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-gray-300">
                      <p className="truncate max-w-[120px]">{c.assessmentName}</p>
                      <p className="text-gray-500">{c.assessmentYear}</p>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-brand-400 font-semibold">
                      {fmtCO2(c.totalCo2eq)}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-gray-500">{fmtDate(c.updatedAt)}</td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
