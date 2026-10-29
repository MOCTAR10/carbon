'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search, ChevronLeft, ChevronRight,
  ShieldCheck, User, UserPlus, X, Eye, EyeOff, AlertCircle, CheckCircle, UserCheck, Send
} from 'lucide-react'

interface UserRow {
  id: number
  email: string
  firstName: string
  lastName: string
  phone: string
  role: string
  createdAt: string
  company: { id: number; name: string }
}

interface Company {
  id: number
  name: string
  sector: string
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ROLE_STYLE: Record<string, string> = {
  admin:  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  user:   'bg-gray-700 text-gray-400 border-gray-600',
  expert: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  cnc:    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
}

function RoleIcon({ role }: { role: string }) {
  if (role === 'admin') return <ShieldCheck className="w-4 h-4 text-yellow-400" />
  if (role === 'expert') return <UserCheck className="w-4 h-4 text-blue-400" />
  if (role === 'cnc') return <Send className="w-4 h-4 text-emerald-400" />
  return <User className="w-4 h-4 text-gray-400" />
}

function RoleAvatarBg(role: string) {
  if (role === 'admin') return 'bg-yellow-500/20'
  if (role === 'expert') return 'bg-blue-500/20'
  if (role === 'cnc') return 'bg-emerald-500/20'
  return 'bg-gray-700'
}

function RoleLabel(role: string) {
  if (role === 'admin') return 'Administrateur'
  if (role === 'expert') return 'Expert'
  if (role === 'cnc') return 'CNC'
  return 'Utilisateur'
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    phone: '', companyId: '', role: 'user',
  })

  const loadUsers = useCallback(async (p = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p) })
    if (search) params.set('search', search)
    if (roleFilter) params.set('role', roleFilter)
    const res = await fetch('/api/admin/users?' + params.toString())
    const data = await res.json()
    setUsers(data.users || [])
    setTotal(data.total || 0)
    setPages(data.pages || 1)
    setPage(p)
    setLoading(false)
  }, [search, roleFilter])

  useEffect(() => { loadUsers(1) }, [loadUsers])

  useEffect(() => {
    fetch('/api/admin/companies/list')
      .then(r => r.json())
      .then(data => setCompanies(Array.isArray(data) ? data : []))
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    setCreateSuccess('')
    setCreating(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        companyId: form.companyId ? parseInt(form.companyId) : null,
        role: form.role || 'user',
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setCreateError(data.error || 'Erreur lors de la création')
      setCreating(false)
      return
    }
    setCreateSuccess('Compte créé : ' + data.user.firstName + ' ' + data.user.lastName)
    setForm({ firstName: '', lastName: '', email: '', password: '', phone: '', companyId: '', role: 'user' })
    setCreating(false)
    loadUsers(1)
    setTimeout(() => { setShowCreate(false); setCreateSuccess('') }, 1800)
  }

  const resetForm = () => {
    setForm({ firstName: '', lastName: '', email: '', password: '', phone: '', companyId: '', role: 'user' })
    setCreateError('')
    setCreateSuccess('')
    setShowCreate(false)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Utilisateurs</h1>
          <p className="text-gray-400 text-sm mt-1">
            {total} utilisateur{total !== 1 ? 's' : ''} enregistré{total !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateError(''); setCreateSuccess('') }}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Nouvel utilisateur
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, entreprise..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadUsers(1)}
            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500"
        >
          <option value="">Tous les rôles</option>
          <option value="user">Utilisateur</option>
          <option value="admin">Administrateur</option>
          <option value="expert">Expert</option>
          <option value="cnc">CNC</option>
        </select>
        <button
          onClick={() => loadUsers(1)}
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
                <th className="text-left text-gray-400 font-medium px-4 py-3">Utilisateur</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3 hidden md:table-cell">Entreprise</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3 hidden lg:table-cell">Téléphone</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Rôle</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3 hidden md:table-cell">Inscrit</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="text-center py-10 text-gray-500">Chargement...</td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-gray-500">Aucun utilisateur trouvé.</td></tr>
              )}
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${RoleAvatarBg(u.role)}`}>
                        <RoleIcon role={u.role} />
                      </div>
                      <div>
                        <p className="font-medium text-white">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 hidden md:table-cell">{u.company?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">{u.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium ${ROLE_STYLE[u.role] || ROLE_STYLE.user}`}>
                      <RoleIcon role={u.role} />
                      {RoleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
            <p className="text-xs text-gray-500">Page {page} sur {pages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => loadUsers(page - 1)} disabled={page <= 1}
                className="p-1.5 rounded-lg bg-gray-700 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => loadUsers(page + 1)} disabled={page >= pages}
                className="p-1.5 rounded-lg bg-gray-700 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Create user modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-brand-600/20 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Créer un utilisateur</h2>
                  <p className="text-xs text-gray-500">Nouveau compte sur la plateforme</p>
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
                <input type="email" required placeholder="jean@entreprise.com"
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Téléphone</label>
                  <input type="tel" placeholder="+242 06 000 0000"
                    value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Rôle *</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500">
                    <option value="user">Utilisateur (entreprise)</option>
                    <option value="expert">Expert GreenLeaves</option>
                    <option value="cnc">Membre CNC</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
              </div>
              {form.role === 'user' && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Entreprise *</label>
                  <select required value={form.companyId} onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500">
                    <option value="">Sélectionner...</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={resetForm}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm font-medium transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors">
                  {creating ? 'Création...' : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
