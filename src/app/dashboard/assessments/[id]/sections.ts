import { Flame, Package, Truck, Users, Trash2, Building, Factory, type LucideIcon } from 'lucide-react'
import type { LibraryFactor } from '@/lib/factor-library'

/* 7 main tabs, matching the sheets of the Carbon-Footprint template */
export const TABS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'energy',     label: 'Énergie',         icon: Flame },
  { id: 'non_energy', label: 'Hors énergie',    icon: Factory },
  { id: 'inputs',     label: 'Intrants',        icon: Package },
  { id: 'freight',    label: 'Fret',            icon: Truck },
  { id: 'transport',  label: 'Transport',       icon: Users },
  { id: 'waste',      label: 'Déchets',         icon: Trash2 },
  { id: 'capital',    label: 'Immobilisations', icon: Building },
]

export interface SubSection {
  id: string
  label: string
  scope: 1 | 2 | 3
  factors: LibraryFactor[]
  description?: string
}

type SectionDef = Omit<SubSection, 'factors'> & { subcategories: string[] }

/* Sections of each tab, defined by the factor subcategories they gather. Factors come from the library (DB). */
export const SECTION_DEFS: Record<string, SectionDef[]> = {
  energy: [
    { id: 'fuels_stationary', label: 'Combustibles fossiles (sources fixes)', scope: 1, subcategories: ['fuels_stationary'], description: 'Butane, propane, gaz naturel, gazole, charbon, coke — consommation directe sur site' },
    { id: 'fuels_organic', label: 'Combustibles d’origine organique', scope: 1, subcategories: ['fuels_organic'], description: 'Biodiesel, biométhane, bois, granulés — sources renouvelables' },
    { id: 'fuels_mobile', label: 'Combustibles (sources mobiles)', scope: 1, subcategories: ['fuels_mobile'], description: 'Essence, gazole, GPL, GNL, kérosène — véhicules et engins' },
    { id: 'steam', label: 'Achat de vapeur et de froid', scope: 2, subcategories: ['steam', 'cooling'], description: 'Réseaux de chaleur et de froid' },
    { id: 'electricity', label: 'Achat d’électricité', scope: 2, subcategories: ['electricity'], description: 'Électricité par pays et par usage (chauffage, industrie, transport…)' },
  ],
  non_energy: [
    { id: 'refrigerants', label: 'Fluides frigorigènes (HFC)', scope: 1, subcategories: ['refrigerants'], description: 'Fuites de climatisation et de réfrigération' },
    { id: 'process', label: 'Émissions de procédés', scope: 1, subcategories: ['process'], description: 'CO₂, N₂O, CH₄ — émissions directes hors combustion' },
  ],
  inputs: [
    { id: 'metals', label: 'Métaux', scope: 3, subcategories: ['metals'], description: 'Acier, aluminium, cuivre, nickel — neufs et recyclés' },
    { id: 'plastics', label: 'Plastiques', scope: 3, subcategories: ['plastics'], description: 'PET, PEHD, PVC, nylon, plastique moyen' },
    { id: 'other_inputs', label: 'Verre, papier, construction, eau', scope: 3, subcategories: ['glass', 'paper', 'construction', 'utilities'], description: 'Verre, papier/carton, béton, ciment, eau potable' },
  ],
  freight: [
    { id: 'road', label: 'Fret routier', scope: 3, subcategories: ['road'], description: 'Camions articulés, rigides, utilitaires' },
    { id: 'air_freight', label: 'Fret aérien', scope: 3, subcategories: ['air'], description: 'Transport aérien de marchandises' },
    { id: 'rail_freight', label: 'Fret ferroviaire', scope: 3, subcategories: ['rail'], description: 'Transport ferroviaire de marchandises' },
    { id: 'maritime_freight', label: 'Fret maritime et fluvial', scope: 3, subcategories: ['maritime', 'river'], description: 'Conteneur maritime, fret fluvial' },
  ],
  transport: [
    { id: 'car', label: 'Voitures', scope: 3, subcategories: ['car'], description: 'Essence, gazole, électrique, hybride' },
    { id: 'public', label: 'Transports en commun', scope: 3, subcategories: ['bus', 'train', 'metro'], description: 'Bus, TGV, TER, métro' },
    { id: 'plane', label: 'Avion', scope: 3, subcategories: ['plane'], description: 'Court, moyen et long-courrier' },
  ],
  waste: [
    { id: 'building_waste', label: 'Déchets du bâtiment', scope: 3, subcategories: ['building'], description: 'Béton, bois, déchets inertes, plâtre' },
    { id: 'mineral_waste', label: 'Déchets minéraux', scope: 3, subcategories: ['mineral'], description: 'Incinération, enfouissement' },
    { id: 'organic_waste', label: 'Déchets organiques', scope: 3, subcategories: ['organic'], description: 'Compost, papier, carton' },
    { id: 'plastic_waste', label: 'Déchets plastiques', scope: 3, subcategories: ['plastic'], description: 'Plastique moyen, PE, PVC' },
    { id: 'household_waste', label: 'Ordures ménagères', scope: 3, subcategories: ['household'], description: 'Déchets ménagers courants' },
    { id: 'dangerous_waste', label: 'Déchets dangereux', scope: 3, subcategories: ['dangerous'], description: 'Déchets industriels spéciaux' },
    { id: 'wastewater', label: 'Eaux usées', scope: 3, subcategories: ['water'], description: 'Traitement des eaux usées' },
  ],
  capital: [
    { id: 'buildings', label: 'Bâtiments (méthode surface)', scope: 3, subcategories: ['buildings'], description: 'Bureau, entrepôt, industriel — kgCO₂e/m² amorti' },
    { id: 'vehicles', label: 'Véhicules', scope: 3, subcategories: ['vehicles'], description: 'Véhicules de société, camions' },
    { id: 'it', label: 'Informatique', scope: 3, subcategories: ['it'], description: 'Ordinateurs, serveurs, smartphones' },
    { id: 'furniture', label: 'Mobilier', scope: 3, subcategories: ['furniture'], description: 'Bureaux, chaises' },
  ],
}

/**
 * Tab → sections with their factors. Retired factors appear only where the bilan already uses them.
 * Factors whose subcategory no section claims (new imports) go to an "Autres sources" section of their tab.
 */
export function buildSections(factors: LibraryFactor[], usedIds: Set<string> = new Set()): Record<string, SubSection[]> {
  const visible = factors.filter(f => f.status === 'active' || usedIds.has(f.id))
  const out: Record<string, SubSection[]> = {}
  for (const tab of TABS) {
    const defs = SECTION_DEFS[tab.id] ?? []
    const claimed = new Set(defs.flatMap(d => d.subcategories))
    const inTab = visible.filter(f => f.category === tab.id)
    const sections: SubSection[] = defs.map(({ subcategories, ...d }) => ({ ...d, factors: inTab.filter(f => subcategories.includes(f.subcategory)) }))
    const other = inTab.filter(f => !claimed.has(f.subcategory))
    for (const scope of [1, 2, 3] as const) {
      const list = other.filter(f => f.scope === scope)
      if (list.length) sections.push({ id: `other_${tab.id}_${scope}`, label: 'Autres sources', scope, factors: list, description: 'Sources ajoutées à la bibliothèque' })
    }
    out[tab.id] = sections
  }
  return out
}

/** Accent- and case-insensitive key for search */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** "kgCO2eq/litre" → "litre" */
export const unitLabel = (unit: string) => unit.replace(/^kgCO2eq\//, '').replace('m³', 'm³')

export const UPLOAD_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.xlsx,.docx,.xls,.doc,.csv'
export const UPLOAD_EXTENSIONS = UPLOAD_ACCEPT.split(',').map(e => e.slice(1))
export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024
