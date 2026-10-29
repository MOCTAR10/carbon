'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Leaf, Wallet, TrendingUp, ArrowUpRight, ShieldCheck,
  ShieldOff, BarChart3, Clock, Globe2, ChevronRight
} from 'lucide-react'

interface PartnerData {
  firstName: string
  lastName: string
  partner: {
    id: number
    name: string
    type: string
    country: string
    walletBalance: number
    puroConnected: boolean
    puroAccountNumber: string | null
    puroKeyConfigured: boolean
  } | null
  stats: {
    totalTonsSold: number
    totalEarned: number
    totalTransactions: number
  }
  recentTransactions: {
    id: number
    tonsPurchased: number
    amountPaid: number
    partnerCredited: number
    status: string
    createdAt: string
    projectTitle: string
  }[]
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString('fr-FR')
}

export default function PartnerHome() {
  const [data, setData] = useState<PartnerData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/partner-me')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Leaf className="w-8 h-8 text-emerald-500 animate-pulse" />
      </div>
    )
  }

  if (!data || !data.partner) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p>Aucun partenaire associé à ce compte.</p>
        <p className="text-sm mt-1">Contactez l&apos;administrateur CarbonTrack.</p>
      </div>
    )
  }

  const { partner, stats, recentTransactions } = data

  return (
    <div className="w-full overflow-x-hidden space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">
            Bonjour, {data.firstName} 👋
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {partner.name} · {partner.type} · {partner.country}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-2xl px-4 py-2.5">
          <Globe2 className="w-4 h-4 text-gray-400" />
          <span className="text-gray-300 text-sm font-medium">{partner.country}</span>
        </div>
      </div>

      {/* Puro.earth CTA — shown when not connected */}
      {!partner.puroConnected && (
        <Link href="/partner/puro" className="block">
          <div className="bg-gradient-to-r from-amber-950/60 to-orange-950/60 border border-amber-700/50 rounded-3xl p-6 hover:border-amber-600 transition-colors cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <ShieldOff className="w-6 h-6 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-amber-300 font-bold text-base">Connectez votre compte Puro.earth</p>
                <p className="text-amber-500/80 text-sm mt-1">
                  Soumettez vos projets de retrait carbone certifiés (CORC), suivez vos issuances et retraits blockchain directement depuis votre portail.
                </p>
                <div className="flex items-center gap-2 mt-3 text-amber-400 text-sm font-bold">
                  Configurer maintenant <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Puro connected banner */}
      {partner.puroConnected && (
        <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-emerald-300 font-bold text-sm">Puro.earth — UAT Sandbox Connecté</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Compte: {partner.puroAccountNumber || 'configuré'} · Données en temps réel via l&apos;API Puro.earth
            </p>
          </div>
          <Link href="/partner/puro" className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-900/50 border border-emerald-800 px-3 py-2 rounded-xl hover:bg-emerald-900 transition-colors">
            Tableau de bord <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          {
            icon: Wallet, color: 'emerald', label: 'Solde Wallet',
            value: `${fmt(partner.walletBalance)} FCFA`,
            sub: 'Crédits disponibles pour retrait'
          },
          {
            icon: Leaf, color: 'blue', label: 'CO₂ Compensé',
            value: `${stats.totalTonsSold.toLocaleString('fr-FR')} T`,
            sub: 'Tonnes vendues aux entreprises'
          },
          {
            icon: TrendingUp, color: 'purple', label: 'Revenus Générés',
            value: `${fmt(stats.totalEarned)} FCFA`,
            sub: `${stats.totalTransactions} transaction${stats.totalTransactions > 1 ? 's' : ''}`
          },
        ].map(({ icon: Icon, color, label, value, sub }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
            <div className={`w-11 h-11 bg-${color}-500/10 rounded-2xl flex items-center justify-center mb-4`}>
              <Icon className={`w-5 h-5 text-${color}-500`} />
            </div>
            <p className="text-2xl font-black text-white">{value}</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">{label}</p>
            <p className="text-xs text-gray-600 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/partner/puro" className="bg-gray-900 border border-gray-800 hover:border-emerald-700 rounded-3xl p-5 flex items-center gap-4 transition-colors group">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">Tableau de bord Puro.earth</p>
            <p className="text-gray-500 text-xs mt-0.5">CORCs, facilities, transactions, retraits</p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 transition-colors" />
        </Link>

        <Link href="/partner/sales" className="bg-gray-900 border border-gray-800 hover:border-blue-700 rounded-3xl p-5 flex items-center gap-4 transition-colors group">
          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-6 h-6 text-blue-500" />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">Mes Ventes Carbone</p>
            <p className="text-gray-500 text-xs mt-0.5">Crédits vendus aux entreprises via CarbonTrack</p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors" />
        </Link>
      </div>

      {/* Recent Transactions */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Transactions Récentes</h2>
            <p className="text-gray-500 text-xs mt-0.5">Achats de crédits carbone de vos projets</p>
          </div>
          <Link href="/partner/sales" className="text-emerald-400 text-xs font-bold hover:text-emerald-300 transition-colors">
            Voir tout →
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Aucune transaction encore</p>
            <p className="text-gray-600 text-xs mt-1">Vos projets apparaissent dans le Marché Carbone des entreprises clientes.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {recentTransactions.map(tx => (
              <div key={tx.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-8 h-8 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Leaf className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{tx.projectTitle}</p>
                    <p className="text-gray-500 text-xs">{new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-emerald-400 font-black text-sm">{tx.tonsPurchased.toFixed(2)} T</p>
                  <p className="text-gray-500 text-xs">+{fmt(tx.partnerCredited)} FCFA</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
