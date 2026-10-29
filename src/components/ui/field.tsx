'use client'

import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Labelled form field. The render-prop receives the generated id so the control and its
 * <label>, hint and error are always associated (htmlFor / aria-describedby).
 */
export function Field({
  label, hint, error, optional, className, children,
}: {
  label: React.ReactNode
  hint?: React.ReactNode
  error?: React.ReactNode
  optional?: boolean
  className?: string
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => React.ReactNode
}) {
  const id = React.useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errId = error ? `${id}-err` : undefined
  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-ink-700">
        {label}
        {optional && <span className="ml-1 font-normal text-ink-400">(optionnel)</span>}
      </label>
      {children({ id, 'aria-describedby': [hintId, errId].filter(Boolean).join(' ') || undefined, 'aria-invalid': error ? true : undefined })}
      {hint && !error && <p id={hintId} className="mt-1.5 text-xs text-ink-400">{hint}</p>}
      {error && <p id={errId} role="alert" className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}

export const inputClass = (opts: { icon?: boolean; size?: 'md' | 'lg'; invalid?: boolean } = {}) => cn(
  'w-full rounded-xl border bg-white text-sm text-ink-800 outline-none transition placeholder:text-ink-400',
  'border-ivory-400 hover:border-forest-300 focus:border-forest-500 focus:ring-4 focus:ring-forest-100',
  'disabled:cursor-not-allowed disabled:bg-ivory-100 disabled:opacity-70',
  opts.size === 'lg' ? 'h-12' : 'h-11',
  opts.icon ? 'pl-10 pr-4' : 'px-3.5',
  opts.invalid && 'border-red-300 focus:border-red-400 focus:ring-red-100',
)

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { icon?: LucideIcon; inputSize?: 'md' | 'lg' }
>(({ icon: Icon, inputSize, className, ...props }, ref) => (
  <div className="relative">
    {Icon && <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" strokeWidth={1.8} />}
    <input
      ref={ref}
      className={cn(inputClass({ icon: !!Icon, size: inputSize, invalid: !!props['aria-invalid'] }), className)}
      {...props}
    />
  </div>
))
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(inputClass(), 'h-auto min-h-[96px] resize-y py-3 leading-relaxed', className)}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'
