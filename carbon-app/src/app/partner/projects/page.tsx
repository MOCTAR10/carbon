'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus, Pencil, Trash2, Leaf, MapPin, Trees, Droplets,
  Users, Briefcase, ChevronDown, ChevronUp, X, Save,
  CheckCircle, AlertCircle, Eye, EyeOff, BarChart2, Globe2,
  FlaskConical, Activity
} from 'lucide-react'

interface Project {
  id: number
  title: string
  description: string | null
  project_type: string
  country: string | null
  location_name: string | null
  latitude: number | null
  longitude: number | null
  methodology: string | null
  standard: string | null
  status: string
  price_per_ton: number
  tons_available: number
  tons_sold: number
  start_date: string | null
  end_date: string | null
  trees_planted: number
  hectares_managed: number
  co2_removed_actual: number
  beneficiaries_count: number
  jobs_created: number
  total_budget_fcfa: number
  funds_received_fcfa: number
  created_at: string
}

const PROJECT_TYPES = [
  'Reforestation', 'Agroforesterie', 'Conservation (REDD+)', 'Carbone Bleu',
  'Agriculture Régénérative', 'Gestion des Déchets', 'Efficacité Énergétique',
  'Énergie Renouvelable', 'Industrie', 'Autre'
]

const STANDARDS = ['VCS', 'Gold Standard', 'Plan Vivo', 'CAR', 'ACR', 'CDM', 'Autre']
const METHODOLOGIES = ['VM0007', 'VM0009', 'VM0010', 'VM0015', 'VM0017', 'VM0021', 'VM0022', 'AMS-I', 'AMS-III', 'Autre']

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-800 text-gray-400 border-gray-700',
  active:    'bg-emerald-900/40 text-emerald-400 border-emerald-800',
  completed: 'bg-blue-900/40 text-blue-400 border-blue-800',
  suspended: 'bg-red-900/40 text-red-400 border-red-800',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', active: 'Actif', completed: 'Terminé', suspended: 'Suspendu'
}

const emptyForm = {
  title: '', description: '', project_type: 'Reforestation', country: '',
  location_name: '', latitude: '', longitude: '', methodology: '', standard: '',
  status: 'draft', price_per_ton: '', tons_available: '', start_date: '', end_date: '',
  trees_planted: '', hectares_managed: '', co2_removed_actual: '',
  beneficiaries_count: '', jobs_created: '', total_budget_fcfa: ''
}

export default function PartnerProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/partner/projects')
      const data = await res.json()
      setProjects(data.projects || [])
    } catch {
      setMsg({ type: 'err', text: 'Erreur lors du chargement des projets' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm })
    setShowForm(true)
    setMsg(null)
  }

  const openEdit = (p: Project) => {
    setEditingId(p.id)
    setForm({
      title: p.title, description: p.description || '', project_type: p.project_type,
      country: p.country || '', location_name: p.location_name || '',
      latitude: p.latitude?.toString() || '', longitude: p.longitude?.toString() || '',
      methodology: p.methodology || '', standard: p.standard || '',
      status: p.status, price_per_ton: p.price_per_ton.toString(),
      tons_available: p.tons_available.toString(), start_date: p.start_date?.slice(0, 10) || '',
      end_date: p.end_date?.slice(0, 10) || '', trees_planted: p.trees_planted.toString(),
      hectares_managed: p.hectares_managed.toString(),
      co2_removed_actual: p.co2_removed_actual.toString(),
      beneficiaries_count: p.beneficiaries_count.toString(),
      jobs_created: p.jobs_created.toString(), total_budget_fcfa: p.total_budget_fcfa.toString()
    })
    setShowForm(true)
    setMsg(null)
  }

  const handleSave = async () => {
    if (!form.title || !form.project_type) {
      setMsg({ type: 'err', text: 'Titre et type de projet requis' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const payload = {
        ...form,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        price_per_ton: parseFloat(form.price_per_ton) || 0,
        tons_available: parseFloat(form.tons_available) || 0,
        trees_planted: parseInt(form.trees_planted) || 0,
        hectares_managed: parseFloat(form.hectares_managed) || 0,
        co2_removed_actual: parseFloat(form.co2_removed_actual) || 0,
        beneficiaries_count: parseInt(form.beneficiaries_count) || 0,
        jobs_created: parseInt(form.jobs_created) || 0,
        total_budget_fcfa: parseInt(form.total_budget_fcfa) || 0,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      }

      const url = editingId ? `/api/partner/projects/${editingId}` : '/api/partner/projects'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')

      setMsg({ type: 'ok', text: editingId ? 'Projet mis à jour' : 'Projet créé avec succès' })
      setShowForm(false)
      loadProjects()
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/partner/projects/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setDeleteConfirm(null)
      setMsg({ type: 'ok', text: 'Projet supprimé' })
      loadProjects()
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message })
      setDeleteConfirm(null)
    }
  }

  const f = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Leaf className="w-7 h-7 text-emerald-400" />
            Mes Projets Carbone
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Gérez vos projets, leurs métriques d&apos;impact et leur disponibilité sur le marché
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Nouveau Projet
        </button>
      </div>

      {/* Flash message */}
      {msg && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
          msg.type === 'ok' ? 'bg-emerald-900/30 border-emerald-800 text-emerald-300' : 'bg-red-900/30 border-red-800 text-red-300'
        }`}>
          {msg.type === 'ok' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm">{msg.text}</span>
          <button onClick={() => setMsg(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">{editingId ? 'Modifier le projet' : 'Nouveau projet'}</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-300"><X className="w-5 h-5" /></button>
          </div>

          {/* Basic info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Informations générales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Titre du projet *</label>
                <input value={form.title} onChange={e => f('title', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="Ex: Reforestation Vallée du N'tem" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Type de projet *</label>
                <select value={form.project_type} onChange={e => f('project_type', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
                  {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Statut</label>
                <select value={form.status} onChange={e => f('status', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea value={form.description} onChange={e => f('description', e.target.value)} rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
                  placeholder="Décrivez votre projet, ses objectifs et son approche..." />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><MapPin className="w-4 h-4" /> Localisation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Pays</label>
                <input value={form.country} onChange={e => f('country', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="Gabon" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Lieu / Région</label>
                <input value={form.location_name} onChange={e => f('location_name', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="Forêt du Djoué, Province du Haut-Ogooué" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Latitude</label>
                <input value={form.latitude} onChange={e => f('latitude', e.target.value)} type="number" step="0.0000001"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="-0.7893" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Longitude</label>
                <input value={form.longitude} onChange={e => f('longitude', e.target.value)} type="number" step="0.0000001"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="11.6094" />
              </div>
            </div>
          </div>

          {/* Certification */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Certification &amp; Méthodologie</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Standard</label>
                <select value={form.standard} onChange={e => f('standard', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
                  <option value="">— Sélectionner —</option>
                  {STANDARDS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Méthodologie</label>
                <select value={form.methodology} onChange={e => f('methodology', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
                  <option value="">— Sélectionner —</option>
                  {METHODOLOGIES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Prix par tonne (FCFA)</label>
                <input value={form.price_per_ton} onChange={e => f('price_per_ton', e.target.value)} type="number" min="0"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="15000" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tonnes disponibles</label>
                <input value={form.tons_available} onChange={e => f('tons_available', e.target.value)} type="number" min="0"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="1000" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Date de début</label>
                <input value={form.start_date} onChange={e => f('start_date', e.target.value)} type="date"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Date de fin</label>
                <input value={form.end_date} onChange={e => f('end_date', e.target.value)} type="date"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
          </div>

          {/* Impact metrics */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><BarChart2 className="w-4 h-4" /> Métriques d&apos;Impact</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><Trees className="w-3 h-3" /> Arbres plantés</label>
                <input value={form.trees_planted} onChange={e => f('trees_planted', e.target.value)} type="number" min="0"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="50000" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Hectares gérés</label>
                <input value={form.hectares_managed} onChange={e => f('hectares_managed', e.target.value)} type="number" min="0" step="0.01"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="500.5" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">tCO₂ retirées (mesuré)</label>
                <input value={form.co2_removed_actual} onChange={e => f('co2_removed_actual', e.target.value)} type="number" min="0" step="0.01"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="1250.00" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Bénéficiaires</label>
                <input value={form.beneficiaries_count} onChange={e => f('beneficiaries_count', e.target.value)} type="number" min="0"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="1200" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><Briefcase className="w-3 h-3" /> Emplois créés</label>
                <input value={form.jobs_created} onChange={e => f('jobs_created', e.target.value)} type="number" min="0"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="45" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Budget total (FCFA)</label>
                <input value={form.total_budget_fcfa} onChange={e => f('total_budget_fcfa', e.target.value)} type="number" min="0"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="50000000" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
              <Save className="w-4 h-4" />
              {saving ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Créer le projet'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Projects list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-2xl">
          <div className="w-14 h-14 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Leaf className="w-7 h-7 text-emerald-600" />
          </div>
          <h3 className="text-white font-semibold mb-1">Aucun projet</h3>
          <p className="text-gray-500 text-sm mb-4">Créez votre premier projet carbone pour commencer à vendre des crédits</p>
          <button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            Créer un projet
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map(p => (
            <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              {/* Project header */}
              <div className="flex items-start gap-4 p-5">
                <div className="w-10 h-10 bg-emerald-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Leaf className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-white font-semibold">{p.title}</h3>
                    <span className={`text-xs border px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] || STATUS_COLORS.draft}`}>
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap text-sm text-gray-400">
                    <span>{p.project_type}</span>
                    {p.country && <span className="flex items-center gap-1"><Globe2 className="w-3 h-3" />{p.country}</span>}
                    {p.location_name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.location_name}</span>}
                  </div>
                </div>
                {/* Quick stats */}
                <div className="hidden md:flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="text-white font-bold">{p.tons_available.toLocaleString('fr-FR')}</div>
                    <div className="text-gray-500 text-xs">t disponibles</div>
                  </div>
                  <div className="text-center">
                    <div className="text-emerald-400 font-bold">{p.tons_sold.toLocaleString('fr-FR')}</div>
                    <div className="text-gray-500 text-xs">t vendues</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-bold">{p.price_per_ton.toLocaleString('fr-FR')}</div>
                    <div className="text-gray-500 text-xs">FCFA/t</div>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Link href={`/partner/projects/${p.id}/baseline`} className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-900/20 rounded-lg transition-colors" title="Baseline MRV">
                    <FlaskConical className="w-4 h-4" />
                  </Link>
                  <Link href={`/partner/projects/${p.id}/monitoring`} className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors" title="Suivi MRV">
                    <Activity className="w-4 h-4" />
                  </Link>
                  <button onClick={() => openEdit(p)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Modifier">
                    <Pencil className="w-4 h-4" />
                  </button>
                  {deleteConfirm === p.id ? (
                    <div className="flex items-center gap-1 bg-red-900/30 border border-red-800 rounded-lg px-2 py-1">
                      <span className="text-xs text-red-300">Confirmer?</span>
                      <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300 text-xs font-bold">Oui</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-gray-400 hover:text-gray-300 text-xs">Non</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(p.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors" title="Supprimer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                    {expandedId === p.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === p.id && (
                <div className="border-t border-gray-800 p-5 bg-gray-950/50">
                  {/* Impact metrics grid */}
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Métriques d&apos;Impact</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    {[
                      { label: 'Arbres plantés', value: p.trees_planted.toLocaleString('fr-FR'), icon: Trees },
                      { label: 'Hectares gérés', value: `${p.hectares_managed.toLocaleString('fr-FR')} ha`, icon: MapPin },
                      { label: 'tCO₂ retirées', value: `${p.co2_removed_actual.toLocaleString('fr-FR')} t`, icon: Leaf },
                      { label: 'Bénéficiaires', value: p.beneficiaries_count.toLocaleString('fr-FR'), icon: Users },
                      { label: 'Emplois créés', value: p.jobs_created.toLocaleString('fr-FR'), icon: Briefcase },
                    ].map(m => (
                      <div key={m.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                        <m.icon className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                        <div className="text-white font-bold text-sm">{m.value}</div>
                        <div className="text-gray-500 text-xs">{m.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Certification row */}
                  {(p.standard || p.methodology) && (
                    <div className="flex gap-2 flex-wrap">
                      {p.standard && <span className="bg-blue-900/30 border border-blue-800 text-blue-300 text-xs px-3 py-1 rounded-full">{p.standard}</span>}
                      {p.methodology && <span className="bg-purple-900/30 border border-purple-800 text-purple-300 text-xs px-3 py-1 rounded-full">{p.methodology}</span>}
                      {p.start_date && <span className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full">{new Date(p.start_date).toLocaleDateString('fr-FR')} → {p.end_date ? new Date(p.end_date).toLocaleDateString('fr-FR') : '...'}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
