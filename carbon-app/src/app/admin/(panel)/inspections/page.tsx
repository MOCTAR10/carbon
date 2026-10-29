'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Calendar, MapPin, Building2, UserCheck, CheckCircle,
  AlertTriangle, Clock, RefreshCw, ChevronRight
} from 'lucide-react'

interface Inspection {
  id: number
  status: string
  audit_scheduled_date: string | null
  audit_location: string | null
  inspection_date: string | null
  inspection_confirmed: boolean
  inspection_proposed_date: string | null
  inspection_proposed_by: string | null
  expert_name: string | null
  expert_email: string | null
  assessment_name: string
  assessment_year: number
  company_name: string
  site_name: string
  site_address: string | null
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function isPast(d: string | null) {
  if (!d) return false
  return new Date(d) < new Date()
}

function daysUntil(d: string | null) {
  if (!d) return null
  const diff = new Date(d).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

export default function AdminInspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/inspections')
      .then(r => r.json())
      .then(d => { setInspections(d.inspections ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const pending    = inspections.filter(i => !i.inspection_confirmed && !i.inspection_proposed_date)
  const proposals  = inspections.filter(i => !!i.inspection_proposed_date)
  const confirmed  = inspections.filter(i => i.inspection_confirmed)
  const upcoming   = [...pending, ...confirmed].filter(i => !isPast(i.audit_scheduled_date))
  const past       = [...pending, ...confirmed].filter(i => isPast(i.audit_scheduled_date))

  const sections = [
    { title: 'Propositions en attente', items: proposals, icon: AlertTriangle, accent: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5' },
    { title: 'À venir — confirmées', items: upcoming.filter(i => i.inspection_confirmed), icon: CheckCircle, accent: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
    { title: 'À venir — en attente de confirmation', items: upcoming.filter(i => !i.inspection_confirmed), icon: Clock, accent: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/5' },
    { title: 'Passées', items: past, icon: Calendar, accent: 'text-gray-500', border: 'border-gray-700', bg: 'bg-transparent' },
  ]

  return (
    <div className="space-y-6 max-w-4xl">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendrier des inspections</h1>
          <p className="text-gray-400 text-sm mt-1">{inspections.length} inspection{inspections.length !== 1 ? 's' : ''} planifiée{inspections.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 rounded-full bg-amber-500" /> Proposition
          <div className="w-2 h-2 rounded-full bg-emerald-500 ml-2" /> Confirmée
          <div className="w-2 h-2 rounded-full bg-blue-500 ml-2" /> En attente
        </div>
      </div>

      {loading && (
        <div className="text-center py-16 text-gray-500 text-sm">Chargement…</div>
      )}

      {!loading && inspections.length === 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 text-center">
          <Calendar className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Aucune inspection planifiée</p>
          <p className="text-gray-600 text-sm mt-1">Les inspections apparaîtront ici dès qu&apos;une date sera définie lors de l&apos;assignation d&apos;un expert.</p>
        </div>
      )}

      {sections.map(({ title, items, icon: Icon, accent, border, bg }) => {
        if (items.length === 0) return null
        return (
          <div key={title} className={`bg-gray-800 border ${border} rounded-2xl overflow-hidden`}>
            <div className={`flex items-center gap-2 px-5 py-3.5 border-b ${border} ${bg}`}>
              <Icon className={`w-4 h-4 ${accent}`} />
              <h2 className={`text-sm font-semibold ${accent}`}>{title}</h2>
              <span className={`text-xs rounded-full px-2 py-0.5 ${accent} bg-current/10 ml-auto`} style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                {items.length}
              </span>
            </div>

            <div className="divide-y divide-gray-700/50">
              {items.map(insp => {
                const effectiveDate = insp.inspection_proposed_date ?? insp.audit_scheduled_date
                const days = daysUntil(effectiveDate)
                const isProposal = !!insp.inspection_proposed_date

                return (
                  <div key={insp.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-700/30 transition-colors">

                    {/* Date block */}
                    <div className="flex-shrink-0 w-14 text-center">
                      {effectiveDate ? (
                        <>
                          <p className="text-xs text-gray-500 leading-tight">
                            {new Date(effectiveDate).toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()}
                          </p>
                          <p className="text-2xl font-bold text-white leading-tight">
                            {new Date(effectiveDate).getDate()}
                          </p>
                          <p className="text-xs text-gray-500 leading-tight">
                            {new Date(effectiveDate).getFullYear()}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-600">—</p>
                      )}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-white truncate">{insp.assessment_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{insp.company_name} · {insp.assessment_year}</p>
                        </div>
                        {days !== null && days >= 0 && !isPast(effectiveDate) && (
                          <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                            days <= 3 ? 'bg-red-500/20 text-red-400' :
                            days <= 7 ? 'bg-amber-500/20 text-amber-400' :
                            'bg-gray-700 text-gray-400'
                          }`}>
                            {days === 0 ? "Aujourd'hui" : `J-${days}`}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                        {insp.audit_location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{insp.audit_location}
                          </span>
                        )}
                        {insp.site_address && !insp.audit_location && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />{insp.site_address}
                          </span>
                        )}
                        {insp.expert_name && (
                          <span className="flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-blue-400" />{insp.expert_name}
                          </span>
                        )}
                        {isProposal && (
                          <span className="flex items-center gap-1 text-amber-400">
                            <RefreshCw className="w-3 h-3" />Proposition {insp.inspection_proposed_by === 'expert' ? 'expert' : 'admin'} · {fmtDate(insp.inspection_proposed_date)}
                          </span>
                        )}
                        {insp.inspection_confirmed && (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <CheckCircle className="w-3 h-3" />Confirmée
                          </span>
                        )}
                      </div>
                    </div>

                    <Link
                      href={`/admin/certifications/${insp.id}`}
                      className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-500 hover:text-white hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Gérer <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
