'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Plus, BarChart3, CheckCircle2, Clock,
  Calculator, Leaf, AlertCircle, Trash2, ChevronDown, ChevronUp,
  FileDown, ChevronRight,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Period {
  id: number
  project_id: number
  period_start: string
  period_end: string
  status: string
  record_count: string
  net_reductions: string | null
  credits_eligible: string | null
  mrv_calculated_at: string | null
}

interface Record_ {
  id: number
  activity_type: string
  value: string
  unit: string
  notes: string
  created_at: string
}

interface MRVResult {
  baselineTco2: number
  netReductions: number
  bufferTons: number
  creditsEligible: number
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; color: string }> = {
  open:         { label: 'Ouverte',        color: 'bg-gray-100 text-gray-600' },
  data_entered: { label: 'Données saisies',color: 'bg-blue-50 text-blue-700' },
  calculated:   { label: 'Calculée',       color: 'bg-green-50 text-green-700' },
  verified:     { label: 'Vérifiée',       color: 'bg-emerald-50 text-emerald-700' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtNum(n: number | string | null) {
  if (n === null || n === undefined) return '—'
  const num = typeof n === 'string' ? parseFloat(n) : n
  return num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MonitoringPage() {
  const params = useParams()
  const projId = params.id as string

  const [periods, setPeriods]           = useState<Period[]>([])
  const [loading, setLoading]           = useState(true)
  const [showNewForm, setShowNewForm]   = useState(false)
  const [newStart, setNewStart]         = useState('')
  const [newEnd, setNewEnd]             = useState('')
  const [creating, setCreating]         = useState(false)
  const [error, setError]               = useState('')
  const [expandedId, setExpandedId]     = useState<number | null>(null)
  const [periodRecords, setPeriodRecords] = useState<Record<number, Record_[]>>({})
  const [calcResults, setCalcResults]   = useState<Record<number, MRVResult>>({})
  const [calcLoading, setCalcLoading]   = useState<number | null>(null)
  // New record form state per period
  const [newRecord, setNewRecord] = useState<Record<number, { activityType: string; value: string; unit: string }>>({})
  const [addingRecord, setAddingRecord] = useState<number | null>(null)

  useEffect(() => { loadPeriods() }, [projId])

  async function loadPeriods() {
    setLoading(true)
    const res = await fetch(`/api/partner/monitoring-periods?project_id=${projId}`)
    const data = await res.json()
    setPeriods(data.periods ?? [])
    setLoading(false)
  }

  async function loadRecords(periodId: number) {
    const res = await fetch(`/api/partner/monitoring-periods/${periodId}/records`)
    const data = await res.json()
    setPeriodRecords(prev => ({ ...prev, [periodId]: data.records ?? [] }))
  }

  async function handleExpandToggle(periodId: number) {
    if (expandedId === periodId) {
      setExpandedId(null)
      return
    }
    setExpandedId(periodId)
    if (!periodRecords[periodId]) await loadRecords(periodId)
  }

  async function handleCreatePeriod() {
    if (!newStart || !newEnd) { setError('Dates de début et fin requises'); return }
    setCreating(true)
    setError('')
    try {
      const res = await fetch(`/api/partner/monitoring-periods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: parseInt(projId), periodStart: newStart, periodEnd: newEnd }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setShowNewForm(false)
      setNewStart(''); setNewEnd('')
      await loadPeriods()
    } finally {
      setCreating(false)
    }
  }

  async function handleAddRecord(periodId: number) {
    const rec = newRecord[periodId]
    if (!rec?.activityType || !rec?.value) return
    setAddingRecord(periodId)
    try {
      await fetch(`/api/partner/monitoring-periods/${periodId}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityType: rec.activityType, value: parseFloat(rec.value), unit: rec.unit }),
      })
      setNewRecord(prev => ({ ...prev, [periodId]: { activityType: '', value: '', unit: '' } }))
      await loadRecords(periodId)
      await loadPeriods()
    } finally {
      setAddingRecord(null)
    }
  }

  async function handleCalculate(periodId: number) {
    setCalcLoading(periodId)
    try {
      const res = await fetch(`/api/partner/monitoring-periods/${periodId}/calculate`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setCalcResults(prev => ({ ...prev, [periodId]: data.mrv }))
      await loadPeriods()
    } finally {
      setCalcLoading(null)
    }
  }

  async function downloadReport(periodId: number) {
    const res = await fetch(`/api/partner/monitoring-periods/${periodId}/generate-report`, { method: 'POST' })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `MonitoringReport_P${periodId}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function downloadPDD() {
    const res = await fetch(`/api/partner/projects/${projId}/generate-pdd`, { method: 'POST' })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `PDD_Projet${projId}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalCredits = periods
    .filter(p => p.credits_eligible)
    .reduce((sum, p) => sum + parseFloat(p.credits_eligible!), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <Link href={`/partner/projects`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ChevronLeft className="w-4 h-4" /> Retour aux projets
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-green-600" /> Suivi MRV
            </h1>
            <p className="text-sm text-gray-500 mt-1">Périodes de surveillance et calcul des crédits carbone éligibles</p>
          </div>
          <div className="flex items-center gap-2">
            {totalCredits > 0 && (
              <div className="text-right mr-2">
                <p className="text-xs text-gray-500">Crédits éligibles total</p>
                <p className="text-xl font-bold text-green-700">{fmtNum(totalCredits)} tCO₂e</p>
              </div>
            )}
            <button
              onClick={downloadPDD}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors font-medium"
              title="Télécharger le Project Design Document"
            >
              <FileDown className="w-4 h-4" /> PDD
            </button>
          </div>
        </div>
      </div>

      {/* Baseline link */}
      <Link
        href={`/partner/projects/${projId}/baseline`}
        className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
      >
        <Leaf className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Scénario de référence (Baseline)</p>
          <p className="text-xs text-blue-600">Modifier la méthodologie et les paramètres du baseline</p>
        </div>
        <ChevronRight className="w-4 h-4 text-blue-400 ml-auto" />
      </Link>

      {/* New period form */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-5">
          <h2 className="font-semibold text-gray-900">Périodes de suivi</h2>
          <button
            onClick={() => { setShowNewForm(!showNewForm); setError('') }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 hover:text-green-800"
          >
            <Plus className="w-4 h-4" /> Nouvelle période
          </button>
        </div>

        {showNewForm && (
          <div className="px-5 pb-5 border-t border-gray-100 pt-4">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date de début</label>
                <input type="date" value={newStart} onChange={e => setNewStart(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date de fin</label>
                <input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
            {error && (
              <p className="text-xs text-red-600 flex items-center gap-1 mb-2">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={handleCreatePeriod} disabled={creating}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
                {creating ? 'Création...' : 'Créer'}
              </button>
              <button onClick={() => setShowNewForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Annuler
              </button>
            </div>
          </div>
        )}

        {periods.length === 0 && !showNewForm && (
          <div className="px-5 pb-6 text-center text-sm text-gray-400">
            Aucune période de suivi. Créez-en une pour commencer la saisie des données.
          </div>
        )}

        {/* Period list */}
        <div className="divide-y divide-gray-100">
          {periods.map(period => {
            const st     = STATUS[period.status] ?? STATUS.open
            const isOpen = expandedId === period.id
            const mrvRes = calcResults[period.id]
            const recs   = periodRecords[period.id] ?? []
            const nr     = newRecord[period.id] ?? { activityType: '', value: '', unit: '' }

            return (
              <div key={period.id}>
                {/* Period header */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleExpandToggle(period.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {fmtDate(period.period_start)} — {fmtDate(period.period_end)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      <span>{period.record_count} enregistrement{parseInt(period.record_count) !== 1 ? 's' : ''}</span>
                      {period.credits_eligible && (
                        <>
                          <span>&bull;</span>
                          <span className="text-green-600 font-medium">{fmtNum(period.credits_eligible)} tCO₂e crédits éligibles</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {period.status === 'data_entered' && (
                      <button
                        onClick={e => { e.stopPropagation(); handleCalculate(period.id) }}
                        disabled={calcLoading === period.id}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-60"
                      >
                        {calcLoading === period.id
                          ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                          : <Calculator className="w-3 h-3" />
                        }
                        Calculer MRV
                      </button>
                    )}
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded: records + MRV result */}
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-gray-100 bg-gray-50 space-y-4">

                    {/* MRV result */}
                    {(mrvRes || period.credits_eligible) && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4">
                        {[
                          { label: 'Baseline',          value: mrvRes?.baselineTco2    ?? null },
                          { label: 'Réductions nettes',  value: mrvRes?.netReductions   ?? parseFloat(period.net_reductions ?? '0') },
                          { label: 'Pool tampon',        value: mrvRes?.bufferTons      ?? null },
                          { label: 'Crédits éligibles',  value: mrvRes?.creditsEligible ?? parseFloat(period.credits_eligible ?? '0') },
                        ].map(kpi => (
                          <div key={kpi.label} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500">{kpi.label}</p>
                            <p className="text-sm font-bold text-gray-900 mt-0.5">{fmtNum(kpi.value ?? 0)}</p>
                            <p className="text-xs text-gray-400">tCO₂e</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Records list */}
                    {recs.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Données saisies</p>
                        <div className="space-y-1">
                          {recs.map(rec => (
                            <div key={rec.id} className="flex items-center gap-3 text-sm bg-white border border-gray-200 rounded-lg px-3 py-2">
                              <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{rec.activity_type}</span>
                              <span className="font-semibold text-gray-900">{fmtNum(parseFloat(rec.value))}</span>
                              <span className="text-gray-400">{rec.unit}</span>
                              {rec.notes && <span className="text-xs text-gray-400 italic ml-auto">{rec.notes}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add record form */}
                    {!['calculated', 'verified'].includes(period.status) && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ajouter une donnée</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Type d'activité (ex: deforestation_avoided)"
                            value={nr.activityType}
                            onChange={e => setNewRecord(p => ({ ...p, [period.id]: { ...nr, activityType: e.target.value } }))}
                            className="flex-1 text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                          <input
                            type="number" step="any" placeholder="Valeur"
                            value={nr.value}
                            onChange={e => setNewRecord(p => ({ ...p, [period.id]: { ...nr, value: e.target.value } }))}
                            className="w-24 text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                          <input
                            type="text" placeholder="Unité"
                            value={nr.unit}
                            onChange={e => setNewRecord(p => ({ ...p, [period.id]: { ...nr, unit: e.target.value } }))}
                            className="w-20 text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                          <button
                            onClick={() => handleAddRecord(period.id)}
                            disabled={addingRecord === period.id}
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
                          >
                            {addingRecord === period.id ? '...' : <Plus className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Calculate button at bottom */}
                    {period.status === 'data_entered' && (
                      <button
                        onClick={() => handleCalculate(period.id)}
                        disabled={calcLoading === period.id}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
                      >
                        {calcLoading === period.id
                          ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Calcul...</>
                          : <><Calculator className="w-4 h-4" /> Calculer MRV pour cette période</>
                        }
                      </button>
                    )}

                    {/* Download monitoring report */}
                    {(period.status === 'calculated' || period.status === 'verified') && (
                      <button
                        onClick={() => downloadReport(period.id)}
                        className="w-full flex items-center justify-center gap-2 py-2 border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 text-sm font-medium rounded-lg transition-colors"
                      >
                        <FileDown className="w-4 h-4" /> Télécharger Rapport MRV (PDF)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

