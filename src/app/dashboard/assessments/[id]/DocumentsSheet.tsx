'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Eye, FileText, Loader2, Lock, Paperclip, Trash, Upload } from 'lucide-react'
import { cn, fmtDate, fmtSize, MONTHS_FR } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Select } from '@/components/ui/select'
import { UPLOAD_ACCEPT, UPLOAD_EXTENSIONS, UPLOAD_MAX_BYTES } from './sections'

export interface AuditDoc {
  id: number
  emission_factor_id: string
  year: number
  month: number
  original_name: string
  file_size: number
  created_at: string
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function DocumentsSheet({
  open, onOpenChange, assessmentId, factor, year, months, initialMonth, docs, locked, onChanged,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  assessmentId: string
  factor: { id: string; name: string } | null
  year: number
  /** Months of the bilan's period */
  months: number[]
  /** Month selected in the editor (0 = annual view) */
  initialMonth: number
  docs: AuditDoc[]
  locked: boolean
  onChanged: () => Promise<void>
}) {
  const [month, setMonth] = useState(initialMonth || months[0])
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) { setMonth(initialMonth || months[0]); setConfirmId(null) }
  }, [open, initialMonth, months])

  if (!factor) return null
  const factorDocs = docs
    .filter(d => d.emission_factor_id === factor.id)
    .sort((a, b) => a.month - b.month || b.created_at.localeCompare(a.created_at))
  // Annual view lists every month; a month view lists that month first
  const shown = initialMonth ? factorDocs.filter(d => d.month === month) : factorDocs

  const upload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!UPLOAD_EXTENSIONS.includes(ext)) {
      toast.error('Format non accepté', { description: 'PDF, images (PNG, JPG, WebP), Excel, Word ou CSV.' })
      return
    }
    if (file.size > UPLOAD_MAX_BYTES) {
      toast.error('Fichier trop volumineux', { description: `${fmtSize(file.size)} — 10 Mo maximum.` })
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('assessmentId', assessmentId)
      fd.append('factorId', factor.id)
      fd.append('year', String(year))
      fd.append('month', String(month))
      const res = await fetch('/api/documents', { method: 'POST', body: fd })
      if (res.ok) {
        await onChanged()
        toast.success('Justificatif ajouté', { description: `${file.name} · ${MONTHS_FR[month - 1]} ${year}` })
      } else {
        const data = await res.json().catch(() => null)
        toast.error('Téléversement impossible', { description: data?.error || 'Réessayez dans un instant.' })
      }
    } catch {
      toast.error('Erreur de connexion au serveur.')
    }
    setUploading(false)
  }

  const remove = async (doc: AuditDoc) => {
    setDeletingId(doc.id)
    try {
      const res = await fetch('/api/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: doc.id, assessmentId }),
      })
      if (res.ok) {
        await onChanged()
        toast.success('Justificatif supprimé', { description: doc.original_name })
      } else {
        const data = await res.json().catch(() => null)
        toast.error('Suppression impossible', { description: data?.error || 'Réessayez dans un instant.' })
      }
    } catch {
      toast.error('Erreur de connexion au serveur.')
    }
    setDeletingId(null)
    setConfirmId(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="right"
        eyebrow={initialMonth ? `Justificatifs · ${cap(MONTHS_FR[month - 1])} ${year}` : `Justificatifs · Année ${year}`}
        title={factor.name}
        description="Factures, relevés ou bons de livraison qui prouvent les quantités saisies."
        footer={
          <p className="w-full text-center text-xs text-ink-500">
            {factorDocs.length === 0 ? 'Aucun justificatif' : `${factorDocs.length} justificatif${factorDocs.length > 1 ? 's' : ''}`} pour cette source sur l’année
          </p>
        }
      >
        {locked ? (
          <p className="mb-5 flex items-start gap-2 rounded-xl border border-ivory-300 bg-ivory-50 px-4 py-3 text-xs text-ink-600">
            <Lock className="mt-0.5 size-3.5 flex-shrink-0 text-gold-600" />
            Les justificatifs sont verrouillés pendant la certification : l’expert consulte ceux qui ont été soumis.
          </p>
        ) : (
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-3">
              <label htmlFor="doc-month" className="text-[13px] font-semibold text-ink-700">Mois du justificatif</label>
              <Select
                id="doc-month"
                size="sm"
                className="w-40"
                value={String(month)}
                onValueChange={v => setMonth(Number(v))}
                options={months.map(m => ({ value: String(m), label: cap(MONTHS_FR[m - 1]) }))}
              />
            </div>
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              tabIndex={-1}
              accept={UPLOAD_ACCEPT}
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) upload(file)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => {
                e.preventDefault()
                setDragging(false)
                const file = e.dataTransfer.files?.[0]
                if (file && !uploading) upload(file)
              }}
              disabled={uploading}
              className={cn(
                'flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-7 text-sm transition-all disabled:opacity-60',
                dragging
                  ? 'border-forest-500 bg-forest-50 text-forest-800'
                  : 'border-ivory-400 bg-ivory-50 text-ink-500 hover:border-forest-300 hover:bg-forest-50/50 hover:text-forest-800',
              )}
            >
              <span className="flex size-10 items-center justify-center rounded-full border border-ivory-300 bg-white text-forest-600">
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              </span>
              <span className="font-semibold">
                {uploading ? 'Envoi en cours…' : dragging ? 'Déposez le fichier' : 'Glissez un fichier ou cliquez pour choisir'}
              </span>
              <span className="text-[11px] text-ink-400">PDF, images, Excel, Word, CSV · 10 Mo max.</span>
            </button>
          </div>
        )}

        {shown.length === 0 ? (
          <EmptyState
            icon={Paperclip}
            title="Aucun justificatif"
            description={initialMonth ? `Rien pour ${MONTHS_FR[month - 1]} ${year}.` : 'Ajoutez une facture ou un relevé pour justifier cette source.'}
          />
        ) : (
          <ul className="space-y-2">
            {shown.map(doc => (
              <li key={doc.id} className="flex items-center gap-3 rounded-xl border border-ivory-300 bg-white p-3 transition-colors hover:border-forest-200 hover:bg-ivory-50">
                <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-600">
                  <FileText className="size-4" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-800" title={doc.original_name}>{doc.original_name}</p>
                  <p className="text-[11px] text-ink-400">
                    {fmtSize(doc.file_size)} · {cap(MONTHS_FR[doc.month - 1] ?? '')} {doc.year} · ajouté le {fmtDate(doc.created_at)}
                  </p>
                </div>
                {confirmId === doc.id ? (
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)} disabled={deletingId === doc.id}>Annuler</Button>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => remove(doc)} disabled={deletingId === doc.id}>
                      {deletingId === doc.id ? <Loader2 className="animate-spin" /> : <Trash />} Supprimer
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-shrink-0 items-center gap-0.5">
                    <a
                      href={`/api/documents/${doc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex size-10 items-center justify-center rounded-lg text-ink-500 hover:bg-white hover:text-forest-700"
                      aria-label={`Ouvrir ${doc.original_name}`}
                    >
                      <Eye className="size-4" />
                    </a>
                    {!locked && (
                      <button
                        type="button"
                        onClick={() => setConfirmId(doc.id)}
                        className="flex size-10 items-center justify-center rounded-lg text-ink-500 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Supprimer ${doc.original_name}`}
                      >
                        <Trash className="size-4" />
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {initialMonth !== 0 && factorDocs.length > shown.length && (
          <p className="mt-4 text-center text-xs text-ink-400">
            {factorDocs.length - shown.length} autre{factorDocs.length - shown.length > 1 ? 's' : ''} justificatif{factorDocs.length - shown.length > 1 ? 's' : ''} sur d’autres mois
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
