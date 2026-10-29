'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Leaf, LogOut, Clock } from 'lucide-react'

export default function PartnerLayout({ children: _children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')

  useEffect(() => {
    fetch('/api/auth/partner-me')
      .then(res => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(data => {
        setName(data.firstName || '')
        setLoading(false)
      })
      .catch(() => router.push('/login'))
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center animate-pulse">
          <Leaf className="w-7 h-7 text-white" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">

        <div className="w-16 h-16 bg-emerald-900/40 border border-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Clock className="w-8 h-8 text-emerald-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Portail Partenaire</h1>
        {name && <p className="text-emerald-400 font-medium mb-4">Bonjour, {name}</p>}
        <p className="text-gray-400 mb-2">
          Le portail partenaire est en cours de préparation.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          Il sera disponible dès l&apos;ouverture du marché carbone local.
        </p>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl text-sm font-medium text-red-400 border border-red-900/50 hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>

      </div>
    </div>
  )
}
