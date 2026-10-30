'use client'

import { useEffect, useState } from 'react'
import {
  AlertTriangle, ArrowRight, BookOpen, Check, ChevronDown, CircleDot, ClipboardCheck, Compass, FileCheck2, Info,
  Loader2, Plus, Repeat, Sparkles, Target,
} from 'lucide-react'
import { cn, fmtNum } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { SECTOR_LABELS } from '@/lib/sectors'
import type { LibraryFactor } from '@/lib/factor-library'
import {
  QUESTIONS, suggestedAnswer, type Answers, type Analysis, type CheckItem, type Context, type Hint, type PlanItem,
} from '@/lib/copilot'
import { TABS, unitLabel } from './sections'

export type CopilotView = 'profile' | 'plan' | 'checks' | 'analysis'

const SITE_LABELS: Record<string, string> = {
  agence: 'agence', boutique: 'boutique', bureau: 'bureau', chantier: 'chantier', clinique: 'clinique', datacenter: 'datacenter',
  ecole: 'école', entrepot: 'entrepôt', exploitation_agricole: 'exploitation agricole', garage: 'garage', hotel: 'hôtel',
  laboratoire: 'laboratoire', logistique: 'plateforme logistique', magasin: 'magasin', restaurant: 'restaurant',
  supermarche: 'supermarché', usine: 'usine', autre: 'site',
}

const t = (kg: number) => `${fmtNum(kg / 1000, kg < 10_000 ? 2 : 1)} tCO₂e`
/** Share of the total, never a misleading « 0 % » for a small but real poste */
const pct = (x: number) => (x > 0 && x < 0.001 ? '< 0,1 %' : `${fmtNum(x * 100, 1)} %`)

/* ---------------- Completeness ring ---------------- */
function Ring({ value, size = 64, label }: { value: number; size?: number; label: string }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value))
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} className="stroke-forest-800/40" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          className={cn('transition-[stroke-dashoffset] duration-700', pct >= 1 ? 'stroke-gold-400' : 'stroke-forest-300')}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-base tabular-nums text-ivory-50">
        {Math.round(pct * 100)}<span className="text-[10px] text-forest-100/70">%</span>
      </span>
    </div>
  )
}

/* ---------------- Card on the bilan page ---------------- */
export function CopilotCard({
  confirmed, plan, hints, checks, analysis, onOpen,
}: {
  confirmed: boolean
  plan: PlanItem[]
  hints: Hint[]
  checks: CheckItem[]
  analysis: Analysis
  onOpen: (view: CopilotView) => void
}) {
  const covered = plan.filter(p => p.covered).length
  const ready = checks.filter(c => c.ok).length
  const warnings = hints.filter(h => h.severity === 'warning')
  const next = confirmed ? (warnings.length ? warnings : hints).slice(0, 2) : []

  return (
    <Card className="overflow-hidden border-transparent bg-forest-950 bg-forest-grain text-ivory-50 shadow-lifted">
      <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Ring value={confirmed && plan.length ? covered / plan.length : 0} label={`Plan de collecte : ${covered} postes sur ${plan.length}`} />
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-300/90">
              <Sparkles className="size-3.5" /> Copilote carbone
            </p>
            {confirmed ? (
              <>
                <p className="mt-1 font-display text-lg leading-snug">
                  {covered === plan.length ? 'Tous vos postes attendus sont renseignés' : `${covered} poste${covered > 1 ? 's' : ''} renseigné${covered > 1 ? 's' : ''} sur ${plan.length}`}
                </p>
                {next.length > 0 ? (
                  <ul className="mt-1.5 space-y-0.5 text-xs text-forest-100/80">
                    {next.map(h => (
                      <li key={h.id} className="flex items-start gap-1.5">
                        {h.severity === 'warning' ? <AlertTriangle className="mt-0.5 size-3 flex-shrink-0 text-gold-300" /> : <CircleDot className="mt-0.5 size-3 flex-shrink-0 text-forest-300" />}
                        <span className="min-w-0 truncate">{h.title}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-forest-100/75">Aucun point d’attention : votre bilan est cohérent.</p>
                )}
              </>
            ) : (
              <>
                <p className="mt-1 font-display text-lg leading-snug">Établissons le périmètre de votre bilan</p>
                <p className="mt-1 text-xs text-forest-100/75">
                  Quelques questions sur vos activités : le Copilote en déduit les postes à renseigner, les justificatifs à réunir et les contrôles avant certification.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-stretch">
          {confirmed && (
            <div className="flex gap-2 text-[11px] lg:justify-end">
              <button type="button" onClick={() => onOpen('checks')} className="rounded-lg bg-forest-900 px-2.5 py-1.5 text-left ring-1 ring-forest-700 hover:ring-gold-400/60">
                <span className="block text-forest-100/60">Prêt pour l’audit</span>
                <span className="font-semibold tabular-nums">{ready}/{checks.length}</span>
              </button>
              {analysis.uncertainty != null && (
                <button type="button" onClick={() => onOpen('analysis')} className="rounded-lg bg-forest-900 px-2.5 py-1.5 text-left ring-1 ring-forest-700 hover:ring-gold-400/60">
                  <span className="block text-forest-100/60">Incertitude</span>
                  <span className="font-semibold tabular-nums">± {fmtNum(analysis.uncertainty * 100, 1)} %</span>
                </button>
              )}
            </div>
          )}
          <Button variant="gold" onClick={() => onOpen(confirmed ? (warnings.length ? 'checks' : 'plan') : 'profile')} className="h-11 sm:h-10">
            {confirmed ? 'Ouvrir le Copilote' : 'Démarrer (2 min)'} <ArrowRight />
          </Button>
        </div>
      </div>
    </Card>
  )
}

/* ---------------- Side sheet ---------------- */
export function CopilotSheet({
  open, onOpenChange, view, onViewChange, ctx, siteName, savedAnswers, answers, confirmed, inherited, locked, dirty,
  plan, hints, checks, analysis, factorsById, previousYear, onSaveProfile, onAddFactor, onGoto, onReplace,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  view: CopilotView
  onViewChange: (v: CopilotView) => void
  ctx: Context
  siteName: string
  savedAnswers: Answers
  answers: Answers
  confirmed: boolean
  inherited: boolean
  locked: boolean
  dirty: boolean
  plan: PlanItem[]
  hints: Hint[]
  checks: CheckItem[]
  analysis: Analysis
  factorsById: Map<string, LibraryFactor>
  previousYear: number | null
  onSaveProfile: (a: Answers) => Promise<boolean>
  onAddFactor: (f: LibraryFactor) => void
  onGoto: (h: Hint) => void
  onReplace: (fromId: string, toId: string) => Promise<void>
}) {
  const ready = checks.filter(c => c.ok).length
  const warnings = hints.filter(h => h.severity === 'warning').length
  const siteLabel = ctx.siteType ? SITE_LABELS[ctx.siteType] ?? ctx.siteType : 'site'
  const site = siteLabel.charAt(0).toUpperCase() + siteLabel.slice(1)
  const sector = ctx.sector ? SECTOR_LABELS[ctx.sector] ?? ctx.sector : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="right"
        size="xl"
        eyebrow="Copilote carbone"
        title={siteName}
        description={[sector, `${site}${ctx.country ? ` · ${ctx.country}` : ''}`].filter(Boolean).join(' · ')}
      >
        <Tabs value={view} onValueChange={v => onViewChange(v as CopilotView)}>
          <TabsList aria-label="Copilote">
            <TabsTrigger value="profile"><Compass /> Profil</TabsTrigger>
            <TabsTrigger value="plan" disabled={!confirmed}><Target /> Plan de collecte</TabsTrigger>
            <TabsTrigger value="checks" disabled={!confirmed}>
              <ClipboardCheck /> Contrôles
              {warnings > 0 && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-800">{warnings}</span>}
            </TabsTrigger>
            <TabsTrigger value="analysis" disabled={!confirmed}><FileCheck2 /> Analyse</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-5">
            <ProfileForm
              ctx={ctx} saved={savedAnswers} initial={answers} confirmed={confirmed} inherited={inherited} locked={locked}
              onSave={async a => { if (await onSaveProfile(a)) onViewChange('plan') }}
            />
          </TabsContent>

          <TabsContent value="plan" className="mt-5 space-y-3">
            <p className="text-xs text-ink-500">
              Postes à renseigner d’après vos activités, avec la méthode, les pièces à réunir et les erreurs fréquentes. Ajoutez une source en un clic.
            </p>
            {plan.map(p => <PlanRow key={p.id} item={p} total={analysis.totalKg} locked={locked} factorsById={factorsById} onAdd={onAddFactor} />)}
          </TabsContent>

          <TabsContent value="checks" className="mt-5 space-y-6">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">Prêt pour l’audit de certification</h3>
                <Badge tone={ready === checks.length ? 'forest' : 'amber'}>{ready}/{checks.length}</Badge>
              </div>
              <ul className="space-y-1.5">
                {checks.map(c => (
                  <li key={c.id} className="flex items-start gap-3 rounded-xl border border-ivory-300 bg-white px-3.5 py-2.5">
                    <span className={cn('mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full', c.ok ? 'bg-forest-700 text-ivory-50' : 'bg-amber-100 text-amber-700')}>
                      {c.ok ? <Check className="size-3" /> : <span className="text-[11px] font-bold">!</span>}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-forest-900">{c.label}</span>
                      <span className="block text-xs text-ink-500">{c.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">Points d’attention ({hints.length})</h3>
              {hints.length === 0 && <p className="text-sm text-ink-500">Aucun point d’attention.</p>}
              <ul className="space-y-2">
                {hints.map(h => (
                  <HintRow key={h.id} hint={h} locked={locked} dirty={dirty} factorsById={factorsById} onGoto={onGoto} onReplace={onReplace} />
                ))}
              </ul>
            </section>
          </TabsContent>

          <TabsContent value="analysis" className="mt-5">
            <AnalysisView analysis={analysis} previousYear={previousYear} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- Profile ---------------- */
function ProfileForm({
  ctx, saved, initial, confirmed, inherited, locked, onSave,
}: {
  ctx: Context
  saved: Answers
  initial: Answers
  confirmed: boolean
  inherited: boolean
  locked: boolean
  onSave: (a: Answers) => Promise<void>
}) {
  const [draft, setDraft] = useState<Answers>(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setDraft(initial) }, [initial])

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-forest-100 bg-forest-50/60 px-4 py-3 text-xs leading-relaxed text-forest-800">
        <Sparkles className="mr-1.5 inline size-3.5 text-gold-600" />
        {inherited
          ? 'Réponses reprises du bilan précédent de ce site : vérifiez qu’elles sont toujours vraies.'
          : 'Réponses pré-remplies d’après votre secteur et le type de site. Corrigez ce qui ne s’applique pas : le périmètre du bilan en dépend.'}
      </p>
      <ul className="divide-y divide-ivory-200 rounded-2xl border border-ivory-300 bg-white">
        {QUESTIONS.map(q => {
          const v = draft[q.id]
          const suggested = saved[q.id] === undefined && suggestedAnswer(q, ctx)
          return (
            <li key={q.id} className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-forest-900">{q.label}</p>
                <p className="text-xs text-ink-400">
                  {q.help}
                  {suggested && !confirmed && <span className="ml-1.5 text-gold-700">· suggéré pour votre activité</span>}
                </p>
              </div>
              <div role="radiogroup" aria-label={q.label} className="flex flex-shrink-0 rounded-xl bg-ivory-100 p-0.5">
                {([true, false] as const).map(opt => (
                  <button
                    key={String(opt)}
                    type="button"
                    role="radio"
                    aria-checked={v === opt}
                    disabled={locked}
                    onClick={() => setDraft(d => ({ ...d, [q.id]: opt }))}
                    className={cn(
                      'h-8 min-w-12 rounded-lg px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed',
                      v === opt ? (opt ? 'bg-forest-800 text-ivory-50 shadow-soft' : 'bg-white text-ink-700 shadow-soft') : 'text-ink-500 hover:text-forest-900',
                    )}
                  >
                    {opt ? 'Oui' : 'Non'}
                  </button>
                ))}
              </div>
            </li>
          )
        })}
      </ul>
      {!locked && (
        <div className="flex justify-end">
          <Button onClick={async () => { setBusy(true); await onSave(draft); setBusy(false) }} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Check />}
            {confirmed ? 'Mettre à jour le profil' : 'Confirmer et voir mon plan'}
          </Button>
        </div>
      )}
    </div>
  )
}

/* ---------------- Plan row ---------------- */
function PlanRow({
  item, total, locked, factorsById, onAdd,
}: {
  item: PlanItem
  total: number
  locked: boolean
  factorsById: Map<string, LibraryFactor>
  onAdd: (f: LibraryFactor) => void
}) {
  const [open, setOpen] = useState(!item.covered)
  const tab = TABS.find(x => x.id === item.tab)
  return (
    <div className={cn('rounded-2xl border bg-white', item.covered ? 'border-ivory-300' : 'border-amber-200')}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className={cn('flex size-7 flex-shrink-0 items-center justify-center rounded-full', item.covered ? 'bg-forest-700 text-ivory-50' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200')}>
          {item.covered ? <Check className="size-3.5" /> : tab ? <tab.icon className="size-3.5" /> : <Plus className="size-3.5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-forest-900">{item.label}</span>
          <span className="block truncate text-xs text-ink-400">
            {item.covered
              ? `${item.usedIds.map(id => factorsById.get(id)?.nameFr ?? id).join(' · ')}`
              : `À collecter : ${item.collect}`}
          </span>
        </span>
        {item.covered && item.kg > 0 && (
          <span className="flex-shrink-0 text-right text-xs tabular-nums text-forest-900">
            {t(item.kg)}
            <span className="block text-[11px] text-ink-400">{pct(total ? item.kg / total : 0)}</span>
          </span>
        )}
        <ChevronDown className={cn('size-4 flex-shrink-0 text-ink-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-ivory-200 px-4 py-3 text-xs">
          <dl className="grid gap-2 sm:grid-cols-[110px_1fr]">
            <dt className="font-semibold text-ink-500">Référentiel</dt><dd className="text-ink-700">{item.standard}</dd>
            <dt className="font-semibold text-ink-500">Donnée</dt><dd className="text-ink-700">{item.collect}{item.monthly ? ' — chaque mois de la période' : ''}</dd>
            <dt className="font-semibold text-ink-500">Justificatifs</dt><dd className="text-ink-700">{item.proof}</dd>
            <dt className="font-semibold text-ink-500">Erreurs fréquentes</dt><dd className="text-ink-700">{item.pitfalls}</dd>
          </dl>
          {!locked && item.factors.length > 0 && (
            <div>
              <p className="mb-1.5 font-semibold text-ink-500">Facteurs recommandés</p>
              <ul className="space-y-1">
                {item.factors.map(f => (
                  <li key={f.id} className="flex items-center gap-3 rounded-xl bg-ivory-50 px-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-forest-900">{f.nameFr}</span>
                      <span className="block text-[11px] text-ink-400">{fmtNum(f.factorTotal, 4)} kgCO₂e/{unitLabel(f.unit)} · {f.source}{f.region ? ` · ${f.region}` : ''}</span>
                    </span>
                    <Button size="sm" variant={item.usedIds.includes(f.id) ? 'ghost' : 'outline'} onClick={() => onAdd(f)}>
                      {item.usedIds.includes(f.id) ? <>Voir <ArrowRight /></> : <><Plus /> Ajouter</>}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------------- Hint row ---------------- */
function HintRow({
  hint, locked, dirty, factorsById, onGoto, onReplace,
}: {
  hint: Hint
  locked: boolean
  dirty: boolean
  factorsById: Map<string, LibraryFactor>
  onGoto: (h: Hint) => void
  onReplace: (fromId: string, toId: string) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const warn = hint.severity === 'warning'
  const target = hint.replacementId ? factorsById.get(hint.replacementId) : undefined
  return (
    <li className={cn('rounded-xl border px-3.5 py-3', warn ? 'border-amber-200 bg-amber-50/50' : 'border-ivory-300 bg-white')}>
      <div className="flex items-start gap-2.5">
        {warn ? <AlertTriangle className="mt-0.5 size-4 flex-shrink-0 text-amber-600" /> : <Info className="mt-0.5 size-4 flex-shrink-0 text-sky-600" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-forest-900">{hint.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-600">{hint.detail}</p>
          {!locked && (
            <div className="mt-2 flex flex-wrap gap-2">
              {hint.factorId && (
                <Button size="sm" variant="outline" onClick={() => onGoto(hint)}>
                  {hint.id.startsWith('proof:') ? <><BookOpen /> Joindre les justificatifs</> : <>Aller à la saisie <ArrowRight /></>}
                </Button>
              )}
              {hint.factorId && target && (
                <Button
                  size="sm"
                  disabled={busy || dirty}
                  title={dirty ? 'Enregistrez d’abord vos modifications' : undefined}
                  onClick={async () => { setBusy(true); await onReplace(hint.factorId!, target.id); setBusy(false) }}
                >
                  {busy ? <Loader2 className="animate-spin" /> : <Repeat />} Remplacer par « {target.nameFr} »
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

/* ---------------- Analysis ---------------- */
function AnalysisView({ analysis, previousYear }: { analysis: Analysis; previousYear: number | null }) {
  if (!analysis.totalKg) return <p className="text-sm text-ink-500">L’analyse apparaît dès que des données sont saisies.</p>
  let cum = 0
  const top = analysis.hotspots.filter(h => { const keep = cum < 0.8; cum += h.share; return keep })
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-ivory-300 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Total</p>
          <p className="mt-1 font-display text-2xl tabular-nums text-forest-900">
            {fmtNum(analysis.totalKg / 1000, analysis.totalKg < 10_000 ? 2 : 1)} <span className="font-sans text-xs text-ink-500">tCO₂e</span>
          </p>
        </div>
        <div className="rounded-2xl border border-ivory-300 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Incertitude (facteurs)</p>
          <p className="mt-1 font-display text-2xl tabular-nums text-forest-900">± {fmtNum((analysis.uncertainty ?? 0) * 100, 1)} %</p>
        </div>
        <div className="rounded-2xl border border-ivory-300 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Facteurs peu précis</p>
          <p className="mt-1 font-display text-2xl tabular-nums text-forest-900">{fmtNum(analysis.lowQualityShare * 100, 0)} %</p>
          <p className="text-[11px] text-ink-400">des émissions (incertitude &gt; 30 %)</p>
        </div>
      </div>

      <section>
        <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">Postes significatifs</h3>
        <p className="mb-3 text-xs text-ink-500">
          {top.length} poste{top.length > 1 ? 's' : ''} font 80 % de vos émissions : c’est là que la qualité des données et les actions de réduction comptent le plus.
        </p>
        <ul className="space-y-2">
          {analysis.hotspots.map(h => (
            <li key={h.label} className="rounded-xl border border-ivory-300 bg-white px-3.5 py-2.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-forest-900">{h.label}</span>
                <span className="flex-shrink-0 tabular-nums text-ink-700">{t(h.kg)} · {pct(h.share)}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ivory-200">
                <div className={cn('h-full rounded-full', top.includes(h) ? 'bg-forest-700' : 'bg-forest-300')} style={{ width: `${h.share * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="rounded-xl bg-ivory-100 px-4 py-3 text-[11px] leading-relaxed text-ink-500">
        Méthode : incertitude des facteurs d’émission combinée selon l’approche 1 du GIEC (2006, vol. 1, ch. 3) — racine de la somme des carrés des
        incertitudes absolues, à 95 %. L’incertitude des données d’activité (compteurs, factures) n’est pas incluse.
        {previousYear ? ` Les écarts avec le bilan ${previousYear} figurent dans les contrôles.` : ''}
      </p>
    </div>
  )
}
