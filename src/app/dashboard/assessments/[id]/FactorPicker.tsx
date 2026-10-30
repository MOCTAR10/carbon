'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, Search } from 'lucide-react'
import { cn, fmtNum } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { EmissionFactor } from '@/lib/emission-factors'
import { norm, unitLabel, type SubSection } from './sections'

/** Searchable list of a section's emission factors; picking one adds it to the entry table. */
export function FactorPicker({
  section, open, onOpenChange, visibleIds, onPick,
}: {
  section: SubSection | null
  open: boolean
  onOpenChange: (v: boolean) => void
  /** Factors already shown in the table */
  visibleIds: Set<string>
  onPick: (factor: EmissionFactor) => void
}) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)

  useEffect(() => { if (open) { setQ(''); setActive(0) } }, [open])

  const results = useMemo(() => {
    if (!section) return []
    // Every word must match somewhere ("elec gabon" → "Électricité Gabon")
    // Retired factors stay in a bilan that uses them but are never offered again
    const offered = section.factors.filter(f => f.status !== 'retired')
    const words = norm(q).split(/\s+/).filter(Boolean)
    return words.length
      ? offered.filter(f => {
          const hay = norm(`${f.nameFr} ${f.name} ${f.region} ${f.sourceRef} ${f.source} ${f.keywords.join(' ')}`)
          return words.every(w => hay.includes(w))
        })
      : offered
  }, [section, q])

  useEffect(() => { setActive(0) }, [q])

  if (!section) return null

  const pick = (f?: EmissionFactor) => { if (f) { onPick(f); onOpenChange(false) } }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        eyebrow="Ajouter une source"
        title={section.label}
        description={section.description}
        size="lg"
        className="sm:h-[min(640px,88vh)]"
      >
        <div
          className="space-y-3"
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)) }
            else if (e.key === 'Enter') { e.preventDefault(); pick(results[active]) }
          }}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Rechercher : gazole, électricité Gabon, acier…"
              aria-label="Rechercher un facteur d’émission"
              role="combobox"
              aria-expanded
              aria-controls="factor-list"
              aria-activedescendant={results[active] ? `factor-${results[active].id}` : undefined}
              className="h-11 w-full rounded-xl border border-ivory-400 bg-white pl-10 pr-4 text-sm text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-forest-500 focus:ring-4 focus:ring-forest-100"
            />
          </div>
          <p className="text-xs text-ink-400">
            {results.length} facteur{results.length > 1 ? 's' : ''} d’émission{q && ` pour « ${q} »`}
          </p>
          <ul id="factor-list" role="listbox" className="space-y-1">
            {results.map((f, i) => {
              const added = visibleIds.has(f.id)
              return (
                <li key={f.id} role="presentation">
                  <button
                    type="button"
                    id={`factor-${f.id}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseMove={() => setActive(i)}
                    onClick={() => pick(f)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                      i === active ? 'bg-ivory-100' : 'hover:bg-ivory-50',
                    )}
                  >
                    <span className={cn(
                      'flex size-8 flex-shrink-0 items-center justify-center rounded-lg',
                      added ? 'bg-forest-50 text-forest-700' : 'border border-ivory-300 bg-white text-ink-400',
                    )}>
                      {added ? <Check className="size-4" /> : <Plus className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink-800">{f.nameFr}</span>
                      <span className="block truncate text-[11px] text-ink-400">{f.region} · {f.source}</span>
                    </span>
                    <span className="flex-shrink-0 text-right text-[11px] tabular-nums text-ink-500">
                      {fmtNum(f.factorTotal, 4)}
                      <span className="block text-ink-400">kgCO₂e/{unitLabel(f.unit)}</span>
                    </span>
                  </button>
                </li>
              )
            })}
            {results.length === 0 && (
              <li className="px-3 py-10 text-center text-sm text-ink-400">Aucun facteur ne correspond à « {q} ».</li>
            )}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}
