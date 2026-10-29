'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Leaf, Mail, Lock, ArrowRight, AlertCircle, Loader2, X } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Email ou mot de passe incorrect')
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
    <div className="h-screen overflow-hidden bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-5">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">CarbonTrack</span>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Connexion</h1>
          <p className="text-gray-500 text-sm mt-1">Accédez à votre tableau de bord</p>
        </div>

        <div className="card p-6">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-700 border border-red-200 px-3.5 py-2.5 rounded-xl mb-4 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError('')} className="text-red-400/70 hover:text-red-400 flex-shrink-0 p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  className="input-field pl-10 py-2.5 text-sm"
                  placeholder="votre@email.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  className="input-field pl-10 py-2.5 text-sm"
                  placeholder="Votre mot de passe"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Connexion en cours...</>
                : <><span>Se connecter</span><ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>
        </div>

        <div className="text-center mt-4 space-y-3">
          <p className="text-sm text-gray-500">
            Pas encore de compte ?{' '}
            <Link href="/register" className="text-brand-600 hover:text-brand-700 font-medium">
              Créer un compte
            </Link>
          </p>
          <div className="inline-flex items-center gap-1.5 text-[10px] text-gray-400">
            <svg className="w-3 h-3 rounded-sm" viewBox="0 0 3 2">
              <rect width="3" height="0.67" fill="#009E60" />
              <rect y="0.66" width="3" height="0.67" fill="#FCD116" />
              <rect y="1.33" width="3" height="0.67" fill="#3A75C4" />
            </svg>
            <span>République Gabonaise &copy; 2026</span>
          </div>
        </div>
      </div>
    </div>
  )
}
