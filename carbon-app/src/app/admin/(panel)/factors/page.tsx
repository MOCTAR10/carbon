'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Library, Search, Download, Upload, Star, Archive, RotateCcw, X, AlertTriangle, CheckCircle2, History, Loader2,
} from 'lucide-react'
import { CATEGORY_LABELS, SUBCATEGORY_LABELS } from '@/lib/emission-factors'
import { FACTOR_CATEGORIES } from '@/lib/factor-import'
import type { LibraryFactor } from '@/lib/factor-library'

interface Change {
  id: number
  factorId: string
  action: 'created' | 'updated' | 'retired' | 'restored'
  batchLabel: string | null
  changedBy: string | null
  createdAt: string
}

interface Preview {
  summary: { created: number; updated: number; unchanged: number; errors: number }
  created: { id: string; nameFr: string; category: string; scope: number; factorTotal: number; unit: string; source: string }[]
  updated: { id: string; nameFr: string; fields: { field: string; before: unknown; after: unknown }[]; openBilans: number }[]
  errors: { row: number; id?: string; message: string }[]
  applied: boolean
  error?: string
}

const SCOPE_CHIP: Record<number, string> = {
  1: 'bg-scope1/20 text-scope1-light',
  2: 'bg-scope2/20 text-scope2-light',
  3: 'bg-scope3/20 text-scope3-light',
}

const ACTION_LABELS: Record<Change['action'], string> = {
  created: 'Ajouté', updated: 'Modifié', retired: 'Retiré', restored: 'Réactivé',
}

const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 6 })
const show = (v: unknown) => Array.isArray(v) ? (v.length ? v.join(' | ') : '—') : v == null || v === '' ? '—' : typeof v === 'boolean' ? (v ? 'oui' : 'non') : String(v)
const formatDate = (d: string) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function AdminFactors() {
  const [factors, setFactors] = useState<LibraryFactor[]>([])
  const [changes, setChanges] = useState<Change[]>([])
  const [usage, setUsage] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [scope, setScope] = useState('')
  const [status, setStatus] = useState('active')
  const [busyId, setBusyId] = useState<string | null>(null)

  // Import
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [label, setLabel] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/emission-factors', { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      // Same order as the data-entry tabs (Énergie first)
      const rank = (c: string) => (FACTOR_CATEGORIES as readonly string[]).indexOf(c)
      setFactors([...data.factors].sort((a: LibraryFactor, b: LibraryFactor) => rank(a.category) - rank(b.category)))
      setChanges(data.changes)
      setUsage(data.usage)
      setError('')
    } catch {
      setError('Impossible de charger la bibliothèque.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const words = search.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/).filter(Boolean)
    return factors.filter(f => {
      if (category && f.category !== category) return false
      if (scope && String(f.scope) !== scope) return false
      if (status && f.status !== status) return false
      if (!words.length) return true
      const hay = `${f.id} ${f.nameFr} ${f.name} ${f.source} ${f.region} ${f.keywords.join(' ')}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      return words.every(w => hay.includes(w))
    })
  }, [factors, search, category, scope, status])

  const counts = useMemo(() => ({
    active: factors.filter(f => f.status === 'active').length,
    retired: factors.filter(f => f.status === 'retired').length,
    sources: new Set(factors.map(f => f.source)).size,
  }), [factors])

  const patch = async (f: LibraryFactor, body: { status?: string; isRecommended?: boolean }) => {
    setBusyId(f.id)
    const res = await fetch(`/api/admin/emission-factors/${encodeURIComponent(f.id)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    setBusyId(null)
    if (res.ok) load()
    else setError((await res.json().catch(() => ({}))).error || 'Modification impossible.')
  }

  const runImport = async (data: Record<string, unknown>[], apply: boolean) => {
    setImporting(true)
    setImportMsg('')
    try {
      const res = await fetch('/api/admin/emission-factors/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: data, label: label || fileName, apply }),
      })
      const body = await res.json()
      if (body.summary) setPreview(body)
      if (!res.ok) { setImportMsg(body.error || 'Import impossible.'); return }
      if (apply) {
        setImportMsg(`Import appliqué : ${body.summary.created} ajouté(s), ${body.summary.updated} modifié(s).`)
        setRows(null)
        setPreview(null)
        load()
      }
    } catch {
      setImportMsg('Import impossible.')
    } finally {
      setImporting(false)
    }
  }

  const onFile = async (file: File) => {
    setImportMsg('')
    setPreview(null)
    try {
      // Parsed in the browser: the server only receives plain rows
      const XLSX = await import('xlsx')
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', raw: true })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true })
      if (!data.length) { setImportMsg('Le fichier ne contient aucune ligne.'); return }
      setRows(data)
      setFileName(file.name)
      runImport(data, false)
    } catch {
      setImportMsg('Fichier illisible : utilisez le modèle CSV exporté (séparateur « ; ») ou un fichier Excel.')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const closeImport = () => { setRows(null); setPreview(null); setLabel(''); setImportMsg('') }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Facteurs d’émission</h1>
          <p className="text-gray-400 text-sm mt-1">
            {counts.active} facteurs actifs · {counts.sources} sources{counts.retired ? ` · ${counts.retired} retiré${counts.retired > 1 ? "s" : ""}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/admin/emission-factors/export"
            className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> Exporter (modèle CSV)
          </a>
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" /> Importer
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            aria-label="Fichier de facteurs à importer"
            onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }}
          />
        </div>
      </div>

      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      {importMsg && !rows && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{importMsg}</p>
      )}

      {/* Import preview */}
      {rows && (
        <section className="bg-gray-900 border border-brand-600/40 rounded-xl p-5 space-y-4" aria-label="Aperçu de l’import">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">Aperçu de l’import</h2>
              <p className="text-xs text-gray-400 mt-0.5">{fileName} · {rows.length} ligne{rows.length > 1 ? 's' : ''} · rien n’est enregistré avant validation</p>
            </div>
            <button onClick={closeImport} className="p-1.5 text-gray-400 hover:text-white" aria-label="Annuler l’import"><X className="w-4 h-4" /></button>
          </div>

          {importing && !preview && <p className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Analyse du fichier…</p>}

          {preview && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { k: 'Nouveaux', v: preview.summary.created, c: 'text-emerald-300' },
                  { k: 'Modifiés', v: preview.summary.updated, c: 'text-amber-300' },
                  { k: 'Inchangés', v: preview.summary.unchanged, c: 'text-gray-300' },
                  { k: 'Lignes en erreur', v: preview.summary.errors, c: preview.summary.errors ? 'text-red-300' : 'text-gray-300' },
                ].map(s => (
                  <div key={s.k} className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
                    <p className="text-xs text-gray-400">{s.k}</p>
                    <p className={`text-xl font-bold tabular-nums ${s.c}`}>{s.v}</p>
                  </div>
                ))}
              </div>

              {preview.errors.length > 0 && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-red-300"><AlertTriangle className="w-4 h-4" /> Lignes à corriger</p>
                  <ul className="mt-2 max-h-48 overflow-y-auto space-y-1 text-xs text-red-200/90">
                    {preview.errors.map((e, i) => (
                      <li key={i}>Ligne {e.row}{e.id ? ` (${e.id})` : ''} — {e.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.updated.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-amber-300">Modifications</p>
                  <ul className="max-h-72 overflow-y-auto space-y-2">
                    {preview.updated.map(u => (
                      <li key={u.id} className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-xs">
                        <p className="font-medium text-white">{u.nameFr} <span className="text-gray-500">· {u.id}</span></p>
                        <ul className="mt-1.5 space-y-0.5 text-gray-300">
                          {u.fields.map(f => (
                            <li key={f.field}><span className="text-gray-500">{f.field} :</span> <s className="text-gray-500">{show(f.before)}</s> → <span className="text-amber-200">{show(f.after)}</span></li>
                          ))}
                        </ul>
                        {u.openBilans > 0 && (
                          <p className="mt-1.5 text-amber-300/90">
                            {u.openBilans} bilan{u.openBilans > 1 ? 's' : ''} en cours utilise{u.openBilans > 1 ? 'nt' : ''} ce facteur : la nouvelle valeur s’appliquera à leur prochain enregistrement. Pour une nouvelle édition d’une source, préférez un nouvel identifiant.
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.created.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-emerald-300">Nouveaux facteurs</p>
                  <ul className="max-h-60 overflow-y-auto divide-y divide-gray-700/60 bg-gray-800 border border-gray-700 rounded-lg text-xs">
                    {preview.created.map(c => (
                      <li key={c.id} className="flex items-center gap-3 px-4 py-2">
                        <span className={`rounded px-1.5 py-0.5 font-semibold ${SCOPE_CHIP[c.scope]}`}>S{c.scope}</span>
                        <span className="min-w-0 flex-1 truncate text-white">{c.nameFr} <span className="text-gray-500">· {CATEGORY_LABELS[c.category] ?? c.category} · {c.source}</span></span>
                        <span className="tabular-nums text-gray-300">{fmt(c.factorTotal)} {c.unit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center pt-1">
                <input
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder={`Libellé du lot (ex. DEFRA 2024) — par défaut « ${fileName} »`}
                  aria-label="Libellé du lot"
                  className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                />
                <button
                  onClick={() => runImport(rows, true)}
                  disabled={importing || preview.summary.errors > 0 || (preview.summary.created + preview.summary.updated === 0)}
                  className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Appliquer l’import
                </button>
              </div>
            </>
          )}
          {importMsg && <p className="text-sm text-red-300">{importMsg}</p>}
        </section>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Rechercher : nom, identifiant, source, mot-clé…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Catégorie"
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500">
          <option value="">Toutes les catégories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={scope} onChange={e => setScope(e.target.value)} aria-label="Scope"
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500">
          <option value="">Tous les scopes</option>
          <option value="1">Scope 1</option>
          <option value="2">Scope 2</option>
          <option value="3">Scope 3</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Statut"
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500">
          <option value="active">Actifs</option>
          <option value="retired">Retirés</option>
          <option value="">Tous</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-400 font-medium px-4 py-3">Facteur</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3 hidden lg:table-cell">Catégorie</th>
                <th className="text-right text-gray-400 font-medium px-4 py-3">Valeur</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3 hidden md:table-cell">Source</th>
                <th className="text-center text-gray-400 font-medium px-4 py-3 hidden md:table-cell">Bilans</th>
                <th className="text-right text-gray-400 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="text-center py-10 text-gray-500">Chargement...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-500">Aucun facteur trouvé.</td></tr>}
              {filtered.map(f => (
                <tr key={f.id} className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${f.status === 'retired' ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold ${SCOPE_CHIP[f.scope]}`}>S{f.scope}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-white">
                          {f.nameFr}
                          {f.isRecommended && <Star className="ml-1.5 inline w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-label="Recommandé" />}
                        </p>
                        <p className="text-xs text-gray-500">{f.id}{f.region ? ` · ${f.region}` : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs hidden lg:table-cell">
                    {CATEGORY_LABELS[f.category] ?? f.category}
                    <span className="block text-gray-500">{SUBCATEGORY_LABELS[f.subcategory] ?? f.subcategory}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-200 whitespace-nowrap">
                    {fmt(f.factorTotal)}
                    <span className="block text-[11px] text-gray-500">{f.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs hidden md:table-cell">
                    {f.source}{f.sourceYear ? ` (${f.sourceYear})` : ''}
                    {f.sourceRef && <span className="block text-gray-500">{f.sourceRef}</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300 tabular-nums hidden md:table-cell">{usage[f.id] ?? 0}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => patch(f, { isRecommended: !f.isRecommended })}
                      disabled={busyId === f.id}
                      title={f.isRecommended ? 'Retirer la recommandation' : 'Recommander ce facteur'}
                      aria-label={f.isRecommended ? `Ne plus recommander ${f.nameFr}` : `Recommander ${f.nameFr}`}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-amber-300 hover:bg-gray-700 disabled:opacity-40 transition-colors"
                    >
                      <Star className={`w-4 h-4 ${f.isRecommended ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                    {f.status === 'active' ? (
                      <button
                        onClick={() => patch(f, { status: 'retired' })}
                        disabled={busyId === f.id}
                        title="Retirer : n’est plus proposé, reste valable dans les bilans qui l’utilisent"
                        aria-label={`Retirer ${f.nameFr}`}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-300 hover:bg-gray-700 disabled:opacity-40 transition-colors"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => patch(f, { status: 'active' })}
                        disabled={busyId === f.id}
                        title="Réactiver"
                        aria-label={`Réactiver ${f.nameFr}`}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-300 hover:bg-gray-700 disabled:opacity-40 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && <p className="px-4 py-3 border-t border-gray-700 text-xs text-gray-500">{filtered.length} facteur{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}</p>}
      </div>

      {/* History */}
      <section className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-white"><History className="w-4 h-4 text-gray-400" /> Historique des modifications</h2>
        {changes.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">Aucune modification depuis l’initialisation de la bibliothèque.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-700/60 text-xs">
            {changes.map(c => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="w-20 font-semibold text-gray-200">{ACTION_LABELS[c.action]}</span>
                <span className="text-gray-300">{c.factorId}</span>
                {c.batchLabel && <span className="rounded bg-gray-700 px-1.5 py-0.5 text-gray-300">{c.batchLabel}</span>}
                <span className="ml-auto text-gray-500">{c.changedBy ?? '—'} · {formatDate(c.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="flex items-start gap-2 text-xs text-gray-500">
        <Library className="w-4 h-4 flex-shrink-0" />
        Chaque saisie garde la valeur du facteur utilisée au moment de l’enregistrement : un bilan certifié n’est jamais modifié par un import.
        Colonnes du modèle : séparateur « ; », listes (mots-clés, secteurs, types de site) séparées par « | ».
      </p>
    </div>
  )
}
