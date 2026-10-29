'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import QRCodeImage from '@/components/QRCodeImage'

interface CertRow {
  id: number
  status: string
  assessmentName: string
  assessmentYear: number
  companyName: string
  siteName: string
  totalCo2eq: number
  requestedAt: string
  updatedAt: string
  certifiedAt: string | null
  certificateNumber: string | null
}

const STATUS_INFO: Record<string, { label: string; cls: string }> = {
  assigned:    { label: 'Assigné',  cls: 'bg-blue-500/20 text-blue-400' },
  in_progress: { label: 'En cours', cls: 'bg-violet-500/20 text-violet-400' },
  certified:   { label: 'Certifié', cls: 'bg-green-500/20 text-green-400' },
  rejected:    { label: 'Rejeté',   cls: 'bg-red-500/20 text-red-400' },
}

const TABS = [
  { key: 'all',        label: 'Tous' },
  { key: 'assigned',   label: 'Assignés' },
  { key: 'in_progress',label: 'En cours' },
  { key: 'certified',  label: 'Certifiés' },
  { key: 'rejected',   label: 'Rejetés' },
]

function fmt(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(2) + ' tCO₂e'
  return n.toFixed(2) + ' kgCO₂e'
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ExpertCertificationsPage() {
  const [certs, setCerts] = useState<CertRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')

  useEffect(() => {
    fetch('/api/expert/certifications')
      .then(r => r.json())
      .then(data => { setCerts(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = tab === 'all' ? certs : certs.filter(c => c.status === tab)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Mes certifications</h1>
        <p className="text-gray-400 text-sm mt-1">{certs.length} bilan{certs.length !== 1 ? 's' : ''} assigné{certs.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(t => {
          const count = t.key === 'all' ? certs.length : certs.filter(c => c.status === t.key).length
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                tab === t.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {t.label} ({count})
            </button>
          )
        })}
      </div>

      {loading && <div className="text-center py-10 text-gray-500">Chargement...</div>}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-10 text-gray-500">Aucune certification dans cette catégorie.</div>
      )}

      <div className="space-y-3">
        {filtered.map(c => {
          const s = STATUS_INFO[c.status] || { label: c.status, cls: 'bg-gray-700 text-gray-400' }
          return (
            <Link
              key={c.id}
              href={`/expert/certifications/${c.id}`}
              className="block bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-blue-500/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${s.cls}`}>{s.label}</span>
                    {c.certificateNumber && (
                      <span className="text-xs text-gray-500 font-mono">#{c.certificateNumber}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-white">{c.assessmentName}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{c.companyName} · {c.siteName} · {c.assessmentYear}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>Assigné le {fmtDate(c.requestedAt)}</span>
                    {c.certifiedAt && <span>Certifié le {fmtDate(c.certifiedAt)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold text-brand-400">{fmt(c.totalCo2eq)}</p>
                  </div>
                  {c.status === 'certified' && c.certificateNumber && (
                    <QRCodeImage certNumber={c.certificateNumber} size={48} />
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
