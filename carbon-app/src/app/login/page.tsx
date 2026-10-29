'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Leaf, Mail, Lock, ArrowRight, AlertCircle, Loader2, X, Eye, EyeOff, ShieldCheck, FileCheck2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'

const TRUST_POINTS = [
  { icon: FileCheck2,  title: 'Bilan GES conforme',       text: 'ISO 14064-1 et GHG Protocol, scopes 1, 2 et 3.' },
  { icon: MapPin,      title: 'Audit terrain accrédité',  text: 'Un expert GreenLeaves vérifie vos données sur site.' },
  { icon: ShieldCheck, title: 'Dépôt au CNC',             text: 'Votre dossier complet est déposé auprès du CNC.' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
            : data.error || 'Email ou mot de passe incorrect',
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
          <h1 className="mt-2 font-display text-4xl font-normal tracking-tight text-forest-900">Connexion à votre espace</h1>
          <p className="mt-2 text-sm text-ink-500">Saisissez vos identifiants pour accéder à votre espace entreprise.</p>

          {error && (
            <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError('')} className="flex-shrink-0 p-0.5 text-red-400 hover:text-red-600" aria-label="Fermer">
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <form method="post" onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-ink-700">Adresse email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  className="h-12 w-full rounded-xl border border-ivory-400 bg-white pl-10 pr-4 text-sm text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-forest-500 focus:ring-4 focus:ring-forest-100 disabled:opacity-60"
                  placeholder="vous@entreprise.ga"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold text-ink-700">Mot de passe</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  className="h-12 w-full rounded-xl border border-ivory-400 bg-white pl-10 pr-11 text-sm text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-forest-500 focus:ring-4 focus:ring-forest-100 disabled:opacity-60"
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
