'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Accessible modal (portalled, focus-trapped, Escape/overlay to close, focus returned on close).
 * `side="right"` renders a slide-over sheet; on phones every dialog becomes a bottom sheet.
 */
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

type ContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  title: React.ReactNode
  description?: React.ReactNode
  eyebrow?: React.ReactNode
  /** Rendered under the title, above the scrolling body (badges, meta) */
  meta?: React.ReactNode
  /** Sticky footer (actions) */
  footer?: React.ReactNode
  side?: 'center' | 'right'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  hideClose?: boolean
}

const SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }

export const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, ContentProps>(
  ({ title, description, eyebrow, meta, footer, side = 'center', size = 'md', hideClose, className, children, ...props }, ref) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className="fixed inset-0 z-50 bg-forest-950/45 backdrop-blur-[3px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
      />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed z-50 flex flex-col bg-white font-sans text-ink-800 shadow-lifted outline-none',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200',
          // phones: bottom sheet
          'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-3xl data-[state=open]:slide-in-from-bottom-8',
          side === 'center'
            ? cn('sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[88vh] sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95', SIZES[size])
            : 'sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:max-h-none sm:w-full sm:max-w-xl sm:rounded-none sm:rounded-l-3xl sm:data-[state=open]:slide-in-from-right-10 sm:data-[state=open]:slide-in-from-bottom-0',
          className,
        )}
        {...props}
      >
        <span className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-ivory-300 sm:hidden" aria-hidden />
        <header className="flex items-start justify-between gap-4 border-b border-ivory-200 px-6 pb-4 pt-4 sm:pt-6">
          <div className="min-w-0">
            {eyebrow && <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">{eyebrow}</p>}
            <DialogPrimitive.Title className="font-display text-xl leading-snug text-forest-900 sm:text-2xl">{title}</DialogPrimitive.Title>
            {description
              ? <DialogPrimitive.Description className="mt-1 text-sm text-ink-500">{description}</DialogPrimitive.Description>
              : <DialogPrimitive.Description className="sr-only">{typeof title === 'string' ? title : 'Boîte de dialogue'}</DialogPrimitive.Description>}
            {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
          </div>
          {!hideClose && (
            <DialogPrimitive.Close
              className="-mr-2 flex size-9 flex-shrink-0 items-center justify-center rounded-xl text-ink-400 transition-colors hover:bg-ivory-100 hover:text-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
              aria-label="Fermer"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          )}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <footer className="flex flex-col-reverse gap-2 border-t border-ivory-200 bg-ivory-50/80 px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </footer>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  ),
)
DialogContent.displayName = 'DialogContent'
