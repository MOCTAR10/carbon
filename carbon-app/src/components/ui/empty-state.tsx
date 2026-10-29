import * as React from 'react'
import type { LucideIcon } from 'lucide-react'

export function EmptyState({
  icon: Icon, title, description, action,
}: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-ivory-400 bg-ivory-50 px-6 py-8 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-full border border-ivory-300 bg-white text-forest-400">
        <Icon className="size-5" strokeWidth={1.6} />
      </div>
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      {description && <p className="mt-1 max-w-[240px] text-xs text-ink-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
