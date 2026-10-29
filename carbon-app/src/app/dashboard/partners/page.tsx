'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, CreditCard, Printer, Wallet } from 'lucide-react'

interface Partner {
  id: string | number
  name: string
  type: string
  country: string
  virtual_card_number: string
  wallet_balance: number
}

export default function PartnersAdminPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState('Reforestation')
  const [country, setCountry] = useState('Gabon')
  const [loading, setLoading] = useState(false)

  const fetchPartners = () => {
    fetch('/api/partners').then(r => r.json()).then(setPartners).catch(console.error)
  }

  useEffect(() => { fetchPartners() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, country })
    })
    setName(''); setCountry('Gabon');
    fetchPartners();
    setLoading(false)
  }

  const printCard = (partner: Partner) => {
    window.open(`/dashboard/partners/card?id=${partner.id}&name=${encodeURIComponent(partner.name)}&num=${partner.virtual_card_number}&type=${encodeURIComponent(partner.type)}`, 'PrintCard', 'width=1000,height=800')
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
             <Users className="w-8 h-8 text-emerald-600" /> Gestion des Partenaires (ONG)
          </h1>
          <p className="text-gray-500 mt-2">Gérez les portefeuilles financiers et imprimez les cartes de retrait AFG Bank.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FORM */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-1 h-max">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
             <Plus className="w-5 h-5 text-brand-600" /> Nouveau Partenaire
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l&apos;ONG / Association</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Ex: Action Vert Gabon" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de Mision</label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="Reforestation">Reforestation (Planter des arbres)</option>
                <option value="Conservation">Conservation (Protéger les forêts)</option>
                <option value="Protection Côtière">Protection Côtière (Mangroves)</option>
                <option value="Énergie Solaire">Énergie Solaire</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pays d&apos;opération</label>
              <input type="text" value={country} onChange={e => setCountry(e.target.value)} required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-md">
              {loading ? 'Création...' : 'Créer le Portefeuille & Publier sur le Marché'}
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
               La validation ajoutera automatiquement cette ONG sur le Marché Carbone des entreprises avec un lot de 10.000 Tonnes à 15.000 FCFA.
            </p>
          </form>
        </div>

        {/* LIST */}
        <div className="lg:col-span-2 space-y-4">
          {partners.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
               Aucun partenaire enregistré. Ajoutez votre première ONG locale.
            </div>
          ) : (
            partners.map(p => (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-6 hover:shadow-md transition-shadow">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                       <Wallet className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div>
                       <h3 className="text-xl font-bold text-gray-900">{p.name}</h3>
                       <p className="text-gray-500 text-sm mb-2">{p.type} • {p.country}</p>
                       <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg w-max border border-gray-100">
                         <CreditCard className="w-4 h-4 text-gray-400" />
                         <span className="font-mono text-sm tracking-widest text-gray-700">{p.virtual_card_number}</span>
                       </div>
                    </div>
                 </div>
                 
                 <div className="flex flex-col items-center sm:items-end gap-3 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                    <div className="text-center sm:text-right">
                       <p className="text-sm text-gray-500 mb-1">Solde (Retirable)</p>
                       <p className="text-2xl font-black text-emerald-600">{Number(p.wallet_balance).toLocaleString('fr-FR')} FCFA</p>
                    </div>
                    <button 
                      onClick={() => printCard(p)}
                      className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-sm w-full sm:w-auto justify-center"
                    >
                      <Printer className="w-4 h-4" />
                      Imprimer la Carte Plastique
                    </button>
                 </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
