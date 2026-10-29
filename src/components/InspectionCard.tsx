'use client'

import { useState } from 'react'
import {
  Calendar, MapPin, CheckCircle, AlertTriangle, Clock,
  Edit2, X, Save, RefreshCw, ThumbsUp
} from 'lucide-react'

export interface InspectionData {
  certId: number
  status: string
  auditScheduledDate: string | null
  auditLocation: string | null
  inspectionDate: string | null
  inspectionConfirmed: boolean
  inspectionProposedDate: string | null
  inspectionProposedBy: string | null
}

interface Props {
  data: InspectionData
  role: 'expert' | 'admin'
  onRefresh: () => void
  theme?: 'light' | 'dark'
}

function fmtDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function InspectionCard({ data, role, onRefresh, theme = 'dark' }: Props) {
  // Effective scheduled date — prefer auditScheduledDate, fall back to inspectionDate
  // (covers certs assigned before audit_scheduled_date column was backfilled)
  const effectiveDate = data.auditScheduledDate || data.inspectionDate

  const [mode, setMode] = useState<'view' | 'reschedule'>('view')
  const [dateInput, setDateInput] = useState(effectiveDate?.slice(0, 10) ?? '')
  const [locationInput, setLocationInput] = useState(data.auditLocation ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isDark = theme === 'dark'
  // The field audit date can only change before the audit is finalised
  const isReadOnly = !['pending', 'assigned', 'in_progress'].includes(data.status)

  const apiBase = role === 'expert'
    ? `/api/expert/certifications/${data.certId}`
    : `/api/admin/certifications/${data.certId}`

  const patch = async (body: object) => {
    setSaving(true); setError('')
    try {
      const res = await fetch(apiBase, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Erreur'); return }
      setMode('view')
      onRefresh()
    } catch { setError('Erreur réseau') }
    finally { setSaving(false) }
  }

  // Status pill
  const hasProposal = !!data.inspectionProposedDate
  const isConfirmed = data.inspectionConfirmed
  const hasScheduled = !!effectiveDate

  let pillLabel = 'Non planifiée'
  let pillCls   = isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'

  if (hasProposal) {
    pillLabel = `Proposition ${data.inspectionProposedBy === 'expert' ? 'expert' : 'admin'}`
    pillCls   = isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
  } else if (isConfirmed && hasScheduled) {
    pillLabel = 'Confirmée ✓'
    pillCls   = isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
  } else if (hasScheduled) {
    pillLabel = 'En attente de confirmation'
    pillCls   = isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
  }

  const border = isDark ? 'border-gray-700' : 'border-gray-200'
  const bg     = isDark ? 'bg-gray-800' : 'bg-white'
  const bgIn   = isDark ? 'bg-gray-900' : 'bg-gray-50'
  const txt    = isDark ? 'text-white' : 'text-gray-900'
  const muted  = isDark ? 'text-gray-400' : 'text-gray-500'
  const inputCls = isDark
    ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-600 focus:border-blue-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'

  return (
    <div className={`${bg} border ${border} rounded-xl overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-3.5 border-b ${border}`}>
        <div className="flex items-center gap-2.5">
          <Calendar className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
          <span className={`text-sm font-semibold ${txt}`}>Audit terrain</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pillCls}`}>{pillLabel}</span>
        </div>
        {!isReadOnly && mode === 'view' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setDateInput(effectiveDate?.slice(0, 10) ?? ''); setLocationInput(data.auditLocation ?? ''); setMode('reschedule') }}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              <Edit2 className="w-3.5 h-3.5" />{hasScheduled ? 'Modifier' : 'Planifier'}
            </button>
            {role === 'expert' && hasScheduled && !isConfirmed && !hasProposal && (
              <button
                onClick={() => patch({ action: 'confirm_date' })}
                disabled={saving}
                className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <ThumbsUp className="w-3.5 h-3.5" />Confirmer
              </button>
            )}
            {role === 'admin' && hasProposal && data.inspectionProposedBy === 'expert' && (
              <button
                onClick={() => patch({ action: 'accept_proposal' })}
                disabled={saving}
                className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <ThumbsUp className="w-3.5 h-3.5" />Accepter la proposition
              </button>
            )}
          </div>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        {error && (
          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}>
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}
          </div>
        )}

        {/* Expert proposal banner */}
        {hasProposal && (
          <div className={`flex items-start gap-3 rounded-xl p-3 ${isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className={`text-xs font-semibold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                {data.inspectionProposedBy === 'expert' ? "L'expert propose une autre date" : "L'admin a proposé une nouvelle date"}
              </p>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>
                {fmtDate(data.inspectionProposedDate)}
              </p>
            </div>
          </div>
        )}

        {/* Main date grid */}
        {mode === 'view' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`${bgIn} rounded-xl p-3.5`}>
              <p className={`text-xs font-medium mb-1 ${muted}`}>Date de l&apos;audit terrain</p>
              <div className="flex items-center gap-2">
                <Calendar className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                <p className={`text-sm font-semibold ${hasScheduled ? txt : muted}`}>
                  {fmtDate(effectiveDate) ?? 'Non définie'}
                </p>
              </div>
              {data.auditLocation && (
                <div className="flex items-center gap-2 mt-2">
                  <MapPin className={`w-4 h-4 flex-shrink-0 ${muted}`} />
                  <p className={`text-xs ${muted}`}>{data.auditLocation}</p>
                </div>
              )}
            </div>

            <div className={`${bgIn} rounded-xl p-3.5`}>
              <p className={`text-xs font-medium mb-1 ${muted}`}>Statut de confirmation expert</p>
              {isConfirmed ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <p className={`text-sm font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Confirmée</p>
                </div>
              ) : hasProposal ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <p className={`text-sm font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    Autre date proposée
                  </p>
                </div>
              ) : hasScheduled ? (
                <div className="flex items-center gap-2">
                  <Clock className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                  <p className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>En attente de confirmation</p>
                </div>
              ) : (
                <p className={`text-sm ${muted}`}>—</p>
              )}
            </div>
          </div>
        )}

        {/* Set / change the field audit date (admin plans it, the expert can fix it directly) */}
        {mode === 'reschedule' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-medium mb-1 ${muted}`}>Date de l&apos;audit terrain *</label>
                <input
                  type="date"
                  value={dateInput}
                  onChange={e => setDateInput(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 ${inputCls}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${muted}`}>Lieu</label>
                <input
                  type="text"
                  value={locationInput}
                  onChange={e => setLocationInput(e.target.value)}
                  placeholder="Adresse du site…"
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 ${inputCls}`}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => patch(role === 'expert'
                  ? { action: 'set_date', auditDate: dateInput, auditLocation: locationInput }
                  : { action: 'reschedule', scheduledDate: dateInput, location: locationInput })}
                disabled={saving || !dateInput}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />{saving ? 'Sauvegarde…' : 'Confirmer la date'}
              </button>
              <button onClick={() => setMode('view')} className={`text-xs px-3 py-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Confirmed summary */}
        {isConfirmed && hasScheduled && mode === 'view' && (
          <div className={`flex items-center gap-3 rounded-xl p-3 ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'}`}>
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <p className={`text-xs font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              Audit terrain confirmé · {fmtDate(effectiveDate)}
              {data.auditLocation && ` · ${data.auditLocation}`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
