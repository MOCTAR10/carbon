'use client'

import { useEffect, useState } from 'react'
import { Settings, Save, AlertCircle, CheckCircle2, CreditCard, Calendar, DollarSign } from 'lucide-react'

interface PlatformSettings {
  monthly_price: { value: string; label: string; updatedAt: string }
  currency: { value: string; label: string; updatedAt: string }
  subscription_duration_days: { value: string; label: string; updatedAt: string }
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtPrice(n: string) {
  return Number(n).toLocaleString('fr-FR') + ' FCFA'
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Editable fields
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('')

  const load = () => {
    setLoading(true)
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then((data: PlatformSettings) => {
        setSettings(data)
        setPrice(data.monthly_price?.value ?? '250000')
        setDuration(data.subscription_duration_days?.value ?? '30')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    setError('')
    setSuccess(false)
    const priceNum = parseInt(price)
    const durationNum = parseInt(duration)
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Le prix doit être un nombre positif.')
      return
    }
    if (isNaN(durationNum) || durationNum < 1 || durationNum > 365) {
      setError('La durée doit être comprise entre 1 et 365 jours.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthly_price: String(priceNum), subscription_duration_days: String(durationNum) }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Erreur'); return }
      setSuccess(true)
      load()
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Erreur de connexion.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-gray-500 text-sm py-10 text-center">Chargement...</div>

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Settings className="w-6 h-6 text-gray-400" />
          Paramètres de la plateforme
        </h1>
        <p className="text-gray-400 text-sm mt-1">Gérez la tarification et les règles d&apos;abonnement.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl p-3 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />Paramètres enregistrés avec succès.
        </div>
      )}

      {/* Current tarification summary */}
      {settings && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: DollarSign, label: 'Prix mensuel', value: fmtPrice(settings.monthly_price?.value ?? '0'), color: 'text-brand-400' },
            { icon: CreditCard, label: 'Devise', value: settings.currency?.value ?? 'FCFA', color: 'text-blue-400' },
            { icon: Calendar, label: 'Durée', value: (settings.subscription_duration_days?.value ?? '30') + ' jours', color: 'text-violet-400' },
          ].map(s => (
            <div key={s.label} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <s.icon className={`w-5 h-5 mb-2 ${s.color}`} />
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Edit form */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-300">Modifier la tarification</h2>

        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Prix mensuel (FCFA)</label>
          <div className="relative">
            <input
              type="number"
              min="1"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 pr-20"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500">FCFA</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">Affiché : {price ? Number(price).toLocaleString('fr-FR') + ' FCFA' : '—'}</p>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Durée de l&apos;abonnement (jours)</label>
          <input
            type="number"
            min="1"
            max="365"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
          />
          <p className="text-xs text-gray-600 mt-1">Ex: 30 = 1 mois, 365 = 1 an</p>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </div>

      {/* Last updated info */}
      {settings?.monthly_price?.updatedAt && (
        <p className="text-xs text-gray-600">
          Dernière mise à jour : {fmtDate(settings.monthly_price.updatedAt)}
        </p>
      )}

      {/* Impact notice */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-300 space-y-1">
            <p className="font-semibold">Impact des modifications</p>
            <p>Le nouveau prix s&apos;appliquera uniquement aux <strong>nouveaux abonnements</strong>. Les abonnements existants ne sont pas affectés.</p>
            <p>La durée modifiée s&apos;appliquera aux abonnements créés après l&apos;enregistrement.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
