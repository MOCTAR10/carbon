'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Calculator, ChevronLeft, CheckCircle2, AlertCircle,
  Leaf, BarChart3, Info, Save,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Methodology {
  id: number
  code: string
  name: string
  standard: string
  project_types: string[]
  parameters: Record<string, {
    label: string; type: string; unit?: string; default?: number; options?: string[]
  }>
  description: string
}

interface BaselineResult {
  baselineTco2: number
  projectEmissions: number
  leakageTco2: number
  netReductions: number
  bufferTons: number
  creditsEligible: number
  details: Record<string, number>
}

interface SavedBaseline {
  id: number
  methodology_code: string
  baseline_tco2_yr: number
  calculated_at: string
  notes: string
}

// ─── Additionnality test labels ───────────────────────────────────────────────

const ADD_BARRIERS = [
  { key: 'financial',    label: 'Barrière financière',    desc: 'Le projet ne serait pas financièrement viable sans revenus carbone.' },
  { key: 'technological',label: 'Barrière technologique', desc: 'La technologie utilisée n\'est pas couramment adoptée dans le pays.' },
  { key: 'regulatory',   label: 'Barrière réglementaire', desc: 'Les pratiques du projet vont au-delà des exigences légales en vigueur.' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtNum(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BaselinePage() {
  const params  = useParams()
  const projId  = params.id as string

  const [methodologies, setMethodologies]   = useState<Methodology[]>([])
  const [savedBaseline, setSavedBaseline]   = useState<SavedBaseline | null>(null)
  const [selectedCode, setSelectedCode]     = useState('')
  const [paramValues, setParamValues]       = useState<Record<string, string>>({})
  const [additionnality, setAdditionnality] = useState<Record<string, boolean>>({
    financial: false, technological: false, regulatory: false,
  })
  const [notes, setNotes]                   = useState('')
  const [result, setResult]                 = useState<BaselineResult | null>(null)
  const [loading, setLoading]               = useState(true)
  const [saving, setSaving]                 = useState(false)
  const [error, setError]                   = useState('')

  useEffect(() => {
    fetch(`/api/partner/projects/${projId}/baseline`)
      .then(r => r.json())
      .then(data => {
        setMethodologies(data.methodologies ?? [])
        if (data.baseline) {
          setSavedBaseline(data.baseline)
          setSelectedCode(data.baseline.methodology_code)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [projId])

  const selectedMethodology = methodologies.find(m => m.code === selectedCode)

  // Reset param values when methodology changes
  function handleMethodologyChange(code: string) {
    setSelectedCode(code)
    setResult(null)
    setError('')
    const m = methodologies.find(m => m.code === code)
    if (m) {
      const defaults: Record<string, string> = {}
      for (const [key, def] of Object.entries(m.parameters)) {
        defaults[key] = def.default !== undefined ? String(def.default) : ''
      }
      setParamValues(defaults)
    } else {
      setParamValues({})
    }
  }

  async function handleCalculate() {
    if (!selectedCode) { setError('Sélectionnez une méthodologie'); return }
    setSaving(true)
    setError('')
    try {
      const params: Record<string, number> = {}
      for (const [k, v] of Object.entries(paramValues)) {
        params[k] = parseFloat(v) || 0
      }

      const res = await fetch(`/api/partner/projects/${projId}/baseline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          methodologyCode: selectedCode,
          parameters: params,
          additionnality,
          notes,
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur de calcul'); return }

      setResult(data.mrv)
      setSavedBaseline(data.baseline)
    } catch {
      setError('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  const addPassed = Object.values(additionnality).filter(Boolean).length

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
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calculator className="w-6 h-6 text-green-600" /> Scénario de référence (Baseline)
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Définissez la méthodologie et les paramètres du projet pour calculer le baseline annuel.
        </p>
      </div>

      {/* Saved baseline banner */}
      {savedBaseline && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">
              Baseline enregistré — {fmtNum(savedBaseline.baseline_tco2_yr)} tCO₂e/an
            </p>
            <p className="text-xs text-green-600">
              Méthodologie {savedBaseline.methodology_code} · Calculé le {fmtDate(savedBaseline.calculated_at)}
            </p>
          </div>
          <Link
            href={`/partner/projects/${projId}/monitoring`}
            className="ml-auto text-sm font-medium text-green-700 hover:underline flex-shrink-0"
          >
            Suivi MRV →
          </Link>
        </div>
      )}

      {/* Methodology selector */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
          1. Sélectionner la méthodologie
        </h2>

        <div className="grid gap-3">
          {methodologies.filter(m => m.standard !== 'ogec').map(m => (
            <label
              key={m.code}
              className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                selectedCode === m.code
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="methodology"
                value={m.code}
                checked={selectedCode === m.code}
                onChange={() => handleMethodologyChange(m.code)}
                className="mt-1 accent-green-600"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded font-semibold text-gray-700">{m.code}</span>
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-medium">{m.standard.replace('_', ' ').toUpperCase()}</span>
                </div>
                <p className="text-sm font-medium text-gray-900 mt-1">{m.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Parameters form */}
      {selectedMethodology && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
            2. Paramètres du projet
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {Object.entries(selectedMethodology.parameters).map(([key, def]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {def.label}
                  {def.unit && <span className="text-gray-400 ml-1">({def.unit})</span>}
                </label>
                {def.type === 'select' && def.options ? (
                  <select
                    value={paramValues[key] ?? ''}
                    onChange={e => setParamValues(v => ({ ...v, [key]: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {def.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type="number"
                    step="any"
                    value={paramValues[key] ?? ''}
                    onChange={e => setParamValues(v => ({ ...v, [key]: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder={def.default !== undefined ? String(def.default) : '0'}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additionnality test */}
      {selectedMethodology && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
              3. Test d'additionnalité
            </h2>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              addPassed >= 2 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {addPassed}/3 barrières
            </span>
          </div>
          <p className="text-xs text-gray-500 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            Au moins 2 barrières doivent être démontrées pour que le projet soit éligible aux crédits carbone.
          </p>
          <div className="space-y-3">
            {ADD_BARRIERS.map(b => (
              <label key={b.key} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={additionnality[b.key] ?? false}
                  onChange={e => setAdditionnality(a => ({ ...a, [b.key]: e.target.checked }))}
                  className="mt-1 accent-green-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{b.label}</p>
                  <p className="text-xs text-gray-500">{b.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {selectedMethodology && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
          <label className="text-sm font-medium text-gray-700">Notes et justifications</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Décrire les hypothèses, sources de données, justifications de l'additionnalité..."
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Calculate button */}
      {selectedMethodology && (
        <button
          onClick={handleCalculate}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60"
        >
          {saving
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Calcul en cours...</>
            : <><Calculator className="w-4 h-4" /> Calculer le Baseline</>
          }
        </button>
      )}

      {/* Result card */}
      {result && (
        <div className="bg-white border-2 border-green-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h3 className="font-bold text-gray-900">Résultats du Baseline MRV</h3>
            <span className="ml-auto text-xs text-gray-400">Méthode {selectedCode}</span>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Baseline annuel',     value: result.baselineTco2,    color: 'bg-blue-50 text-blue-700 border-blue-200' },
              { label: 'Fuites estimées',     value: result.leakageTco2,     color: 'bg-orange-50 text-orange-700 border-orange-200' },
              { label: 'Réductions nettes',   value: result.netReductions,   color: 'bg-green-50 text-green-700 border-green-200' },
              { label: 'Pool tampon',         value: result.bufferTons,      color: 'bg-gray-50 text-gray-600 border-gray-200' },
              { label: 'Crédits éligibles',   value: result.creditsEligible, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            ].map(kpi => (
              <div key={kpi.label} className={`rounded-xl p-3 border text-center ${kpi.color}`}>
                <p className="text-xs font-medium opacity-70">{kpi.label}</p>
                <p className="text-lg font-bold mt-0.5">{fmtNum(kpi.value)}</p>
                <p className="text-xs opacity-60">tCO₂e/an</p>
              </div>
            ))}
          </div>

          {/* Additionnality verdict */}
          <div className={`flex items-center gap-3 p-3 rounded-lg ${
            addPassed >= 2 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
          }`}>
            {addPassed >= 2
              ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            }
            <p className={`text-sm font-medium ${addPassed >= 2 ? 'text-green-800' : 'text-amber-800'}`}>
              {addPassed >= 2
                ? `Additionnalité démontrée (${addPassed}/3 barrières) — projet éligible`
                : `Additionnalité insuffisante (${addPassed}/3 barrières) — au moins 2 requises`
              }
            </p>
          </div>

          {/* CTA */}
          <div className="flex gap-3">
            <div className="flex items-center gap-2 text-xs text-green-600">
              <Save className="w-3.5 h-3.5" />
              Baseline enregistré automatiquement
            </div>
            <Link
              href={`/partner/projects/${projId}/monitoring`}
              className="ml-auto inline-flex items-center gap-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
            >
              <BarChart3 className="w-4 h-4" /> Démarrer le suivi MRV
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
