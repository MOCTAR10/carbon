'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Building2, Plus, MapPin, X, Ruler, ClipboardList, ArrowUpRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Stagger, Reveal } from '@/components/ui/motion'

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

interface Site {
  id: number
  name: string
  type: string
  address: string
  surface: number | null
  description: string
  assessment_count: number
  created_at: string
  country?: string | null
}

const SITE_TYPES = [
  { value: 'agence', label: 'Agence / Succursale' },
  { value: 'boutique', label: 'Boutique / Point de Vente' },
  { value: 'bureau', label: 'Bureau / Siège Social' },
  { value: 'chantier', label: 'Chantier / Construction' },
  { value: 'clinique', label: 'Clinique / Centre Médical' },
  { value: 'datacenter', label: 'Data Center / Informatique' },
  { value: 'ecole', label: 'École / Campus' },
  { value: 'entrepot', label: 'Entrepôt / Stockage' },
  { value: 'exploitation_agricole', label: 'Exploitation Agricole' },
  { value: 'garage', label: 'Garage / Atelier' },
  { value: 'hotel', label: 'Hôtel / Hébergement' },
  { value: 'laboratoire', label: 'Laboratoire / R&D' },
  { value: 'logistique', label: 'Plateforme Logistique' },
  { value: 'magasin', label: 'Magasin' },
  { value: 'restaurant', label: 'Restaurant / Restauration' },
  { value: 'supermarche', label: 'Supermarché / Hypermarché' },
  { value: 'usine', label: 'Usine / Production' },
  { value: 'autre', label: 'Autre' }
]

const FIELD = 'h-11 w-full rounded-xl border border-ivory-400 bg-white px-3.5 text-sm text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-forest-500 focus:ring-4 focus:ring-forest-100'
const LABEL = 'mb-1.5 block text-[13px] font-semibold text-ink-700'

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'bureau', address: '', surface: '', description: '', country: 'Gabon' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchSites()
  }, [])

  const fetchSites = () => {
    fetch('/api/sites')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSites(d) })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, surface: form.surface ? parseFloat(form.surface) : null }),
      })
      if (res.ok) {
        setShowForm(false)
        setForm({ name: '', type: 'bureau', address: '', surface: '', description: '', country: 'Gabon' })
        fetchSites()
        toast.success('Site créé')
      } else {
        const d = await res.json().catch(() => null)
        toast.error(d?.error ?? 'Impossible de créer le site')
      }
    } finally {
      setLoading(false)
    }
  }

  const totalAssessments = sites.reduce((n, s) => n + Number(s.assessment_count || 0), 0)
  const countries = new Set(sites.map(s => s.country).filter(Boolean)).size

  return (
    <Stagger className="space-y-8">
      <Reveal>
        <PageHeader
          eyebrow="Périmètre organisationnel"
          title="Sites & Entités"
          description="Gérez les différents sites de votre entreprise. Chaque bilan carbone est rattaché à un site."
          actions={<Button onClick={() => setShowForm(true)}><Plus /> Ajouter un site</Button>}
        />
      </Reveal>

      {loaded && sites.length > 0 && (
        <Reveal>
          <Card className="grid grid-cols-3 divide-x divide-ivory-300">
            {[
              { label: 'Sites enregistrés', value: sites.length },
              { label: 'Pays couverts',     value: countries },
              { label: 'Bilans rattachés',  value: totalAssessments },
            ].map(s => (
              <div key={s.label} className="px-6 py-5">
                <p className="font-display text-3xl tabular-nums text-forest-900">{s.value}</p>
                <p className="mt-1 text-xs font-medium text-ink-500">{s.label}</p>
              </div>
            ))}
          </Card>
        </Reveal>
      )}

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-950/40 p-4 font-sans backdrop-blur-sm animate-in fade-in-0">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-lifted animate-in zoom-in-95">

            {/* Header — never scrolls */}
            <div className="flex flex-shrink-0 items-start justify-between border-b border-ivory-300 px-8 pb-5 pt-7">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">Nouveau site</p>
                <h2 className="font-display text-2xl text-forest-900">Ajouter un site</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ivory-100 hover:text-ink-700" aria-label="Fermer">
                <X className="size-5" />
              </button>
            </div>

            {/* Scrollable form body */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <form id="site-form" onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className={LABEL}>Nom du site *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    className={FIELD}
                    placeholder="Ex : Siège social Libreville"
                    required
                  />
                </div>
                <div>
                  <label className={LABEL}>Type de site</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
                    className={FIELD}
                  >
                    {SITE_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>Pays *</label>
                    <select
                      value={form.country}
                      onChange={e => setForm(prev => ({ ...prev, country: e.target.value }))}
                      className={FIELD}
                      required
                    >
                      <option value="" disabled>Sélectionnez un pays…</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Adresse</label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                      className={FIELD}
                      placeholder="Adresse du site"
                    />
                  </div>
                </div>
                <div>
                  <label className={LABEL}>Surface (m&sup2;)</label>
                  <input
                    type="number"
                    value={form.surface}
                    onChange={e => setForm(prev => ({ ...prev, surface: e.target.value }))}
                    className={FIELD}
                    placeholder="Ex : 500"
                    min={0}
                    step="0.01"
                  />
                </div>
                <div>
                  <label className={LABEL}>Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                    className={`${FIELD} h-auto py-2.5`}
                    rows={3}
                    placeholder="Description optionnelle…"
                  />
                </div>
              </form>
            </div>

            {/* Footer buttons — never scrolls */}
            <div className="flex flex-shrink-0 gap-3 border-t border-ivory-300 px-8 py-5">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">Annuler</Button>
              <Button type="submit" form="site-form" disabled={loading} className="flex-1">
                {loading ? <><Loader2 className="animate-spin" /> Création…</> : 'Créer le site'}
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* Sites grid */}
      {!loaded ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-56 rounded-2xl" />)}
        </div>
      ) : sites.length === 0 ? (
        <Reveal>
          <Card className="p-10">
            <EmptyState
              icon={Building2}
              title="Aucun site enregistré"
              description="Ajoutez votre premier site pour commencer votre bilan carbone."
              action={<Button onClick={() => setShowForm(true)}><Plus /> Ajouter un site</Button>}
            />
          </Card>
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sites.map(site => (
            <Reveal key={site.id}>
              <Card className="group flex h-full flex-col p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-forest-200 hover:shadow-lifted">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-forest-900 text-gold-300">
                    <Building2 className="size-5" strokeWidth={1.7} />
                  </div>
                  <Badge tone="neutral">{SITE_TYPES.find(t => t.value === site.type)?.label || site.type}</Badge>
                </div>
                <h3 className="font-display text-xl text-forest-900">{site.name}</h3>
                <div className="mt-2 space-y-1.5 text-sm text-ink-500">
                  <p className="flex items-center gap-2 truncate">
                    <MapPin className="size-3.5 flex-shrink-0 text-gold-500" />
                    <span className="truncate">{[site.address, site.country].filter(Boolean).join(' · ') || 'Aucune adresse'}</span>
                  </p>
                  {site.surface && (
                    <p className="flex items-center gap-2">
                      <Ruler className="size-3.5 flex-shrink-0 text-gold-500" />
                      <span className="tabular-nums">{Number(site.surface).toLocaleString('fr-FR')} m&sup2;</span>
                    </p>
                  )}
                </div>
                {site.description && (
                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-ink-400">{site.description}</p>
                )}
                <div className="min-h-5 flex-1" />
                <div className="flex items-center justify-between border-t border-ivory-300 pt-4">
                  <span className="flex items-center gap-2 text-sm text-ink-600">
                    <ClipboardList className="size-4 text-forest-500" strokeWidth={1.8} />
                    <span className="font-semibold tabular-nums text-forest-900">{site.assessment_count}</span>
                    bilan{Number(site.assessment_count) > 1 ? 's' : ''}
                  </span>
                  <Link
                    href="/dashboard/assessments"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-forest-700 transition-colors hover:text-gold-600"
                  >
                    Voir les bilans <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      )}
    </Stagger>
  )
}
