'use client'

import { useState } from 'react'
import { Leaf, Eye, EyeOff, AlertCircle, Loader2, X } from 'lucide-react'

export default function AdminLoginPage() {
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

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erreur de connexion')
        setLoading(false)
        return
      }

      if (data.role !== 'admin') {
        setError('Accès refusé. Ce portail est réservé aux administrateurs.')
        // Only clear the specific cookie set for this login — never wipe other portals
        await fetch('/api/auth/clear-portal?portal=admin', { method: 'POST' })
        setLoading(false)
        return
      }

      window.location.href = '/admin'
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
      setLoading(false)
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-600/30">
            <Leaf className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Portail Administrateur</h1>
          <p className="text-gray-500 text-sm mt-1">CarbonTrack · Accès restreint</p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3.5 text-sm mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="text-red-400/70 hover:text-red-400 flex-shrink-0 p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                required
                autoFocus
                placeholder="admin@carbontrack.com"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                  required
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm mt-2 flex items-center justify-center gap-2"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Connexion en cours...</>
                : 'Se connecter'
              }
            </button>
          </form>
        </div>

        <div className="text-center mt-6 space-y-2">
          <p className="text-xs text-gray-600">
            Accès réservé aux administrateurs CarbonTrack
          </p>
          <div className="inline-flex items-center gap-1.5 text-[10px] text-gray-600">
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
