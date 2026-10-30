import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Canonical certification journey — the only label set used in the company portal. */
export const JOURNEY_STEPS = [
  { status: 'pending',          label: 'Demande envoyée',  short: 'Demande' },
  { status: 'assigned',         label: 'Expert assigné',   short: 'Expert' },
  { status: 'in_progress',      label: 'Audit terrain',    short: 'Audit' },
  { status: 'audit_done',       label: 'Audit validé',     short: 'Validé' },
  { status: 'submitted_to_cnc', label: 'Déposé à la DGEPN', short: 'DGEPN' },
  { status: 'certified',        label: 'Certificat DGEPN', short: 'Certificat' },
] as const

type StepState = 'done' | 'active' | 'todo' | 'refused'

export function journeyStates(status: string): StepState[] {
  const idx = JOURNEY_STEPS.findIndex(s => s.status === status)
  return JOURNEY_STEPS.map((_, i) => {
    if (status === 'rejected') return i === 0 ? 'refused' : 'todo'
    if (status === 'certified') return 'done'
    return i < idx ? 'done' : i === idx ? 'active' : 'todo'
  })
}

function Dot({ state, n }: { state: StepState; n: number }) {
  return (
    <span
      className={cn(
        'relative z-10 flex size-7 flex-shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors',
        state === 'done' && 'border-forest-700 bg-forest-700 text-ivory-50',
        state === 'active' && 'border-gold-500 bg-gold-50 text-gold-700 ring-4 ring-gold-100',
        state === 'todo' && 'border-ivory-400 bg-white text-ink-400',
        state === 'refused' && 'border-red-300 bg-red-50 text-red-600',
      )}
      aria-hidden
    >
      {state === 'done' ? <Check className="size-3.5" strokeWidth={3} /> : state === 'refused' ? <X className="size-3.5" strokeWidth={3} /> : n}
    </span>
  )
}

/** Six-step journey. `vertical` for cards/dialogs; horizontal collapses to vertical below `md`. */
export function CertJourney({
  status, orientation = 'horizontal', dates, className,
}: {
  status: string
  orientation?: 'horizontal' | 'vertical'
  /** Optional date/detail per step status */
  dates?: Partial<Record<string, string | null | undefined>>
  className?: string
}) {
  const states = journeyStates(status)
  const currentIdx = states.findIndex(s => s === 'active')
  const label = status === 'rejected'
    ? 'Demande refusée'
    : status === 'certified' ? 'Certification obtenue' : `Étape ${currentIdx + 1} sur ${JOURNEY_STEPS.length} : ${JOURNEY_STEPS[currentIdx]?.label}`

  const vertical = (
    <ol className={cn('space-y-0', orientation === 'horizontal' && 'md:hidden', className)} aria-label={label}>
      {JOURNEY_STEPS.map((step, i) => (
        <li key={step.status} className="relative flex items-start gap-3 pb-4 last:pb-0" aria-current={states[i] === 'active' ? 'step' : undefined}>
          {i < JOURNEY_STEPS.length - 1 && (
            <span className={cn('absolute left-[13px] top-7 h-[calc(100%-20px)] w-px', states[i] === 'done' ? 'bg-forest-600' : 'bg-ivory-300')} aria-hidden />
          )}
          <Dot state={states[i]} n={i + 1} />
          <span className="min-w-0 pt-1">
            <span className={cn('block text-sm leading-tight',
              states[i] === 'done' ? 'text-ink-700' : states[i] === 'active' ? 'font-semibold text-forest-900' : states[i] === 'refused' ? 'font-semibold text-red-700' : 'text-ink-400')}>
              {states[i] === 'refused' ? 'Demande refusée' : step.label}
            </span>
            {states[i] !== 'todo' && dates?.[step.status] && <span className="mt-0.5 block text-xs text-ink-400">{dates[step.status]}</span>}
          </span>
        </li>
      ))}
    </ol>
  )
  if (orientation === 'vertical') return vertical

  return (
    <>
      {vertical}
      <ol className={cn('hidden items-start md:flex', className)} aria-label={label}>
        {JOURNEY_STEPS.map((step, i) => (
          <li key={step.status} className="relative flex flex-1 flex-col items-start gap-2" aria-current={states[i] === 'active' ? 'step' : undefined}>
            {i < JOURNEY_STEPS.length - 1 && (
              <span className={cn('absolute left-7 right-0 top-[13px] h-px', states[i] === 'done' ? 'bg-forest-600' : 'bg-ivory-300')} aria-hidden />
            )}
            <Dot state={states[i]} n={i + 1} />
            <span className={cn('pr-2 text-xs leading-tight',
              states[i] === 'done' ? 'text-ink-600' : states[i] === 'active' ? 'font-semibold text-forest-900' : states[i] === 'refused' ? 'font-semibold text-red-700' : 'text-ink-400')}>
              {states[i] === 'refused' ? 'Refusée' : step.label}
              {states[i] !== 'todo' && dates?.[step.status] && <span className="mt-0.5 block font-normal text-ink-400">{dates[step.status]}</span>}
            </span>
          </li>
        ))}
      </ol>
    </>
  )
}
