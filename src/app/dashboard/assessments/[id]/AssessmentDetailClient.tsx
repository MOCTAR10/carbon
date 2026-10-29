'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Save, Flame, Package, Truck, Users, Trash2, Building, Factory, ChevronDown, BarChart3, X, Calendar, Paperclip, Upload, FileText, Eye, Trash, Shield, Award, Loader2 } from 'lucide-react'
import { cn, fmtCO2 } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge, CertStatusBadge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Stagger, Reveal } from '@/components/ui/motion'
import {
  ENERGY_FUELS_STATIONARY, ENERGY_FUELS_ORGANIC, ENERGY_FUELS_MOBILE,
  ELECTRICITY_FACTORS, STEAM_COOLING_FACTORS, REFRIGERANT_FACTORS,
  INPUTS_METALS, INPUTS_PLASTICS, INPUTS_OTHER,
  FREIGHT_FACTORS, TRANSPORT_PEOPLE_FACTORS, WASTE_FACTORS, CAPITAL_GOODS_FACTORS,
  ALL_EMISSION_FACTORS,
  SCOPE_MAPPING,
  type EmissionFactor
} from '@/lib/emission-factors'

/* ============================================================
   TYPES
   ============================================================ */
interface EntryRow {
  id: string
  emissionFactorId: string
  factorName: string
  category: string
  subcategory: string
  quantity: number
  unit: string
  factorUpstream: number
  factorCombustion: number
  factorValue: number
  totalCo2eq: number
  scope: number
  ghgCategory: string
  isoCategory: string
  description: string
  sourceCharacterization: string
  month: number
  year: number
}

interface AuditDoc {
  id: number
  assessment_id: number
  emission_factor_id: string
  year: number
  month: number
  filename: string
  original_name: string
  file_size: number
  mime_type: string
  created_at: string
}

const MONTHS = [
  { id: 0, label: 'Annuel', short: 'An' },
  { id: 1, label: 'Janvier', short: 'Jan' },
  { id: 2, label: 'Février', short: 'Fév' },
  { id: 3, label: 'Mars', short: 'Mar' },
  { id: 4, label: 'Avril', short: 'Avr' },
  { id: 5, label: 'Mai', short: 'Mai' },
  { id: 6, label: 'Juin', short: 'Jun' },
  { id: 7, label: 'Juillet', short: 'Jul' },
  { id: 8, label: 'Août', short: 'Aoû' },
  { id: 9, label: 'Septembre', short: 'Sep' },
  { id: 10, label: 'Octobre', short: 'Oct' },
  { id: 11, label: 'Novembre', short: 'Nov' },
  { id: 12, label: 'Décembre', short: 'Déc' },
]

/* ============================================================
   TAB DEFINITIONS  (7 main tabs matching Excel sheets)
   ============================================================ */
const TABS = [
  { id: 'energy',        label: 'Énergie',              icon: Flame,   color: 'red' },
  { id: 'non_energy',    label: 'Hors énergie',         icon: Factory, color: 'red' },
  { id: 'inputs',        label: 'Intrants',             icon: Package, color: 'blue' },
  { id: 'freight',       label: 'Fret',                 icon: Truck,   color: 'blue' },
  { id: 'transport',     label: 'Transport',            icon: Users,   color: 'blue' },
  { id: 'waste',         label: 'Déchets',              icon: Trash2,  color: 'blue' },
  { id: 'capital',       label: 'Immobilisations',      icon: Building,color: 'blue' },
]

/* Each tab has sub-sections with their emission factors */
interface SubSection {
  id: string
  label: string
  scopeLabel: string
  scope: number
  factors: EmissionFactor[]
  description?: string
}

const TAB_SECTIONS: Record<string, SubSection[]> = {
  energy: [
    { id: 'fuels_stationary', label: '1 - Combustibles fossiles (sources fixes)', scopeLabel: 'Scope 1', scope: 1, factors: ENERGY_FUELS_STATIONARY, description: 'Butane, Propane, Gaz naturel, Diesel, Charbon, Coke - Consommation directe sur site' },
    { id: 'fuels_organic', label: '2 - Combustibles d\'origine organique', scopeLabel: 'Scope 1', scope: 1, factors: ENERGY_FUELS_ORGANIC, description: 'Biodiesel, Biométhane, Bois, Granules - Sources renouvelables' },
    { id: 'fuels_mobile', label: '3 - Combustibles (sources mobiles)', scopeLabel: 'Scope 1', scope: 1, factors: ENERGY_FUELS_MOBILE, description: 'Essence, Diesel, GPL, GNL, Kérosène - Véhicules et engins' },
    { id: 'steam', label: '4 - Achat de vapeur et froid', scopeLabel: 'Scope 2', scope: 2, factors: STEAM_COOLING_FACTORS, description: 'Réseaux de chaleur, réseaux de froid' },
    { id: 'electricity', label: '5 - Achat d’électricité', scopeLabel: 'Scope 2', scope: 2, factors: ELECTRICITY_FACTORS, description: 'Électricité par pays/région et par usage (chauffage, industrie, transport...)' },
  ],
  non_energy: [
    { id: 'refrigerants', label: '1 - Fluides frigorigènes (HFC)', scopeLabel: 'Scope 1', scope: 1, factors: REFRIGERANT_FACTORS.filter(f => f.subcategory === 'refrigerants'), description: 'Fuites de climatisation, réfrigération' },
    { id: 'process', label: '2 - Émissions de procédés', scopeLabel: 'Scope 1', scope: 1, factors: REFRIGERANT_FACTORS.filter(f => f.subcategory === 'process'), description: 'CO2, N2O, CH4 - Émissions directes hors combustion' },
  ],
  inputs: [
    { id: 'metals', label: '1 - Métaux', scopeLabel: 'Scope 3', scope: 3, factors: INPUTS_METALS, description: 'Acier, Aluminium, Cuivre, Nickel - neufs et recyclés' },
    { id: 'plastics', label: '2 - Plastiques', scopeLabel: 'Scope 3', scope: 3, factors: INPUTS_PLASTICS, description: 'PET, PEHD, PVC, Nylon, Plastique moyen' },
    { id: 'other_inputs', label: '3 - Verre, Papier, Construction, Eau', scopeLabel: 'Scope 3', scope: 3, factors: INPUTS_OTHER, description: 'Verre, Papier/Carton, Béton, Ciment, Eau potable' },
  ],
  freight: [
    { id: 'road', label: '1 - Fret routier', scopeLabel: 'Scope 3', scope: 3, factors: FREIGHT_FACTORS.filter(f => f.subcategory === 'road'), description: 'Camions articulés, rigides, utilitaires' },
    { id: 'air_freight', label: '2 - Fret aérien', scopeLabel: 'Scope 3', scope: 3, factors: FREIGHT_FACTORS.filter(f => f.subcategory === 'air'), description: 'Transport aérien de marchandises' },
    { id: 'rail_freight', label: '3 - Fret ferroviaire', scopeLabel: 'Scope 3', scope: 3, factors: FREIGHT_FACTORS.filter(f => f.subcategory === 'rail'), description: 'Transport ferroviaire de marchandises' },
    { id: 'maritime_freight', label: '4 - Fret maritime et fluvial', scopeLabel: 'Scope 3', scope: 3, factors: FREIGHT_FACTORS.filter(f => f.subcategory === 'maritime' || f.subcategory === 'river'), description: 'Container maritime, fret fluvial' },
  ],
  transport: [
    { id: 'car', label: '1 - Voitures', scopeLabel: 'Scope 3', scope: 3, factors: TRANSPORT_PEOPLE_FACTORS.filter(f => f.subcategory === 'car'), description: 'Essence, Diesel, Électrique, Hybride' },
    { id: 'public', label: '2 - Transports en commun', scopeLabel: 'Scope 3', scope: 3, factors: TRANSPORT_PEOPLE_FACTORS.filter(f => ['bus', 'train', 'metro'].includes(f.subcategory)), description: 'Bus, TGV, TER, Métro' },
    { id: 'plane', label: '3 - Avion', scopeLabel: 'Scope 3', scope: 3, factors: TRANSPORT_PEOPLE_FACTORS.filter(f => f.subcategory === 'plane'), description: 'Court, moyen et long courrier' },
  ],
  waste: [
    { id: 'building_waste', label: '1 - Déchets du bâtiment', scopeLabel: 'Scope 3', scope: 3, factors: WASTE_FACTORS.filter(f => f.subcategory === 'building'), description: 'Béton, Bois, Déchets inertes, Plâtre' },
    { id: 'mineral_waste', label: '2 - Déchets minéraux', scopeLabel: 'Scope 3', scope: 3, factors: WASTE_FACTORS.filter(f => f.subcategory === 'mineral'), description: 'Incinération, Enfouissement' },
    { id: 'organic_waste', label: '3 - Déchets organiques', scopeLabel: 'Scope 3', scope: 3, factors: WASTE_FACTORS.filter(f => f.subcategory === 'organic'), description: 'Compost, Papier, Carton' },
    { id: 'plastic_waste', label: '4 - Déchets plastiques', scopeLabel: 'Scope 3', scope: 3, factors: WASTE_FACTORS.filter(f => f.subcategory === 'plastic'), description: 'Plastique moyen, PE, PVC' },
    { id: 'household_waste', label: '5 - Ordures ménagères', scopeLabel: 'Scope 3', scope: 3, factors: WASTE_FACTORS.filter(f => f.subcategory === 'household'), description: 'Déchets ménagers courants' },
    { id: 'dangerous_waste', label: '6 - Déchets dangereux', scopeLabel: 'Scope 3', scope: 3, factors: WASTE_FACTORS.filter(f => f.subcategory === 'dangerous'), description: 'Déchets industriels spéciaux' },
    { id: 'wastewater', label: '7 - Eaux usées', scopeLabel: 'Scope 3', scope: 3, factors: WASTE_FACTORS.filter(f => f.subcategory === 'water'), description: 'Traitement des eaux usées' },
  ],
  capital: [
    { id: 'buildings', label: '1 - Bâtiments (méthode surface)', scopeLabel: 'Scope 3', scope: 3, factors: CAPITAL_GOODS_FACTORS.filter(f => f.subcategory === 'buildings'), description: 'Bureau, Entrepôt, Industriel - kgCO2eq/m2 amorti' },
    { id: 'vehicles', label: '2 - Véhicules', scopeLabel: 'Scope 3', scope: 3, factors: CAPITAL_GOODS_FACTORS.filter(f => f.subcategory === 'vehicles'), description: 'Véhicules de société, camions' },
    { id: 'it', label: '3 - Informatique', scopeLabel: 'Scope 3', scope: 3, factors: CAPITAL_GOODS_FACTORS.filter(f => f.subcategory === 'it'), description: 'Ordinateurs, serveurs, smartphones' },
    { id: 'furniture', label: '4 - Mobilier', scopeLabel: 'Scope 3', scope: 3, factors: CAPITAL_GOODS_FACTORS.filter(f => f.subcategory === 'furniture'), description: 'Bureaux, chaises' },
  ],
}

/* ============================================================
   HELPER: format CO2
   ============================================================ */
// Values are in kgCO2e; keeps one decimal below 1 t so small entries stay visible
function formatCO2(v: number): string {
  const fr = (n: number, d: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d })
  if (Math.abs(v) >= 1000000) return `${fr(v / 1000000, 2)} ktCO₂e`
  if (Math.abs(v) >= 1000) return `${fr(v / 1000, 2)} tCO₂e`
  return `${fr(v, 1)} kgCO₂e`
}

function formatNum(v: number): string {
  return v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function AssessmentDetailClient() {
  const params = useParams()
  const assessmentId = params.id as string

  const [assessment, setAssessment] = useState<{ name: string; year: number; site_name: string; status: string } | null>(null)
  const [activeTab, setActiveTab] = useState('energy')
  const [activeYear, setActiveYear] = useState(new Date().getFullYear())
  const [activeMonth, setActiveMonth] = useState(1) // 0 = Annuel (read-only), 1-12 = months
  // entries: factorId -> { 'year-month': qty } e.g. { 'elec_fr': { '2025-1': 100, '2025-2': 120, '2024-6': 50 } }
  const [entries, setEntries] = useState<Record<string, Record<string, number>>>({})
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  // Raw string values for decimal-safe inputs (factorId_year_month → raw string)
  const [rawValues, setRawValues] = useState<Record<string, string>>({})
  // Save feedback (global sonner toaster)
  const showToast = (type: 'success' | 'error', message: string) => {
    if (type === 'success') toast.success('Bilan sauvegardé', { description: message })
    else toast.error('Erreur de sauvegarde', { description: message })
  }

  // Document upload state
  const [docs, setDocs] = useState<AuditDoc[]>([])
  const [docPanel, setDocPanel] = useState<{ factorId: string; factorName: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Certification state
  const [certStatus, setCertStatus] = useState<string | null>(null) // null | pending | assigned | in_progress | certified | rejected
  const [certLoading, setCertLoading] = useState(false)
  const [showCertModal, setShowCertModal] = useState(false)
  const [certMessage, setCertMessage] = useState('')
  const [certSubmitting, setCertSubmitting] = useState(false)

  /* ---- Load data ---- */
  const loadData = useCallback(async () => {
    try {
      const [aRes, eRes] = await Promise.all([
        fetch('/api/assessments').then(r => r.json()),
        fetch(`/api/emissions?assessmentId=${assessmentId}`).then(r => r.json())
      ])
      const found = aRes.find((a: { id: number }) => String(a.id) === assessmentId)
      if (found) {
        setAssessment(found)
        setActiveYear(found.year || new Date().getFullYear())
      }

      // Build map: factorId -> { 'year-month': quantity }
      const map: Record<string, Record<string, number>> = {}
      const yearsSet = new Set<number>()
      if (Array.isArray(eRes)) {
        for (const e of eRes) {
          const fid = e.emission_factor_id
          const m = parseInt(e.month) || 0
          const y = parseInt(e.year) || 0
          if (!map[fid]) map[fid] = {}
          // Legacy entries with month=0 or year=0: default to assessment year + month 1
          const targetMonth = m === 0 ? 1 : m
          const targetYear = y === 0 ? (found?.year || new Date().getFullYear()) : y
          const key = `${targetYear}-${targetMonth}`
          map[fid][key] = (map[fid][key] || 0) + (parseFloat(e.quantity) || 0)
          yearsSet.add(targetYear)
        }
      }
      // Ensure at least the assessment year is available
      const baseYear = found?.year || new Date().getFullYear()
      yearsSet.add(baseYear)
      setAvailableYears(Array.from(yearsSet).sort())
      setEntries(map)

      // Auto-open first section of each tab
      const autoOpen: Record<string, boolean> = {}
      Object.values(TAB_SECTIONS).forEach(sections => {
        if (sections.length > 0) autoOpen[sections[0].id] = true
      })
      setOpenSections(autoOpen)
    } catch { /* ignore */ }
  }, [assessmentId])

  useEffect(() => { loadData() }, [loadData])

  /* ---- Load documents ---- */
  const loadDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents?assessmentId=${assessmentId}`)
      if (res.ok) {
        const data = await res.json()
        setDocs(Array.isArray(data) ? data : [])
      }
    } catch { /* ignore */ }
  }, [assessmentId])

  useEffect(() => { loadDocuments() }, [loadDocuments])

  /* ---- Load certification status ---- */
  useEffect(() => {
    fetch(`/api/certifications/${assessmentId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.certification) setCertStatus(data.certification.status)
      })
      .catch(() => {})
  }, [assessmentId])

  const handleCertRequest = async () => {
    setCertSubmitting(true)
    try {
      const res = await fetch('/api/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId: parseInt(assessmentId), message: certMessage }),
      })
      if (res.ok) {
        setCertStatus('pending')
        setShowCertModal(false)
        setCertMessage('')
        toast.success('Demande de certification envoyée', { description: 'Un expert accrédité va être assigné à votre bilan.' })
      } else {
        const data = await res.json().catch(() => null)
        toast.error(data?.error || 'Impossible d’envoyer la demande.')
      }
    } catch {
      toast.error('Erreur de connexion au serveur.')
    }
    setCertSubmitting(false)
  }

  // Get docs for a specific factor + year + month (or all months if month=0)
  const getDocsForFactor = (factorId: string): AuditDoc[] => {
    if (activeMonth === 0) {
      return docs.filter(d => d.emission_factor_id === factorId && d.year === activeYear)
    }
    return docs.filter(d => d.emission_factor_id === factorId && d.year === activeYear && d.month === activeMonth)
  }

  // Count total docs for a factor across all years/months
  const getDocCount = (factorId: string): number => {
    return docs.filter(d => d.emission_factor_id === factorId).length
  }

  // Upload handler
  const handleUpload = async (file: File) => {
    if (!docPanel || activeMonth === 0) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('assessmentId', assessmentId)
      fd.append('factorId', docPanel.factorId)
      fd.append('year', String(activeYear))
      fd.append('month', String(activeMonth))
      const res = await fetch('/api/documents', { method: 'POST', body: fd })
      if (res.ok) {
        await loadDocuments()
      }
    } catch { /* ignore */ }
    setUploading(false)
  }

  // Delete handler
  const handleDeleteDoc = async (docId: number) => {
    try {
      const res = await fetch('/api/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: docId, assessmentId }),
      })
      if (res.ok) {
        await loadDocuments()
      }
    } catch { /* ignore */ }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  }

  /* ---- Quantity helpers (year + month aware) ---- */
  const setQuantity = (factorId: string, year: number, month: number, value: number) => {
    const key = `${year}-${month}`
    setEntries(prev => ({
      ...prev,
      [factorId]: { ...prev[factorId], [key]: value }
    }))
  }

  // Get quantity for a specific year+month, or sum of all months for a year if month=0
  const getQuantity = (factorId: string, year?: number, month?: number): number => {
    const y = year ?? activeYear
    const m = month ?? activeMonth
    const data = entries[factorId]
    if (!data) return 0
    if (m === 0) {
      // Annual = sum of months 1-12 for the given year
      let sum = 0
      for (let i = 1; i <= 12; i++) sum += data[`${y}-${i}`] || 0
      return sum
    }
    return data[`${y}-${m}`] || 0
  }

  // Get grand total (sum ALL years, ALL months) for a factor — used for scope cards
  const getGrandTotalQty = (factorId: string): number => {
    const data = entries[factorId]
    if (!data) return 0
    return Object.values(data).reduce((sum, v) => sum + (v || 0), 0)
  }

  // Get annual total for a specific year
  const getYearQty = (factorId: string, year: number): number => {
    const data = entries[factorId]
    if (!data) return 0
    let sum = 0
    for (let i = 1; i <= 12; i++) sum += data[`${year}-${i}`] || 0
    return sum
  }

  const calcTotal = (factor: EmissionFactor): number => {
    return getQuantity(factor.id) * factor.factorTotal
  }

  const calcGrandTotal = (factor: EmissionFactor): number => {
    return getGrandTotalQty(factor.id) * factor.factorTotal
  }

  const calcUpstream = (factor: EmissionFactor): number => {
    return getQuantity(factor.id) * factor.factorUpstream
  }

  const calcCombustion = (factor: EmissionFactor): number => {
    return getQuantity(factor.id) * factor.factorCombustion
  }

  /* ---- Totals ---- */
  const allFactors = useMemo(() => ALL_EMISSION_FACTORS, [])

  // Scope totals always use GRAND total (all years, all months) for the top cards
  const grandTotal = useMemo(() => allFactors.reduce((s, f) => s + calcGrandTotal(f), 0), [entries, allFactors])
  const scope1Total = useMemo(() => {
    return allFactors.filter(f => {
      const si = SCOPE_MAPPING[f.subcategory]
      return si && si.scope === 1
    }).reduce((s, f) => s + calcGrandTotal(f), 0)
  }, [entries, allFactors])
  const scope2Total = useMemo(() => {
    return allFactors.filter(f => {
      const si = SCOPE_MAPPING[f.subcategory]
      return si && si.scope === 2
    }).reduce((s, f) => s + calcGrandTotal(f), 0)
  }, [entries, allFactors])
  const scope3Total = useMemo(() => {
    return allFactors.filter(f => {
      const si = SCOPE_MAPPING[f.subcategory]
      return si && si.scope === 3
    }).reduce((s, f) => s + calcGrandTotal(f), 0)
  }, [entries, allFactors])

  const calcSectionTotal = (factors: EmissionFactor[]): number =>
    factors.reduce((sum, f) => sum + calcTotal(f), 0)

  const calcTabTotal = (tabId: string): number => {
    const sections = TAB_SECTIONS[tabId] || []
    return sections.reduce((sum, sec) => sum + calcSectionTotal(sec.factors), 0)
  }

  /* ---- GHG Protocol breakdown (grand total all years) ---- */
  const ghgBreakdown = useMemo(() => {
    const map: Record<string, { total: number; upstream: number; combustion: number }> = {}
    for (const f of allFactors) {
      const si = SCOPE_MAPPING[f.subcategory]
      if (!si) continue
      const key = si.ghgCategory
      const qty = getGrandTotalQty(f.id)
      if (!map[key]) map[key] = { total: 0, upstream: 0, combustion: 0 }
      map[key].total += qty * f.factorTotal
      map[key].upstream += qty * f.factorUpstream
      map[key].combustion += qty * f.factorCombustion
    }
    return Object.entries(map).filter(([, v]) => v.total > 0).sort((a, b) => b[1].total - a[1].total)
  }, [entries, allFactors])

  /* ---- ISO 14069 breakdown (grand total all years) ---- */
  const isoBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    for (const f of allFactors) {
      const si = SCOPE_MAPPING[f.subcategory]
      if (!si) continue
      const key = `${si.isoCategory} - ${si.ghgCategory.split(' ').slice(1).join(' ')}`
      if (!map[key]) map[key] = 0
      map[key] += getGrandTotalQty(f.id) * f.factorTotal
    }
    return Object.entries(map).filter(([, v]) => v > 0).sort((a, b) => a[0].localeCompare(b[0]))
  }, [entries, allFactors])

  /* ---- Save (all years x 12 months) ---- */
  const handleSave = async () => {
    setSaving(true)
    try {
      const allEntries: Omit<EntryRow, 'id'>[] = []
      // Collect all years that have data
      const yearsWithData = new Set<number>()
      for (const data of Object.values(entries)) {
        for (const key of Object.keys(data)) {
          const y = parseInt(key.split('-')[0])
          if (y > 0) yearsWithData.add(y)
        }
      }
      const years = Array.from(yearsWithData).sort()

      for (const [, sections] of Object.entries(TAB_SECTIONS)) {
        for (const sec of sections) {
          for (const factor of sec.factors) {
            for (const yr of years) {
              for (let m = 1; m <= 12; m++) {
                const qty = getQuantity(factor.id, yr, m)
                if (qty > 0) {
                  const scopeInfo = SCOPE_MAPPING[factor.subcategory] || { scope: 3, ghgCategory: 'Autre', isoCategory: '' }
                  allEntries.push({
                    emissionFactorId: factor.id,
                    factorName: factor.nameFr,
                    category: factor.category,
                    subcategory: factor.subcategory,
                    quantity: qty,
                    unit: factor.unit,
                    factorUpstream: factor.factorUpstream,
                    factorCombustion: factor.factorCombustion,
                    factorValue: factor.factorTotal,
                    totalCo2eq: qty * factor.factorTotal,
                    scope: scopeInfo.scope,
                    ghgCategory: scopeInfo.ghgCategory,
                    isoCategory: scopeInfo.isoCategory,
                    description: `${factor.nameFr} - ${factor.source}`,
                    sourceCharacterization: factor.region,
                    month: m,
                    year: yr,
                  })
                }
              }
            }
          }
        }
      }

      const res = await fetch('/api/emissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, entries: allEntries }),
      })

      if (res.ok) {
        showToast('success', `${allEntries.length} entrée(s) sauvegardée(s) avec succès.`)
        setRawValues({}) // clear raw inputs after successful save
      } else {
        showToast('error', 'Erreur lors de la sauvegarde. Réessayez.')
      }
    } catch {
      showToast('error', 'Erreur de connexion au serveur.')
    } finally {
      setSaving(false)
    }
  }

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }))
  }

  /* ---- Scope color helpers (light surfaces: S1 forest, S2 gold, S3 sage) ---- */
  const scopeColor = (scope: number) => {
    if (scope === 1) return { square: 'bg-forest-700 text-ivory-50', chip: 'forest' as const, bar: 'bg-forest-700' }
    if (scope === 2) return { square: 'bg-gold-500 text-forest-950', chip: 'gold' as const, bar: 'bg-gold-500' }
    return { square: 'bg-forest-300 text-forest-950', chip: 'neutral' as const, bar: 'bg-forest-300' }
  }

  const certInProgress = !!certStatus && ['pending', 'assigned', 'in_progress', 'audit_done', 'submitted_to_cnc'].includes(certStatus)
  const grand = fmtCO2(grandTotal)

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <Stagger className="space-y-6">
      {/* ---- HEADER ---- */}
      <Reveal>
        <Link
          href="/dashboard/assessments"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 transition-colors hover:text-forest-800"
        >
          <ArrowLeft className="size-3.5" /> Bilans carbone
        </Link>
        <PageHeader
          eyebrow="Bilan carbone"
          title={<span className="[text-wrap:balance]">{assessment?.name || 'Chargement…'}</span>}
          description={assessment ? <>{assessment.site_name} · Année {assessment.year}</> : undefined}
          actions={
            <>
              <Button
                variant={showSummary ? 'primary' : 'outline'}
                onClick={() => setShowSummary(!showSummary)}
                aria-pressed={showSummary}
              >
                <BarChart3 /> Synthèse
              </Button>
              <Button variant="gold" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <Save />}
                {saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </Button>
            </>
          }
        />
      </Reveal>

      {/* ---- Certification status bar ---- */}
      <Reveal>
        {certStatus === 'certified' ? (
          <Card className="flex items-center gap-4 border-gold-200 bg-gradient-to-r from-gold-50 to-white px-6 py-4">
            <span className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-forest-900 text-gold-300">
              <Award className="size-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg text-forest-900">Bilan certifié</p>
              <p className="text-xs text-ink-500">Ce bilan a été audité par un expert accrédité et certifié par le CNC.</p>
            </div>
            <CertStatusBadge status="certified" />
          </Card>
        ) : certInProgress ? (
          <Card className="flex items-center gap-4 px-6 py-4">
            <span className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-gold-50 text-gold-600 ring-1 ring-gold-200">
              <Shield className="size-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg text-forest-900">Certification en cours</p>
              <p className="text-xs text-ink-500">Votre demande est suivie par un expert accrédité GreenLeaves jusqu’au dépôt au CNC.</p>
            </div>
            <CertStatusBadge status={certStatus!} />
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link href="/dashboard/certifications">Suivre <ArrowRight /></Link>
            </Button>
          </Card>
        ) : certStatus === 'rejected' ? (
          <button
            onClick={() => setShowCertModal(true)}
            className="group flex w-full items-center gap-4 rounded-2xl border border-red-200 bg-white px-6 py-4 text-left shadow-soft transition-all hover:border-red-300 hover:shadow-lifted"
          >
            <span className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-100">
              <Shield className="size-5" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg text-forest-900">Certification refusée</span>
              <span className="block text-xs text-ink-500">Corrigez vos données puis soumettez une nouvelle demande.</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-700">
              Nouvelle demande <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </button>
        ) : (
          <button
            onClick={() => setShowCertModal(true)}
            className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl bg-forest-900 bg-forest-grain px-6 py-5 text-left text-ivory-50 shadow-lifted transition-transform hover:-translate-y-0.5"
          >
            <span className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-gold-500/15 text-gold-300 ring-1 ring-gold-400/40">
              <Shield className="size-5" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg">Faire certifier ce bilan carbone</span>
              <span className="block text-xs text-forest-100/70">Audit terrain par un expert accrédité, puis dépôt de votre dossier au CNC.</span>
            </span>
            <span className={cn(buttonVariants({ variant: 'gold', size: 'sm' }), 'pointer-events-none')}>
              Demander <ArrowRight />
            </span>
          </button>
        )}
      </Reveal>

      {/* Certification Request Modal */}
      {showCertModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-950/40 p-4 font-sans backdrop-blur-sm animate-in fade-in-0">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-lifted animate-in zoom-in-95">

            {/* Header */}
            <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-ivory-300 px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-forest-900 text-gold-300">
                  <Shield className="size-5" strokeWidth={1.8} />
                </span>
                <div>
                  <h3 className="font-display text-xl leading-tight text-forest-900">Certifier ce bilan carbone</h3>
                  <p className="mt-0.5 text-xs text-ink-500">Demande d’audit par un expert accrédité</p>
                </div>
              </div>
              <button
                onClick={() => setShowCertModal(false)}
                className="flex size-8 flex-shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ivory-100 hover:text-ink-700"
                aria-label="Fermer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">

              {/* Steps */}
              <div className="rounded-xl border border-ivory-300 bg-ivory-50 p-5">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">Processus de certification</p>
                <ol className="space-y-3">
                  {[
                    'Votre demande est transmise à l’équipe GreenLeaves',
                    'Un expert accrédité est assigné et fixe la date d’audit',
                    'Audit terrain et vérification de vos données',
                    'Dépôt du dossier au CNC, puis remise du certificat',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-ink-700">
                      <span className="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-forest-900 text-[10px] font-bold text-gold-200">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="cert-message" className="mb-1.5 block text-[13px] font-semibold text-ink-700">
                  Message pour l’expert <span className="font-normal text-ink-400">(optionnel)</span>
                </label>
                <textarea
                  id="cert-message"
                  value={certMessage}
                  onChange={(e) => setCertMessage(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-ivory-400 bg-white px-4 py-3 text-sm text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-forest-500 focus:ring-4 focus:ring-forest-100"
                  placeholder="Précisions sur votre bilan, contraintes particulières, questions…"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-shrink-0 items-center justify-end gap-2 rounded-b-2xl border-t border-ivory-300 bg-ivory-50 px-6 py-4">
              <Button variant="ghost" onClick={() => setShowCertModal(false)}>Annuler</Button>
              <Button onClick={handleCertRequest} disabled={certSubmitting}>
                {certSubmitting ? <Loader2 className="animate-spin" /> : <Shield />}
                {certSubmitting ? 'Envoi en cours…' : 'Envoyer la demande'}
              </Button>
            </div>

          </div>
        </div>
      , document.body)}

      {/* ---- SCOPE SUMMARY CARDS ---- */}
      <Reveal className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl bg-forest-900 bg-forest-grain p-5 text-ivory-50 shadow-lifted">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-300/90">Total général</p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-4xl font-light tabular-nums">{grand.value}</span>
            <span className="text-sm text-forest-100/70">{grand.unit}</span>
          </p>
          <p className="mt-1 text-[11px] text-forest-100/50">Toutes années et tous mois confondus</p>
        </div>
        {[
          { label: 'Scope 1', sub: 'Émissions directes', value: scope1Total, scope: 1 },
          { label: 'Scope 2', sub: 'Énergie indirecte',  value: scope2Total, scope: 2 },
          { label: 'Scope 3', sub: 'Autres indirectes',  value: scope3Total, scope: 3 },
        ].map(s => {
          const pct = grandTotal > 0 ? Math.min(100, (s.value / grandTotal) * 100) : 0
          return (
            <Card key={s.label} className="p-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold text-ink-700">
                  <span className={cn('size-2 rounded-full', scopeColor(s.scope).bar)} />
                  {s.label}
                </span>
                <span className="text-xs tabular-nums text-ink-400">{pct.toFixed(0)} %</span>
              </div>
              <p className="mt-2 font-display text-2xl tabular-nums text-forest-900">{formatCO2(s.value)}</p>
              <p className="text-[11px] text-ink-400">{s.sub}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ivory-200">
                <div className={cn('h-full rounded-full transition-all duration-700', scopeColor(s.scope).bar)} style={{ width: `${pct}%` }} />
              </div>
            </Card>
          )
        })}
      </Reveal>

      {/* ---- GHG / ISO SUMMARY PANEL ---- */}
      {showSummary && (
        <Card className="animate-fade-up">
          <CardHeader
            eyebrow="Synthèse"
            title="GHG Protocol / ISO 14069"
            action={
              <Button variant="ghost" size="icon" onClick={() => setShowSummary(false)} aria-label="Fermer la synthèse">
                <X />
              </Button>
            }
          />
          <CardContent className="grid gap-8 md:grid-cols-2">
            {/* GHG Protocol */}
            <div>
              <h3 className="mb-3 border-b border-ivory-300 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">GHG Protocol — Catégories</h3>
              <div className="space-y-1">
                {ghgBreakdown.map(([cat, vals]) => (
                  <div key={cat} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-ivory-50">
                    <span className="min-w-0 truncate text-ink-700">{cat}</span>
                    <div className="flex flex-shrink-0 items-center gap-3">
                      <span className="hidden text-[11px] tabular-nums text-ink-400 lg:inline">amont {formatNum(vals.upstream)} · comb. {formatNum(vals.combustion)}</span>
                      <span className="w-28 text-right font-semibold tabular-nums text-forest-900">{formatCO2(vals.total)}</span>
                    </div>
                  </div>
                ))}
                {ghgBreakdown.length === 0 && <p className="text-sm text-ink-400">Aucune donnée saisie</p>}
              </div>
            </div>
            {/* ISO 14069 */}
            <div>
              <h3 className="mb-3 border-b border-ivory-300 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">ISO 14069 — Postes</h3>
              <div className="space-y-1">
                {isoBreakdown.map(([cat, val]) => (
                  <div key={cat} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-ivory-50">
                    <span className="min-w-0 truncate text-ink-700">{cat}</span>
                    <span className="flex-shrink-0 font-semibold tabular-nums text-forest-900">{formatCO2(val)}</span>
                  </div>
                ))}
                {isoBreakdown.length === 0 && <p className="text-sm text-ink-400">Aucune donnée saisie</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- YEAR + MONTH SELECTOR ---- */}
      <Reveal>
        <Card className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3.5">
          {/* Year selector */}
          <label className="flex flex-shrink-0 items-center gap-2">
            <Calendar className="size-4 text-gold-500" />
            <span className="text-xs font-semibold text-ink-500">Année</span>
            <select
              value={activeYear}
              onChange={e => setActiveYear(parseInt(e.target.value))}
              className="h-9 cursor-pointer rounded-xl border border-ivory-400 bg-white px-3 text-sm font-semibold text-forest-900 outline-none transition focus:border-forest-500 focus:ring-4 focus:ring-forest-100"
            >
              {(() => {
                const now = new Date().getFullYear()
                const start = Math.min(2000, ...availableYears)
                const end = Math.max(now + 5, ...availableYears)
                const years: number[] = []
                for (let y = end; y >= start; y--) years.push(y)
                return years.map(y => (
                  <option key={y} value={y}>
                    {y}{availableYears.includes(y) ? ' ●' : ''}
                  </option>
                ))
              })()}
            </select>
          </label>

          <span className="hidden h-6 w-px flex-shrink-0 bg-ivory-300 sm:block" />

          {/* Month selector */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-xs font-semibold text-ink-500">Mois</span>
            {MONTHS.map(m => {
              const isActive = activeMonth === m.id
              const isAnnual = m.id === 0
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveMonth(m.id)}
                  title={m.label}
                  className={cn(
                    'h-8 rounded-lg px-2.5 text-xs font-semibold transition-all',
                    isActive
                      ? isAnnual
                        ? 'bg-gold-500 text-forest-950 shadow-soft'
                        : 'bg-forest-900 text-ivory-50 shadow-soft'
                      : 'text-ink-500 hover:bg-ivory-100 hover:text-forest-900',
                    isAnnual && !isActive && 'text-gold-700',
                  )}
                >
                  {m.short}
                </button>
              )
            })}
          </div>
          {activeMonth === 0 && (
            <Badge tone="gold" className="ml-auto">Lecture seule · somme {activeYear}</Badge>
          )}
        </Card>
      </Reveal>

      {/* ---- MAIN TABS ---- */}
      <Reveal>
        <div className="flex flex-wrap gap-1 rounded-2xl border border-ivory-300 bg-ivory-200/60 p-1">
          {TABS.map(tab => {
            const tabTotal = calcTabTotal(tab.id)
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all',
                  isActive
                    ? 'bg-white text-forest-900 shadow-soft ring-1 ring-ivory-300'
                    : 'text-ink-500 hover:bg-white/60 hover:text-forest-900',
                )}
              >
                <Icon className={cn('size-4', isActive ? 'text-gold-500' : 'text-ink-400')} strokeWidth={1.8} />
                <span>{tab.label}</span>
                {tabTotal > 0 && (
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] tabular-nums',
                    isActive ? 'bg-forest-50 text-forest-700' : 'bg-ivory-300/70 text-ink-600',
                  )}>
                    {formatCO2(tabTotal)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </Reveal>

      {/* ---- TAB CONTENT ---- */}
      <div className="space-y-4">
        {(TAB_SECTIONS[activeTab] || []).map(section => {
          const isOpen = openSections[section.id] !== false
          const sectionTotal = calcSectionTotal(section.factors)
          const sc = scopeColor(section.scope)

          return (
            <Card key={section.id} className="overflow-hidden">
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-ivory-50"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span className={cn('flex size-9 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold', sc.square)}>
                    S{section.scope}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-[17px] text-forest-900">{section.label}</h3>
                      <Badge tone={sc.chip}>{section.scopeLabel}</Badge>
                    </div>
                    {section.description && (
                      <p className="mt-0.5 truncate text-xs text-ink-400">{section.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-4">
                  {sectionTotal > 0 && (
                    <span className="text-sm font-semibold tabular-nums text-forest-900">{formatCO2(sectionTotal)}</span>
                  )}
                  <ChevronDown className={cn('size-4 text-ink-400 transition-transform duration-200', !isOpen && '-rotate-90')} />
                </div>
              </button>

              {/* Section table */}
              {isOpen && (
                <div className="border-t border-ivory-300">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-ivory-100 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                          <th className="px-6 py-3 text-left font-semibold" style={{ width: '38%' }}>Source d’émission</th>
                          <th className="px-3 py-3 text-left font-semibold" style={{ width: '8%' }}>Unité</th>
                          <th className="px-3 py-3 text-right font-semibold" style={{ width: '14%' }}>Quantité</th>
                          <th className="px-3 py-3 text-right font-semibold" style={{ width: '10%' }}>FE</th>
                          <th className="px-3 py-3 text-right font-semibold" style={{ width: '18%' }}>Total</th>
                          <th className="px-3 py-3 text-center font-semibold" style={{ width: '12%' }}>Justif.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ivory-200">
                        {section.factors.map(factor => {
                          const qty = getQuantity(factor.id)
                          const upstream = calcUpstream(factor)
                          const combustion = calcCombustion(factor)
                          const total = upstream + combustion
                          return (
                            <tr key={factor.id} className={cn('transition-colors hover:bg-ivory-50', total > 0 && 'bg-forest-50/40')}>
                              <td className="min-w-0 px-6 py-3">
                                <p className="truncate text-sm font-semibold text-ink-800">{factor.nameFr}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <span className="inline-flex items-center rounded-md border border-forest-100 bg-forest-50 px-1.5 py-0.5 text-[10px] font-semibold text-forest-700">{factor.source}</span>
                                  <span className="inline-flex items-center rounded-md bg-ivory-200 px-1.5 py-0.5 font-mono text-[10px] text-ink-600">{factor.sourceRef}</span>
                                  <span className="text-[10px] text-ink-400">{factor.region} ±{(factor.uncertainty * 100).toFixed(0)} %</span>
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-500">{factor.unit.replace('kgCO2eq/', '')}</td>
                              <td className="px-3 py-3">
                                {activeMonth === 0 ? (
                                  <div className="ml-auto w-28 rounded-xl border border-ivory-300 bg-ivory-100 px-3 py-2 text-right text-sm tabular-nums text-ink-600">
                                    {qty ? formatNum(qty) : '–'}
                                  </div>
                                ) : (() => {
                                  const rawKey = `${factor.id}_${activeYear}_${activeMonth}`
                                  const displayed = rawKey in rawValues
                                    ? rawValues[rawKey]
                                    : (qty > 0 ? String(qty) : '')
                                  return (
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={displayed}
                                      onChange={e => {
                                        const raw = e.target.value
                                        // Allow only digits, dot, comma
                                        if (raw !== '' && !/^[\d]*[.,]?[\d]*$/.test(raw)) return
                                        const normalized = raw.replace(',', '.')
                                        setRawValues(prev => ({ ...prev, [rawKey]: raw }))
                                        const parsed = parseFloat(normalized)
                                        setQuantity(factor.id, activeYear, activeMonth, isNaN(parsed) ? 0 : parsed)
                                      }}
                                      onBlur={e => {
                                        const parsed = parseFloat(e.target.value.replace(',', '.')) || 0
                                        setRawValues(prev => ({ ...prev, [rawKey]: parsed > 0 ? String(parsed) : '' }))
                                        setQuantity(factor.id, activeYear, activeMonth, parsed)
                                      }}
                                      className="ml-auto block w-28 rounded-xl border border-ivory-400 bg-white px-3 py-2 text-right text-sm tabular-nums text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-forest-500 focus:ring-4 focus:ring-forest-100"
                                      placeholder="0"
                                      aria-label={`Quantité — ${factor.nameFr}`}
                                    />
                                  )
                                })()}
                              </td>
                              <td className="px-3 py-3 text-right text-xs font-medium tabular-nums text-ink-500">{factor.factorTotal}</td>
                              <td className="px-3 py-3 text-right font-semibold tabular-nums text-forest-900">
                                {total > 0 ? formatCO2(total) : <span className="text-ink-400">–</span>}
                              </td>
                              <td className="px-3 py-3 text-center">
                                {(() => {
                                  const factorDocs = getDocsForFactor(factor.id)
                                  const totalDocs = getDocCount(factor.id)
                                  const hasDocsForView = factorDocs.length > 0
                                  return (
                                    <button
                                      onClick={() => setDocPanel({ factorId: factor.id, factorName: factor.nameFr })}
                                      className={cn(
                                        'inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition-all',
                                        hasDocsForView
                                          ? 'border-forest-200 bg-forest-50 text-forest-700 hover:bg-forest-100'
                                          : qty > 0
                                            ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                            : 'border-ivory-300 bg-white text-ink-400 hover:border-ivory-400 hover:text-ink-600',
                                      )}
                                      title={hasDocsForView ? `${factorDocs.length} justificatif(s)` : 'Ajouter un justificatif'}
                                    >
                                      {hasDocsForView ? (
                                        <>
                                          <Paperclip className="size-3" />
                                          <span>{factorDocs.length}</span>
                                        </>
                                      ) : qty > 0 ? (
                                        <Upload className="size-3" />
                                      ) : (
                                        <Paperclip className="size-3" />
                                      )}
                                      {totalDocs > 0 && totalDocs !== factorDocs.length && (
                                        <span className="text-ink-400">/{totalDocs}</span>
                                      )}
                                    </button>
                                  )
                                })()}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-ivory-300 bg-ivory-100 text-sm">
                          <td colSpan={4} className="px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">Total de la section</td>
                          <td className="px-3 py-3 text-right font-display text-base tabular-nums text-forest-900">{formatCO2(sectionTotal)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* ---- DOCUMENT PANEL (slide-over) ---- */}
      {docPanel && createPortal(
        <div className="fixed inset-0 z-50 flex justify-end font-sans">
          <div className="absolute inset-0 bg-forest-950/40 backdrop-blur-sm animate-in fade-in-0" onClick={() => setDocPanel(null)} />
          <div className="relative flex w-full max-w-md flex-col bg-white shadow-lifted animate-in slide-in-from-right">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-ivory-300 px-6 py-5">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">
                  Justificatifs · {activeMonth === 0 ? `Année ${activeYear}` : `${MONTHS[activeMonth]?.label} ${activeYear}`}
                </p>
                <h3 className="mt-1 truncate font-display text-xl text-forest-900">{docPanel.factorName}</h3>
              </div>
              <button
                onClick={() => setDocPanel(null)}
                className="flex size-8 flex-shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ivory-100 hover:text-ink-700"
                aria-label="Fermer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Upload area */}
            {activeMonth !== 0 && (
              <div className="border-b border-ivory-300 p-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleUpload(file)
                    e.target.value = ''
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ivory-400 bg-ivory-50 px-4 py-6 text-sm text-ink-500 transition-all hover:border-forest-300 hover:bg-forest-50/50 hover:text-forest-800 disabled:opacity-60"
                >
                  <span className="flex size-10 items-center justify-center rounded-full border border-ivory-300 bg-white text-forest-600">
                    {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  </span>
                  <span className="font-semibold">{uploading ? 'Envoi en cours…' : 'Téléverser un justificatif'}</span>
                  <span className="text-[11px] text-ink-400">PDF, images, Excel, Word · 10 Mo max.</span>
                </button>
              </div>
            )}
            {activeMonth === 0 && (
              <div className="border-b border-gold-200 bg-gold-50 px-6 py-3">
                <p className="text-xs text-gold-700">Sélectionnez un mois pour téléverser un justificatif.</p>
              </div>
            )}

            {/* Documents list */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                const panelDocs = getDocsForFactor(docPanel.factorId)
                if (panelDocs.length === 0) {
                  return (
                    <EmptyState
                      icon={Paperclip}
                      title="Aucun justificatif"
                      description="Ajoutez une facture ou un relevé pour justifier cette entrée."
                    />
                  )
                }
                return (
                  <ul className="space-y-2">
                    {panelDocs.map(doc => (
                      <li key={doc.id} className="group flex items-center gap-3 rounded-xl border border-ivory-300 bg-white p-3 transition-colors hover:border-forest-200 hover:bg-ivory-50">
                        <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-600">
                          <FileText className="size-4" strokeWidth={1.8} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink-800">{doc.original_name}</p>
                          <p className="text-[11px] text-ink-400">
                            {formatFileSize(doc.file_size)} · {MONTHS[doc.month]?.short} {doc.year} · {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                          <a
                            href={`/api/documents/${doc.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex size-8 items-center justify-center rounded-lg text-ink-500 hover:bg-white hover:text-forest-700"
                            title="Voir"
                          >
                            <Eye className="size-3.5" />
                          </a>
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="flex size-8 items-center justify-center rounded-lg text-ink-500 hover:bg-red-50 hover:text-red-600"
                            title="Supprimer"
                          >
                            <Trash className="size-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              })()}
            </div>

            {/* Footer summary */}
            <div className="border-t border-ivory-300 bg-ivory-50 px-6 py-3 text-center text-[11px] text-ink-500">
              {getDocCount(docPanel.factorId)} justificatif(s) au total pour cette source
            </div>
          </div>
        </div>
      , document.body)}

      {/* ---- Reference standards ---- */}
      <Reveal>
        <Card>
          <CardHeader eyebrow="Méthodologie" title="Normes et standards de référence" />
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { name: 'ISO 14064', text: 'Spécification et lignes directrices pour la quantification et la déclaration des émissions de GES.' },
              { name: 'ISO 14069', text: 'Lignes directrices pour l’application de l’ISO 14064-1 — catégories d’émissions.' },
              { name: 'GHG Protocol', text: 'Corporate Standard — scopes 1, 2 et 3, catégories 1 à 15 du protocole.' },
              { name: 'Bilan Carbone®', text: 'Méthode de l’ADEME — Base Carbone, facteurs d’émission France et Europe.' },
            ].map(s => (
              <div key={s.name} className="rounded-xl border border-ivory-300 bg-ivory-50 p-4">
                <p className="font-display text-base text-forest-900">{s.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-500">{s.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </Reveal>
    </Stagger>
  )
}
