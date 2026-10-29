'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileCheck, Clock, Award, ChevronRight, Loader2,
  TrendingUp, ArrowUpRight, Users,
} from 'lucide-react'

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

export default function CncDashboardPage() {
  const router = useRouter()
  const [certs, setCerts] = useState<CncCertification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cnc/certifications')
      .then(r => r.json())
      .then(data => {
        setCerts(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const pending = certs.filter(c => c.status === 'submitted_to_cnc')
  const completed = certs.filter(c => c.status === 'certificate_generated')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d&apos;ensemble des certifications CNC</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">En attente</p>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{pending.length}</p>
          <p className="text-xs text-gray-400 mt-1">Dossiers à traiter</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Certificats émis</p>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Award className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{completed.length}</p>
          <p className="text-xs text-gray-400 mt-1">Certificats générés</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Total dossiers</p>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <FileCheck className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{certs.length}</p>
          <p className="text-xs text-gray-400 mt-1">Tous statuts confondus</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Taux de complétion</p>
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {certs.length > 0 ? Math.round((completed.length / certs.length) * 100) : 0}%
          </p>
          <p className="text-xs text-gray-400 mt-1">Dossiers finalisés</p>
        </div>
      </div>


      {/* Pending certifications */}
      {pending.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Dossiers en attente
            </h2>
            <button
              onClick={() => router.push('/cnc/certifications')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
            >
              Voir tout <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {pending.slice(0, 5).map(cert => (
              <button
                key={cert.id}
                onClick={() => router.push(`/cnc/certifications/${cert.id}`)}
                className="w-full px-5 py-3 text-left hover:bg-emerald-50/50 transition-colors group flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-emerald-700 transition-colors">{cert.assessmentName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{cert.companyName} · {cert.assessmentYear}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full font-medium">En attente</span>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                </div>
              </button>
            ))}
          </div>
          {pending.length > 5 && (
            <div className="px-5 py-3 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">{pending.length - 5} dossiers supplémentaires</p>
            </div>
          )}
        </div>
      )}

      {/* Recently completed */}
      {completed.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-500" />
              Derniers certificats émis
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {completed.slice(0, 5).map(cert => (
              <button
                key={cert.id}
                onClick={() => router.push(`/cnc/certifications/${cert.id}`)}
                className="w-full px-5 py-3 text-left hover:bg-emerald-50/50 transition-colors group flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-emerald-700 transition-colors">{cert.assessmentName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{cert.companyName} · N° {cert.certificateNumber}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-medium">Certificat émis</span>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {certs.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl py-20 text-center shadow-sm">
          <div className="mx-auto w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <FileCheck className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-700 font-medium">Aucun dossier soumis pour le moment</p>
          <p className="text-sm text-gray-400 mt-1">Les dossiers vous seront attribués par les administrateurs.</p>
        </div>
      )}
    </div>
  )
}
