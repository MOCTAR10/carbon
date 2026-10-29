'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  Leaf, Mail, Lock, User, Building2, ArrowRight, AlertCircle, Phone, Upload, X,
  FileCheck2, MapPin, ShieldCheck, Check, Hash,
} from 'lucide-react'
import LoadingScreen from '@/components/LoadingScreen'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const FIELD = 'h-12 w-full rounded-xl border border-ivory-400 bg-white px-4 text-sm text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-forest-500 focus:ring-4 focus:ring-forest-100'
const LABEL = 'mb-1.5 block text-[13px] font-semibold text-ink-700'
const ICON = 'pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400'

const STEPS = [
  { icon: FileCheck2,  title: 'Créez votre bilan GES',     text: 'Saisissez vos données par site, scopes 1, 2 et 3.' },
  { icon: MapPin,      title: 'Audit terrain accrédité',   text: 'Un expert GreenLeaves vérifie vos données sur site.' },
  { icon: ShieldCheck, title: 'Dépôt au CNC',              text: 'Votre dossier complet est déposé auprès du CNC.' },
]

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex size-6 items-center justify-center rounded-full bg-forest-900 text-[11px] font-bold text-gold-200">{n}</span>
        <h2 className="font-display text-lg text-forest-900">{title}</h2>
        <span className="h-px flex-1 bg-ivory-300" />
      </div>
      {children}
    </section>
  )
}

export default function RegisterPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    phone: '',
    rccm: '',
    sector: ''
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const sectorGroups = [
    {
      group: 'Ressources naturelles & Énergie',
      options: [
        { value: 'petrole_gaz',      label: 'Pétrole & Gaz' },
        { value: 'mines',            label: 'Mines & Extraction minière' },
        { value: 'foresterie',       label: 'Foresterie, Bois & Papier' },
        { value: 'agriculture',      label: 'Agriculture & Agro-industrie' },
        { value: 'peche',            label: 'Pêche & Aquaculture' },
        { value: 'eau',              label: 'Eau & Assainissement' },
        { value: 'energie',          label: 'Énergie & Utilities' },
      ],
    },
    {
      group: 'Industrie & Production',
      options: [
        { value: 'industrie',        label: 'Industrie manufacturière' },
        { value: 'construction',     label: 'Construction & BTP' },
        { value: 'chimie',           label: 'Chimie & Pétrochimie' },
        { value: 'agroalimentaire',  label: 'Agroalimentaire & Boissons' },
        { value: 'emballage',        label: 'Imprimerie & Emballage' },
      ],
    },
    {
      group: 'Services & Tertiaire',
      options: [
        { value: 'commerce',         label: 'Commerce & Distribution' },
        { value: 'transport',        label: 'Transport & Logistique' },
        { value: 'banque',           label: 'Finance, Banque & Assurance' },
        { value: 'telecom',          label: 'Télécommunications' },
        { value: 'tech',             label: 'Technologies & Numérique' },
        { value: 'sante',            label: 'Santé & Pharmaceutique' },
        { value: 'education',        label: 'Éducation & Formation' },
        { value: 'immobilier',       label: 'Immobilier & Foncier' },
        { value: 'tourisme',         label: 'Tourisme, Hôtellerie & Restauration' },
        { value: 'medias',           label: 'Médias & Communication' },
      ],
    },
    {
      group: 'Secteur public & Organisations',
      options: [
        { value: 'administration',   label: 'Administrations & Services publics' },
        { value: 'ong',              label: 'ONG & Associations' },
        { value: 'organisations_int',label: 'Organisations internationales' },
      ],
    },
    {
      group: 'Autre',
      options: [
        { value: 'autre',            label: 'Autre secteur' },
      ],
    },
  ]

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo trop lourd (max 2 Mo)')
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setError('')
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptedTerms) {
      setError('Vous devez accepter la Politique de confidentialité et les CGU pour continuer.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setError('')
    setLoading(true)

    try {
      // Step 1: Register (JSON)
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          acceptedTermsVersion: '1.0',
          acceptedAt: new Date().toISOString(),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'inscription")
        setLoading(false)
        return
      }

      // Step 2: Upload logo if provided
      if (logoFile) {
        const fd = new FormData()
        fd.append('logo', logoFile)
        await fetch('/api/company/logo', { method: 'POST', body: fd })
      }

      window.location.href = '/dashboard'
    } catch {
      setError('Erreur de connexion au serveur')
      setLoading(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const mismatch = !!form.confirmPassword && form.password !== form.confirmPassword

  if (loading) return <LoadingScreen theme="light" label="Création de votre compte..." />

  return (
    <div className="flex min-h-screen bg-ivory-100 font-sans text-ink-800">

      {/* ── Brand panel ── */}
      <aside className="sticky top-0 hidden h-screen w-[42%] max-w-[600px] flex-col justify-between overflow-hidden bg-forest-900 bg-forest-grain p-12 text-ivory-50 lg:flex">
        <div className="pointer-events-none absolute -bottom-40 -right-40 size-[520px] rounded-full border border-gold-400/10" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 size-[360px] rounded-full border border-gold-400/10" />

        <Link href="/" className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-gold-500/15 ring-1 ring-gold-400/40">
            <Leaf className="size-5 text-gold-300" strokeWidth={1.8} />
          </span>
          <span className="font-display text-2xl tracking-tight">CarbonTrack</span>
        </Link>

        <div className="relative">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-300/90">Espace entreprise</p>
          <h2 className="font-display text-5xl font-light leading-[1.08] tracking-tight">
            Votre parcours vers un bilan <em className="font-normal text-gold-200">certifié</em>.
          </h2>
          <ol className="mt-10 space-y-5">
            {STEPS.map((p, i) => (
              <li key={p.title} className="flex gap-4">
                <span className="relative flex size-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                  <p.icon className="size-[18px] text-gold-300" strokeWidth={1.7} />
                  <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-gold-500 text-[9px] font-bold text-forest-950">{i + 1}</span>
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ivory-50">{p.title}</span>
                  <span className="block text-sm text-forest-100/60">{p.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-forest-100/50">
          <svg className="h-2.5 w-4 rounded-[2px]" viewBox="0 0 3 2" aria-hidden>
            <rect width="3" height="0.67" fill="#009E60" />
            <rect y="0.66" width="3" height="0.67" fill="#FCD116" />
            <rect y="1.33" width="3" height="0.67" fill="#3A75C4" />
          </svg>
          République Gabonaise · Plateforme opérée par GreenLeaves
        </div>
      </aside>

      {/* ── Form ── */}
      <main className="flex flex-1 justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-[520px] animate-fade-up">
          <Link href="/" className="mb-10 flex items-center gap-2.5 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-xl bg-forest-900">
              <Leaf className="size-[18px] text-gold-300" strokeWidth={1.8} />
            </span>
            <span className="font-display text-xl text-forest-900">CarbonTrack</span>
          </Link>

          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">Inscription</p>
          <h1 className="mt-2 font-display text-4xl font-normal tracking-tight text-forest-900">Créer votre compte</h1>
          <p className="mt-2 text-sm text-ink-500">
            Déjà un compte ?{' '}
            <Link href="/login" className="font-semibold text-forest-700 hover:text-gold-600">Se connecter</Link>
          </p>

          {error && (
            <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button type="button" onClick={() => setError('')} className="flex-shrink-0 p-0.5 text-red-400 hover:text-red-600" aria-label="Fermer">
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-10">
            {/* Personal info */}
            <Section n={1} title="Vos informations">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Prénom</label>
                  <div className="relative">
                    <User className={ICON} />
                    <input type="text" value={form.firstName} onChange={e => updateField('firstName', e.target.value)}
                      className={cn(FIELD, 'pl-10')} placeholder="Jean" autoComplete="given-name" required />
                  </div>
                </div>
                <div>
                  <label className={LABEL}>Nom</label>
                  <input type="text" value={form.lastName} onChange={e => updateField('lastName', e.target.value)}
                    className={FIELD} placeholder="Dupont" autoComplete="family-name" required />
                </div>
              </div>

              <div>
                <label className={LABEL}>Email professionnel</label>
                <div className="relative">
                  <Mail className={ICON} />
                  <input type="email" value={form.email} onChange={e => updateField('email', e.target.value)}
                    className={cn(FIELD, 'pl-10')} placeholder="jean.dupont@entreprise.ga" autoComplete="email" required />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL}>Mot de passe</label>
                  <div className="relative">
                    <Lock className={ICON} />
                    <input type="password" value={form.password} onChange={e => updateField('password', e.target.value)}
                      className={cn(FIELD, 'pl-10')} placeholder="Min. 8 caractères" minLength={8} autoComplete="new-password" required />
                  </div>
                </div>
                <div>
                  <label className={LABEL}>Confirmer le mot de passe</label>
                  <div className="relative">
                    <Lock className={ICON} />
                    <input type="password" value={form.confirmPassword} onChange={e => updateField('confirmPassword', e.target.value)}
                      className={cn(FIELD, 'pl-10', mismatch && 'border-red-400 focus:border-red-500 focus:ring-red-100')}
                      placeholder="Ressaisir" minLength={8} autoComplete="new-password" required />
                  </div>
                </div>
              </div>
              {mismatch && (
                <p className="-mt-2 text-xs text-red-600">Les mots de passe ne correspondent pas.</p>
              )}
            </Section>

            {/* Company info */}
            <Section n={2} title="Votre entreprise">
              <div>
                <label className={LABEL}>Nom de l&apos;entreprise</label>
                <div className="relative">
                  <Building2 className={ICON} />
                  <input type="text" value={form.companyName} onChange={e => updateField('companyName', e.target.value)}
                    className={cn(FIELD, 'pl-10')} placeholder="Mon Entreprise" autoComplete="organization" required />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL}>Téléphone</label>
                  <div className="relative">
                    <Phone className={ICON} />
                    <input type="tel" value={form.phone} onChange={e => updateField('phone', e.target.value)}
                      className={cn(FIELD, 'pl-10')} placeholder="+241 07 12 34 56" autoComplete="tel" required />
                  </div>
                </div>
                <div>
                  <label className={LABEL}>
                    RCCM <span className="font-normal text-ink-400">(optionnel)</span>
                  </label>
                  <div className="relative">
                    <Hash className={ICON} />
                    <input type="text" value={form.rccm} onChange={e => updateField('rccm', e.target.value)}
                      className={cn(FIELD, 'pl-10')} placeholder="GA-LBV-RCCM-2024-B-00123" maxLength={50} />
                  </div>
                </div>
              </div>

              <div>
                <label className={LABEL}>Secteur d&apos;activité</label>
                <select value={form.sector} onChange={e => updateField('sector', e.target.value)} className={FIELD} required>
                  <option value="">Choisir un secteur…</option>
                  {sectorGroups.map(g => (
                    <optgroup key={g.group} label={g.group}>
                      {g.options.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Logo upload */}
              <div>
                <label className={LABEL}>
                  Logo de l&apos;entreprise <span className="font-normal text-ink-400">(optionnel)</span>
                </label>

                {logoPreview ? (
                  <div className="flex items-center gap-4 rounded-xl border border-ivory-400 bg-white p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoPreview} alt="Aperçu du logo" className="size-16 rounded-lg border border-ivory-300 bg-ivory-50 object-contain p-1" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-800">{logoFile?.name}</p>
                      <p className="text-xs text-ink-400">{logoFile ? (logoFile.size / 1024).toFixed(0) + ' Ko' : ''}</p>
                    </div>
                    <button type="button" onClick={removeLogo} className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-500" aria-label="Retirer le logo">
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-ivory-400 bg-ivory-50 px-4 py-6 text-ink-500 transition-colors hover:border-forest-300 hover:bg-forest-50/50 hover:text-forest-700"
                  >
                    <span className="flex size-10 items-center justify-center rounded-full border border-ivory-300 bg-white">
                      <Upload className="size-4 text-forest-500" />
                    </span>
                    <span className="text-sm font-semibold">Cliquer pour téléverser le logo</span>
                    <span className="px-4 text-center text-xs text-ink-400">
                      PNG, JPG, WebP — max 2 Mo · recommandé : 500×500 px, fond transparent
                    </span>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </div>
            </Section>

            {/* Legal acceptance — required */}
            <Section n={3} title="Finalisation">
              <label className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                acceptedTerms ? 'border-forest-300 bg-forest-50/60' : 'border-ivory-400 bg-white hover:border-forest-200',
              )}>
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="peer sr-only"
                />
                <span className={cn(
                  'mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-forest-100',
                  acceptedTerms ? 'border-forest-700 bg-forest-700 text-ivory-50' : 'border-ivory-400 bg-white',
                )}>
                  {acceptedTerms && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span className="text-xs leading-relaxed text-ink-600">
                  J&apos;ai lu et j&apos;accepte la{' '}
                  <Link href="/privacy" target="_blank" className="font-semibold text-forest-700 underline hover:text-gold-600">
                    Politique de confidentialité
                  </Link>
                  {' '}et les{' '}
                  <Link href="/conditions-utilisation" target="_blank" className="font-semibold text-forest-700 underline hover:text-gold-600">
                    Conditions Générales d&apos;Utilisation
                  </Link>
                  {' '}de CarbonTrack, alignées sur les principes du Règlement Général sur la Protection des Données (RGPD).
                </span>
              </label>

              <Button type="submit" size="lg" disabled={loading || !acceptedTerms} className="w-full">
                {loading ? 'Création en cours…' : <>Créer mon compte <ArrowRight /></>}
              </Button>
            </Section>
          </form>
        </div>
      </main>
    </div>
  )
}
