'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  BarChart3, CalendarDays, FileText, ShieldCheck, ListTree, Download, QrCode, Loader2, AlertTriangle,
  RotateCw, Award, LayoutDashboard, BookOpenCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { co2UnitFor, plural } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Select } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Stagger, Reveal } from '@/components/ui/motion'
import { periodMonths, monthShort, type AssessmentListItem, type ReportData } from './report-utils'
import { co2For, KpiRow, OverviewPanel, MonthlyPanel, GhgPanel, IsoPanel, DetailPanel } from './report-panels'

type LoadState = 'loading' | 'ready' | 'error' | 'notfound'
type Cert = { assessmentId: number; status: string; certificateNumber: string | null }

const TABS = [
  { id: 'overview', label: 'Vue d’ensemble', icon: LayoutDashboard },
  { id: 'monthly', label: 'Mensuel', icon: CalendarDays },
  { id: 'ghg', label: 'GHG Protocol', icon: BookOpenCheck },
  { id: 'iso', label: 'ISO 14064', icon: ShieldCheck },
  { id: 'detail', label: 'Détail des postes', icon: ListTree },
] as const

export default function ReportsPage() {
  // useSearchParams needs a Suspense boundary under the App Router
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <Reports />
    </Suspense>
  )
}

function Reports() {
  const router = useRouter()
  const params = useSearchParams()
  const urlId = params.get('id')

  const [list, setList] = useState<AssessmentListItem[] | null>(null)
  const [listState, setListState] = useState<LoadState>('loading')
  const [certNumbers, setCertNumbers] = useState<Record<number, string>>({})
  const [selectedId, setSelectedId] = useState('')
  const [report, setReport] = useState<ReportData | null>(null)
  const [reportState, setReportState] = useState<LoadState>('loading')
  const [tab, setTab] = useState<string>('overview')
  const [pdfOpen, setPdfOpen] = useState(false)
  const [pdfMode, setPdfMode] = useState<'yearly' | 'monthly' | null>(null)
  const requestRef = useRef(0)

  const loadList = useCallback(async () => {
    setListState('loading')
    try {
      const r = await fetch('/api/assessments')
      if (!r.ok) throw new Error(String(r.status))
      const data = await r.json()
      setList(Array.isArray(data) ? data : [])
      setListState('ready')
    } catch {
      setListState('error')
    }
    // Certificate numbers power the verification QR in the PDF — optional, never blocks the page
    fetch('/api/certifications')
      .then(r => (r.ok ? r.json() : []))
      .then((certs: Cert[]) => {
        const map: Record<number, string> = {}
        if (Array.isArray(certs)) for (const c of certs) if (c.status === 'certified' && c.certificateNumber) map[c.assessmentId] = c.certificateNumber
        setCertNumbers(map)
      })
      .catch(() => {})
  }, [])

  useEffect(() => { loadList() }, [loadList])

  // Selection follows the URL (?id=) so reports can be deep-linked; falls back to the most recent bilan
  useEffect(() => {
    if (!list) return
    const match = list.find(a => String(a.id) === urlId)
    setSelectedId(match ? String(match.id) : list[0] ? String(list[0].id) : '')
  }, [list, urlId])

  const loadReport = useCallback(async (id: string, signal?: AbortSignal) => {
    const req = ++requestRef.current
    setReportState('loading')
    try {
      const r = await fetch(`/api/reports/${id}`, { signal })
      if (req !== requestRef.current) return
      if (r.status === 404) { setReport(null); setReportState('notfound'); return }
      if (!r.ok) throw new Error(String(r.status))
      const data: ReportData = await r.json()
      if (req !== requestRef.current) return
      setReport(data)
      setReportState('ready')
    } catch (e) {
      if ((e as Error).name === 'AbortError' || req !== requestRef.current) return
      setReportState('error')
    }
  }, [])

  useEffect(() => {
    if (!selectedId) return
    const ctrl = new AbortController()
    loadReport(selectedId, ctrl.signal)
    return () => ctrl.abort()
  }, [selectedId, loadReport])

  const onSelect = (id: string) => {
    setSelectedId(id)
    router.replace(`/dashboard/reports?id=${id}`, { scroll: false })
  }

  const unit = co2UnitFor(report?.summary.total ?? 0)
  const co2 = useMemo(() => co2For(unit), [unit])
  const certificateNumber = report ? certNumbers[report.assessment.id] ?? null : null
  const ready = reportState === 'ready' && report

  const generate = async (mode: 'yearly' | 'monthly') => {
    if (!report) return
    setPdfMode(mode)
    try {
      const { generateReportPdf } = await import('./report-pdf')
      await generateReportPdf(report, { mode, certificateNumber })
      toast.success('Rapport PDF téléchargé')
      setPdfOpen(false)
    } catch (err) {
      console.error('PDF generation error:', err)
      toast.error('La génération du PDF a échoué. Réessayez.')
    } finally {
      setPdfMode(null)
    }
  }

  const options = (list ?? []).map(a => ({ value: String(a.id), label: a.name, hint: `${a.site_name} · ${a.year}` }))
  const period = report ? periodMonths(report.assessment) : null

  return (
    <Stagger className="space-y-8">
      <Reveal>
        <PageHeader
          eyebrow="Analyse & reporting"
          title="Rapports & synthèse"
          description="Votre bilan carbone selon le GHG Protocol, l’ISO 14064-1 et l’ISO 14069."
          actions={ready && (
            <Button onClick={() => setPdfOpen(true)}>
              <Download /> Télécharger le PDF
            </Button>
          )}
        />
      </Reveal>

      {listState === 'loading' && <ReportSkeleton />}

      {listState === 'error' && (
        <Reveal><ErrorCard text="Impossible de charger vos bilans." onRetry={loadList} /></Reveal>
      )}

      {listState === 'ready' && list?.length === 0 && (
        <Reveal>
          <Card className="p-10">
            <EmptyState
              icon={BarChart3}
              title="Aucun bilan à analyser"
              description="Créez un bilan et saisissez vos données : vos rapports apparaîtront ici."
              action={<Button asChild><Link href="/dashboard/assessments?new=1">Créer un bilan</Link></Button>}
            />
          </Card>
        </Reveal>
      )}

      {listState === 'ready' && !!list?.length && (
        <>
          <Reveal>
            <Card className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <span className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-600">
                  <FileText className="size-[18px]" strokeWidth={1.8} />
                </span>
                <label htmlFor="report-assessment" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">
                  Bilan analysé
                </label>
              </div>
              <div className="w-full md:max-w-md">
                <Select id="report-assessment" value={selectedId} onValueChange={onSelect} options={options} placeholder="Choisir un bilan" />
              </div>
              {ready && period && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500 md:ml-auto">
                  <span>
                    {period.start === 1 && period.end === 12 ? `Année ${report.assessment.year}` : `${monthShort(period.start)} – ${monthShort(period.end)} ${report.assessment.year}`}
                    {' · '}{plural(report.entries?.length || 0, 'poste')}
                  </span>
                  {certificateNumber && <Badge tone="forest" dot><Award className="size-3" /> Certifié DGEPN</Badge>}
                </div>
              )}
            </Card>
          </Reveal>

          {reportState === 'loading' && <ReportSkeleton withoutSelector />}
          {reportState === 'error' && <ErrorCard text="Impossible de charger ce rapport." onRetry={() => loadReport(selectedId)} />}
          {reportState === 'notfound' && (
            <Card className="p-10">
              <EmptyState icon={FileText} title="Bilan introuvable" description="Ce bilan n’existe plus ou ne fait pas partie de votre espace." />
            </Card>
          )}

          {ready && (
            <div className="space-y-6">
              <KpiRow report={report} unit={unit} co2={co2} />
              {report.summary.total <= 0 && (
                <Card className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
                  <p className="flex-1 text-sm text-ink-600">Ce bilan ne contient encore aucune émission enregistrée.</p>
                  <Button asChild size="sm" variant="outline"><Link href={`/dashboard/assessments/${report.assessment.id}`}>Saisir les données</Link></Button>
                </Card>
              )}
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList aria-label="Sections du rapport">
                  {TABS.map(t => (
                    <TabsTrigger key={t.id} value={t.id}>
                      <t.icon strokeWidth={1.8} /> {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="overview" className="mt-6 focus-visible:outline-none"><OverviewPanel report={report} unit={unit} co2={co2} /></TabsContent>
                <TabsContent value="monthly" className="mt-6 focus-visible:outline-none"><MonthlyPanel report={report} unit={unit} co2={co2} /></TabsContent>
                <TabsContent value="ghg" className="mt-6 focus-visible:outline-none"><GhgPanel report={report} unit={unit} co2={co2} /></TabsContent>
                <TabsContent value="iso" className="mt-6 focus-visible:outline-none"><IsoPanel report={report} unit={unit} co2={co2} /></TabsContent>
                <TabsContent value="detail" className="mt-6 focus-visible:outline-none"><DetailPanel report={report} unit={unit} co2={co2} /></TabsContent>
              </Tabs>
            </div>
          )}
        </>
      )}

      <Dialog open={pdfOpen} onOpenChange={o => { if (!pdfMode) setPdfOpen(o) }}>
        <DialogContent
          size="sm"
          eyebrow="Export"
          title="Télécharger le rapport PDF"
          description={report ? `${report.assessment.name} · ${report.assessment.site_name}` : undefined}
        >
          <div className="space-y-3">
            {[
              { mode: 'yearly' as const, icon: BarChart3, title: 'Rapport annuel', text: 'Synthèse par scope, catégorie, GHG Protocol et ISO 14069, avec le détail des calculs.' },
              { mode: 'monthly' as const, icon: CalendarDays, title: 'Rapport mensuel détaillé', text: 'La synthèse annuelle, complétée du suivi mois par mois.' },
            ].map(opt => (
              <button
                key={opt.mode}
                onClick={() => generate(opt.mode)}
                disabled={!!pdfMode}
                aria-busy={pdfMode === opt.mode}
                className="group flex w-full items-center gap-4 rounded-2xl border border-ivory-300 bg-white p-4 text-left transition-all hover:border-gold-300 hover:shadow-soft disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
              >
                <span className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-700 transition-colors group-hover:bg-gold-50 group-hover:text-gold-600">
                  {pdfMode === opt.mode ? <Loader2 className="size-5 animate-spin" /> : <opt.icon className="size-5" strokeWidth={1.8} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink-800">{pdfMode === opt.mode ? 'Génération en cours…' : opt.title}</span>
                  <span className="block text-xs leading-relaxed text-ink-500">{opt.text}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="mt-5 flex items-start gap-2 border-t border-ivory-200 pt-4 text-xs text-ink-500">
            <QrCode className="mt-0.5 size-3.5 flex-shrink-0 text-gold-600" />
            {certificateNumber
              ? <span>Le rapport inclut un QR code de vérification du certificat DGEPN n° {certificateNumber}.</span>
              : <span>Une fois le bilan certifié, le rapport inclura un QR code de vérification du certificat.</span>}
          </p>
        </DialogContent>
      </Dialog>
    </Stagger>
  )
}

function ErrorCard({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center" role="alert">
      <span className="flex size-11 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="size-5" strokeWidth={1.8} />
      </span>
      <p className="text-sm font-semibold text-ink-800">{text}</p>
      <p className="text-xs text-ink-500">Vérifiez votre connexion puis réessayez.</p>
      <Button variant="outline" size="sm" onClick={onRetry}><RotateCw /> Réessayer</Button>
    </Card>
  )
}

function ReportSkeleton({ withoutSelector }: { withoutSelector?: boolean }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement du rapport">
      {!withoutSelector && <Skeleton className="h-[84px] rounded-2xl" />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
      </div>
      <Skeleton className="h-12 rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  )
}
