'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  Leaf, Mail, Lock, User, Building2, ArrowRight, AlertCircle, Phone, Upload, X,
  FileCheck2, MapPin, ShieldCheck, Check, Hash, Eye, EyeOff, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Select, type SelectGroup } from '@/components/ui/select'
import { cn, fmtSize } from '@/lib/utils'

const STEPS = [
  { icon: FileCheck2,  title: 'Créez votre bilan GES',     text: 'Saisissez vos données par site, scopes 1, 2 et 3.' },
  { icon: MapPin,      title: 'Audit terrain accrédité',   text: 'Un expert GreenLeaves vérifie vos données sur site.' },
  { icon: ShieldCheck, title: 'Certificat délivré par le CNC', text: 'L’expert dépose votre dossier complet auprès du CNC.' },
]

const SECTOR_GROUPS: SelectGroup[] = [
  {
    label: 'Ressources naturelles & énergie',
    options: [
      { value: 'petrole_gaz',      label: 'Pétrole & gaz' },
      { value: 'mines',            label: 'Mines & extraction minière' },
      { value: 'foresterie',       label: 'Foresterie, bois & papier' },
      { value: 'agriculture',      label: 'Agriculture & agro-industrie' },
      { value: 'peche',            label: 'Pêche & aquaculture' },
      { value: 'eau',              label: 'Eau & assainissement' },
      { value: 'energie',          label: 'Énergie & utilities' },
    ],
  },
  {
    label: 'Industrie & production',
    options: [
      { value: 'industrie',        label: 'Industrie manufacturière' },
      { value: 'construction',     label: 'Construction & BTP' },
      { value: 'chimie',           label: 'Chimie & pétrochimie' },
      { value: 'agroalimentaire',  label: 'Agroalimentaire & boissons' },
      { value: 'emballage',        label: 'Imprimerie & emballage' },
    ],
  },
  {
    label: 'Services & tertiaire',
    options: [
      { value: 'commerce',         label: 'Commerce & distribution' },
      { value: 'transport',        label: 'Transport & logistique' },
      { value: 'banque',           label: 'Finance, banque & assurance' },
      { value: 'telecom',          label: 'Télécommunications' },
      { value: 'tech',             label: 'Technologies & numérique' },
      { value: 'sante',            label: 'Santé & pharmaceutique' },
      { value: 'education',        label: 'Éducation & formation' },
      { value: 'immobilier',       label: 'Immobilier & foncier' },
      { value: 'tourisme',         label: 'Tourisme, hôtellerie & restauration' },
      { value: 'medias',           label: 'Médias & communication' },
    ],
  },
  {
    label: 'Secteur public & organisations',
    options: [
      { value: 'administration',   label: 'Administrations & services publics' },
      { value: 'ong',              label: 'ONG & associations' },
      { value: 'organisations_int',label: 'Organisations internationales' },
    ],
  },
  { label: 'Autre', options: [{ value: 'autre', label: 'Autre secteur' }] },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 0–4. The server only enforces ≥ 8 characters; the meter nudges towards better passwords. */
function passwordScore(p: string) {
  if (p.length < 8) return 0
  let s = 1
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 14) s++
  return Math.min(s, 4)
}
const STRENGTH = [
  { label: 'Trop court', tone: 'text-red-600', bar: 'bg-red-500' },
  { label: 'Faible', tone: 'text-amber-700', bar: 'bg-amber-500' },
  { label: 'Correct', tone: 'text-gold-700', bar: 'bg-gold-500' },
  { label: 'Bon', tone: 'text-forest-600', bar: 'bg-forest-500' },
  { label: 'Excellent', tone: 'text-forest-700', bar: 'bg-forest-700' },
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

type FormKey = 'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword' | 'companyName' | 'phone' | 'rccm' | 'sector'

export default function RegisterPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<Record<FormKey, string>>({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    companyName: '', phone: '', rccm: '', sector: '',
  })
  const [touched, setTouched] = useState<Partial<Record<FormKey, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoError, setLogoError] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState('')
  const [emailTaken, setEmailTaken] = useState(false)
  const [loading, setLoading] = useState(false)

  const update = (field: FormKey, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (field === 'email') setEmailTaken(false)
  }
  const blur = (field: FormKey) => () => setTouched(t => ({ ...t, [field]: true }))
  const show = (field: FormKey) => submitted || !!touched[field]

  const errors: Partial<Record<FormKey, string>> = {
    firstName: !form.firstName.trim() ? 'Indiquez votre prénom.' : undefined,
    lastName: !form.lastName.trim() ? 'Indiquez votre nom.' : undefined,
    email: !form.email.trim() ? 'Indiquez votre email professionnel.'
      : !EMAIL_RE.test(form.email.trim()) ? 'Adresse email invalide.'
      : emailTaken ? 'Un compte existe déjà avec cet email.' : undefined,
    password: form.password.length < 8 ? 'Au moins 8 caractères.' : form.password.length > 128 ? '128 caractères maximum.' : undefined,
    confirmPassword: !form.confirmPassword ? 'Confirmez votre mot de passe.'
      : form.confirmPassword !== form.password ? 'Les mots de passe ne correspondent pas.' : undefined,
    companyName: !form.companyName.trim() ? 'Indiquez le nom de l’entreprise.' : undefined,
    phone: !form.phone.trim() ? 'Indiquez un numéro de téléphone.' : undefined,
    sector: !form.sector ? 'Choisissez votre secteur d’activité.' : undefined,
  }
  const err = (field: FormKey) => (show(field) ? errors[field] : undefined)
  const hasErrors = Object.values(errors).some(Boolean)
  const score = passwordScore(form.password)

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setLogoError('Format non pris en charge : PNG, JPG ou WebP.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Logo trop lourd (2 Mo maximum).')
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setLogoError('')
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (hasErrors || !acceptedTerms) {
      setError(!acceptedTerms && !hasErrors
        ? 'Acceptez la Politique de confidentialité et les CGU pour continuer.'
        : 'Certains champs sont à compléter ou à corriger.')
      return
    }
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          email: form.email.trim(),
          acceptedTermsVersion: '1.0',
          acceptedAt: new Date().toISOString(),
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 409) setEmailTaken(true)
        setError(
          res.status === 429
            ? (data.error || 'Trop de tentatives. Réessayez plus tard.')
            : data.error || 'L’inscription a échoué. Réessayez.',
        )
        setLoading(false)
        return
      }

      // The account exists at this point: a failed logo upload must not block access
      if (logoFile) {
        const fd = new FormData()
        fd.append('logo', logoFile)
        const up = await fetch('/api/company/logo', { method: 'POST', body: fd }).catch(() => null)
        if (!up?.ok) {
          toast.error('Compte créé, mais le logo n’a pas pu être enregistré.', { description: 'Vous pourrez l’ajouter depuis vos paramètres.' })
          await new Promise(r => setTimeout(r, 1800))
        }
      }

      window.location.href = '/dashboard'
    } catch {
      setError('Impossible de joindre le serveur. Vérifiez votre connexion.')
      setLoading(false)
    }
  }

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
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-300">Espace entreprise</p>
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
                  <span className="block text-sm text-forest-200">{p.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-forest-200">
          <svg className="h-2.5 w-4 rounded-[2px]" viewBox="0 0 3 2" aria-hidden>
            <rect width="3" height="0.67" fill="#009E60" />
            <rect y="0.66" width="3" height="0.67" fill="#FCD116" />
            <rect y="1.33" width="3" height="0.67" fill="#3A75C4" />
          </svg>
          République gabonaise · Plateforme opérée par GreenLeaves
        </div>
      </aside>

      {/* ── Form ── */}
      <main className="flex flex-1 justify-center px-5 py-10 sm:px-12 sm:py-12">
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
              <span className="flex-1">
                {error}
                {emailTaken && (
                  <> <Link href="/login" className="font-semibold underline">Se connecter</Link></>
                )}
              </span>
              <button type="button" onClick={() => setError('')} className="flex-shrink-0 p-0.5 text-red-500 hover:text-red-700" aria-label="Fermer le message">
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-10">
            <fieldset disabled={loading} className="space-y-10">
              <Section n={1} title="Vos informations">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Prénom" error={err('firstName')}>
                    {p => <Input {...p} icon={User} inputSize="lg" value={form.firstName} onChange={e => update('firstName', e.target.value)} onBlur={blur('firstName')} placeholder="Jean" autoComplete="given-name" maxLength={100} />}
                  </Field>
                  <Field label="Nom" error={err('lastName')}>
                    {p => <Input {...p} inputSize="lg" value={form.lastName} onChange={e => update('lastName', e.target.value)} onBlur={blur('lastName')} placeholder="Dupont" autoComplete="family-name" maxLength={100} />}
                  </Field>
                </div>

                <Field label="Email professionnel" error={err('email') ?? (emailTaken ? errors.email : undefined)}>
                  {p => <Input {...p} icon={Mail} inputSize="lg" type="email" value={form.email} onChange={e => update('email', e.target.value)} onBlur={blur('email')} placeholder="jean.dupont@entreprise.ga" autoComplete="email" maxLength={255} />}
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Mot de passe" error={err('password')}>
                    {p => (
                      <div>
                        <div className="relative">
                          <Input
                            {...p} icon={Lock} inputSize="lg" className="pr-11"
                            type={showPassword ? 'text' : 'password'}
                            value={form.password} onChange={e => update('password', e.target.value)} onBlur={blur('password')}
                            placeholder="8 caractères minimum" autoComplete="new-password" maxLength={128}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ivory-100 hover:text-ink-800"
                            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                            aria-pressed={showPassword}
                          >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                        {form.password && (
                          <div className="mt-2" aria-live="polite">
                            <div className="flex gap-1" aria-hidden>
                              {[1, 2, 3, 4].map(i => (
                                <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= score ? STRENGTH[score].bar : 'bg-ivory-300')} />
                              ))}
                            </div>
                            <p className={cn('mt-1 text-xs font-medium', STRENGTH[score].tone)}>
                              Sécurité : {STRENGTH[score].label}
                              {score > 0 && score < 3 && <span className="font-normal text-ink-500"> · ajoutez majuscules, chiffres ou symboles</span>}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </Field>
                  <Field label="Confirmer le mot de passe" error={err('confirmPassword') ?? (form.confirmPassword && form.confirmPassword !== form.password ? errors.confirmPassword : undefined)}>
                    {p => (
                      <Input
                        {...p} icon={Lock} inputSize="lg"
                        type={showPassword ? 'text' : 'password'}
                        value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} onBlur={blur('confirmPassword')}
                        placeholder="Ressaisir" autoComplete="new-password" maxLength={128}
                      />
                    )}
                  </Field>
                </div>
              </Section>

              <Section n={2} title="Votre entreprise">
                <Field label="Nom de l’entreprise" error={err('companyName')}>
                  {p => <Input {...p} icon={Building2} inputSize="lg" value={form.companyName} onChange={e => update('companyName', e.target.value)} onBlur={blur('companyName')} placeholder="Raison sociale" autoComplete="organization" maxLength={255} />}
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Téléphone" error={err('phone')}>
                    {p => <Input {...p} icon={Phone} inputSize="lg" type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} onBlur={blur('phone')} placeholder="+241 07 12 34 56" autoComplete="tel" maxLength={30} />}
                  </Field>
                  <Field label="RCCM" optional>
                    {p => <Input {...p} icon={Hash} inputSize="lg" value={form.rccm} onChange={e => update('rccm', e.target.value)} placeholder="GA-LBV-01-2024-B12-00123" maxLength={100} />}
                  </Field>
                </div>

                <Field label="Secteur d’activité" error={err('sector')}>
                  {p => (
                    <Select
                      id={p.id} size="lg" value={form.sector} invalid={!!err('sector')}
                      onValueChange={v => { update('sector', v); setTouched(t => ({ ...t, sector: true })) }}
                      groups={SECTOR_GROUPS} placeholder="Choisir un secteur…" disabled={loading}
                    />
                  )}
                </Field>

                <div>
                  <p className="mb-1.5 text-[13px] font-semibold text-ink-700">
                    Logo de l’entreprise <span className="font-normal text-ink-400">(optionnel)</span>
                  </p>

                  {logoPreview ? (
                    <div className="flex items-center gap-4 rounded-xl border border-ivory-400 bg-white p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logoPreview} alt="Aperçu du logo" className="size-16 rounded-lg border border-ivory-300 bg-ivory-50 object-contain p-1" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-800">{logoFile?.name}</p>
                        <p className="text-xs text-ink-500">{logoFile ? fmtSize(logoFile.size) : ''}</p>
                      </div>
                      <button type="button" onClick={removeLogo} className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-red-50 hover:text-red-600" aria-label="Retirer le logo">
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-ivory-400 bg-ivory-50 px-4 py-6 text-ink-600 transition-colors hover:border-forest-300 hover:bg-forest-50/50 hover:text-forest-700"
                    >
                      <span className="flex size-10 items-center justify-center rounded-full border border-ivory-300 bg-white">
                        <Upload className="size-4 text-forest-500" />
                      </span>
                      <span className="text-sm font-semibold">Téléverser le logo</span>
                      <span className="px-4 text-center text-xs text-ink-500">
                        PNG, JPG ou WebP · 2 Mo maximum · idéalement 500 × 500 px, fond transparent
                      </span>
                    </button>
                  )}
                  {logoError && <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">{logoError}</p>}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleLogoChange}
                    className="hidden"
                    aria-label="Logo de l’entreprise"
                  />
                </div>
              </Section>

              <Section n={3} title="Finalisation">
                <label className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                  acceptedTerms ? 'border-forest-300 bg-forest-50/60'
                    : submitted ? 'border-red-300 bg-red-50/40' : 'border-ivory-400 bg-white hover:border-forest-200',
                )}>
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => { setAcceptedTerms(e.target.checked); if (e.target.checked && !hasErrors) setError('') }}
                    className="peer sr-only"
                  />
                  <span className={cn(
                    'mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-forest-100',
                    acceptedTerms ? 'border-forest-700 bg-forest-700 text-ivory-50' : 'border-ivory-400 bg-white',
                  )}>
                    {acceptedTerms && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  <span className="text-xs leading-relaxed text-ink-600">
                    J’ai lu et j’accepte la{' '}
                    <Link href="/privacy" target="_blank" className="font-semibold text-forest-700 underline hover:text-gold-600">
                      Politique de confidentialité
                    </Link>
                    {' '}et les{' '}
                    <Link href="/conditions-utilisation" target="_blank" className="font-semibold text-forest-700 underline hover:text-gold-600">
                      Conditions générales d’utilisation
                    </Link>
                    {' '}de CarbonTrack, alignées sur les principes du Règlement général sur la protection des données (RGPD).
                  </span>
                </label>

                <Button
                  type="submit"
                  size="lg"
                  disabled={loading || !acceptedTerms}
                  aria-disabled={loading || !acceptedTerms}
                  className={cn(
                    'w-full disabled:opacity-100',
                    loading ? 'disabled:cursor-wait' : 'disabled:bg-ivory-300 disabled:text-ink-500 disabled:shadow-none',
                  )}
                >
                  {loading
                    ? <><Loader2 className="animate-spin" /> Création de votre compte…</>
                    : <>Créer mon compte <ArrowRight /></>}
                </Button>
                {!acceptedTerms && !loading && (
                  <p className="-mt-1 text-center text-xs text-ink-500">Acceptez les conditions ci-dessus pour créer votre compte.</p>
                )}
              </Section>
            </fieldset>
          </form>
        </div>
      </main>
    </div>
  )
}
