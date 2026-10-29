'use client'

import { useState } from 'react'
import { Eye, EyeOff, AlertCircle, Loader2, X } from 'lucide-react'

export default function CncLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Email ou mot de passe incorrect.')
        setLoading(false)
        return
      }
      if (data.role !== 'cnc') {
        setError('Ce compte n\'est pas autorisé à accéder à l\'espace CNC.')
        setLoading(false)
        return
      }
      window.location.href = '/cnc'
    } catch {
      setError('Impossible de joindre le serveur.')
      setLoading(false)
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo + Title */}
        <div className="text-center mb-3">
          <div className="mx-auto mb-2 w-20 h-20 bg-white rounded-2xl shadow-lg border border-emerald-100 flex items-center justify-center">
            <img src="/cnc-logo.png" alt="CNC Logo" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Conseil National du Climat</h1>
          <p className="text-gray-500 text-xs mt-0.5">Espace CNC — Certification carbone officielle</p>
        </div>

        {/* Card */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 mb-4 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="text-red-400/70 hover:text-red-400 flex-shrink-0 p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="cnc@carbontrack.gouv.ga"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                className="w-full bg-white border border-gray-300 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-shadow"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                  className="w-full bg-white border border-gray-300 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Connexion en cours...</>
                : "Accéder à l'espace CNC"
              }
            </button>
          </form>
        </div>
        <div className="text-center mt-6">
          <div className="inline-flex items-center gap-1.5 text-[10px] text-gray-500">
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
