'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search, ChevronLeft, ChevronRight, UserPlus, X,
  Eye, EyeOff, AlertCircle, CheckCircle, UserCheck, BarChart3
} from 'lucide-react'

interface Expert {
  id: number
  email: string
  firstName: string
  lastName: string
  phone: string
  createdAt: string
  assignmentCount: number
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminExperts() {
  const [experts, setExperts] = useState<Expert[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' })

  const loadExperts = useCallback(async (p = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p) })
    if (search) params.set('search', search)
    const res = await fetch('/api/admin/experts?' + params.toString())
    const data = await res.json()
    setExperts(data.experts || [])
    setTotal(data.total || 0)
    setPages(data.pages || 1)
    setPage(p)
    setLoading(false)
  }, [search])

  useEffect(() => { loadExperts(1) }, [loadExperts])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    setCreateSuccess('')
    setCreating(true)
    const res = await fetch('/api/admin/experts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) {
      setCreateError(data.error || 'Erreur lors de la création')
      setCreating(false)
      return
    }
    setCreateSuccess(`Expert créé : ${data.expert.firstName} ${data.expert.lastName}`)
    setForm({ firstName: '', lastName: '', email: '', password: '', phone: '' })
    setCreating(false)
    loadExperts(1)
    setTimeout(() => { setShowCreate(false); setCreateSuccess('') }, 1800)
  }

  const resetForm = () => {
    setForm({ firstName: '', lastName: '', email: '', password: '', phone: '' })
    setCreateError('')
    setCreateSuccess('')
    setShowCreate(false)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Experts certifieurs</h1>
          <p className="text-gray-400 text-sm mt-1">
            {total} expert{total !== 1 ? 's' : ''} enregistré{total !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateError(''); setCreateSuccess('') }}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Nouvel expert
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadExperts(1)}
            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>
        <button
          onClick={() => loadExperts(1)}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          Rechercher
        </button>
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-400 font-medium px-4 py-3">Expert</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3 hidden lg:table-cell">Téléphone</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3 hidden md:table-cell">Bilans assignés</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3 hidden md:table-cell">Inscrit</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={4} className="text-center py-10 text-gray-500">Chargement...</td></tr>
              )}
              {!loading && experts.length === 0 && (
                <tr><td colSpan={4} className="text-center py-10 text-gray-500">Aucun expert trouvé.</td></tr>
              )}
              {experts.map(e => (
                <tr key={e.id} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <UserCheck className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{e.firstName} {e.lastName}</p>
                        <p className="text-xs text-gray-500">{e.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">{e.phone || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-gray-700 text-gray-300 border border-gray-600 font-medium">
                      <BarChart3 className="w-3.5 h-3.5" />
                      {e.assignmentCount} bilan{e.assignmentCount !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{formatDate(e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
            <p className="text-xs text-gray-500">Page {page} sur {pages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => loadExperts(page - 1)} disabled={page <= 1}
                className="p-1.5 rounded-lg bg-gray-700 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => loadExperts(page + 1)} disabled={page >= pages}
                className="p-1.5 rounded-lg bg-gray-700 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create expert modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Créer un expert</h2>
                  <p className="text-xs text-gray-500">Compte expert certifieur CarbonTrack</p>
                </div>
              </div>
              <button onClick={resetForm} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4 overflow-y-auto">
              {createError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{createError}
                </div>
              )}
              {createSuccess && (
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl p-3 text-sm">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />{createSuccess}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Prénom *</label>
                  <input type="text" required placeholder="Jean"
                    value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Nom *</label>
                  <input type="text" required placeholder="Dupont"
                    value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Email *</label>
                <input type="email" required placeholder="expert@carbontrack.com"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Mot de passe *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} required minLength={6}
                    placeholder="Minimum 6 caractères"
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:border-brand-500"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Téléphone</label>
                <input type="tel" placeholder="+242 06 000 0000"
                  value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={resetForm}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm font-medium transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors">
                  {creating ? 'Création...' : 'Créer l\'expert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
