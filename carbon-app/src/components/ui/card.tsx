import * as React from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-ivory-300/80 bg-white shadow-soft', className)}
      {...props}
    />
  )
}

export function CardHeader({
  title, eyebrow, action, className,
}: { title: React.ReactNode; eyebrow?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-end justify-between gap-4 px-6 pt-5 pb-4', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-600">{eyebrow}</p>}
        <h2 className="truncate font-display text-lg font-medium text-forest-900">{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 pb-6', className)} {...props} />
}
