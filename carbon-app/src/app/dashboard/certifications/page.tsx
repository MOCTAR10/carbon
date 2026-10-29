'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Award, Shield, Clock, XCircle, Loader2, FileText, Download, Calendar, Building2, ArrowRight,
  ArrowUpRight, User, BarChart3, Eye, ChevronDown, Landmark, MapPin, FileCheck2, ShieldCheck,
  Link2, Copy, History, AlertTriangle,
} from 'lucide-react'
import { cn, co2UnitFor, fmtCO2, fmtCO2Text, fmtDate, fmtSize, plural, SCOPES } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge, CertStatusBadge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Stagger, Reveal } from '@/components/ui/motion'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { CertJourney } from '@/components/ui/cert-journey'

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
  inspectionDate: string | null
  rejectionReason: string | null
  certifiedAt: string | null
  certificateNumber: string | null
  requestedAt: string
  auditScheduledDate: string | null
  auditLocation: string | null
  expertReportPdfUrl: string | null
  submittedToCncAt: string | null
  cncDepositReference: string | null
  documents: CertDoc[]
}

/** Latest request of a bilan + its earlier (refused) requests */
type Dossier = Certification & { history: Certification[] }

const ACTIVE_STATUSES = ['pending', 'assigned', 'in_progress', 'audit_done', 'submitted_to_cnc']

const fmtD = (d: string | null) => (d ? fmtDate(d) : '—')

const verifyUrl = (n: string) =>
  `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${encodeURIComponent(n)}`

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Clipboard API needs a secure context; fall back for http (LAN dev)
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
  toast.success('Lien de vérification copié', { description: text })
}

const journeyDates = (c: Certification) => ({
  pending: fmtDate(c.requestedAt),
  in_progress: c.auditScheduledDate ? fmtDate(c.auditScheduledDate) : null,
  audit_done: c.inspectionDate ? fmtDate(c.inspectionDate) : null,
  submitted_to_cnc: c.submittedToCncAt ? fmtDate(c.submittedToCncAt) : null,
  certified: c.certifiedAt ? fmtDate(c.certifiedAt) : null,
})

// ─── Page component ───────────────────────────────────────────────────────────

export default function CertificationsPage() {
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const load = useCallback(() => {
    setFailed(false)
    setLoading(true)
    fetch('/api/certifications')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => setCertifications(Array.isArray(data) ? data : []))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  // One dossier per bilan: the newest request carries the status, older ones become its history
  const dossiers = useMemo<Dossier[]>(() => {
    const byAssessment = new Map<number, Dossier>()
    for (const c of certifications) {            // API order: newest first
      const d = byAssessment.get(c.assessmentId)
      if (d) d.history.push(c)
      else byAssessment.set(c.assessmentId, { ...c, history: [] })
    }
    return Array.from(byAssessment.values())
  }, [certifications])

  const certified  = dossiers.filter(c => c.status === 'certified')
  const inProgress = dossiers.filter(c => ACTIVE_STATUSES.includes(c.status))
  const rejected   = dossiers.filter(c => c.status === 'rejected')
  const selected   = dossiers.find(d => d.id === selectedId) ?? null

  if (loading) return <CertificationsSkeleton />

  return (
    <Stagger className="space-y-10">
      <Reveal>
        <PageHeader
          eyebrow="Conformité & certification"
          title="Certifications"
          description="Suivez chaque demande : audit terrain par un expert accrédité GreenLeaves, dépôt du dossier au CNC, puis délivrance du certificat."
          actions={dossiers.length > 0 ? (
            <>
              {certified.length > 0 && (
                <Badge tone="forest" className="px-3 py-1 text-xs">
                  <Award className="size-3.5" />
                  {plural(certified.length, 'bilan certifié', 'bilans certifiés')}
                </Badge>
              )}
              {inProgress.length > 0 && (
                <Badge tone="gold" className="px-3 py-1 text-xs">
                  <Clock className="size-3.5" />
                  {inProgress.length} en cours
                </Badge>
              )}
            </>
          ) : undefined}
        />
      </Reveal>

      {failed && (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <AlertTriangle className="size-6 text-amber-600" />
          <p className="text-sm font-semibold text-ink-800">Impossible de charger vos certifications</p>
          <Button variant="outline" size="sm" onClick={load}>Réessayer</Button>
        </Card>
      )}

      {!failed && dossiers.length === 0 && (
        <Reveal>
          <Card className="p-10">
            <EmptyState
              icon={Award}
              title="Aucune demande de certification"
              description="Ouvrez un bilan complété et cliquez sur « Certifier ce bilan » pour lancer l’audit."
              action={
                <Button asChild>
                  <Link href="/dashboard/assessments"><BarChart3 /> Voir mes bilans</Link>
                </Button>
              }
            />
          </Card>
        </Reveal>
      )}

      {certified.length > 0 && (
        <Section icon={FileCheck2} title="Bilans certifiés" count={certified.length} tone="gold">
          <div className="grid gap-5 lg:grid-cols-2">
            {certified.map(cert => (
              <CredentialCard key={cert.id} cert={cert} onSelect={() => setSelectedId(cert.id)} />
            ))}
          </div>
        </Section>
      )}

      {inProgress.length > 0 && (
        <Section icon={Clock} title="En cours de certification" count={inProgress.length}>
          <div className="space-y-4">
            {inProgress.map(cert => (
              <ProgressCard key={cert.id} cert={cert} onSelect={() => setSelectedId(cert.id)} />
            ))}
          </div>
        </Section>
      )}

      {rejected.length > 0 && (
        <Section icon={XCircle} title="Demandes refusées" count={rejected.length}>
          <div className="space-y-4">
            {rejected.map(cert => (
              <RejectedCard key={cert.id} cert={cert} onSelect={() => setSelectedId(cert.id)} />
            ))}
          </div>
        </Section>
      )}

      <Dialog open={!!selected} onOpenChange={o => { if (!o) setSelectedId(null) }}>
        {selected && <CertDetail key={selected.id} cert={selected} />}
      </Dialog>
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
          <Icon className={cn('size-4', tone === 'gold' ? 'text-gold-600' : 'text-forest-500')} strokeWidth={1.8} />
          <h2 className="font-display text-xl text-forest-900">{title}</h2>
          <span className="rounded-full bg-ivory-200 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-ink-600">{count}</span>
          <span className="h-px flex-1 bg-ivory-300" />
        </div>
        {children}
      </section>
    </Reveal>
  )
}

// ─── Shared card bits ─────────────────────────────────────────────────────────

function CardMeta({ cert }: { cert: Certification }) {
  // Separator lives on the following item so it never dangles at the end of a wrapped line
  const sep = "before:mr-3 before:text-ivory-400 before:content-['•']"
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
      <span className="inline-flex items-center gap-1"><Building2 className="size-3" />{cert.siteName}</span>
      <span className={sep}>{cert.assessmentYear}</span>
      <span className={cn(sep, 'font-semibold tabular-nums text-ink-700')}>{fmtCO2Text(cert.totalCo2eq)}</span>
      {cert.expertName && (
        <span className={cn(sep, 'inline-flex items-center gap-1')}><User className="size-3" />{cert.expertName}</span>
      )}
    </p>
  )
}

function HistoryNote({ cert }: { cert: Dossier }) {
  if (!cert.history.length) return null
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-ink-500">
      <History className="size-3" /> {plural(cert.history.length, 'demande antérieure', 'demandes antérieures')}
    </span>
  )
}

// ─── Certified: credential card ───────────────────────────────────────────────

function CredentialCard({ cert, onSelect }: { cert: Dossier; onSelect: () => void }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gold-300/70 bg-white shadow-gold transition-all hover:shadow-lifted">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-300 via-gold-500 to-gold-300" />
      <span className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full border border-gold-200/60" />
      <span className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full border border-gold-200/60" />

      <button
        onClick={onSelect}
        className="relative block w-full p-6 pb-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-400"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex size-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold-100 to-gold-50 ring-1 ring-gold-300/60">
            <Award className="size-6 text-gold-600" strokeWidth={1.6} />
          </div>
          <CertStatusBadge status={cert.status} />
        </div>

        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-600">Certificat délivré par le CNC</p>
        <p className="mt-1 font-display text-2xl tracking-tight text-forest-900">
          {cert.certificateNumber ? `N° ${cert.certificateNumber}` : 'Numéro en attente'}
        </p>

        <h3 className="mt-4 truncate text-sm font-semibold text-ink-800">{cert.assessmentName}</h3>
        <div className="mt-1"><CardMeta cert={cert} /></div>
      </button>

      <div className="relative mx-6 flex flex-wrap items-center justify-between gap-3 border-t border-ivory-300 py-4">
        <span className="text-xs text-ink-500">
          Délivré le <span className="font-semibold text-ink-700">{fmtD(cert.certifiedAt)}</span>
        </span>
        <div className="flex items-center gap-1">
          {cert.certificateNumber && (
            <Button variant="ghost" size="sm" onClick={() => copyText(verifyUrl(cert.certificateNumber!))}>
              <Link2 /> Copier le lien de vérification
            </Button>
          )}
          <Button variant="link" size="sm" onClick={onSelect}>
            Ouvrir <ArrowRight />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── In progress card ─────────────────────────────────────────────────────────

function ProgressCard({ cert, onSelect }: { cert: Dossier; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className="group block w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400">
      <Card className="p-5 transition-all group-hover:shadow-lifted sm:p-6">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <h3 className="min-w-0 truncate font-display text-lg text-forest-900">{cert.assessmentName}</h3>
          <span className="flex-shrink-0"><CertStatusBadge status={cert.status} /></span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <CardMeta cert={cert} />
          <HistoryNote cert={cert} />
        </div>

        <div className="mt-6"><CertJourney status={cert.status} dates={journeyDates(cert)} /></div>

        {(cert.auditScheduledDate || cert.auditLocation || cert.submittedToCncAt) && (
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-ivory-300 pt-4 text-xs text-ink-500">
            {cert.auditScheduledDate && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5 text-forest-500" /> Audit terrain le{' '}
                <span className="font-semibold text-ink-700">{fmtD(cert.auditScheduledDate)}</span>
              </span>
            )}
            {cert.auditLocation && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-forest-500" /> <span className="text-ink-700">{cert.auditLocation}</span>
              </span>
            )}
            {cert.submittedToCncAt && (
              <span className="inline-flex items-center gap-1.5">
                <Landmark className="size-3.5 text-gold-600" /> Déposé au CNC le{' '}
                <span className="font-semibold text-ink-700">{fmtD(cert.submittedToCncAt)}</span>
                {cert.cncDepositReference && <span>· Réf. {cert.cncDepositReference}</span>}
              </span>
            )}
          </div>
        )}
      </Card>
    </button>
  )
}

// ─── Rejected card ────────────────────────────────────────────────────────────

function RejectedCard({ cert, onSelect }: { cert: Dossier; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className="group block w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400">
      <Card className="flex items-start gap-4 p-5 transition-all group-hover:shadow-lifted">
        <span className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-100">
          <XCircle className="size-5" strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-ink-800">{cert.assessmentName}</h3>
          <div className="mt-1.5"><CertStatusBadge status={cert.status} /></div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <CardMeta cert={cert} />
            <HistoryNote cert={cert} />
          </div>
          {cert.rejectionReason && (
            <p className="mt-3 border-l-2 border-red-200 pl-3 text-sm text-red-700">{cert.rejectionReason}</p>
          )}
          <p className="mt-3 text-xs text-ink-500">Corrigez votre bilan, puis soumettez une nouvelle demande depuis sa page.</p>
        </div>
        <ArrowUpRight className="size-4 flex-shrink-0 text-ink-400 transition-colors group-hover:text-forest-700" />
      </Card>
    </button>
  )
}

// ─── Detail dialog ────────────────────────────────────────────────────────────

async function downloadBlob(url: string, filename: string, init?: RequestInit) {
  const res = await fetch(url, init)
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
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
}

function CertDetail({ cert }: { cert: Dossier }) {
  const [busy, setBusy] = useState<'cert' | 'tracking' | 'report' | null>(null)
  const [showDocs, setShowDocs] = useState(false)

  // Most recent certificate uploaded by the expert (documents are sorted newest first)
  const certificateDoc    = cert.documents.find(d => d.docType === 'certificate')
  const isCertified       = cert.status === 'certified'
  const isRejected        = cert.status === 'rejected'
  const canDownloadCert   = isCertified && !!certificateDoc
  const canDownloadReport = !!cert.expertReportPdfUrl
  const unit = co2UnitFor(Number(cert.totalCo2eq) || 0)

  const run = async (kind: 'cert' | 'tracking' | 'report', fn: () => Promise<void>) => {
    setBusy(kind)
    try { await fn() } catch { toast.error('Erreur lors du téléchargement') } finally { setBusy(null) }
  }
  const downloadCertificate = () => certificateDoc && run('cert', () =>
    downloadBlob(`/api/certification-documents/${certificateDoc.id}`, certificateDoc.originalName))
  const downloadTracking = () => run('tracking', () =>
    downloadBlob(`/api/certifications/${cert.id}/tracking`, `suivi-demande-certification-${cert.id}.pdf`))
  const downloadExpertReport = () => run('report', () =>
    downloadBlob(`/api/admin/certifications/${cert.id}/generate-pdf`, `rapport-audit-${cert.id}.pdf`, { method: 'POST' }))

  const statusMessage: Record<string, string> = {
    pending:          'Votre demande est en attente d’attribution à un expert accrédité GreenLeaves.',
    assigned:         cert.expertName
      ? `L’expert ${cert.expertName} a été désigné pour votre audit terrain.`
      : 'Un expert accrédité a été désigné pour votre audit terrain.',
    in_progress:      'L’audit de votre bilan est en cours : l’expert examine vos données et justificatifs.',
    audit_done:       'L’audit est validé. L’expert accrédité prépare le dépôt de votre dossier au Conseil National du Climat (CNC).',
    submitted_to_cnc: 'Votre dossier a été déposé au CNC par l’expert accrédité. Le certificat sera disponible ici dès sa délivrance.',
    certified:        'Votre bilan carbone est certifié par le CNC.',
    rejected:         'Votre demande a été refusée. Corrigez votre bilan puis soumettez une nouvelle demande.',
  }

  const timeline: { icon: React.ElementType; label: string; value: React.ReactNode; highlight?: boolean }[] = [
    { icon: Calendar, label: 'Demande envoyée le', value: fmtD(cert.requestedAt) },
    ...(cert.expertName ? [{ icon: User, label: 'Expert auditeur', value: cert.expertName }] : []),
    ...(cert.auditScheduledDate ? [{ icon: Calendar, label: 'Audit terrain prévu le', value: fmtD(cert.auditScheduledDate) }] : []),
    ...(cert.auditLocation ? [{ icon: MapPin, label: 'Lieu de l’audit', value: cert.auditLocation }] : []),
    ...(cert.inspectionDate ? [{ icon: Eye, label: 'Audit réalisé le', value: fmtD(cert.inspectionDate) }] : []),
    ...(cert.submittedToCncAt ? [{
      icon: Landmark, label: 'Déposé au CNC le',
      value: <>{fmtD(cert.submittedToCncAt)}{cert.cncDepositReference && ` · Réf. ${cert.cncDepositReference}`}</>,
    }] : []),
    ...(cert.certifiedAt && isCertified ? [{ icon: ShieldCheck, label: 'Certifié le', value: fmtD(cert.certifiedAt), highlight: true }] : []),
  ]

  return (
    <DialogContent
      size="lg"
      eyebrow={isCertified ? 'Certificat délivré par le CNC' : 'Demande de certification'}
      title={cert.assessmentName}
      description={`${cert.siteName} · Exercice ${cert.assessmentYear}`}
      meta={<CertStatusBadge status={cert.status} />}
      footer={
        <>
          <Button asChild variant="link" className="sm:mr-auto">
            <Link href={`/dashboard/assessments/${cert.assessmentId}`}>Voir le bilan <ArrowRight /></Link>
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Downloads first: this is why the company opens the dossier */}
        {isCertified && (
          <div className="relative overflow-hidden rounded-2xl bg-forest-900 bg-forest-grain p-5 text-ivory-50 sm:p-6">
            <span className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full border border-gold-400/20" />
            <span className="pointer-events-none absolute -right-2 -top-2 size-20 rounded-full border border-gold-400/20" />
            <p className="relative text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-300">Numéro de certificat</p>
            <p className="relative mt-1 font-display text-2xl tracking-tight sm:text-3xl">
              {cert.certificateNumber ? `N° ${cert.certificateNumber}` : 'Numéro en attente'}
            </p>
            <p className="relative mt-1 text-sm text-ivory-200">Délivré le {fmtD(cert.certifiedAt)}</p>
            <div className="relative mt-5 flex flex-col gap-2 sm:flex-row">
              {canDownloadCert ? (
                <Button variant="gold" onClick={downloadCertificate} disabled={busy === 'cert'}>
                  {busy === 'cert' ? <Loader2 className="animate-spin" /> : <Download />} Télécharger le certificat
                </Button>
              ) : (
                <p className="text-sm text-ivory-200">La copie numérique du certificat sera ajoutée par l’expert.</p>
              )}
              {cert.certificateNumber && (
                <Button
                  variant="outline"
                  className="border-white/20 bg-white/5 text-ivory-50 hover:border-gold-300 hover:bg-white/10"
                  onClick={() => copyText(verifyUrl(cert.certificateNumber!))}
                >
                  <Copy /> Copier le lien de vérification
                </Button>
              )}
            </div>
          </div>
        )}

        <div className={cn(
          'rounded-2xl border px-4 py-3.5 text-sm leading-relaxed',
          isRejected ? 'border-red-200 bg-red-50 text-red-700' : 'border-forest-100 bg-forest-50 text-forest-800',
        )}>
          {statusMessage[cert.status] ?? ''}
        </div>

        {cert.rejectionReason && isRejected && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-red-600">Motif du refus</p>
            <p className="rounded-xl border border-red-100 bg-red-50/60 p-4 text-sm leading-relaxed text-red-700">{cert.rejectionReason}</p>
          </div>
        )}

        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">Documents</p>
          <div className="space-y-2.5">
            {canDownloadReport && (
              <DownloadRow
                icon={Shield}
                title="Rapport d’audit expert"
                subtitle="Rapport complet de l’audit GreenLeaves (PDF)"
                loading={busy === 'report'}
                onClick={downloadExpertReport}
              />
            )}
            <DownloadRow
              icon={FileText}
              title="Fiche de suivi de la demande"
              subtitle="État d’avancement de votre dossier (PDF)"
              loading={busy === 'tracking'}
              onClick={downloadTracking}
            />
          </div>
        </div>

        {!isRejected && (
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">Progression du dossier</p>
            <div className="grid gap-6 sm:grid-cols-[210px_1fr]">
              <CertJourney status={cert.status} orientation="vertical" />
              <Timeline rows={timeline} />
            </div>
          </div>
        )}
        {isRejected && <Timeline rows={timeline} />}

        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            Émissions déclarées <span className="font-normal normal-case tracking-normal">({fmtCO2(0, unit).unit})</span>
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-forest-900 p-3.5 text-ivory-50">
              <p className="text-[11px] text-ivory-200">Total</p>
              <p className="mt-1 font-display text-lg tabular-nums">{fmtCO2(cert.totalCo2eq, unit).value}</p>
            </div>
            {SCOPES.map(s => (
              <div key={s.scope} className="rounded-xl border border-ivory-300 bg-white p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] text-ink-500">
                  <span className={cn('size-1.5 rounded-full', s.bg)} /> {s.label}
                </p>
                <p className="mt-1 font-display text-lg tabular-nums text-forest-900">
                  {fmtCO2(cert[`scope${s.scope}` as 'scope1'], unit).value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {cert.documents.length > 0 && (
          <div>
            <button
              onClick={() => setShowDocs(!showDocs)}
              aria-expanded={showDocs}
              className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500 transition-colors hover:text-forest-800"
            >
              Pièces du dossier ({cert.documents.length})
              <ChevronDown className={cn('size-3.5 transition-transform', showDocs && 'rotate-180')} />
            </button>
            {showDocs && (
              <ul className="mt-3 divide-y divide-ivory-300 overflow-hidden rounded-xl border border-ivory-300 bg-white">
                {cert.documents.map(doc => (
                  <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
                    <FileText className="size-4 flex-shrink-0 text-forest-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-800">{doc.originalName}</p>
                      <p className="text-xs text-ink-500">{fmtSize(doc.fileSize)} · {fmtD(doc.createdAt)}</p>
                    </div>
                    <a
                      href={`/api/certification-documents/${doc.id}`}
                      className="flex size-9 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ivory-100 hover:text-forest-900"
                      aria-label={`Télécharger ${doc.originalName}`}
                    >
                      <Download className="size-4" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {cert.history.length > 0 && (
          <div>
            <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
              <History className="size-3.5" /> Demandes antérieures
            </p>
            <ul className="divide-y divide-ivory-300 overflow-hidden rounded-xl border border-ivory-300 bg-white">
              {cert.history.map(h => (
                <li key={h.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-ink-700">Demande du {fmtD(h.requestedAt)}</span>
                    <CertStatusBadge status={h.status} />
                  </div>
                  {h.rejectionReason && <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{h.rejectionReason}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </DialogContent>
  )
}

function Timeline({ rows }: { rows: { icon: React.ElementType; label: string; value: React.ReactNode; highlight?: boolean }[] }) {
  return (
    <dl className="divide-y divide-ivory-300 self-start overflow-hidden rounded-2xl border border-ivory-300 bg-white">
      {rows.map(r => (
        <div key={r.label} className={cn('flex items-start gap-3 px-4 py-3 text-sm', r.highlight && 'bg-gold-50/70')}>
          <r.icon className={cn('mt-0.5 size-4 flex-shrink-0', r.highlight ? 'text-gold-600' : 'text-ink-400')} strokeWidth={1.8} />
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
      className="group flex w-full items-center gap-4 rounded-2xl border border-ivory-300 bg-white p-4 text-left transition-colors hover:border-forest-200 hover:bg-forest-50/40 disabled:cursor-wait"
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
        <Skeleton className="h-10 w-80 max-w-full" />
        <Skeleton className="h-3 w-[28rem] max-w-full" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
      <Skeleton className="h-44 rounded-2xl" />
    </div>
  )
}
