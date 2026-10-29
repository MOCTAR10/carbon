'use client'

import { useState, useEffect } from 'react'
import {
  User, Globe2, Mail, Phone, Building2, MapPin,
  Save, CheckCircle, AlertCircle, X, Image, Pencil
} from 'lucide-react'

interface PartnerProfile {
  id: number
  name: string
  type: string
  country: string
  mission: string | null
  website: string | null
  contactEmail: string | null
  logoUrl: string | null
}

interface UserInfo {
  id: number
  email: string
  firstName: string
  lastName: string
  phone: string | null
  partner: PartnerProfile | null
}

const PARTNER_TYPES = [
  'ONG', 'Association', 'Fondation', 'Coopérative', 'Institution publique', 'Autre'
]

const COUNTRIES_AF = [
  'Gabon', 'Cameroun', 'Congo', 'RD Congo', 'Côte d\'Ivoire', 'Sénégal',
  'Mali', 'Burkina Faso', 'Niger', 'Togo', 'Bénin', 'Ghana', 'Nigeria',
  'Kenya', 'Tanzanie', 'Éthiopie', 'Mozambique', 'Madagascar', 'Autre'
]

export default function PartnerProfilePage() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOrg, setEditOrg] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Org form state
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState('')
  const [orgCountry, setOrgCountry] = useState('')
  const [orgMission, setOrgMission] = useState('')
  const [orgWebsite, setOrgWebsite] = useState('')
  const [orgEmail, setOrgEmail] = useState('')
  const [orgLogo, setOrgLogo] = useState('')

  useEffect(() => {
    fetch('/api/auth/partner-me')
      .then(r => r.json())
      .then(data => {
        setUser(data)
        if (data.partner) {
          setOrgName(data.partner.name || '')
          setOrgType(data.partner.type || '')
          setOrgCountry(data.partner.country || '')
          setOrgMission(data.partner.mission || '')
          setOrgWebsite(data.partner.website || '')
          setOrgEmail(data.partner.contactEmail || '')
          setOrgLogo(data.partner.logoUrl || '')
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSaveOrg = async () => {
    if (!user?.partner?.id) return
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/partners/${user.partner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName,
          type: orgType,
          country: orgCountry,
          mission: orgMission,
          website: orgWebsite,
          contact_email: orgEmail,
          logo_url: orgLogo || null,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setMsg({ type: 'ok', text: 'Profil organisationnel mis à jour' })
      setEditOrg(false)
      // refresh user data
      const me = await fetch('/api/auth/partner-me').then(r => r.json())
      setUser(me)
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const p = user?.partner

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <User className="w-7 h-7 text-emerald-400" />
          Profil &amp; Paramètres
        </h1>
        <p className="text-gray-400 text-sm mt-1">Gérez les informations de votre organisation et de votre compte</p>
      </div>

      {/* Flash */}
      {msg && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
          msg.type === 'ok' ? 'bg-emerald-900/30 border-emerald-800 text-emerald-300' : 'bg-red-900/30 border-red-800 text-red-300'
        }`}>
          {msg.type === 'ok' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm">{msg.text}</span>
          <button onClick={() => setMsg(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Organization profile */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {p?.logoUrl ? (
              <img src={p.logoUrl} alt={p.name} className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 bg-emerald-900/40 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-emerald-400" />
              </div>
            )}
            <div>
              <h2 className="text-white font-bold">{p?.name || 'Organisation'}</h2>
              <p className="text-gray-500 text-sm">{p?.type} · {p?.country}</p>
            </div>
          </div>
          <button onClick={() => { setEditOrg(!editOrg); setMsg(null) }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <Pencil className="w-4 h-4" /> Modifier
          </button>
        </div>

        {!editOrg ? (
          <div className="p-5 space-y-4">
            {/* Info rows */}
            {[
              { icon: Building2, label: 'Type', value: p?.type },
              { icon: MapPin, label: 'Pays', value: p?.country },
              { icon: Globe2, label: 'Site web', value: p?.website, href: true },
              { icon: Mail, label: 'Email de contact', value: p?.contactEmail },
            ].map(row => row.value && (
              <div key={row.label} className="flex items-start gap-3">
                <row.icon className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">{row.label}</p>
                  {row.href ? (
                    <a href={row.value} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-400 hover:text-emerald-300">
                      {row.value}
                    </a>
                  ) : (
                    <p className="text-sm text-white">{row.value}</p>
                  )}
                </div>
              </div>
            ))}
            {p?.mission && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Mission</p>
                <p className="text-sm text-gray-300 leading-relaxed">{p.mission}</p>
              </div>
            )}
            {!p?.mission && !p?.website && !p?.contactEmail && (
              <p className="text-gray-500 text-sm italic">Aucune information supplémentaire. Cliquez sur &quot;Modifier&quot; pour compléter votre profil.</p>
            )}
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nom de l&apos;organisation</label>
                <input value={orgName} onChange={e => setOrgName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="Association Verte" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Type d&apos;organisation</label>
                <select value={orgType} onChange={e => setOrgType(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
                  <option value="">— Sélectionner —</option>
                  {PARTNER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Pays</label>
                <select value={orgCountry} onChange={e => setOrgCountry(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
                  <option value="">— Sélectionner —</option>
                  {COUNTRIES_AF.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email de contact public</label>
                <input value={orgEmail} onChange={e => setOrgEmail(e.target.value)} type="email"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="contact@association.org" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Site web</label>
                <input value={orgWebsite} onChange={e => setOrgWebsite(e.target.value)} type="url"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="https://association.org" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><Image className="w-3 h-3" /> URL du logo</label>
                <input value={orgLogo} onChange={e => setOrgLogo(e.target.value)} type="url"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="https://..." />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Mission &amp; Description</label>
                <textarea value={orgMission} onChange={e => setOrgMission(e.target.value)} rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
                  placeholder="Décrivez la mission de votre organisation, vos objectifs environnementaux et votre approche..." />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSaveOrg} disabled={saving}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                <Save className="w-4 h-4" />{saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button onClick={() => setEditOrg(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Account info (read-only) */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Compte utilisateur</h3>
        <div className="space-y-3">
          {[
            { icon: User, label: 'Nom complet', value: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() },
            { icon: Mail, label: 'Email', value: user?.email },
            { icon: Phone, label: 'Téléphone', value: user?.phone || 'Non renseigné' },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-3">
              <row.icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">{row.label}</p>
                <p className="text-sm text-white">{row.value || '—'}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-4">Pour modifier votre email ou mot de passe, contactez l&apos;administrateur CarbonTrack.</p>
      </div>

      {/* Puro link */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-white font-semibold text-sm">Configuration Puro.earth</h3>
          <p className="text-gray-500 text-xs mt-0.5">Clés API, numéro de compte, facility code</p>
        </div>
        <a href="/partner/puro" className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          Configurer →
        </a>
      </div>
    </div>
  )
}
