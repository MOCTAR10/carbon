'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import {
  Award, Shield, Clock, XCircle, Check, X, Loader2,
  FileText, Download, Calendar, Building2, ArrowRight, ArrowUpRight, User,
  BarChart3, Eye, ChevronDown, Landmark, MapPin, FileCheck2, ShieldCheck,
} from 'lucide-react'
import { cn, fmtCO2Text, fmtDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge, CertStatusBadge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Stagger, Reveal } from '@/components/ui/motion'

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

// ─── Workflow ─────────────────────────────────────────────────────────────────

const WORKFLOW_STEPS: { key: string; label: string }[] = [
  { key: 'pending',          label: 'Demande' },
  { key: 'assigned',         label: 'Expert assigné' },
  { key: 'in_progress',      label: 'Audit en cours' },
  { key: 'audit_done',       label: 'Audit terminé' },
  { key: 'submitted_to_cnc', label: 'Déposé au CNC' },
  { key: 'certified',        label: 'Certifié' },
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

const SCOPES = [
  { key: 'scope1', label: 'Scope 1', dot: 'bg-gold-500' },
  { key: 'scope2', label: 'Scope 2', dot: 'bg-ink-400' },
  { key: 'scope3', label: 'Scope 3', dot: 'bg-forest-400' },
] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string | null): string {
  if (!d) return '—'
  return fmtDate(d)
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} Mo`
  if (bytes >= 1024)    return `${(bytes / 1024).toFixed(0)} Ko`
  return `${bytes} o`
}

// ─── Journey (horizontal, for cards) ──────────────────────────────────────────

function JourneyTrack({ status }: { status: string }) {
  const currentIdx = STATUS_STEP_INDEX[status] ?? 0
  return (
    <ol className="grid grid-cols-6 gap-2">
      {WORKFLOW_STEPS.map((step, i) => {
        const done   = i < currentIdx || status === 'certified'
        const active = i === currentIdx && status !== 'certified'
        return (
          <li key={step.key} className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                'flex size-6 flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-bold',
                done   && 'border-forest-700 bg-forest-700 text-ivory-50',
                active && 'border-gold-500 bg-gold-50 text-gold-700 ring-4 ring-gold-100',
                !done && !active && 'border-ivory-400 bg-white text-ink-400',
              )}>
                {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
              </span>
              {i < WORKFLOW_STEPS.length - 1 && (
                <span className={cn('h-px flex-1', done ? 'bg-forest-600' : 'bg-ivory-300')} />
              )}
            </div>
            <p className={cn(
              'mt-2 truncate text-[11px] leading-tight',
              done ? 'text-ink-600' : active ? 'font-semibold text-forest-900' : 'text-ink-400',
            )}>
              {step.label}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

// ─── Journey (vertical, for the detail dialog — matches the dashboard stepper) ─

function JourneyStepper({ status }: { status: string }) {
  const idx = STATUS_STEP_INDEX[status] ?? 0
  return (
    <ol>
      {WORKFLOW_STEPS.map((step, i) => {
        const done   = i < idx || status === 'certified'
        const active = i === idx && status !== 'certified'
        return (
          <li key={step.key} className="relative flex items-center gap-3 pb-3 last:pb-0">
            {i < WORKFLOW_STEPS.length - 1 && (
              <span className={cn('absolute left-[11px] top-6 h-[calc(100%-12px)] w-px', done ? 'bg-forest-600' : 'bg-ivory-300')} />
            )}
            <span className={cn(
              'relative z-10 flex size-6 flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-bold',
              done   && 'border-forest-700 bg-forest-700 text-ivory-50',
              active && 'border-gold-500 bg-gold-50 text-gold-700 ring-4 ring-gold-100',
              !done && !active && 'border-ivory-400 bg-white text-ink-400',
            )}>
              {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
            </span>
            <span className={cn('text-sm', done ? 'text-ink-700' : active ? 'font-semibold text-forest-900' : 'text-ink-400')}>
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
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

  if (loading) return <CertificationsSkeleton />

  return (
    <Stagger className="space-y-10">
      <Reveal>
        <PageHeader
          eyebrow="Conformité & certification"
          title="Mes certifications"
          description="Suivez chaque demande : audit terrain par un expert accrédité GreenLeaves, dépôt du dossier au CNC, puis délivrance du certificat."
          actions={
            <>
              <Badge tone="forest" className="px-3 py-1 text-xs">
                <Award className="size-3.5" />
                {certified.length} certifié{certified.length !== 1 ? 's' : ''}
              </Badge>
              {inProgress.length > 0 && (
                <Badge tone="gold" className="px-3 py-1 text-xs">
                  <Clock className="size-3.5" />
                  {inProgress.length} en cours
                </Badge>
              )}
            </>
          }
        />
      </Reveal>

      {/* Empty state */}
      {certifications.length === 0 && (
        <Reveal>
          <Card className="p-10">
            <EmptyState
              icon={Award}
              title="Aucune certification"
              description="Ouvrez un bilan finalisé et cliquez sur « Certifier ce bilan » pour commencer."
              action={
                <Button asChild>
                  <Link href="/dashboard/assessments"><BarChart3 /> Voir mes bilans</Link>
                </Button>
              }
            />
          </Card>
        </Reveal>
      )}

      {/* Certified */}
      {certified.length > 0 && (
        <Section icon={FileCheck2} title="Bilans certifiés" count={certified.length} tone="gold">
          <div className="grid gap-5 lg:grid-cols-2">
            {certified.map(cert => (
              <CredentialCard key={cert.id} cert={cert} onSelect={() => setSelectedCert(cert)} />
            ))}
          </div>
        </Section>
      )}

      {/* In progress */}
      {inProgress.length > 0 && (
        <Section icon={Clock} title="En cours de certification" count={inProgress.length}>
          <div className="space-y-4">
            {inProgress.map(cert => (
              <ProgressCard key={cert.id} cert={cert} onSelect={() => setSelectedCert(cert)} />
            ))}
          </div>
        </Section>
      )}

      {/* Rejected */}
      {rejected.length > 0 && (
        <Section icon={XCircle} title="Certifications refusées" count={rejected.length}>
          <div className="space-y-4">
            {rejected.map(cert => (
              <RejectedCard key={cert.id} cert={cert} onSelect={() => setSelectedCert(cert)} />
            ))}
          </div>
        </Section>
      )}

      <CertDetailDialog cert={selectedCert} onClose={() => setSelectedCert(null)} />
    </Stagger>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
  icon: Icon, title, count, tone, children,
}: { icon: React.ElementType; title: string; count: number; tone?: 'gold'; children: React.ReactNode }) {
  return (
    <Reveal>
      <section>
        <div className="mb-4 flex items-center gap-3">
          <Icon className={cn('size-4', tone === 'gold' ? 'text-gold-500' : 'text-forest-500')} strokeWidth={1.8} />
          <h2 className="font-display text-xl text-forest-900">{title}</h2>
          <span className="rounded-full bg-ivory-200 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-ink-500">{count}</span>
          <span className="h-px flex-1 bg-ivory-300" />
        </div>
        {children}
      </section>
    </Reveal>
  )
}

// ─── Shared card bits ─────────────────────────────────────────────────────────

function CardMeta({ cert }: { cert: Certification }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
      <span className="inline-flex items-center gap-1"><Building2 className="size-3" />{cert.siteName}</span>
      <span className="text-ivory-400">•</span>
      <span>{cert.assessmentYear}</span>
      <span className="text-ivory-400">•</span>
      <span className="font-semibold tabular-nums text-ink-700">{fmtCO2Text(cert.totalCo2eq)}</span>
      {cert.expertName && (
        <>
          <span className="text-ivory-400">•</span>
          <span className="inline-flex items-center gap-1"><User className="size-3" />{cert.expertName}</span>
        </>
      )}
    </p>
  )
}

function ScopeChips({ cert }: { cert: Certification }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SCOPES.map(s => (
        <span key={s.key} className="inline-flex items-center gap-1.5 rounded-lg border border-ivory-300 bg-ivory-50 px-2 py-1 text-[11px] text-ink-600">
          <span className={cn('size-1.5 rounded-full', s.dot)} />
          <span className="font-semibold">{s.label}</span>
          <span className="tabular-nums">{fmtCO2Text(cert[s.key])}</span>
        </span>
      ))}
    </div>
  )
}

// ─── Certified: credential card ───────────────────────────────────────────────

function CredentialCard({ cert, onSelect }: { cert: Certification; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="group relative w-full overflow-hidden rounded-2xl border border-gold-300/70 bg-white p-6 text-left shadow-gold transition-all hover:-translate-y-0.5 hover:shadow-lifted focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-300 via-gold-500 to-gold-300" />
      <span className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full border border-gold-200/60" />
      <span className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full border border-gold-200/60" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex size-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold-100 to-gold-50 ring-1 ring-gold-300/60">
          <Award className="size-6 text-gold-600" strokeWidth={1.6} />
        </div>
        <CertStatusBadge status={cert.status} />
      </div>

      <p className="relative mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-600">Certificat CNC</p>
      <p className="relative mt-1 font-display text-2xl tracking-tight text-forest-900">
        {cert.certificateNumber ? `N° ${cert.certificateNumber}` : 'Numéro en attente'}
      </p>

      <h3 className="relative mt-4 truncate text-sm font-semibold text-ink-800">{cert.assessmentName}</h3>
      <div className="relative mt-1"><CardMeta cert={cert} /></div>

      <div className="relative mt-5 flex items-center justify-between border-t border-ivory-300 pt-4">
        <span className="text-xs text-ink-500">
          Délivré le <span className="font-semibold text-ink-700">{formatDate(cert.certifiedAt)}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-forest-700 transition-colors group-hover:text-gold-600">
          Voir le certificat <ArrowRight className="size-3" />
        </span>
      </div>
    </button>
  )
}

// ─── In progress card ─────────────────────────────────────────────────────────

function ProgressCard({ cert, onSelect }: { cert: Certification; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className="group block w-full text-left focus:outline-none">
      <Card className="p-6 transition-all group-hover:shadow-lifted group-focus-visible:ring-2 group-focus-visible:ring-gold-400">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-display text-lg text-forest-900">{cert.assessmentName}</h3>
              <CertStatusBadge status={cert.status} />
            </div>
            <div className="mt-1.5"><CardMeta cert={cert} /></div>
          </div>
          <div className="hidden md:block"><ScopeChips cert={cert} /></div>
        </div>

        <div className="mt-6"><JourneyTrack status={cert.status} /></div>

        {(cert.auditScheduledDate || cert.auditLocation || cert.submittedToCncAt) && (
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-ivory-300 pt-4 text-xs text-ink-500">
            {cert.auditScheduledDate && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5 text-forest-500" /> Audit terrain le{' '}
                <span className="font-semibold text-ink-700">{formatDate(cert.auditScheduledDate)}</span>
              </span>
            )}
            {cert.auditLocation && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-forest-500" /> <span className="text-ink-700">{cert.auditLocation}</span>
              </span>
            )}
            {cert.submittedToCncAt && (
              <span className="inline-flex items-center gap-1.5">
                <Landmark className="size-3.5 text-gold-500" /> Déposé au CNC le{' '}
                <span className="font-semibold text-ink-700">{formatDate(cert.submittedToCncAt)}</span>
                {cert.cncDepositReference && <span className="text-ink-400">· Réf. {cert.cncDepositReference}</span>}
              </span>
            )}
          </div>
        )}
      </Card>
    </button>
  )
}

// ─── Rejected card ────────────────────────────────────────────────────────────

function RejectedCard({ cert, onSelect }: { cert: Certification; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className="group block w-full text-left focus:outline-none">
      <Card className="flex items-start gap-4 p-5 transition-all group-hover:shadow-lifted group-focus-visible:ring-2 group-focus-visible:ring-gold-400">
        <span className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 ring-1 ring-red-100">
          <XCircle className="size-5" strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-ink-800">{cert.assessmentName}</h3>
            <CertStatusBadge status={cert.status} />
          </div>
          <div className="mt-1"><CardMeta cert={cert} /></div>
          {cert.rejectionReason && (
            <p className="mt-3 border-l-2 border-red-200 pl-3 text-sm text-red-700/90">{cert.rejectionReason}</p>
          )}
        </div>
        <ArrowUpRight className="size-4 flex-shrink-0 text-ink-400 transition-colors group-hover:text-forest-700" />
      </Card>
    </button>
  )
}

// ─── Detail dialog ────────────────────────────────────────────────────────────

function CertDetailDialog({ cert, onClose }: { cert: Certification | null; onClose: () => void }) {
  return (
    <Dialog.Root open={!!cert} onOpenChange={open => { if (!open) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-forest-950/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-ivory-300 bg-ivory-50 font-sans text-ink-800 shadow-lifted focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {cert && <CertDetail key={cert.id} cert={cert} onClose={onClose} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function CertDetail({ cert, onClose }: { cert: Certification; onClose: () => void }) {
  const [certLoading, setCertLoading] = useState(false)
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [showDocs, setShowDocs] = useState(false)

  // Most recent certificate uploaded by the expert (documents are sorted newest first)
  const certificateDoc    = cert.documents.find(d => d.docType === 'certificate')
  const canDownloadCert   = cert.status === 'certified' && !!certificateDoc
  const canDownloadReport = !!cert.expertReportPdfUrl
  const isCertified       = cert.status === 'certified'
  const isRejected        = cert.status === 'rejected'

  async function downloadBlob(url: string, filename: string) {
    const res = await fetch(url)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Erreur lors du téléchargement')
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
        toast.error(data.error || 'Erreur lors de la génération du rapport')
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
    pending:     'Votre demande est en attente d’attribution à un expert accrédité GreenLeaves.',
    assigned:    `L’expert ${cert.expertName || ''} a été désigné pour votre audit.`,
    in_progress: 'L’audit de votre bilan est en cours. L’expert examine vos données et documents.',
    audit_done:  'L’audit terrain est terminé. L’expert accrédité prépare le dépôt de votre dossier au Conseil National du Climat (CNC).',
    submitted_to_cnc: 'Votre dossier a été déposé au CNC par l’expert accrédité. Le certificat sera disponible ici dès sa délivrance.',
    certified:   'Votre bilan carbone est certifié par le CNC. Téléchargez le certificat ci-dessous.',
    rejected:    cert.rejectionReason || 'Votre demande a été refusée.',
  }

  const timeline: { icon: React.ElementType; label: string; value: React.ReactNode; highlight?: boolean }[] = [
    { icon: Calendar, label: 'Demande envoyée le', value: formatDate(cert.requestedAt) },
    ...(cert.expertName ? [{ icon: User, label: 'Expert auditeur', value: cert.expertName }] : []),
    ...(cert.auditScheduledDate ? [{ icon: Calendar, label: 'Audit terrain prévu le', value: formatDate(cert.auditScheduledDate) }] : []),
    ...(cert.auditLocation ? [{ icon: MapPin, label: 'Lieu de l’audit', value: cert.auditLocation }] : []),
    ...(cert.inspectionDate ? [{ icon: Eye, label: 'Audit réalisé le', value: formatDate(cert.inspectionDate) }] : []),
    ...(cert.submittedToCncAt ? [{
      icon: Landmark, label: 'Dossier déposé au CNC le',
      value: <>{formatDate(cert.submittedToCncAt)}{cert.cncDepositReference && ` · Réf. ${cert.cncDepositReference}`}</>,
    }] : []),
    ...(cert.certifiedAt ? [{ icon: ShieldCheck, label: 'Certifié le', value: formatDate(cert.certifiedAt), highlight: true }] : []),
  ]

  return (
    <>
      {/* Header */}
      <div className={cn(
        'relative flex-shrink-0 overflow-hidden px-7 pb-6 pt-7',
        isCertified ? 'bg-forest-900 bg-forest-grain text-ivory-50' : 'border-b border-ivory-300 bg-white',
      )}>
        {isCertified && (
          <>
            <span className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full border border-gold-400/15" />
            <span className="pointer-events-none absolute -right-4 -top-4 size-32 rounded-full border border-gold-400/15" />
          </>
        )}
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className={cn('text-[11px] font-semibold uppercase tracking-[0.18em]', isCertified ? 'text-gold-300' : 'text-gold-600')}>
              {isCertified ? 'Certificat CNC' : 'Demande de certification'}
            </p>
            <Dialog.Title className={cn('mt-1.5 font-display text-2xl tracking-tight', isCertified ? 'text-ivory-50' : 'text-forest-900')}>
              {isCertified && cert.certificateNumber ? `N° ${cert.certificateNumber}` : cert.assessmentName}
            </Dialog.Title>
            <Dialog.Description className={cn('mt-1 text-sm', isCertified ? 'text-forest-100/70' : 'text-ink-500')}>
              {isCertified && cert.certificateNumber ? `${cert.assessmentName} · ` : ''}{cert.siteName} · {cert.assessmentYear}
            </Dialog.Description>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <CertStatusBadge status={cert.status} />
            <Dialog.Close asChild>
              <button
                className={cn(
                  'flex size-8 items-center justify-center rounded-lg transition-colors',
                  isCertified ? 'text-forest-100/70 hover:bg-white/10 hover:text-ivory-50' : 'text-ink-400 hover:bg-ivory-100 hover:text-ink-700',
                )}
                aria-label="Fermer"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-7 py-6">

        {/* Status message */}
        <div className={cn(
          'rounded-2xl border px-4 py-3.5 text-sm leading-relaxed',
          isRejected  ? 'border-red-200 bg-red-50 text-red-700' :
          isCertified ? 'border-gold-200 bg-gold-50 text-gold-700' :
                        'border-forest-100 bg-forest-50 text-forest-800',
        )}>
          {statusMessage[cert.status]}
        </div>

        {/* Workflow progress */}
        {!isRejected && (
          <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Progression du dossier</p>
              <JourneyStepper status={cert.status} />
            </div>
            <Timeline rows={timeline} />
          </div>
        )}
        {isRejected && <Timeline rows={timeline} />}

        {/* Emissions summary */}
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Émissions déclarées</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-forest-900 p-3.5 text-ivory-50">
              <p className="text-[11px] text-forest-100/60">Total</p>
              <p className="mt-1 font-display text-lg tabular-nums">{fmtCO2Text(cert.totalCo2eq)}</p>
            </div>
            {SCOPES.map(s => (
              <div key={s.key} className="rounded-xl border border-ivory-300 bg-white p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] text-ink-500">
                  <span className={cn('size-1.5 rounded-full', s.dot)} /> {s.label}
                </p>
                <p className="mt-1 font-display text-lg tabular-nums text-forest-900">{fmtCO2Text(cert[s.key])}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Admin / expert notes */}
        {cert.adminNotes && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Notes de l&apos;expert</p>
            <p className="rounded-xl border border-ivory-300 bg-white p-4 text-sm leading-relaxed text-ink-700">{cert.adminNotes}</p>
          </div>
        )}

        {cert.rejectionReason && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-red-500">Motif de refus</p>
            <p className="rounded-xl border border-red-100 bg-red-50/60 p-4 text-sm leading-relaxed text-red-700">{cert.rejectionReason}</p>
          </div>
        )}

        {/* Downloads */}
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Téléchargements</p>
          <div className="space-y-2.5">
            {canDownloadCert && (
              <button
                onClick={downloadCertificate}
                disabled={certLoading}
                className="flex w-full items-center gap-4 rounded-2xl border border-gold-300 bg-gradient-to-r from-gold-50 to-white p-4 text-left shadow-gold transition-all hover:-translate-y-0.5 disabled:opacity-60"
              >
                <span className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-gold-500 text-forest-950">
                  <Award className="size-5" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-forest-900">Certificat CNC</span>
                  <span className="block truncate text-xs text-gold-700">Copie numérique du certificat — N° {cert.certificateNumber}</span>
                </span>
                <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gold-500 px-3 text-xs font-semibold text-forest-950">
                  {certLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                  Télécharger
                </span>
              </button>
            )}

            <DownloadRow
              icon={FileText}
              title="Fiche de suivi de la demande"
              subtitle="État d’avancement de votre dossier (PDF)"
              loading={trackingLoading}
              onClick={downloadTracking}
            />

            {canDownloadReport && (
              <DownloadRow
                icon={Shield}
                title="Rapport d’audit expert"
                subtitle="Rapport complet d’audit — expert GreenLeaves"
                loading={reportLoading}
                onClick={downloadExpertReport}
              />
            )}
          </div>
        </div>

        {/* Uploaded documents */}
        {cert.documents.length > 0 && (
          <div>
            <button
              onClick={() => setShowDocs(!showDocs)}
              className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 transition-colors hover:text-forest-800"
            >
              Documents joints ({cert.documents.length})
              <ChevronDown className={cn('size-3.5 transition-transform', showDocs && 'rotate-180')} />
            </button>
            {showDocs && (
              <ul className="mt-3 divide-y divide-ivory-300 overflow-hidden rounded-xl border border-ivory-300 bg-white">
                {cert.documents.map(doc => (
                  <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
                    <FileText className="size-4 flex-shrink-0 text-forest-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-800">{doc.originalName}</p>
                      <p className="text-xs text-ink-400">{formatFileSize(doc.fileSize)} • {formatDate(doc.createdAt)}</p>
                    </div>
                    <a
                      href={`/api/certification-documents/${doc.id}`}
                      className="flex size-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ivory-100 hover:text-forest-900"
                      title="Télécharger"
                    >
                      <Download className="size-4" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-shrink-0 items-center justify-between border-t border-ivory-300 bg-white px-7 py-4">
        <Link
          href={`/dashboard/assessments/${cert.assessmentId}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-forest-700 transition-colors hover:text-gold-600"
        >
          Voir le bilan <ArrowRight className="size-3.5" />
        </Link>
        <Button variant="outline" size="sm" onClick={onClose}>Fermer</Button>
      </div>
    </>
  )
}

function Timeline({ rows }: { rows: { icon: React.ElementType; label: string; value: React.ReactNode; highlight?: boolean }[] }) {
  return (
    <dl className="divide-y divide-ivory-300 overflow-hidden rounded-2xl border border-ivory-300 bg-white">
      {rows.map(r => (
        <div key={r.label} className={cn('flex items-center gap-3 px-4 py-3 text-sm', r.highlight && 'bg-gold-50/70')}>
          <r.icon className={cn('size-4 flex-shrink-0', r.highlight ? 'text-gold-600' : 'text-ink-400')} strokeWidth={1.8} />
          <dt className="text-ink-500">{r.label}</dt>
          <dd className={cn('ml-auto text-right font-semibold', r.highlight ? 'text-gold-700' : 'text-ink-800')}>{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function DownloadRow({
  icon: Icon, title, subtitle, loading, onClick,
}: { icon: React.ElementType; title: string; subtitle: string; loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="group flex w-full items-center gap-4 rounded-2xl border border-ivory-300 bg-white p-4 text-left transition-colors hover:border-forest-200 hover:bg-forest-50/40 disabled:opacity-60"
    >
      <span className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-ivory-100 text-forest-700 ring-1 ring-ivory-300">
        <Icon className="size-5" strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink-800">{title}</span>
        <span className="block truncate text-xs text-ink-500">{subtitle}</span>
      </span>
      {loading
        ? <Loader2 className="size-4 flex-shrink-0 animate-spin text-ink-400" />
        : <Download className="size-4 flex-shrink-0 text-ink-400 transition-colors group-hover:text-forest-700" />}
    </button>
  )
}

function CertificationsSkeleton() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-3 w-[28rem]" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
      <Skeleton className="h-44 rounded-2xl" />
    </div>
  )
}
