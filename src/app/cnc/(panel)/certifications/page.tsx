'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileCheck, Clock, Award, ChevronRight, Loader2 } from 'lucide-react'
import QRCodeImage from '@/components/QRCodeImage'

interface CncCertification {
  id: number
  status: string
  certificateNumber: string | null
  submittedToCncAt: string | null
  cncCertificateGeneratedAt: string | null
  assessmentName: string
  assessmentYear: number
  totalCo2eq: number
  companyName: string
}

export default function CncCertificationsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [certs, setCerts] = useState<CncCertification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')

  useEffect(() => {
    const f = searchParams.get('filter')
    if (f === 'pending' || f === 'done') setFilter(f)
  }, [searchParams])

  useEffect(() => {
    fetch('/api/cnc/certifications')
      .then(r => r.json())
      .then(data => {
        setCerts(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const stats = {
    all: certs.length,
    pending: certs.filter(c => c.status === 'submitted_to_cnc').length,
    done: certs.filter(c => c.status === 'certificate_generated').length,
  }

  const filtered = filter === 'all' ? certs
    : filter === 'pending' ? certs.filter(c => c.status === 'submitted_to_cnc')
    : certs.filter(c => c.status === 'certificate_generated')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certifications</h1>
          <p className="text-gray-500 text-sm mt-1">Dossiers soumis au CNC ({stats.all})</p>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2">
        {[
          { key: 'all' as const, label: 'Tous', count: stats.all },
          { key: 'pending' as const, label: 'En attente', count: stats.pending },
          { key: 'done' as const, label: 'Certificats émis', count: stats.done },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              filter === f.key
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            {f.label}
            {f.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                filter === f.key ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-100 text-gray-500'
              }`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-20 text-center shadow-sm">
          <div className="mx-auto w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <FileCheck className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-700 font-medium">Aucun dossier dans cette catégorie.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
          {filtered.map(cert => (
            <button
              key={cert.id}
              onClick={() => router.push(`/cnc/certifications/${cert.id}`)}
              className="w-full px-5 py-4 text-left hover:bg-emerald-50/50 transition-colors group flex items-center justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">{cert.assessmentName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{cert.companyName} · {cert.assessmentYear}</p>
                {cert.submittedToCncAt && (
                  <p className="text-xs text-gray-400 mt-1">
                    Soumis le {new Date(cert.submittedToCncAt).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  cert.status === 'submitted_to_cnc'
                    ? 'text-amber-600 bg-amber-50'
                    : 'text-emerald-600 bg-emerald-50'
                }`}>
                  {cert.status === 'submitted_to_cnc' ? 'En attente' : 'Certificat émis'}
                </span>
                {cert.status === 'certificate_generated' && cert.certificateNumber && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <QRCodeImage certNumber={cert.certificateNumber} size={48} />
                  </div>
                )}
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
