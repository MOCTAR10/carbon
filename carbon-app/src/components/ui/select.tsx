'use client'

import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SelectOption = { value: string; label: React.ReactNode; hint?: React.ReactNode; disabled?: boolean }
export type SelectGroup = { label: string; options: SelectOption[] }

/**
 * Designed replacement for native <select>. Radix forbids '' as an item value, so an empty
 * value shows the placeholder; pass `allowEmpty` with `emptyLabel` to offer a "Tous" choice.
 */
export function Select({
  id, value, onValueChange, options, groups, placeholder = 'Choisir…', disabled, className, size = 'md',
  allowEmpty, emptyLabel = 'Tous', 'aria-label': ariaLabel, invalid,
}: {
  id?: string
  value: string
  onValueChange: (v: string) => void
  options?: SelectOption[]
  groups?: SelectGroup[]
  placeholder?: string
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  allowEmpty?: boolean
  emptyLabel?: string
  'aria-label'?: string
  invalid?: boolean
}) {
  const EMPTY = '__empty__'
  return (
    <SelectPrimitive.Root
      value={value === '' ? (allowEmpty ? EMPTY : undefined) : value}
      onValueChange={v => onValueChange(v === EMPTY ? '' : v)}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        className={cn(
          'group inline-flex w-full items-center justify-between gap-2 rounded-xl border bg-white text-left font-sans text-ink-800 outline-none transition',
          'border-ivory-400 hover:border-forest-300 focus-visible:border-forest-500 focus-visible:ring-4 focus-visible:ring-forest-100',
          'data-[placeholder]:text-ink-400 disabled:cursor-not-allowed disabled:opacity-60',
          invalid && 'border-red-300 focus-visible:ring-red-100',
          size === 'sm' ? 'h-9 px-3 text-[13px]' : size === 'lg' ? 'h-12 px-4 text-sm' : 'h-11 px-3.5 text-sm',
          className,
        )}
      >
        <span className="min-w-0 truncate"><SelectPrimitive.Value placeholder={placeholder} /></span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="size-4 flex-shrink-0 text-ink-400 transition-transform group-data-[state=open]:rotate-180" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className={cn(
            'z-[60] max-h-[min(360px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-ivory-300 bg-white font-sans shadow-lifted',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          )}
        >
          <SelectPrimitive.Viewport className="p-1.5">
            {allowEmpty && <Item value={EMPTY} label={emptyLabel} />}
            {options?.map(o => <Item key={o.value} {...o} />)}
            {groups?.map(g => (
              <SelectPrimitive.Group key={g.label}>
                <SelectPrimitive.Label className="px-2.5 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-600">
                  {g.label}
                </SelectPrimitive.Label>
                {g.options.map(o => <Item key={o.value} {...o} />)}
              </SelectPrimitive.Group>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

function Item({ value, label, hint, disabled }: SelectOption) {
  return (
    <SelectPrimitive.Item
      value={value}
      disabled={disabled}
      className="relative flex cursor-pointer select-none items-center gap-2 rounded-lg py-2 pl-8 pr-3 text-sm text-ink-700 outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-ivory-100 data-[state=checked]:font-semibold data-[highlighted]:text-forest-900 data-[state=checked]:text-forest-900 data-[disabled]:opacity-50"
    >
      <span className="absolute left-2.5 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator><Check className="size-3.5 text-gold-600" strokeWidth={2.5} /></SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{label}</SelectPrimitive.ItemText>
      {hint && <span className="ml-auto pl-3 text-xs text-ink-400">{hint}</span>}
    </SelectPrimitive.Item>
  )
}
