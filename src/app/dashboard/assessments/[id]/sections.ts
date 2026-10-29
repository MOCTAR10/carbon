import { Flame, Package, Truck, Users, Trash2, Building, Factory, type LucideIcon } from 'lucide-react'
import {
  ENERGY_FUELS_STATIONARY, ENERGY_FUELS_ORGANIC, ENERGY_FUELS_MOBILE,
  ELECTRICITY_FACTORS, STEAM_COOLING_FACTORS, REFRIGERANT_FACTORS,
  INPUTS_METALS, INPUTS_PLASTICS, INPUTS_OTHER,
  FREIGHT_FACTORS, TRANSPORT_PEOPLE_FACTORS, WASTE_FACTORS, CAPITAL_GOODS_FACTORS,
  type EmissionFactor,
} from '@/lib/emission-factors'

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
  factors: EmissionFactor[]
  description?: string
}

const sub = (list: EmissionFactor[], ...subs: string[]) => list.filter(f => subs.includes(f.subcategory))

export const TAB_SECTIONS: Record<string, SubSection[]> = {
  energy: [
    { id: 'fuels_stationary', label: 'Combustibles fossiles (sources fixes)', scope: 1, factors: ENERGY_FUELS_STATIONARY, description: 'Butane, propane, gaz naturel, gazole, charbon, coke — consommation directe sur site' },
    { id: 'fuels_organic', label: 'Combustibles d’origine organique', scope: 1, factors: ENERGY_FUELS_ORGANIC, description: 'Biodiesel, biométhane, bois, granulés — sources renouvelables' },
    { id: 'fuels_mobile', label: 'Combustibles (sources mobiles)', scope: 1, factors: ENERGY_FUELS_MOBILE, description: 'Essence, gazole, GPL, GNL, kérosène — véhicules et engins' },
    { id: 'steam', label: 'Achat de vapeur et de froid', scope: 2, factors: STEAM_COOLING_FACTORS, description: 'Réseaux de chaleur et de froid' },
    { id: 'electricity', label: 'Achat d’électricité', scope: 2, factors: ELECTRICITY_FACTORS, description: 'Électricité par pays et par usage (chauffage, industrie, transport…)' },
  ],
  non_energy: [
    { id: 'refrigerants', label: 'Fluides frigorigènes (HFC)', scope: 1, factors: sub(REFRIGERANT_FACTORS, 'refrigerants'), description: 'Fuites de climatisation et de réfrigération' },
    { id: 'process', label: 'Émissions de procédés', scope: 1, factors: sub(REFRIGERANT_FACTORS, 'process'), description: 'CO₂, N₂O, CH₄ — émissions directes hors combustion' },
  ],
  inputs: [
    { id: 'metals', label: 'Métaux', scope: 3, factors: INPUTS_METALS, description: 'Acier, aluminium, cuivre, nickel — neufs et recyclés' },
    { id: 'plastics', label: 'Plastiques', scope: 3, factors: INPUTS_PLASTICS, description: 'PET, PEHD, PVC, nylon, plastique moyen' },
    { id: 'other_inputs', label: 'Verre, papier, construction, eau', scope: 3, factors: INPUTS_OTHER, description: 'Verre, papier/carton, béton, ciment, eau potable' },
  ],
  freight: [
    { id: 'road', label: 'Fret routier', scope: 3, factors: sub(FREIGHT_FACTORS, 'road'), description: 'Camions articulés, rigides, utilitaires' },
    { id: 'air_freight', label: 'Fret aérien', scope: 3, factors: sub(FREIGHT_FACTORS, 'air'), description: 'Transport aérien de marchandises' },
    { id: 'rail_freight', label: 'Fret ferroviaire', scope: 3, factors: sub(FREIGHT_FACTORS, 'rail'), description: 'Transport ferroviaire de marchandises' },
    { id: 'maritime_freight', label: 'Fret maritime et fluvial', scope: 3, factors: sub(FREIGHT_FACTORS, 'maritime', 'river'), description: 'Conteneur maritime, fret fluvial' },
  ],
  transport: [
    { id: 'car', label: 'Voitures', scope: 3, factors: sub(TRANSPORT_PEOPLE_FACTORS, 'car'), description: 'Essence, gazole, électrique, hybride' },
    { id: 'public', label: 'Transports en commun', scope: 3, factors: sub(TRANSPORT_PEOPLE_FACTORS, 'bus', 'train', 'metro'), description: 'Bus, TGV, TER, métro' },
    { id: 'plane', label: 'Avion', scope: 3, factors: sub(TRANSPORT_PEOPLE_FACTORS, 'plane'), description: 'Court, moyen et long-courrier' },
  ],
  waste: [
    { id: 'building_waste', label: 'Déchets du bâtiment', scope: 3, factors: sub(WASTE_FACTORS, 'building'), description: 'Béton, bois, déchets inertes, plâtre' },
    { id: 'mineral_waste', label: 'Déchets minéraux', scope: 3, factors: sub(WASTE_FACTORS, 'mineral'), description: 'Incinération, enfouissement' },
    { id: 'organic_waste', label: 'Déchets organiques', scope: 3, factors: sub(WASTE_FACTORS, 'organic'), description: 'Compost, papier, carton' },
    { id: 'plastic_waste', label: 'Déchets plastiques', scope: 3, factors: sub(WASTE_FACTORS, 'plastic'), description: 'Plastique moyen, PE, PVC' },
    { id: 'household_waste', label: 'Ordures ménagères', scope: 3, factors: sub(WASTE_FACTORS, 'household'), description: 'Déchets ménagers courants' },
    { id: 'dangerous_waste', label: 'Déchets dangereux', scope: 3, factors: sub(WASTE_FACTORS, 'dangerous'), description: 'Déchets industriels spéciaux' },
    { id: 'wastewater', label: 'Eaux usées', scope: 3, factors: sub(WASTE_FACTORS, 'water'), description: 'Traitement des eaux usées' },
  ],
  capital: [
    { id: 'buildings', label: 'Bâtiments (méthode surface)', scope: 3, factors: sub(CAPITAL_GOODS_FACTORS, 'buildings'), description: 'Bureau, entrepôt, industriel — kgCO₂e/m² amorti' },
    { id: 'vehicles', label: 'Véhicules', scope: 3, factors: sub(CAPITAL_GOODS_FACTORS, 'vehicles'), description: 'Véhicules de société, camions' },
    { id: 'it', label: 'Informatique', scope: 3, factors: sub(CAPITAL_GOODS_FACTORS, 'it'), description: 'Ordinateurs, serveurs, smartphones' },
    { id: 'furniture', label: 'Mobilier', scope: 3, factors: sub(CAPITAL_GOODS_FACTORS, 'furniture'), description: 'Bureaux, chaises' },
  ],
}

/** Accent- and case-insensitive key for search */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** "kgCO2eq/litre" → "litre" */
export const unitLabel = (unit: string) => unit.replace(/^kgCO2eq\//, '').replace('m³', 'm³')

export const UPLOAD_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.xlsx,.docx,.xls,.doc,.csv'
export const UPLOAD_EXTENSIONS = UPLOAD_ACCEPT.split(',').map(e => e.slice(1))
export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024
