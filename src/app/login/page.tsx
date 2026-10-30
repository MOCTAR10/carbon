'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Leaf, Mail, Lock, ArrowRight, AlertCircle, Loader2, X, Eye, EyeOff, ShieldCheck, FileCheck2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'

const TRUST_POINTS = [
  { icon: FileCheck2,  title: 'Bilan GES conforme',       text: 'ISO 14064-1 et GHG Protocol, scopes 1, 2 et 3.' },
  { icon: MapPin,      title: 'Audit terrain accrédité',  text: 'Un expert GreenLeaves vérifie vos données sur site.' },
  { icon: ShieldCheck, title: 'Certificat DGEPN',         text: 'L’expert dépose votre dossier à la DGEPN, qui délivre le certificat.' },
]

type Who = { firstName: string; lastName: string; space: string; logoUrl: string | null }

const inputCls = 'h-12 w-full rounded-xl border border-ivory-400 bg-white pl-10 text-sm text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-forest-500 focus:ring-4 focus:ring-forest-100 disabled:opacity-60'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [who, setWho] = useState<Who | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Step 1: identify the account from the e-mail alone
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Adresse e-mail introuvable'); return }
      setWho(data)
    } catch {
      setError('Impossible de joindre le serveur. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }

  const changeEmail = () => { setWho(null); setPassword(''); setError('') }
  const initials = who ? (((who.firstName[0] ?? '') + (who.lastName[0] ?? '')).toUpperCase() || email.charAt(0).toUpperCase()) : ''

  // Step 2: password
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(
          res.status === 429
            ? (data.error || 'Trop de tentatives. Patientez quelques minutes avant de réessayer.')
            : res.status === 401 ? 'Mot de passe incorrect.' : data.error || 'Connexion impossible',
        )
        setLoading(false)
        return
      }

      // Hard redirect — forces a full page load with the new cookie set
      if (data.role === 'admin')        window.location.href = '/admin'
      else if (data.role === 'expert')  window.location.href = '/expert'
      else if (data.role === 'partner') window.location.href = '/partner'
      else                              window.location.href = '/dashboard'
    } catch {
      setError('Impossible de joindre le serveur. Vérifiez votre connexion.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-ivory-100 font-sans text-ink-800">

      {/* ── Brand panel ── */}
      <aside className="relative hidden w-[46%] max-w-[640px] flex-col justify-between overflow-hidden bg-forest-900 bg-forest-grain p-12 text-ivory-50 lg:flex">
        <div className="pointer-events-none absolute -bottom-40 -right-40 size-[520px] rounded-full border border-gold-400/10" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 size-[360px] rounded-full border border-gold-400/10" />

        <Link href="/" className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-gold-500/15 ring-1 ring-gold-400/40">
            <Leaf className="size-5 text-gold-300" strokeWidth={1.8} />
          </span>
          <span className="font-display text-2xl tracking-tight">CarbonTrack</span>
        </Link>

        <div className="relative">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-300">Bilan carbone &amp; certification</p>
          <h2 className="font-display text-5xl font-light leading-[1.08] tracking-tight">
            Mesurez, auditez,<br />
            <em className="font-normal text-gold-200">certifiez</em> votre empreinte.
          </h2>
          <ul className="mt-10 space-y-5">
            {TRUST_POINTS.map(p => (
              <li key={p.title} className="flex gap-4">
                <span className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                  <p.icon className="size-[18px] text-gold-300" strokeWidth={1.7} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ivory-50">{p.title}</span>
                  <span className="block text-sm text-forest-200">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
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
      <main className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[400px] animate-fade-up">
          <Link href="/" className="mb-10 flex items-center gap-2.5 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-xl bg-forest-900">
              <Leaf className="size-[18px] text-gold-300" strokeWidth={1.8} />
            </span>
            <span className="font-display text-xl text-forest-900">CarbonTrack</span>
          </Link>

          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">Espace sécurisé</p>
          <h1 className="mt-2 font-display text-4xl font-normal tracking-tight text-forest-900">Se connecter</h1>
          <p className="mt-2 text-sm text-ink-500">
            {who ? 'Saisissez votre mot de passe pour continuer.' : 'Saisissez votre adresse e-mail professionnelle.'}
          </p>

          {error && (
            <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError('')} className="flex-shrink-0 p-0.5 text-red-400 hover:text-red-600" aria-label="Fermer">
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {!who ? (
            <form method="post" onSubmit={handleLookup} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-ink-700">Adresse email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="username"
                    autoFocus
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    className={inputCls + ' pr-4'}
                    placeholder="vous@entreprise.ga"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <Button type="submit" size="lg" disabled={loading} className="w-full">
                {loading
                  ? <><Loader2 className="animate-spin" /> Vérification…</>
                  : <>Continuer <ArrowRight /></>}
              </Button>
            </form>
          ) : (
            <form method="post" onSubmit={handleSubmit} className="mt-8 space-y-5">
              {/* Who is signing in */}
              <div className="flex items-center gap-3.5 rounded-2xl border border-ivory-300 bg-white p-4 shadow-sm">
                {who.logoUrl
                  ? <img src={who.logoUrl} alt="" className="size-12 flex-shrink-0 rounded-xl border border-ivory-300 object-contain p-1" />
                  : <span className="flex size-12 flex-shrink-0 items-center justify-center rounded-xl bg-forest-900 font-display text-lg text-gold-200">{initials}</span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-forest-900">{who.space}</span>
                  <span className="block truncate text-sm text-ink-600">{[who.firstName, who.lastName].filter(Boolean).join(' ') || email}</span>
                  <span className="block truncate text-xs text-ink-400">{email}</span>
                </span>
                <button type="button" onClick={changeEmail} className="flex-shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-forest-700 hover:bg-ivory-100">
                  Modifier
                </button>
              </div>
              {/* Lets password managers pair the password with the e-mail */}
              <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />

              <div>
                <label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold text-ink-700">Mot de passe</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    autoFocus
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    className={inputCls + ' pr-11'}
                    placeholder="Votre mot de passe"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ivory-100 hover:text-ink-700"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" size="lg" disabled={loading} className="w-full">
                {loading
                  ? <><Loader2 className="animate-spin" /> Connexion en cours…</>
                  : <>Se connecter <ArrowRight /></>}
              </Button>
            </form>
          )}

          <div className="my-8 flex items-center gap-4">
            <span className="h-px flex-1 bg-ivory-300" />
            <span className="text-xs text-ink-400">Nouveau sur CarbonTrack ?</span>
            <span className="h-px flex-1 bg-ivory-300" />
          </div>

          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/register">Créer un compte entreprise</Link>
          </Button>

          <p className="mt-10 text-center text-xs text-ink-400">
            En vous connectant, vous acceptez les{' '}
            <Link href="/conditions-utilisation" className="font-medium text-forest-700 hover:underline">conditions d’utilisation</Link>
            {' '}et la{' '}
            <Link href="/privacy" className="font-medium text-forest-700 hover:underline">politique de confidentialité</Link>.
          </p>
        </div>
      </main>
    </div>
  )
}
