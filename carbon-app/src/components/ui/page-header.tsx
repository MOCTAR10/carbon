import * as React from 'react'
import { cn } from '@/lib/utils'

export function PageHeader({
  eyebrow, title, description, actions, className,
}: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex flex-col gap-4 md:flex-row md:items-end md:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-600">{eyebrow}</p>
        )}
        <h1 className="font-display text-3xl font-normal leading-tight tracking-tight text-forest-900 md:text-[2.5rem]">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
