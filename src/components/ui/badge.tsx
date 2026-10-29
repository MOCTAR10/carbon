import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
  {
    variants: {
      tone: {
        neutral: 'border-ivory-400 bg-ivory-100 text-ink-600',
        forest:  'border-forest-200 bg-forest-50 text-forest-700',
        gold:    'border-gold-200 bg-gold-50 text-gold-700',
        sky:     'border-sky-200 bg-sky-50 text-sky-700',
        amber:   'border-amber-200 bg-amber-50 text-amber-700',
        violet:  'border-violet-200 bg-violet-50 text-violet-700',
        red:     'border-red-200 bg-red-50 text-red-700',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean
}

export function Badge({ className, tone, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  )
}

type Tone = NonNullable<BadgeProps['tone']>

export const CERT_STATUS_BADGE: Record<string, { label: string; tone: Tone }> = {
  pending:          { label: 'En attente',     tone: 'amber' },
  assigned:         { label: 'Expert assigné', tone: 'sky' },
  in_progress:      { label: 'Audit en cours', tone: 'sky' },
  audit_done:       { label: 'Audit terminé',  tone: 'violet' },
  submitted_to_cnc: { label: 'Déposé au CNC',  tone: 'gold' },
  certified:        { label: 'Certifié',       tone: 'forest' },
  rejected:         { label: 'Rejeté',         tone: 'red' },
}

export function CertStatusBadge({ status }: { status: string }) {
  const s = CERT_STATUS_BADGE[status] ?? { label: status, tone: 'neutral' as Tone }
  return <Badge tone={s.tone} dot>{s.label}</Badge>
}
