'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Building2, Eye, EyeOff, FileCheck2, ImagePlus, KeyRound, Loader2, Lock, Mail, Phone, ShieldCheck, Trash2, UploadCloud, UserRound,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Select, type SelectGroup } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { SECTOR_LABELS } from '@/lib/sectors'
import { cn, fmtDate } from '@/lib/utils'

type Profile = { email: string; firstName: string; lastName: string; phone: string; createdAt: string | null; termsVersion: string | null; termsAcceptedAt: string | null }
type Company = { name: string; rccm: string; sector: string; logoUrl: string | null; identityLocked: boolean }

// Same grouping as the registration form
const SECTOR_GROUP_KEYS: [string, string[]][] = [
  ['Ressources naturelles & Énergie', ['petrole_gaz', 'mines', 'foresterie', 'agriculture', 'peche', 'eau', 'energie']],
  ['Industrie & Production', ['industrie', 'construction', 'chimie', 'agroalimentaire', 'emballage']],
  ['Services & Tertiaire', ['commerce', 'transport', 'banque', 'telecom', 'tech', 'sante', 'education', 'immobilier', 'tourisme', 'medias']],
  ['Secteur public & Organisations', ['administration', 'ong', 'organisations_int']],
  ['Autre', ['autre']],
]
const SECTOR_GROUPS: SelectGroup[] = SECTOR_GROUP_KEYS.map(([label, keys]) => ({
  label,
  options: keys.filter(k => k in SECTOR_LABELS).map(k => ({ value: k, label: SECTOR_LABELS[k] })),
}))

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const LOGO_MAX = 2 * 1024 * 1024

const notifyShell = () => window.dispatchEvent(new Event('ct:company-updated'))

async function send<T>(url: string, method: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Une erreur est survenue')
  return data as T
}

/* ── Layout ─────────────────────────────────────────────────────────────── */

function Section({
  icon: Icon, title, description, children, footer, id,
}: {
  icon: React.ElementType; title: string; description: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; id: string
}) {
  return (
    <section aria-labelledby={id} className="grid gap-5 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:gap-10">
      <div>
        <div className="flex items-center gap-3 lg:block">
          <span className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl border border-ivory-300 bg-white text-forest-700 shadow-soft lg:mb-3">
            <Icon className="size-[18px]" strokeWidth={1.7} />
          </span>
          <h2 id={id} className="font-display text-xl text-forest-900">{title}</h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-500 lg:mt-1.5">{description}</p>
      </div>
      <Card className="min-w-0 overflow-hidden">
        <div className="space-y-5 p-5 sm:p-6">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-3 border-t border-ivory-200 bg-ivory-50/60 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-end sm:px-6">
            {footer}
          </div>
        )}
      </Card>
    </section>
  )
}

function SaveBar({ dirty, saving, onReset, label = 'Enregistrer' }: { dirty: boolean; saving: boolean; onReset: () => void; label?: string }) {
  return (
    <>
      {dirty && !saving && <span className="mr-auto hidden text-xs text-ink-400 sm:block">Modifications non enregistrées</span>}
      <Button type="button" variant="ghost" onClick={onReset} disabled={!dirty || saving}>Annuler</Button>
      <Button type="submit" disabled={!dirty || saving}>
        {saving && <Loader2 className="animate-spin" />}
        {saving ? 'Enregistrement…' : label}
      </Button>
    </>
  )
}

function SectionSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr] lg:gap-10">
      <div className="space-y-3"><Skeleton className="size-10" /><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-56" /></div>
      <Card className="space-y-5 p-6">
        <div className="grid gap-5 sm:grid-cols-2"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
        <Skeleton className="h-16" />
      </Card>
    </div>
  )
}

/* ── Profil ─────────────────────────────────────────────────────────────── */

function ProfileSection({ profile, onSaved }: { profile: Profile; onSaved: (p: Profile) => void }) {
  const initial = { firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone }
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dirty = form.firstName !== initial.firstName || form.lastName !== initial.lastName || form.phone !== initial.phone

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.firstName.trim() || !form.lastName.trim()) { setError('Le prénom et le nom sont requis'); return }
    setSaving(true)
    try {
      const p = await send<Profile>('/api/account/profile', 'PATCH', form)
      onSaved(p)
      setForm({ firstName: p.firstName, lastName: p.lastName, phone: p.phone })
      notifyShell()
      toast.success('Profil mis à jour')
    } catch (err) {
      setError((err as Error).message)
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} noValidate>
      <Section
        id="profil" icon={UserRound} title="Profil"
        description="Vos coordonnées de contact. Elles sont utilisées par l’équipe GreenLeaves et l’expert chargé de votre audit."
        footer={<SaveBar dirty={dirty} saving={saving} onReset={() => { setForm(initial); setError('') }} />}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Prénom">
            {p => <Input {...p} value={form.firstName} maxLength={100} autoComplete="given-name" onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />}
          </Field>
          <Field label="Nom">
            {p => <Input {...p} value={form.lastName} maxLength={100} autoComplete="family-name" onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />}
          </Field>
        </div>
        <Field label="Téléphone" optional hint="Format international recommandé, ex. +241 77 00 00 00">
          {p => <Input {...p} type="tel" icon={Phone} value={form.phone} maxLength={30} autoComplete="tel" onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />}
        </Field>
        <Field label="Adresse e-mail" hint="Identifiant de connexion. Contactez le support pour le modifier.">
          {p => <Input {...p} icon={Mail} value={profile.email} readOnly disabled />}
        </Field>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}
      </Section>
    </form>
  )
}

/* ── Entreprise ─────────────────────────────────────────────────────────── */

function LogoPicker({ company, onChange }: { company: Company; onChange: (logoUrl: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'upload' | 'delete' | null>(null)
  const [drag, setDrag] = useState(false)

  const upload = async (file: File) => {
    if (!LOGO_TYPES.includes(file.type)) { toast.error('Format non pris en charge : PNG, JPG ou WebP uniquement'); return }
    if (file.size > LOGO_MAX) { toast.error('Le logo ne doit pas dépasser 2 Mo'); return }
    setBusy('upload')
    try {
      const fd = new FormData()
      fd.append('logo', file)
      const res = await fetch('/api/company/logo', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erreur lors du téléversement')
      onChange(data.logoUrl)
      notifyShell()
      toast.success('Logo mis à jour')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = async () => {
    setBusy('delete')
    try {
      const res = await fetch('/api/company/logo', { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Erreur serveur')
      onChange(null)
      notifyShell()
      toast.success('Logo supprimé')
    } catch (err) {
      toast.error((err as Error).message)
    } finally { setBusy(null) }
  }

  const initials = company.name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '—'

  return (
    <div>
      <p className="mb-1.5 text-[13px] font-semibold text-ink-700">Logo</p>
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) upload(f) }}
        className={cn(
          'flex flex-col gap-4 rounded-2xl border border-dashed p-4 transition-colors sm:flex-row sm:items-center',
          drag ? 'border-gold-500 bg-gold-50/60' : 'border-ivory-400 bg-ivory-50/50',
        )}
      >
        <div className="relative flex size-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-ivory-300 bg-white shadow-soft">
          {company.logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={company.logoUrl} alt={`Logo de ${company.name}`} className="size-full object-contain p-2" />
            : <span className="font-display text-2xl text-forest-700">{initials}</span>}
          {busy === 'upload' && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/80"><Loader2 className="size-5 animate-spin text-forest-700" /></span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-800">
            <span className="hidden sm:inline">Glissez une image ici ou choisissez un fichier</span>
            <span className="sm:hidden">Choisissez un fichier</span>
          </p>
          <p className="mt-0.5 text-xs text-ink-400">PNG, JPG ou WebP · 2 Mo maximum · fond transparent idéal</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={!!busy}>
              {company.logoUrl ? <UploadCloud /> : <ImagePlus />}
              {company.logoUrl ? 'Remplacer' : 'Ajouter un logo'}
            </Button>
            {company.logoUrl && (
              <Button type="button" variant="ghost" size="sm" onClick={remove} disabled={!!busy} className="text-red-700 hover:bg-red-50 hover:text-red-800">
                {busy === 'delete' ? <Loader2 className="animate-spin" /> : <Trash2 />} Supprimer
              </Button>
            )}
          </div>
        </div>
        <input
          ref={inputRef} type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-label="Fichier du logo"
          onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }}
        />
      </div>
    </div>
  )
}

function CompanySection({ company, onSaved }: { company: Company; onSaved: (c: Company) => void }) {
  const initial = { name: company.name, rccm: company.rccm, sector: company.sector }
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dirty = form.name !== initial.name || form.rccm !== initial.rccm || form.sector !== initial.sector
  const locked = company.identityLocked

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('La raison sociale est requise'); return }
    setSaving(true)
    try {
      const c = await send<Company>('/api/account/company', 'PATCH', form)
      onSaved(c)
      setForm({ name: c.name, rccm: c.rccm, sector: c.sector })
      notifyShell()
      toast.success('Informations de l’entreprise mises à jour')
    } catch (err) {
      setError((err as Error).message)
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} noValidate>
      <Section
        id="entreprise" icon={Building2} title="Entreprise"
        description="Identité de votre organisation telle qu’elle figure sur vos rapports, le dossier remis au CNC et votre certificat."
        footer={<SaveBar dirty={dirty} saving={saving} onReset={() => { setForm(initial); setError('') }} />}
      >
        <LogoPicker company={company} onChange={logoUrl => onSaved({ ...company, logoUrl })} />
        {locked && (
          <div className="flex gap-3 rounded-xl border border-gold-200 bg-gold-50/70 px-3.5 py-3 text-sm text-gold-700">
            <Lock className="mt-0.5 size-4 flex-shrink-0" />
            <p>Une certification est en cours : la raison sociale et le RCCM sont verrouillés pour rester conformes au dossier audité. Contactez le support pour toute correction.</p>
          </div>
        )}
        <Field label="Raison sociale">
          {p => <Input {...p} value={form.name} maxLength={255} disabled={locked} autoComplete="organization" onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="RCCM" optional hint="Registre du commerce et du crédit mobilier">
            {p => <Input {...p} value={form.rccm} maxLength={50} disabled={locked} onChange={e => setForm(f => ({ ...f, rccm: e.target.value }))} />}
          </Field>
          <Field label="Secteur d’activité">
            {p => (
              <Select
                id={p.id} value={form.sector} groups={SECTOR_GROUPS} placeholder="Choisir un secteur"
                onValueChange={v => setForm(f => ({ ...f, sector: v }))}
              />
            )}
          </Field>
        </div>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}
      </Section>
    </form>
  )
}

/* ── Sécurité ───────────────────────────────────────────────────────────── */

function strength(pw: string) {
  if (!pw) return { score: 0, label: '', tone: '' }
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  if (pw.length < 8) return { score: 1, label: 'Trop court · 8 caractères minimum', tone: 'bg-red-500 text-red-700' }
  if (s <= 2) return { score: 2, label: 'Faible', tone: 'bg-amber-500 text-amber-700' }
  if (s <= 3) return { score: 3, label: 'Correct', tone: 'bg-gold-500 text-gold-700' }
  return { score: 4, label: 'Robuste', tone: 'bg-forest-600 text-forest-700' }
}

function PasswordInput({ fieldProps, value, onChange, autoComplete }: {
  fieldProps: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }
  value: string; onChange: (v: string) => void; autoComplete: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input {...fieldProps} type={show ? 'text' : 'password'} icon={KeyRound} value={value} maxLength={128} autoComplete={autoComplete} onChange={e => onChange(e.target.value)} className="pr-11" />
      <button
        type="button" onClick={() => setShow(s => !s)}
        className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ivory-100 hover:text-forest-900"
        aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={show}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

function SecuritySection() {
  const empty = { current: '', next: '', confirm: '' }
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const st = strength(form.next)
  const mismatch = !!form.confirm && form.confirm !== form.next
  const dirty = !!(form.current || form.next || form.confirm)
  const ready = !!form.current && form.next.length >= 8 && form.next === form.confirm

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!ready) { setError(form.next.length < 8 ? 'Le nouveau mot de passe doit contenir au moins 8 caractères' : 'Les mots de passe ne correspondent pas'); return }
    setSaving(true)
    try {
      await send('/api/account/password', 'POST', { currentPassword: form.current, newPassword: form.next })
      setForm(empty)
      toast.success('Mot de passe modifié')
    } catch (err) {
      setError((err as Error).message)
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} noValidate>
      <Section
        id="securite" icon={ShieldCheck} title="Sécurité"
        description="Choisissez un mot de passe unique d’au moins 8 caractères, idéalement une phrase longue mêlant chiffres et symboles."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => { setForm(empty); setError('') }} disabled={!dirty || saving}>Annuler</Button>
            <Button type="submit" disabled={!ready || saving}>
              {saving && <Loader2 className="animate-spin" />}
              {saving ? 'Modification…' : 'Modifier le mot de passe'}
            </Button>
          </>
        }
      >
        <Field label="Mot de passe actuel">
          {p => <PasswordInput fieldProps={p} value={form.current} autoComplete="current-password" onChange={v => setForm(f => ({ ...f, current: v }))} />}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Field label="Nouveau mot de passe">
              {p => <PasswordInput fieldProps={p} value={form.next} autoComplete="new-password" onChange={v => setForm(f => ({ ...f, next: v }))} />}
            </Field>
            {form.next && (
              <div className="mt-2" aria-live="polite">
                <div className="flex gap-1" aria-hidden>
                  {[1, 2, 3, 4].map(i => (
                    <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= st.score ? st.tone.split(' ')[0] : 'bg-ivory-300')} />
                  ))}
                </div>
                <p className={cn('mt-1.5 text-xs font-medium', st.tone.split(' ')[1])}>Sécurité : {st.label}</p>
              </div>
            )}
          </div>
          <Field label="Confirmer le nouveau mot de passe" error={mismatch ? 'Les mots de passe ne correspondent pas' : undefined}>
            {p => <PasswordInput fieldProps={p} value={form.confirm} autoComplete="new-password" onChange={v => setForm(f => ({ ...f, confirm: v }))} />}
          </Field>
        </div>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}
      </Section>
    </form>
  )
}

/* ── Conformité ─────────────────────────────────────────────────────────── */

function ComplianceSection({ profile }: { profile: Profile }) {
  return (
    <Section
      id="conformite" icon={FileCheck2} title="Conformité"
      description="Les conditions acceptées lors de la création de votre compte et la manière dont nous traitons vos données."
    >
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-ivory-300 bg-ivory-50/60 p-4">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-600">Conditions d’utilisation</dt>
          <dd className="mt-1.5 text-sm text-ink-800">
            {profile.termsAcceptedAt
              ? <>Version {profile.termsVersion ?? '—'} acceptée le {fmtDate(profile.termsAcceptedAt)}</>
              : <span className="text-ink-500">Acceptées à l’inscription (date non enregistrée)</span>}
          </dd>
        </div>
        <div className="rounded-xl border border-ivory-300 bg-ivory-50/60 p-4">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-600">Compte créé</dt>
          <dd className="mt-1.5 text-sm text-ink-800">{profile.createdAt ? `Le ${fmtDate(profile.createdAt)}` : '—'}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm"><Link href="/conditions-utilisation" target="_blank">Conditions d’utilisation</Link></Button>
        <Button asChild variant="outline" size="sm"><Link href="/privacy" target="_blank">Politique de confidentialité</Link></Button>
      </div>
    </Section>
  )
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    setFailed(false)
    try {
      const [p, c] = await Promise.all([fetch('/api/account/profile'), fetch('/api/account/company')])
      if (!p.ok || !c.ok) throw new Error()
      setProfile(await p.json())
      setCompany(await c.json())
    } catch { setFailed(true) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <PageHeader eyebrow="Compte" title="Paramètres" description="Gérez votre profil, l’identité de votre entreprise et la sécurité de votre accès." />

      {failed ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <p className="font-display text-lg text-forest-900">Impossible de charger vos paramètres</p>
          <p className="text-sm text-ink-500">Vérifiez votre connexion puis réessayez.</p>
          <Button variant="outline" onClick={load}>Réessayer</Button>
        </Card>
      ) : !profile || !company ? (
        <div className="space-y-10" aria-busy="true" aria-label="Chargement"><SectionSkeleton /><SectionSkeleton /></div>
      ) : (
        <div className="divide-y divide-ivory-300/80 [&>*]:py-8 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <ProfileSection key={`p-${profile.firstName}-${profile.lastName}-${profile.phone}`} profile={profile} onSaved={setProfile} />
          <CompanySection key={`c-${company.name}-${company.rccm}-${company.sector}`} company={company} onSaved={setCompany} />
          <SecuritySection />
          <ComplianceSection profile={profile} />
        </div>
      )}
    </div>
  )
}
