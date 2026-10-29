'use client'

import { useState, useEffect, useCallback } from 'react'
import { Building2, Search, ChevronLeft, ChevronRight, X, Users, ClipboardList, Eye } from 'lucide-react'

interface Company {
  id: number
  name: string
  rccm: string
  sector: string
  createdAt: string
  userCount: number
  siteCount: number
  assessmentCount: number
}

interface CompanyDetail {
  company: { id: number; name: string; rccm: string; sector: string; createdAt: string }
  users: { id: number; email: string; firstName: string; lastName: string; phone: string; role: string; createdAt: string }[]
  sites: { id: number; name: string; type: string; address: string; assessmentCount: number }[]
}

const SECTORS: Record<string, string> = {
  agriculture: 'Agriculture', industrie: 'Industrie', transport: 'Transport',
  energie: 'Énergie', construction: 'Construction', commerce: 'Commerce',
  services: 'Services', mining: 'Mines', telecom: 'Télécommunications',
  banque: 'Banque & Finance', sante: 'Santé', education: 'Éducation', autre: 'Autre',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminCompanies() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('')
  const [detail, setDetail] = useState<CompanyDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadCompanies = useCallback(async (p = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p) })
    if (search) params.set('search', search)
    if (sector) params.set('sector', sector)
    const res = await fetch(`/api/admin/companies?${params}`)
    const data = await res.json()
    setCompanies(data.companies || [])
    setTotal(data.total || 0)
    setPages(data.pages || 1)
    setPage(p)
    setLoading(false)
  }, [search, sector])

  useEffect(() => { loadCompanies(1) }, [loadCompanies])

  const openDetail = async (id: number) => {
    setDetailLoading(true)
    setDetail(null)
    const res = await fetch(`/api/admin/companies/${id}`)
    const data = await res.json()
    setDetail(data)
    setDetailLoading(false)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Entreprises</h1>
        <p className="text-gray-400 text-sm mt-1">{total} entreprise{total !== 1 ? 's' : ''} enregistrée{total !== 1 ? 's' : ''}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Rechercher par nom, RCCM..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadCompanies(1)}
            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>
        <select
          value={sector}
          onChange={e => setSector(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500"
        >
          <option value="">Tous les secteurs</option>
          {Object.entries(SECTORS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button
          onClick={() => loadCompanies(1)}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
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
                <th className="text-left text-gray-400 font-medium px-4 py-3">Entreprise</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3 hidden md:table-cell">Secteur</th>
                <th className="text-center text-gray-400 font-medium px-4 py-3 hidden lg:table-cell">Utilisateurs</th>
                <th className="text-center text-gray-400 font-medium px-4 py-3 hidden lg:table-cell">Bilans</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3 hidden md:table-cell">Inscrit</th>
                <th className="text-right text-gray-400 font-medium px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-500">Chargement...</td></tr>
              )}
              {!loading && companies.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-500">Aucune entreprise trouvée.</td></tr>
              )}
              {companies.map(c => (
                <tr key={c.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.rccm}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 hidden md:table-cell">{SECTORS[c.sector] || c.sector}</td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    <span className="inline-flex items-center gap-1 text-gray-300">
                      <Users className="w-3.5 h-3.5" />{c.userCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    <span className="inline-flex items-center gap-1 text-gray-300">
                      <ClipboardList className="w-3.5 h-3.5" />{c.assessmentCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openDetail(c.id)}
                      className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
            <p className="text-xs text-gray-500">Page {page} sur {pages}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadCompanies(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-gray-700 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => loadCompanies(page + 1)}
                disabled={page >= pages}
                className="p-1.5 rounded-lg bg-gray-700 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-700 sticky top-0 bg-gray-900">
              <h2 className="text-lg font-bold text-white">
                {detail ? detail.company.name : 'Chargement...'}
              </h2>
              <button onClick={() => setDetail(null)} className="p-1.5 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading && (
              <div className="p-8 text-center text-gray-500">Chargement...</div>
            )}

            {detail && (
              <div className="p-5 space-y-5">
                {/* Company info */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">RCCM</p>
                    <p className="text-sm text-white mt-0.5">{detail.company.rccm || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Secteur</p>
                    <p className="text-sm text-white mt-0.5">{SECTORS[detail.company.sector] || detail.company.sector}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Inscrit le</p>
                    <p className="text-sm text-white mt-0.5">{formatDate(detail.company.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Sites</p>
                    <p className="text-sm text-white mt-0.5">{detail.sites.length}</p>
                  </div>
                </div>

                {/* Users */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">Utilisateurs ({detail.users.length})</h3>
                  <div className="space-y-2">
                    {detail.users.map(u => (
                      <div key={u.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2.5">
                        <div>
                          <p className="text-sm text-white">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-700 text-gray-400'}`}>
                          {u.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sites */}
                {detail.sites.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Sites</h3>
                    <div className="space-y-2">
                      {detail.sites.map(s => (
                        <div key={s.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2.5">
                          <div>
                            <p className="text-sm text-white">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.type} · {s.address || '—'}</p>
                          </div>
                          <span className="text-xs text-gray-500">{s.assessmentCount} bilan{s.assessmentCount > 1 ? 's' : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
