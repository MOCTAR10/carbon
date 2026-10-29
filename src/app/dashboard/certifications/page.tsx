'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Award, Shield, Clock, CheckCircle2, XCircle,
  FileText, Download, Calendar, Building2, ArrowRight, User,
  BarChart3, Eye, ClipboardCheck, ChevronDown, ChevronUp, Landmark,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CertDoc {
  id: number
  docType: string
  originalName: string
  fileSize: number
  mimeType: string
  createdAt: string
}

interface Certification {
  id: number
  assessmentId: number
  assessmentName: string
  assessmentYear: number
  siteName: string
  totalCo2eq: number
  scope1: number
  scope2: number
  scope3: number
  status: string
  expertName: string | null
  expertEmail: string | null
  inspectionDate: string | null
  inspectionNotes: string | null
  companyMessage: string | null
  adminNotes: string | null
  rejectionReason: string | null
  certifiedAt: string | null
  certificateNumber: string | null
  requestedAt: string

  auditScheduledDate: string | null
  auditLocation: string | null
  submittedToOgecAt: string | null
  ogecReference: string | null
  avisNumber: string | null
  avisDate: string | null
  avisPdfUrl: string | null
  avisPeriodStart: number | null
  avisPeriodEnd: number | null
  avisTotalCo2eq: number | null
  expertReportPdfUrl: string | null
  dossierCompiledAt: string | null
  submittedToCncAt: string | null
  cncDepositReference: string | null
  documents: CertDoc[]
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string; color: string; bg: string; icon: React.ElementType
}> = {
  pending:    { label: 'En attente',     color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',  icon: Clock },
  assigned:   { label: 'Expert assigné', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',    icon: User },
  in_progress:{ label: 'Audit en cours', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200',icon: Eye },
  audit_done: { label: 'Audit terminé',  color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200',icon: ClipboardCheck },
  submitted_to_cnc: { label: 'Déposé au CNC', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200', icon: Landmark },
  certified:  { label: 'Certifié',       color: 'text-green-700',  bg: 'bg-green-50 border-green-200',  icon: Award },
  rejected:   { label: 'Refusé',         color: 'text-red-700',    bg: 'bg-red-50 border-red-200',      icon: XCircle },
}

const WORKFLOW_STEPS: { key: string; label: string }[] = [
  { key: 'pending',     label: 'Demande' },
  { key: 'assigned',    label: 'Expert assigné' },
  { key: 'in_progress', label: 'Audit en cours' },
  { key: 'audit_done',  label: 'Audit terminé' },
  { key: 'submitted_to_cnc', label: 'Déposé au CNC' },
  { key: 'certified',   label: 'Certifié' },
]

const STATUS_STEP_INDEX: Record<string, number> = {
  pending:     0,
  assigned:    1,
  in_progress: 2,
  audit_done:  3,
  submitted_to_cnc: 4,
  certified:   5,
  rejected:    -1,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCO2(v: number): string {
  if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(2)} MtCO₂e`
  if (Math.abs(v) >= 1000)    return `${(v / 1000).toFixed(2)} tCO₂e`
  return `${v.toFixed(1)} kgCO₂e`
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} Mo`
  if (bytes >= 1024)    return `${(bytes / 1024).toFixed(0)} Ko`
  return `${bytes} o`
}

// ─── WorkflowProgress component ──────────────────────────────────────────────

function WorkflowProgress({ status }: { status: string }) {
  if (status === 'rejected') {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <p className="text-sm text-red-700 font-medium">Demande de certification refusée</p>
      </div>
    )
  }

  const currentIdx = STATUS_STEP_INDEX[status] ?? 0

  return (
    <div className="w-full">
      <div className="relative flex items-center justify-between">
        {/* Background track */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-200 rounded-full" style={{ zIndex: 0 }} />
        {/* Filled track */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${(currentIdx / (WORKFLOW_STEPS.length - 1)) * 100}%`, zIndex: 1 }}
        />
        {/* Dots */}
        {WORKFLOW_STEPS.map((step, i) => {
          const done    = i < currentIdx
          const current = i === currentIdx
          return (
            <div key={step.key} className="flex flex-col items-center" style={{ zIndex: 2 }}>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  done    ? 'bg-green-500 border-green-500' :
                  current ? 'bg-white border-green-500 shadow-md' :
                            'bg-white border-gray-300'
                }`}
              >
                {done && <CheckCircle2 className="w-3 h-3 text-white" />}
                {current && <div className="w-2 h-2 rounded-full bg-green-500" />}
              </div>
            </div>
          )
        })}
      </div>
      {/* Labels — only show a few to avoid overflow */}
      <div className="flex justify-between mt-2">
        {WORKFLOW_STEPS.map((step, i) => {
          const done    = i < currentIdx
          const current = i === currentIdx
          return (
            <div
              key={step.key}
              className={`text-center flex-1 text-[9px] leading-tight px-0.5 ${
                done    ? 'text-green-600 font-medium' :
                current ? 'text-green-700 font-semibold' :
                          'text-gray-400'
              }`}
            >
              {step.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function CertificationsPage() {
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCert, setSelectedCert] = useState<Certification | null>(null)

  useEffect(() => {
    fetch('/api/certifications')
      .then(r => r.json())
      .then(data => {
        setCertifications(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const ACTIVE_STATUSES = ['pending', 'assigned', 'in_progress', 'audit_done', 'submitted_to_cnc']
  const certified   = certifications.filter(c => c.status === 'certified')
  const inProgress  = certifications.filter(c => ACTIVE_STATUSES.includes(c.status))
  const rejected    = certifications.filter(c => c.status === 'rejected')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Award className="w-5 h-5 text-brand-600" />
          </div>
          <p className="text-sm text-gray-500">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes certifications</h1>
          <p className="text-sm text-gray-500 mt-1">Suivi du processus de certification GreenLeaves</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
            <Award className="w-4 h-4" />
            {certified.length} certifié{certified.length !== 1 ? 's' : ''}
          </div>
          {inProgress.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm font-medium">
              <Clock className="w-4 h-4" />
              {inProgress.length} en cours
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {certifications.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune certification</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Vous n&apos;avez pas encore demandé de certification pour vos bilans carbone.
            Ouvrez un bilan et cliquez sur &quot;Certifier ce bilan&quot; pour commencer.
          </p>
          <Link href="/dashboard/assessments" className="btn-primary inline-flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Voir mes bilans
          </Link>
        </div>
      )}

      {/* Certified */}
      {certified.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" /> Bilans certifiés
          </h2>
          <div className="space-y-3">
            {certified.map(cert => (
              <CertCard key={cert.id} cert={cert} onSelect={() => setSelectedCert(cert)} />
            ))}
          </div>
        </div>
      )}

      {/* In progress */}
      {inProgress.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" /> En cours de certification
          </h2>
          <div className="space-y-3">
            {inProgress.map(cert => (
              <CertCard key={cert.id} cert={cert} onSelect={() => setSelectedCert(cert)} />
            ))}
          </div>
        </div>
      )}

      {/* Rejected */}
      {rejected.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600" /> Certifications refusées
          </h2>
          <div className="space-y-3">
            {rejected.map(cert => (
              <CertCard key={cert.id} cert={cert} onSelect={() => setSelectedCert(cert)} />
            ))}
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedCert && (
        <CertDetailModal cert={selectedCert} onClose={() => setSelectedCert(null)} />
      )}
    </div>
  )
}

// ─── CertCard ─────────────────────────────────────────────────────────────────

function CertCard({ cert, onSelect }: { cert: Certification; onSelect: () => void }) {
  const config     = STATUS_CONFIG[cert.status] || STATUS_CONFIG.pending
  const StatusIcon = config.icon
  const showProgress = cert.status !== 'rejected'

  return (
    <div
      onClick={onSelect}
      className="card p-5 cursor-pointer hover:shadow-md transition-shadow"
    >
      {/* Top row */}
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${config.bg}`}>
          <StatusIcon className={`w-6 h-6 ${config.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-semibold text-gray-900 truncate">{cert.assessmentName}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${config.bg} ${config.color} flex-shrink-0`}>
              {config.label}
            </span>
            {cert.certificateNumber && (
              <span className="text-xs text-gray-400 font-mono flex-shrink-0">N° {cert.certificateNumber}</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{cert.siteName}</span>
            <span>&bull;</span>
            <span>{cert.assessmentYear}</span>
            <span>&bull;</span>
            <span>{formatCO2(cert.totalCo2eq)}</span>
            {cert.expertName && (
              <>
                <span>&bull;</span>
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{cert.expertName}</span>
              </>
            )}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <span className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded font-medium">S1: {formatCO2(cert.scope1)}</span>
          <span className="text-xs px-2 py-1 bg-orange-50 text-orange-600 rounded font-medium">S2: {formatCO2(cert.scope2)}</span>
          <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded font-medium">S3: {formatCO2(cert.scope3)}</span>
        </div>

        <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div className="pt-3 border-t border-gray-100">
          <WorkflowProgress status={cert.status} />
        </div>
      )}
    </div>
  )
}

// ─── CertDetailModal ──────────────────────────────────────────────────────────

function CertDetailModal({ cert, onClose }: { cert: Certification; onClose: () => void }) {
  const config        = STATUS_CONFIG[cert.status] || STATUS_CONFIG.pending
  const StatusIcon    = config.icon
  const [certLoading, setCertLoading] = useState(false)
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [showDocs, setShowDocs] = useState(false)

  // Most recent certificate uploaded by the expert (documents are sorted newest first)
  const certificateDoc    = cert.documents.find(d => d.docType === 'certificate')
  const canDownloadCert   = cert.status === 'certified' && !!certificateDoc
  const canDownloadReport = !!cert.expertReportPdfUrl

  async function downloadBlob(url: string, filename: string) {
    const res = await fetch(url)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Erreur lors du téléchargement')
      return
    }
    const blobUrl = URL.createObjectURL(await res.blob())
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    a.click()
    URL.revokeObjectURL(blobUrl)
  }

  async function downloadCertificate() {
    if (!certificateDoc) return
    setCertLoading(true)
    try { await downloadBlob(`/api/certification-documents/${certificateDoc.id}`, certificateDoc.originalName) }
    finally { setCertLoading(false) }
  }

  async function downloadTracking() {
    setTrackingLoading(true)
    try { await downloadBlob(`/api/certifications/${cert.id}/tracking`, `suivi-demande-certification-${cert.id}.pdf`) }
    finally { setTrackingLoading(false) }
  }

  async function downloadExpertReport() {
    setReportLoading(true)
    try {
      const res = await fetch(`/api/admin/certifications/${cert.id}/generate-pdf`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Erreur lors de la génération du rapport')
        return
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `rapport-expert-certification-${cert.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setReportLoading(false)
    }
  }

  // Status-specific message shown to company
  const statusMessage: Record<string, string> = {
    pending:     'Votre demande est en attente d\'attribution à un expert accrédité GreenLeaves.',
    assigned:    `L'expert ${cert.expertName || ''} a été désigné pour votre audit.`,
    in_progress: 'L\'audit de votre bilan est en cours. L\'expert examine vos données et documents.',
    audit_done:  'L\'audit terrain est terminé. L\'expert accrédité prépare le dépôt de votre dossier au Conseil National du Climat (CNC).',
    submitted_to_cnc: 'Votre dossier a été déposé au CNC par l\'expert accrédité. Le certificat sera disponible ici dès sa délivrance.',
    certified:   'Votre bilan carbone est certifié par le CNC. Téléchargez le certificat ci-dessous.',
    rejected:    cert.rejectionReason || 'Votre demande a été refusée.',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${config.bg}`}>
                <StatusIcon className={`w-6 h-6 ${config.color}`} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{cert.assessmentName}</h3>
                <p className="text-sm text-gray-500">{cert.siteName} &bull; {cert.assessmentYear}</p>
              </div>
            </div>
            <span className={`text-sm px-3 py-1 rounded-full font-medium border ${config.bg} ${config.color}`}>
              {config.label}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* Workflow progress */}
          {cert.status !== 'rejected' && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Progression du dossier
              </p>
              <WorkflowProgress status={cert.status} />
            </div>
          )}

          {/* Status message */}
          <div className={`flex gap-3 p-4 rounded-xl border ${
            cert.status === 'rejected'  ? 'bg-red-50 border-red-200' :
            cert.status === 'certified' ? 'bg-green-50 border-green-200' :
            'bg-blue-50 border-blue-200'
          }`}>
            <StatusIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.color}`} />
            <p className={`text-sm ${
              cert.status === 'rejected'  ? 'text-red-700' :
              cert.status === 'certified' ? 'text-green-700' :
              'text-blue-700'
            }`}>
              {statusMessage[cert.status]}
            </p>
          </div>

          {/* Emissions summary */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total',   value: cert.totalCo2eq, color: 'bg-brand-50 text-brand-700 border-brand-200' },
              { label: 'Scope 1', value: cert.scope1,     color: 'bg-red-50 text-red-700 border-red-200' },
              { label: 'Scope 2', value: cert.scope2,     color: 'bg-orange-50 text-orange-700 border-orange-200' },
              { label: 'Scope 3', value: cert.scope3,     color: 'bg-blue-50 text-blue-700 border-blue-200' },
            ].map((s, i) => (
              <div key={i} className={`rounded-xl p-3 border text-center ${s.color}`}>
                <p className="text-xs font-medium opacity-70">{s.label}</p>
                <p className="text-sm font-bold mt-0.5">{formatCO2(s.value)}</p>
              </div>
            ))}
          </div>

          {/* Timeline rows */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Demande envoyée le</span>
              <span className="font-medium text-gray-900 ml-auto">{formatDate(cert.requestedAt)}</span>
            </div>

            {cert.expertName && (
              <div className="flex items-center gap-3 text-sm p-3 bg-gray-50 rounded-lg">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">Expert auditeur</span>
                <span className="font-medium text-gray-900 ml-auto">{cert.expertName}</span>
              </div>
            )}

            {cert.inspectionDate && (
              <div className="flex items-center gap-3 text-sm p-3 bg-gray-50 rounded-lg">
                <Eye className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">Audit réalisé le</span>
                <span className="font-medium text-gray-900 ml-auto">{formatDate(cert.inspectionDate)}</span>
              </div>
            )}

            {cert.submittedToCncAt && (
              <div className="flex items-center gap-3 text-sm p-3 bg-gray-50 rounded-lg">
                <Landmark className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">Dossier déposé au CNC le</span>
                <span className="font-medium text-gray-900 ml-auto">
                  {formatDate(cert.submittedToCncAt)}{cert.cncDepositReference && ` · Réf. ${cert.cncDepositReference}`}
                </span>
              </div>
            )}

            {cert.certifiedAt && (
              <div className="flex items-center gap-3 text-sm p-3 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-green-700">Certifié le</span>
                <span className="font-medium text-green-800 ml-auto">{formatDate(cert.certifiedAt)}</span>
              </div>
            )}

            {cert.certificateNumber && (
              <div className="flex items-center gap-3 text-sm p-3 bg-green-50 rounded-lg">
                <Award className="w-4 h-4 text-green-600" />
                <span className="text-green-700">N° du certificat CNC</span>
                <span className="font-mono font-medium text-green-800 ml-auto">{cert.certificateNumber}</span>
              </div>
            )}
          </div>

          {/* Admin / expert notes */}
          {cert.adminNotes && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes de l&apos;expert</p>
              <p className="text-sm text-gray-700 bg-blue-50 rounded-lg p-3">{cert.adminNotes}</p>
            </div>
          )}

          {cert.rejectionReason && (
            <div>
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Motif de refus</p>
              <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3">{cert.rejectionReason}</p>
            </div>
          )}

          {/* Downloads */}
          <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Téléchargements</p>

              {canDownloadCert && (
                <button
                  onClick={downloadCertificate}
                  disabled={certLoading}
                  className="w-full flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors disabled:opacity-60"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-green-900 text-sm">Certificat CNC</p>
                    <p className="text-xs text-green-600">Copie numérique du certificat — N° {cert.certificateNumber}</p>
                  </div>
                  {certLoading
                    ? <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    : <Download className="w-4 h-4 text-green-600 flex-shrink-0" />
                  }
                </button>
              )}

              <button
                onClick={downloadTracking}
                disabled={trackingLoading}
                className="w-full flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-60"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900 text-sm">Fiche de suivi de la demande</p>
                  <p className="text-xs text-gray-500">État d&apos;avancement de votre dossier (PDF)</p>
                </div>
                {trackingLoading
                  ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  : <Download className="w-4 h-4 text-gray-500 flex-shrink-0" />
                }
              </button>

              {canDownloadReport && (
                <button
                  onClick={downloadExpertReport}
                  disabled={reportLoading}
                  className="w-full flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-60"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900 text-sm">Rapport d&apos;Audit Expert</p>
                    <p className="text-xs text-gray-500">Rapport complet d'audit — expert GreenLeaves</p>
                  </div>
                  {reportLoading
                    ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    : <Download className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  }
                </button>
              )}
          </div>

          {/* Uploaded documents */}
          {cert.documents.length > 0 && (
            <div>
              <button
                onClick={() => setShowDocs(!showDocs)}
                className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 hover:text-gray-700 transition-colors"
              >
                Documents joints ({cert.documents.length})
                {showDocs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showDocs && (
                <div className="space-y-2">
                  {cert.documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <FileText className="w-5 h-5 text-brand-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.originalName}</p>
                        <p className="text-xs text-gray-400">{formatFileSize(doc.fileSize)} &bull; {formatDate(doc.createdAt)}</p>
                      </div>
                      <a
                        href={`/api/certification-documents/${doc.id}`}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Télécharger"
                      >
                        <Download className="w-4 h-4 text-gray-500" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex items-center justify-between">
          <Link
            href={`/dashboard/assessments/${cert.assessmentId}`}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1"
          >
            Voir le bilan <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
