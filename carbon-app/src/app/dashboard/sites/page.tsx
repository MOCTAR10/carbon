'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Building2, Plus, MapPin, Ruler, ClipboardList, ArrowUpRight, Loader2, MoreHorizontal,
  Pencil, Trash2, AlertTriangle, Globe2, Layers,
} from 'lucide-react'
import { plural } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { Stagger, Reveal } from '@/components/ui/motion'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Select, type SelectGroup } from '@/components/ui/select'
import { Field, Input, Textarea } from '@/components/ui/field'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'

const COUNTRIES = [
  "Afghanistan", "Afrique du Sud", "Albanie", "Algérie", "Allemagne", "Andorre", "Angola", "Antigua-et-Barbuda",
  "Arabie Saoudite", "Argentine", "Arménie", "Australie", "Autriche", "Azerbaïdjan", "Bahamas", "Bahreïn",
  "Bangladesh", "Barbade", "Belgique", "Bélize", "Bénin", "Bhoutan", "Biélorussie", "Birmanie (Myanmar)",
  "Bolivie", "Bosnie-Herzégovine", "Botswana", "Brésil", "Brunei", "Bulgarie", "Burkina Faso", "Burundi",
  "Cambodge", "Cameroun", "Canada", "Cap-Vert", "Centrafrique", "Chili", "Chine", "Chypre", "Colombie",
  "Comores", "Congo (Brazzaville)", "Congo (Kinshasa)", "Corée du Nord", "Corée du Sud", "Costa Rica",
  "Côte d'Ivoire", "Croatie", "Cuba", "Danemark", "Djibouti", "Dominique", "Égypte", "Émirats Arabes Unis",
  "Équateur", "Érythrée", "Espagne", "Estonie", "Eswatini", "États-Unis", "Éthiopie", "Fidji", "Finlande",
  "France", "Gabon", "Gambie", "Géorgie", "Ghana", "Grèce", "Grenade", "Guatemala", "Guinée", "Guinée équatoriale",
  "Guinée-Bissau", "Guyana", "Haïti", "Honduras", "Hongrie", "Inde", "Indonésie", "Irak", "Iran", "Irlande",
  "Islande", "Israël", "Italie", "Jamaïque", "Japon", "Jordanie", "Kazakhstan", "Kenya", "Kirghizistan",
  "Kiribati", "Koweït", "Laos", "Lesotho", "Lettonie", "Liban", "Libéria", "Libye", "Liechtenstein", "Lituanie",
  "Luxembourg", "Macédoine du Nord", "Madagascar", "Malaisie", "Malawi", "Maldives", "Mali", "Malte", "Maroc",
  "Maurice", "Mauritanie", "Mexique", "Micronésie", "Moldavie", "Monaco", "Mongolie", "Monténégro", "Mozambique",
  "Namibie", "Nauru", "Népal", "Nicaragua", "Niger", "Nigeria", "Norvège", "Nouvelle-Zélande", "Oman",
  "Ouganda", "Ouzbékistan", "Pakistan", "Palaos", "Panama", "Papouasie-Nouvelle-Guinée", "Paraguay", "Pays-Bas",
  "Pérou", "Philippines", "Pologne", "Portugal", "Qatar", "République Dominicaine", "République Tchèque",
  "Roumanie", "Royaume-Uni", "Russie", "Rwanda", "Saint-Kitts-et-Nevis", "Saint-Marin", "Saint-Vincent-et-les-Grenadines",
  "Sainte-Lucie", "Salvador", "Samoa", "São Tomé-et-Príncipe", "Sénégal", "Serbie", "Seychelles", "Sierra Leone",
  "Singapour", "Slovaquie", "Slovénie", "Somalie", "Soudan", "Soudan du Sud", "Sri Lanka", "Suède", "Suisse",
  "Suriname", "Syrie", "Tadjikistan", "Tanzanie", "Tchad", "Thaïlande", "Timor oriental", "Togo", "Tonga",
  "Trinité-et-Tobago", "Tunisie", "Turkménistan", "Turquie", "Tuvalu", "Ukraine", "Uruguay", "Vanuatu",
  "Vatican", "Venezuela", "Vietnam", "Yémen", "Zambie", "Zimbabwe"
]

// CEMAC first — the platform's home market
const CEMAC = ['Gabon', 'Cameroun', 'Congo (Brazzaville)', 'Guinée équatoriale', 'Centrafrique', 'Tchad']
const COUNTRY_GROUPS: SelectGroup[] = [
  { label: 'Zone CEMAC', options: CEMAC.map(c => ({ value: c, label: c })) },
  { label: 'Autres pays', options: COUNTRIES.filter(c => !CEMAC.includes(c)).map(c => ({ value: c, label: c })) },
]

interface Site {
  id: number
  name: string
  type: string
  address: string | null
  surface: number | null
  description: string | null
  assessment_count: number
  created_at: string
  country?: string | null
}

const SITE_TYPES = [
  { value: 'agence', label: 'Agence / Succursale' },
  { value: 'boutique', label: 'Boutique / Point de vente' },
  { value: 'bureau', label: 'Bureau / Siège social' },
  { value: 'chantier', label: 'Chantier / Construction' },
  { value: 'clinique', label: 'Clinique / Centre médical' },
  { value: 'datacenter', label: 'Data center / Informatique' },
  { value: 'ecole', label: 'École / Campus' },
  { value: 'entrepot', label: 'Entrepôt / Stockage' },
  { value: 'exploitation_agricole', label: 'Exploitation agricole' },
  { value: 'garage', label: 'Garage / Atelier' },
  { value: 'hotel', label: 'Hôtel / Hébergement' },
  { value: 'laboratoire', label: 'Laboratoire / R&D' },
  { value: 'logistique', label: 'Plateforme logistique' },
  { value: 'magasin', label: 'Magasin' },
  { value: 'restaurant', label: 'Restaurant / Restauration' },
  { value: 'supermarche', label: 'Supermarché / Hypermarché' },
  { value: 'usine', label: 'Usine / Production' },
  { value: 'autre', label: 'Autre' },
]

type FormState = { name: string; type: string; address: string; surface: string; description: string; country: string }
const EMPTY_FORM: FormState = { name: '', type: 'bureau', address: '', surface: '', description: '', country: 'Gabon' }

const toForm = (s: Site): FormState => ({
  name: s.name, type: s.type || 'bureau', address: s.address ?? '', surface: s.surface != null ? String(Number(s.surface)) : '',
  description: s.description ?? '', country: s.country ?? '',
})

export default function SitesPage() {
  const router = useRouter()
  const [sites, setSites] = useState<Site[]>([])
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  // null = closed, 'new' = create, Site = edit
  const [editing, setEditing] = useState<Site | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Site | null>(null)

  const fetchSites = useCallback(() => {
    setFailed(false)
    fetch('/api/sites')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { if (Array.isArray(d)) setSites(d) })
      .catch(() => setFailed(true))
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => { fetchSites() }, [fetchSites])

  // Deep link (command palette, dashboard): /dashboard/sites?new=1 opens the creation dialog
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new') === '1') {
      setEditing('new')
      router.replace('/dashboard/sites', { scroll: false })
    }
  }, [router])

  const totalAssessments = sites.reduce((n, s) => n + Number(s.assessment_count || 0), 0)
  const countries = new Set(sites.map(s => s.country).filter(Boolean)).size

  return (
    <Stagger className="space-y-8">
      <Reveal>
        <PageHeader
          eyebrow="Périmètre organisationnel"
          title="Sites & entités"
          description="Chaque bilan carbone est rattaché à un site : siège, agence, usine, entrepôt…"
          actions={sites.length > 0 ? <Button onClick={() => setEditing('new')}><Plus /> Ajouter un site</Button> : undefined}
        />
      </Reveal>

      {loaded && sites.length > 0 && (
        <Reveal>
          <Card className="grid grid-cols-3 divide-x divide-ivory-300">
            {[
              { icon: Building2, value: sites.length, label: sites.length > 1 ? 'Sites enregistrés' : 'Site enregistré' },
              { icon: Globe2, value: countries, label: countries > 1 ? 'Pays couverts' : 'Pays couvert' },
              { icon: Layers, value: totalAssessments, label: totalAssessments > 1 ? 'Bilans rattachés' : 'Bilan rattaché' },
            ].map(s => (
              <div key={s.label} className="px-4 py-4 sm:px-6 sm:py-5">
                <p className="flex items-center gap-2 font-display text-2xl tabular-nums text-forest-900 sm:text-3xl">
                  {s.value}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-ink-500">
                  <s.icon className="hidden size-3.5 text-gold-600 sm:block" strokeWidth={1.8} />
                  {s.label}
                </p>
              </div>
            ))}
          </Card>
        </Reveal>
      )}

      {!loaded ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : failed && sites.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <AlertTriangle className="size-6 text-amber-600" />
          <p className="text-sm font-semibold text-ink-800">Impossible de charger vos sites</p>
          <Button variant="outline" size="sm" onClick={fetchSites}>Réessayer</Button>
        </Card>
      ) : sites.length === 0 ? (
        <Reveal>
          <FirstSite onCreate={() => setEditing('new')} />
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sites.map(site => (
            <Reveal key={site.id}>
              <SiteCard site={site} onEdit={() => setEditing(site)} onDelete={() => setDeleting(site)} />
            </Reveal>
          ))}
        </div>
      )}

      <SiteDialog
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={(created) => {
          setEditing(null)
          fetchSites()
          if (created) {
            toast.success('Site créé', {
              description: 'Vous pouvez maintenant créer son bilan carbone.',
              action: { label: 'Créer un bilan', onClick: () => router.push(`/dashboard/assessments?new=1&site=${created.id}`) },
            })
          } else toast.success('Site mis à jour')
        }}
      />
      <DeleteSiteDialog
        site={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => { setDeleting(null); fetchSites() }}
      />
    </Stagger>
  )
}

// ─── Empty state: guided first step ───────────────────────────────────────────

function FirstSite({ onCreate }: { onCreate: () => void }) {
  const steps = [
    { n: 1, title: 'Déclarez un site', text: 'Le lieu dont vous mesurez les émissions : siège, agence, usine…' },
    { n: 2, title: 'Créez son bilan', text: 'Choisissez l’année et la période couverte.' },
    { n: 3, title: 'Saisissez vos données', text: 'Énergie, carburants, déplacements, achats…' },
  ]
  return (
    <Card className="overflow-hidden">
      <div className="grid gap-0 md:grid-cols-[1.1fr_1fr]">
        <div className="p-8 sm:p-10">
          <span className="flex size-12 items-center justify-center rounded-xl bg-forest-900 text-gold-300">
            <Building2 className="size-5" strokeWidth={1.7} />
          </span>
          <h2 className="mt-5 font-display text-2xl text-forest-900">Commencez par votre premier site</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-500">
            Un site délimite le périmètre de votre bilan. Vous pourrez en ajouter d’autres à tout moment.
          </p>
          <Button className="mt-6" onClick={onCreate}><Plus /> Ajouter un site</Button>
        </div>
        <ol className="space-y-5 border-t border-ivory-300 bg-ivory-50 p-8 sm:p-10 md:border-l md:border-t-0">
          {steps.map(s => (
            <li key={s.n} className="flex gap-4">
              <span className={s.n === 1
                ? 'flex size-7 flex-shrink-0 items-center justify-center rounded-full border border-gold-500 bg-gold-50 text-[11px] font-bold text-gold-700 ring-4 ring-gold-100'
                : 'flex size-7 flex-shrink-0 items-center justify-center rounded-full border border-ivory-400 bg-white text-[11px] font-bold text-ink-500'}>
                {s.n}
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink-800">{s.title}</span>
                <span className="block text-xs leading-relaxed text-ink-500">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  )
}

// ─── Site card ────────────────────────────────────────────────────────────────

function SiteCard({ site, onEdit, onDelete }: { site: Site; onEdit: () => void; onDelete: () => void }) {
  const count = Number(site.assessment_count || 0)
  return (
    <Card className="flex h-full flex-col p-6 transition-all duration-200 hover:border-forest-200 hover:shadow-lifted">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-forest-900 text-gold-300">
          <Building2 className="size-5" strokeWidth={1.7} />
        </div>
        <div className="flex items-center gap-1">
          <Badge tone="neutral" className="max-w-[160px] truncate">{SITE_TYPES.find(t => t.value === site.type)?.label || site.type}</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="-mr-2 text-ink-500" aria-label={`Actions pour ${site.name}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}><Pencil /> Modifier le site</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={onDelete}><Trash2 /> Supprimer</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <h3 className="font-display text-xl text-forest-900">{site.name}</h3>
      <div className="mt-2 space-y-1.5 text-sm text-ink-500">
        <p className="flex items-center gap-2">
          <MapPin className="size-3.5 flex-shrink-0 text-gold-600" />
          <span className="truncate">{[site.address, site.country].filter(Boolean).join(' · ') || 'Aucune adresse'}</span>
        </p>
        {site.surface != null && Number(site.surface) > 0 && (
          <p className="flex items-center gap-2">
            <Ruler className="size-3.5 flex-shrink-0 text-gold-600" />
            <span className="tabular-nums">{Number(site.surface).toLocaleString('fr-FR')} m²</span>
          </p>
        )}
      </div>
      {site.description && (
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-ink-500">{site.description}</p>
      )}
      <div className="min-h-5 flex-1" />
      <div className="flex items-center justify-between gap-3 border-t border-ivory-300 pt-4">
        {count > 0 ? (
          <Link
            href={`/dashboard/assessments?site=${site.id}`}
            className="inline-flex items-center gap-2 rounded-lg text-sm text-ink-600 transition-colors hover:text-forest-900"
          >
            <ClipboardList className="size-4 text-forest-500" strokeWidth={1.8} />
            <span><span className="font-semibold tabular-nums text-forest-900">{count}</span> {count > 1 ? 'bilans' : 'bilan'}</span>
            <ArrowUpRight className="size-3.5 text-ink-400" />
          </Link>
        ) : (
          <span className="text-xs text-ink-500">Aucun bilan pour l’instant</span>
        )}
        <Button asChild variant={count > 0 ? 'outline' : 'primary'} size="sm">
          <Link href={`/dashboard/assessments?new=1&site=${site.id}`}><Plus /> Créer un bilan</Link>
        </Button>
      </div>
    </Card>
  )
}

// ─── Create / edit dialog ─────────────────────────────────────────────────────

function SiteDialog({
  target, onClose, onSaved,
}: { target: Site | 'new' | null; onClose: () => void; onSaved: (created: Site | null) => void }) {
  const isEdit = target !== null && target !== 'new'
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (target === null) return
    setForm(target === 'new' ? EMPTY_FORM : toForm(target))
    setError('')
    setTouched(false)
  }, [target])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(p => ({ ...p, [k]: v }))
  const nameError = touched && !form.name.trim() ? 'Indiquez le nom du site.' : undefined
  const countryError = touched && !form.country ? 'Choisissez un pays.' : undefined
  const surfaceError = form.surface && (Number(form.surface) < 0 || !Number.isFinite(Number(form.surface)))
    ? 'Surface invalide.' : undefined

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!form.name.trim() || !form.country || surfaceError) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(isEdit ? `/api/sites/${(target as Site).id}` : '/api/sites', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, name: form.name.trim(), surface: form.surface ? parseFloat(form.surface) : null }),
      })
      const d = await res.json().catch(() => null)
      if (!res.ok) { setError(d?.error ?? 'Enregistrement impossible. Réessayez.'); return }
      onSaved(isEdit ? null : d)
    } catch {
      setError('Impossible de joindre le serveur.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={target !== null} onOpenChange={o => { if (!o && !saving) onClose() }}>
      <DialogContent
        eyebrow={isEdit ? 'Modifier' : 'Nouveau site'}
        title={isEdit ? (target as Site).name : 'Ajouter un site'}
        description={isEdit ? undefined : 'Le lieu dont vous allez mesurer les émissions.'}
        footer={
          <>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
            <Button type="submit" form="site-form" disabled={saving}>
              {saving ? <><Loader2 className="animate-spin" /> Enregistrement…</> : isEdit ? 'Enregistrer' : 'Créer le site'}
            </Button>
          </>
        }
      >
        <form id="site-form" onSubmit={submit} noValidate className="space-y-4">
          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 size-4 flex-shrink-0" /> {error}
            </p>
          )}
          <Field label="Nom du site" error={nameError}>
            {p => <Input {...p} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex. : Siège social Libreville" maxLength={255} autoFocus />}
          </Field>
          <Field label="Type de site">
            {p => <Select id={p.id} value={form.type} onValueChange={v => set('type', v)} options={SITE_TYPES} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pays" error={countryError}>
              {p => <Select id={p.id} value={form.country} onValueChange={v => set('country', v)} groups={COUNTRY_GROUPS} placeholder="Choisir un pays…" invalid={!!countryError} />}
            </Field>
            <Field label="Surface" optional error={surfaceError} hint="En m²">
              {p => <Input {...p} type="number" inputMode="decimal" value={form.surface} onChange={e => set('surface', e.target.value)} placeholder="Ex. : 500" min={0} step="0.01" />}
            </Field>
          </div>
          <Field label="Adresse" optional>
            {p => <Input {...p} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Quartier, rue, ville" maxLength={500} />}
          </Field>
          <Field label="Description" optional>
            {p => <Textarea {...p} value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Activité du site, effectif, particularités…" maxLength={2000} />}
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete confirmation ──────────────────────────────────────────────────────

function DeleteSiteDialog({ site, onClose, onDeleted }: { site: Site | null; onClose: () => void; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { setError('') }, [site])
  const count = Number(site?.assessment_count || 0)

  const confirm = async () => {
    if (!site) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/sites/${site.id}`, { method: 'DELETE' })
      const d = await res.json().catch(() => null)
      if (!res.ok) { setError(d?.error ?? 'Suppression impossible.'); return }
      toast.success('Site supprimé')
      onDeleted()
    } catch {
      setError('Impossible de joindre le serveur.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={!!site} onOpenChange={o => { if (!o && !busy) onClose() }}>
      <DialogContent
        size="sm"
        eyebrow="Suppression"
        title={`Supprimer « ${site?.name ?? ''} » ?`}
        footer={
          <>
            <Button variant="outline" onClick={onClose} disabled={busy}>Annuler</Button>
            <Button onClick={confirm} disabled={busy} className="bg-red-600 text-white hover:bg-red-700">
              {busy ? <><Loader2 className="animate-spin" /> Suppression…</> : <><Trash2 /> Supprimer définitivement</>}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm leading-relaxed text-ink-600">
          {count > 0 ? (
            <p>
              Ce site compte <strong className="text-ink-800">{plural(count, 'bilan')}</strong>. Ils seront supprimés avec
              leurs données d’émissions et leurs justificatifs.
            </p>
          ) : (
            <p>Ce site ne contient aucun bilan.</p>
          )}
          <p className="text-ink-500">Cette action est irréversible.</p>
          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-red-700">
              <AlertTriangle className="mt-0.5 size-4 flex-shrink-0" /> {error}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
