'use client'

import { useEffect, useState } from 'react'
import { Building2, Loader2, Search } from 'lucide-react'

interface Company {
  id: number
  name: string
  rccm: string | null
  sector: string | null
  logo_url: string | null
  created_at: string
}

export default function CncEntreprisesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/cnc/entreprises')
      .then(r => r.json())
      .then(data => {
        setCompanies(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.sector?.toLowerCase() ?? '').includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entreprises</h1>
          <p className="text-gray-500 text-sm mt-1">
            {companies.length} entreprise{companies.length !== 1 ? 's' : ''} inscrite{companies.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 w-64"
          />
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl py-20 text-center shadow-sm">
          <div className="mx-auto w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-700 font-medium">Aucune entreprise trouvée</p>
          <p className="text-sm text-gray-400 mt-1">{search ? 'Essayez un autre terme de recherche.' : 'Aucune entreprise inscrite pour le moment.'}</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entreprise</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Secteur</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">RCCM</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Inscrite le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-emerald-50/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        {c.logo_url
                          ? <img src={c.logo_url} alt="" className="w-7 h-7 object-contain rounded" />
                          : <Building2 className="w-4 h-4 text-emerald-500" />
                        }
                      </div>
                      <span className="text-sm font-medium text-gray-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-gray-600">{c.sector || '—'}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-gray-600">{c.rccm || '—'}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">
                    {new Date(c.created_at).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
