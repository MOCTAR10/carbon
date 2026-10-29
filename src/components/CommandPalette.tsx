'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Search, ClipboardList, Building2, Plus, CornerDownLeft, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Item = { id: string; label: string; hint?: string; icon: LucideIcon; href: string; group: string }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** ⌘K palette: pages, quick actions, bilans and sites. Data is fetched on first open. */
export default function CommandPalette({
  open, onOpenChange, navItems,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  navItems: { href: string; label: string; icon: LucideIcon }[]
}) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [records, setRecords] = useState<Item[] | null>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!open || records) return
    Promise.all([
      fetch('/api/assessments').then(r => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/sites').then(r => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([assessments, sites]) => {
      setRecords([
        ...(Array.isArray(assessments) ? assessments : []).map((a: { id: number; name: string; year: number; site_name: string }) => ({
          id: `a${a.id}`, label: a.name, hint: `${a.site_name} · ${a.year}`, icon: ClipboardList, href: `/dashboard/assessments/${a.id}`, group: 'Bilans',
        })),
        ...(Array.isArray(sites) ? sites : []).map((s: { id: number; name: string; type: string }) => ({
          id: `s${s.id}`, label: s.name, hint: 'Site', icon: Building2, href: `/dashboard/assessments?site=${s.id}`, group: 'Sites',
        })),
      ])
    })
  }, [open, records])

  useEffect(() => { if (!open) { setQ(''); setActive(0) } }, [open])

  const items = useMemo(() => {
    const base: Item[] = [
      { id: 'new-bilan', label: 'Nouveau bilan carbone', icon: Plus, href: '/dashboard/assessments?new=1', group: 'Actions' },
      { id: 'new-site', label: 'Ajouter un site', icon: Plus, href: '/dashboard/sites?new=1', group: 'Actions' },
      ...navItems.map(n => ({ id: n.href, label: n.label, icon: n.icon, href: n.href, group: 'Pages' })),
      ...(records ?? []),
    ]
    const nq = norm(q.trim())
    if (!nq) return base.filter(i => i.group !== 'Sites').slice(0, 14)
    return base.filter(i => norm(`${i.label} ${i.hint ?? ''}`).includes(nq)).slice(0, 30)
  }, [q, navItems, records])

  useEffect(() => { setActive(0) }, [q])
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const go = (item?: Item) => {
    if (!item) return
    onOpenChange(false)
    router.push(item.href)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, items.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); go(items[active]) }
  }

  let lastGroup = ''
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-forest-950/40 backdrop-blur-[3px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-ivory-300 bg-white font-sans shadow-lifted outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          onKeyDown={onKeyDown}
        >
          <DialogPrimitive.Title className="sr-only">Recherche</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Rechercher une page, un bilan ou un site</DialogPrimitive.Description>
          <div className="flex items-center gap-3 border-b border-ivory-200 px-4">
            <Search className="size-4 flex-shrink-0 text-ink-400" />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Rechercher un bilan, un site, une page…"
              className="h-14 flex-1 bg-transparent text-[15px] text-ink-800 outline-none placeholder:text-ink-400"
              role="combobox"
              aria-expanded
              aria-controls="cmdk-list"
              aria-activedescendant={items[active] ? `cmdk-${items[active].id}` : undefined}
            />
            <kbd className="rounded-md border border-ivory-300 bg-ivory-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-500">Échap</kbd>
          </div>
          <ul ref={listRef} id="cmdk-list" role="listbox" className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
            {items.length === 0 && (
              <li className="px-3 py-10 text-center text-sm text-ink-400">Aucun résultat pour « {q} »</li>
            )}
            {items.map((item, i) => {
              const header = item.group !== lastGroup ? item.group : null
              lastGroup = item.group
              return (
                <li key={item.id} role="presentation">
                  {header && <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-600 first:pt-1">{header}</p>}
                  <button
                    id={`cmdk-${item.id}`}
                    role="option"
                    aria-selected={i === active}
                    data-index={i}
                    onMouseMove={() => setActive(i)}
                    onClick={() => go(item)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none',
                      i === active ? 'bg-ivory-100 text-forest-900' : 'text-ink-700',
                    )}
                  >
                    <item.icon className={cn('size-4 flex-shrink-0', i === active ? 'text-gold-600' : 'text-ink-400')} strokeWidth={1.8} />
                    <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                    {item.hint && <span className="truncate text-xs text-ink-400">{item.hint}</span>}
                    {i === active && <CornerDownLeft className="size-3.5 flex-shrink-0 text-ink-400" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
