// Copilote carbone — business rules, no AI. Pure functions shared by the bilan page and the tests.
//   1. Activity profile: yes/no questions, pre-answered from the company sector and the site type.
//   2. Collection plan: the postes the profile implies, with method, proofs and usual mistakes per poste.
//   3. Audit checks: missing months, outliers and unit slips, double counting, wrong-country electricity,
//      energy intensity, year-on-year consistency, proofs, retired factors.
//   4. Analysis: hotspots and factor uncertainty (IPCC 2006 vol.1 ch.3, approach 1 propagation).
//   5. Pre-certification checklist.
import type { LibraryFactor } from '@/lib/factor-library'
import { CATEGORY_LABELS, SUBCATEGORY_LABELS } from '@/lib/emission-factors'

export type Answers = Record<string, boolean>

export interface Context {
  sector: string | null
  siteType: string | null
  country: string | null
  /** Site floor area, m² */
  surface: number | null
}

export interface Question {
  id: string
  label: string
  help: string
  /** Suggested "yes" for these sectors / site types (always when `always`) */
  sectors?: string[]
  siteTypes?: string[]
  always?: boolean
}

const AGRO = ['agriculture', 'agroalimentaire']
const HOSPITALITY = ['tourisme', 'education', 'sante']

export const QUESTIONS: Question[] = [
  { id: 'grid', label: 'Le site est-il raccordé au réseau électrique ?', help: 'Factures SEEG ou du fournisseur local, en kWh.', always: true },
  { id: 'generator', label: 'Utilisez-vous un groupe électrogène ?', help: 'Secours ou production : litres de gazole achetés ou consommés.', sectors: ['petrole_gaz', 'mines', 'foresterie', 'construction', 'telecom', 'sante', 'tourisme', 'industrie', 'agroalimentaire', 'banque', 'commerce'], siteTypes: ['chantier', 'usine', 'datacenter', 'clinique', 'hotel', 'exploitation_agricole', 'agence', 'supermarche'] },
  { id: 'cooling', label: 'Le site est-il climatisé ou équipé de chambres froides ?', help: 'Les recharges de fluide frigorigène (fuites) figurent sur les fiches d’intervention.', siteTypes: ['bureau', 'agence', 'boutique', 'magasin', 'supermarche', 'hotel', 'clinique', 'datacenter', 'restaurant', 'laboratoire', 'entrepot'], sectors: ['banque', 'telecom', 'tech', 'administration', 'commerce'] },
  { id: 'vehicles', label: 'Des véhicules ou engins de l’entreprise sont-ils rattachés au site ?', help: 'Carburant des véhicules de service, pick-up, camions, engins de chantier.', sectors: ['petrole_gaz', 'mines', 'foresterie', 'construction', 'transport', 'agriculture', 'commerce', 'telecom', 'eau', 'energie'], siteTypes: ['chantier', 'garage', 'logistique', 'exploitation_agricole', 'usine'] },
  { id: 'cooking', label: 'Cuisinez-vous au gaz, au charbon de bois ou au bois ?', help: 'Bouteilles de butane, charbon de bois : kg ou tonnes achetés.', siteTypes: ['restaurant', 'hotel', 'ecole', 'clinique'], sectors: HOSPITALITY },
  { id: 'heat', label: 'Avez-vous des chaudières, fours ou séchoirs ?', help: 'Gaz naturel, fioul, charbon, bois ou granulés brûlés pour la chaleur.', siteTypes: ['usine'], sectors: ['industrie', 'agroalimentaire', 'chimie', 'foresterie', 'emballage'] },
  { id: 'vessels', label: 'Exploitez-vous des navires, barges ou bateaux ?', help: 'Soutes de fioul ou de gasoil marin, y compris navires de soutien offshore.', sectors: ['petrole_gaz', 'peche', 'transport'] },
  { id: 'flaring', label: 'Le site a-t-il des torchères ou des évents de gaz ?', help: 'Volumes de gaz torché ou ventilé (m³), relevés de production.', sectors: ['petrole_gaz'] },
  { id: 'effluents', label: 'Traitez-vous des effluents sur site (lagunes, bassins, digesteur) ?', help: 'Huileries (POME), agro-industrie, stations d’épuration : DCO ou volumes.', sectors: [...AGRO, 'eau', 'chimie'], siteTypes: ['usine'] },
  { id: 'process', label: 'Avez-vous des procédés chimiques ou de calcination ?', help: 'Ciment, chaux, calcaire, réactions chimiques émettant du CO₂ ou du N₂O.', sectors: ['chimie', 'mines'] },
  { id: 'camp', label: 'Du personnel est-il logé sur site (base-vie, camp) ?', help: 'Nombre de résidents permanents : assainissement (fosses, latrines).', sectors: ['petrole_gaz', 'mines', 'foresterie'], siteTypes: ['chantier'] },
  { id: 'materials', label: 'Achetez-vous des matières ou matériaux en quantité ?', help: 'Métaux, plastiques, emballages, béton, ciment, papier…', sectors: ['industrie', 'construction', 'emballage', 'agroalimentaire', 'chimie', 'commerce'], siteTypes: ['usine', 'chantier'] },
  { id: 'food', label: 'Servez-vous des repas (cantine, restaurant, hôtel) ?', help: 'Tonnes de denrées achetées.', siteTypes: ['restaurant', 'hotel', 'ecole', 'clinique'], sectors: ['tourisme'] },
  { id: 'freight', label: 'Faites-vous transporter des marchandises ?', help: 'Achats livrés, expéditions, export : tonnes × km par mode.', sectors: ['commerce', 'industrie', 'agroalimentaire', 'mines', 'foresterie', 'petrole_gaz', 'transport', 'construction'], siteTypes: ['entrepot', 'logistique', 'usine', 'supermarche', 'magasin'] },
  { id: 'travel', label: 'Votre personnel prend-il l’avion pour des missions ?', help: 'Billets : distance ou trajets par classe.', sectors: ['petrole_gaz', 'mines', 'banque', 'ong', 'organisations_int', 'administration', 'tech', 'telecom'] },
  { id: 'commute', label: 'Suivez-vous les trajets domicile-travail ?', help: 'Navettes, bus du personnel, véhicules personnels (km).', always: true },
  { id: 'waste', label: 'Le site produit-il des déchets ?', help: 'Ordures, DIB, déchets dangereux : tonnes enlevées.', always: true },
  { id: 'water', label: 'Consommez-vous de l’eau du réseau ?', help: 'Factures d’eau (m³).', always: true },
  { id: 'capital', label: 'Avez-vous acquis des équipements durables cette année ?', help: 'Véhicules, informatique, mobilier, bâtiments (amortis).', always: true },
]

export function suggestedAnswer(q: Question, ctx: Context): boolean {
  if (q.always) return true
  return (!!ctx.sector && !!q.sectors?.includes(ctx.sector)) || (!!ctx.siteType && !!q.siteTypes?.includes(ctx.siteType))
}

/** Saved answers win; unanswered questions take the suggestion. */
export function resolveAnswers(saved: Answers, ctx: Context): Answers {
  return Object.fromEntries(QUESTIONS.map(q => [q.id, saved[q.id] ?? suggestedAnswer(q, ctx)]))
}

/* ---------------- Collection plan ---------------- */

export interface PlanItemDef {
  id: string
  question: string
  label: string
  /** What to collect, in plain words */
  collect: string
  /** Reporting frameworks the poste belongs to */
  standard: string
  /** Proofs the expert will ask for */
  proof: string
  /** Most frequent mistakes on this poste */
  pitfalls: string
  tab: string
  subcategories: string[]
  /** If set, only factors whose name/keywords contain one of these words count for this poste */
  match?: string[]
  /** Factor ids offered first (those missing from the library are skipped) */
  suggest: string[]
  /** Data expected every month of the period */
  monthly: boolean
  /** Physical energy: the same consumption must not appear under two factors */
  energy?: boolean
}

export const PLAN: PlanItemDef[] = [
  { id: 'electricity', question: 'grid', label: 'Électricité du réseau', collect: 'kWh de chaque facture mensuelle',
    standard: 'GHG Protocol scope 2 (méthode location-based) · ISO 14064-1 catégorie 2',
    proof: 'Factures du fournisseur (SEEG…), une par mois et par compteur', pitfalls: 'Saisir des MWh au lieu de kWh ; oublier un compteur ; utiliser le facteur d’un autre pays.',
    tab: 'energy', subcategories: ['electricity'], suggest: [], monthly: true, energy: true },
  { id: 'generator', question: 'generator', label: 'Groupe électrogène', collect: 'Litres de gazole par mois (bons de livraison, relevés de cuve)',
    standard: 'GHG Protocol scope 1, combustion fixe · ISO 14064-1 catégorie 1',
    proof: 'Bons de livraison carburant, relevés de jauge, registre du groupe', pitfalls: 'Compter aussi ce gazole dans les véhicules ; saisir des m³ au lieu de litres ; oublier les groupes de secours.',
    tab: 'energy', subcategories: ['fuels_stationary'], match: ['gazole', 'diesel', 'gasoil', 'fioul', 'fuel', 'groupe electrogene'], suggest: ['defra24_diesel_station_l', 'defra24_gas_oil_l', 'defra24_fuel_oil_l'], monthly: true, energy: true },
  { id: 'refrigerants', question: 'cooling', label: 'Fluides frigorigènes', collect: 'kg de fluide rechargé (fiches d’intervention du frigoriste)',
    standard: 'GHG Protocol scope 1, émissions fugitives · ISO 14064-1 catégorie 1',
    proof: 'Fiches d’intervention ou factures de recharge indiquant le fluide et les kg', pitfalls: 'Déclarer la charge totale de l’appareil au lieu de la quantité rechargée ; se tromper de fluide (R-22, R-410A, R-32).',
    tab: 'non_energy', subcategories: ['refrigerants'], suggest: ['r410a', 'r32', 'defra24_r22', 'r134a', 'r404a'], monthly: false },
  { id: 'vehicles', question: 'vehicles', label: 'Carburant des véhicules et engins', collect: 'Litres par mois (cartes carburant, bons)',
    standard: 'GHG Protocol scope 1, combustion mobile · ISO 14064-1 catégorie 1',
    proof: 'Relevés de cartes carburant, bons de pompe, registre de la cuve', pitfalls: 'Compter aussi les kilomètres des mêmes véhicules ; mélanger essence et gazole.',
    tab: 'energy', subcategories: ['fuels_mobile'], suggest: ['defra24_diesel_mobile_l', 'defra24_petrol_l'], monthly: true, energy: true },
  { id: 'cooking', question: 'cooking', label: 'Gaz et charbon de cuisine', collect: 'kg de butane (bouteilles) ou de charbon de bois achetés',
    standard: 'GHG Protocol scope 1, combustion fixe · ISO 14064-1 catégorie 1',
    proof: 'Factures de bouteilles (nombre × 12,5 kg) ou de sacs de charbon', pitfalls: 'Saisir le nombre de bouteilles au lieu des kg.',
    tab: 'energy', subcategories: ['fuels_stationary', 'fuels_organic'], match: ['butane', 'propane', 'gpl', 'charbon de bois', 'bois de feu'], suggest: ['defra24_butane_kg', 'ipcc_charcoal_t', 'ipcc_firewood_t'], monthly: false, energy: true },
  { id: 'heat', question: 'heat', label: 'Chaudières, fours et séchoirs', collect: 'Quantités de combustible par mois',
    standard: 'GHG Protocol scope 1, combustion fixe · ISO 14064-1 catégorie 1',
    proof: 'Factures de combustible, compteurs gaz, registres de production', pitfalls: 'Mélanger tonnes et kg ; compter deux fois le combustible des groupes électrogènes.',
    tab: 'energy', subcategories: ['fuels_stationary', 'fuels_organic'], match: ['gaz naturel', 'fioul', 'fuel', 'charbon', 'coke', 'bois', 'granules', 'biomasse', 'chaudiere', 'four'], suggest: ['defra24_natural_gas_m3', 'defra24_fuel_oil_t', 'ipcc_firewood_t'], monthly: true, energy: true },
  { id: 'marine', question: 'vessels', label: 'Combustibles marins', collect: 'Tonnes ou litres soutés (bons de soutage)',
    standard: 'GHG Protocol scope 1, combustion mobile · ISO 14064-1 catégorie 1',
    proof: 'Bunker Delivery Notes (BDN), journaux de bord', pitfalls: 'Mélanger tonnes et litres pour un même navire ; oublier les navires affrétés exploités par l’entreprise.',
    tab: 'energy', subcategories: ['marine_fuels'], suggest: ['defra24_mgo_t', 'imo_hfo_t', 'imo_vlsfo_t'], monthly: true, energy: true },
  { id: 'flaring', question: 'flaring', label: 'Torchage et ventage', collect: 'm³ de gaz torché et ventilé (relevés de production)',
    standard: 'GHG Protocol scope 1 (combustion et fugitives) · ISO 14064-1 catégorie 1',
    proof: 'Rapports de production, débitmètres de torche, analyses de gaz', pitfalls: 'Utiliser le facteur gaz sec pour un gaz associé riche ; oublier le ventage lors des arrêts de torche.',
    tab: 'non_energy', subcategories: ['flaring_venting'], suggest: ['flare_assoc_gas_m3', 'vent_assoc_gas_m3'], monthly: true },
  { id: 'effluents', question: 'effluents', label: 'Effluents et biogaz', collect: 'kg de DCO traités, ou tonnes de régimes (huileries)',
    standard: 'GHG Protocol scope 1, émissions fugitives · ISO 14064-1 catégorie 1',
    proof: 'Analyses DCO du laboratoire, volumes d’effluents, registres de régimes traités', pitfalls: 'Choisir un type de lagune inadapté (profonde > 2 m vs peu profonde) ; saisir la DCO en mg/L au lieu de kg.',
    tab: 'non_energy', subcategories: ['effluents_biogas'], match: ['dco', 'pome', 'biogaz', 'azote', 'lagune', 'effluent'], suggest: ['effluent_lagoon_deep_cod', 'pome_open_lagoon_ffb', 'biogas_enclosed_flare_m3'], monthly: false },
  { id: 'process', question: 'process', label: 'Émissions de procédés', collect: 'Tonnes de calcaire, clinker, chaux ou gaz émis',
    standard: 'GHG Protocol scope 1, procédés · ISO 14064-1 catégorie 1',
    proof: 'Registres de production, bilans matière, analyses', pitfalls: 'Compter le combustible du four dans le procédé (il va en combustion fixe).',
    tab: 'non_energy', subcategories: ['process'], suggest: ['ipcc_clinker_t', 'ipcc_limestone_t', 'co2_process'], monthly: false },
  { id: 'camp', question: 'camp', label: 'Assainissement de la base-vie', collect: 'Nombre de résidents permanents sur l’année',
    standard: 'GHG Protocol scope 1 · ISO 14064-1 catégorie 1',
    proof: 'Registre d’hébergement, effectifs moyens logés', pitfalls: 'Saisir le nombre de résidents chaque mois (le facteur est annuel : une seule valeur).',
    tab: 'non_energy', subcategories: ['effluents_biogas'], match: ['resident', 'fosse', 'latrine'], suggest: ['septic_resident_yr', 'latrine_resident_yr'], monthly: false },
  { id: 'materials', question: 'materials', label: 'Achats de matières', collect: 'Tonnes achetées (factures fournisseurs)',
    standard: 'GHG Protocol scope 3, catégorie 1 (achats) · ISO 14064-1 catégorie 4',
    proof: 'Factures fournisseurs avec quantités', pitfalls: 'Saisir des montants en FCFA au lieu de tonnes ; oublier les emballages.',
    tab: 'inputs', subcategories: ['metals', 'plastics', 'glass', 'paper', 'construction', 'tyres', 'textiles', 'lubricants'], suggest: ['steel_fr', 'defra24_plastics_avg_t', 'defra24_concrete_t', 'cement_fr'], monthly: false },
  { id: 'food', question: 'food', label: 'Alimentation', collect: 'Tonnes de denrées achetées',
    standard: 'GHG Protocol scope 3, catégorie 1 (achats) · ISO 14064-1 catégorie 4',
    proof: 'Factures des fournisseurs de denrées ou du prestataire de restauration', pitfalls: 'Saisir des kg au lieu de tonnes.',
    tab: 'inputs', subcategories: ['food'], suggest: ['defra24_food_t'], monthly: false },
  { id: 'freight', question: 'freight', label: 'Fret de marchandises', collect: 'Tonnes × km par mode (route, mer, air, rail)',
    standard: 'GHG Protocol scope 3, catégories 4 et 9 (transport) · ISO 14064-1 catégorie 3',
    proof: 'Connaissements, lettres de voiture, factures de transporteurs (poids et trajets)', pitfalls: 'Saisir des km sans multiplier par les tonnes ; compter un fret déjà inclus dans votre carburant (flotte propre).',
    tab: 'freight', subcategories: ['road', 'maritime', 'air', 'rail', 'river'], suggest: ['defra24_hgv_avg_tkm', 'defra24_container_ship_tkm', 'defra24_air_freight_tkm'], monthly: false },
  { id: 'travel', question: 'travel', label: 'Déplacements en avion', collect: 'Passagers × km par classe (agence de voyage)',
    standard: 'GHG Protocol scope 3, catégorie 6 · ISO 14064-1 catégorie 3',
    proof: 'Relevé de l’agence de voyage ou billets (origine, destination, classe)', pitfalls: 'Compter un aller-retour comme un aller ; ignorer la classe (affaires ≈ 3 × économique).',
    tab: 'transport', subcategories: ['plane'], suggest: ['defra24_flight_economy_pkm', 'defra24_flight_business_pkm'], monthly: false },
  { id: 'commute', question: 'commute', label: 'Trajets domicile-travail', collect: 'km parcourus (enquête, navettes)',
    standard: 'GHG Protocol scope 3, catégorie 7 · ISO 14064-1 catégorie 3',
    proof: 'Enquête mobilité du personnel, contrats de navettes', pitfalls: 'Compter les véhicules de service (déjà en carburant, scope 1).',
    tab: 'transport', subcategories: ['car', 'bus', 'train', 'metro', 'ferry'], suggest: ['defra24_car_diesel_km', 'defra24_bus_pkm', 'defra24_taxi_pkm'], monthly: false },
  { id: 'waste', question: 'waste', label: 'Déchets', collect: 'Tonnes enlevées par type (bordereaux)',
    standard: 'GHG Protocol scope 3, catégorie 5 · ISO 14064-1 catégorie 4',
    proof: 'Bordereaux d’enlèvement, pesées, contrats de collecte', pitfalls: 'Estimer en volume (m³) au lieu de tonnes ; choisir l’incinération alors que les déchets vont en décharge.',
    tab: 'waste', subcategories: ['household', 'organic', 'plastic', 'building', 'mineral', 'dangerous'], suggest: ['defra24_ci_waste_landfill_t', 'waste_household', 'defra24_food_waste_landfill_t'], monthly: false },
  { id: 'water', question: 'water', label: 'Eau', collect: 'm³ des factures d’eau',
    standard: 'GHG Protocol scope 3, catégorie 1 · ISO 14064-1 catégorie 4',
    proof: 'Factures d’eau', pitfalls: 'Saisir des litres au lieu de m³.',
    tab: 'inputs', subcategories: ['utilities', 'water'], suggest: ['defra24_water_supply_m3'], monthly: false },
  { id: 'capital', question: 'capital', label: 'Immobilisations', collect: 'Nombre d’équipements ou m² acquis',
    standard: 'GHG Protocol scope 3, catégorie 2 · ISO 14064-1 catégorie 4',
    proof: 'Registre des immobilisations, factures d’achat', pitfalls: 'Saisir tout le parc existant au lieu des seuls achats de l’année.',
    tab: 'capital', subcategories: ['buildings', 'vehicles', 'it', 'furniture'], suggest: ['it_laptop', 'vehicle_car'], monthly: false },
]

/** Accent- and case-insensitive key */
export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const factorText = (f: LibraryFactor) => fold(`${f.nameFr} ${f.name} ${f.keywords.join(' ')}`)

export function belongsTo(item: PlanItemDef, f: LibraryFactor): boolean {
  if (!item.subcategories.includes(f.subcategory)) return false
  if (!item.match) return true
  const hay = factorText(f)
  return item.match.some(w => hay.includes(fold(w)))
}

const sameCountry = (region: string, country: string) =>
  fold(region) === fold(country) || (fold(country) === 'france' && fold(region).startsWith('france'))

/** Grid electricity for the site's country (Ember), else the Africa average, else the world. */
export function electricityFor(country: string | null, factors: LibraryFactor[]): LibraryFactor | undefined {
  const grid = factors.filter(f => f.status === 'active' && f.subcategory === 'electricity' && f.id.startsWith('elec_ember_'))
  return grid.find(f => country && f.region === country)
    ?? grid.find(f => f.region === 'Afrique (moyenne)')
    ?? grid.find(f => f.region === 'Monde')
}

export interface PlanItem extends PlanItemDef {
  /** Suggested factors, active and present in the library */
  factors: LibraryFactor[]
  /** Factors of this poste holding data in the bilan */
  usedIds: string[]
  covered: boolean
  /** Emissions of the poste in the bilan, kgCO2e */
  kg: number
}

/** factorId → month → quantity */
export type Quantities = Record<string, Record<number, number>>

const total = (byMonth?: Record<number, number>) => Object.values(byMonth ?? {}).reduce((s, v) => s + (v || 0), 0)

export function buildPlan(answers: Answers, ctx: Context, factors: LibraryFactor[], qty: Quantities): PlanItem[] {
  const byId = new Map(factors.map(f => [f.id, f]))
  return PLAN.filter(item => answers[item.question]).map(item => {
    const suggestions = item.id === 'electricity'
      ? [electricityFor(ctx.country, factors)].filter((f): f is LibraryFactor => !!f)
      : item.suggest.map(id => byId.get(id)).filter((f): f is LibraryFactor => !!f && f.status === 'active')
    const usedIds = Object.keys(qty).filter(id => total(qty[id]) > 0 && byId.has(id) && belongsTo(item, byId.get(id)!))
    const kg = usedIds.reduce((s, id) => s + total(qty[id]) * byId.get(id)!.factorTotal, 0)
    return { ...item, factors: suggestions, usedIds, covered: usedIds.length > 0, kg }
  })
}

/* ---------------- Analysis ---------------- */

export interface Analysis {
  totalKg: number
  /** Relative uncertainty (95 %) of the total from emission factors, IPCC approach 1 */
  uncertainty: number | null
  /** Share of emissions computed with a factor whose uncertainty exceeds 30 % */
  lowQualityShare: number
  /** Postes ranked by weight, with their cumulative share */
  hotspots: { label: string; kg: number; share: number }[]
}

export function analyse(plan: PlanItem[], factors: LibraryFactor[], qty: Quantities): Analysis {
  const byId = new Map(factors.map(f => [f.id, f]))
  let totalKg = 0
  let sq = 0
  let low = 0
  const byPoste = new Map<string, number>()
  const postOf = new Map<string, string>()
  for (const p of plan) for (const id of p.usedIds) if (!postOf.has(id)) postOf.set(id, p.label)
  for (const [id, byMonth] of Object.entries(qty)) {
    const f = byId.get(id)
    if (!f) continue
    const kg = total(byMonth) * f.factorTotal
    if (kg <= 0) continue
    totalKg += kg
    const u = f.uncertainty || 0
    sq += (kg * u) ** 2
    if (u > 0.3) low += kg
    const label = postOf.get(id) ?? 'Autres sources'
    byPoste.set(label, (byPoste.get(label) ?? 0) + kg)
  }
  const hotspots = Array.from(byPoste.entries()).sort((a, b) => b[1] - a[1])
    .map(([label, kg]) => ({ label, kg, share: totalKg ? kg / totalKg : 0 }))
  return {
    totalKg,
    uncertainty: totalKg > 0 ? Math.sqrt(sq) / totalKg : null,
    lowQualityShare: totalKg > 0 ? low / totalKg : 0,
    hotspots,
  }
}

/* ---------------- Checks ---------------- */

export type Severity = 'warning' | 'info'

export interface Hint {
  id: string
  severity: Severity
  title: string
  detail: string
  factorId?: string
  /** For "Remplacer" actions */
  replacementId?: string
  month?: number
}

export interface DocRef { emission_factor_id: string; month: number; year: number }

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

function listMonths(ms: number[]) {
  const names = ms.map(m => MONTHS[m - 1])
  return names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')} et ${names.length - 3} autre${names.length > 4 ? 's' : ''}`
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

const fr = (n: number, d = 0) => n.toLocaleString('fr-FR', { maximumFractionDigits: d })

/** Active factor that replaces a retired one: same subcategory, unit and region, newest source year. */
export function replacementFor(f: LibraryFactor, factors: LibraryFactor[]): LibraryFactor | undefined {
  const alias: Record<string, string> = { global: 'monde', europe: 'union europeenne', 'congo-brazzaville': 'congo (brazzaville)', 'rd congo': 'congo (kinshasa)' }
  const region = alias[fold(f.region)] ?? fold(f.region)
  return factors
    .filter(o => o.status === 'active' && o.id !== f.id && o.subcategory === f.subcategory && o.unit === f.unit && fold(o.region) === region)
    .sort((a, b) => (b.sourceYear ?? 0) - (a.sourceYear ?? 0))[0]
}

/**
 * Annual grid electricity per m² usually observed for a site type (kWh/m²/an), hot-humid climate.
 * Wide on purpose: outside the range means "check the meter or the surface", not "wrong".
 */
export const ELECTRICITY_INTENSITY: Record<string, [number, number]> = {
  bureau: [40, 500], agence: [40, 500], boutique: [60, 700], magasin: [60, 700], supermarche: [200, 1500],
  hotel: [80, 900], clinique: [100, 1000], ecole: [10, 250], restaurant: [150, 2000], laboratoire: [150, 1500],
  entrepot: [5, 250], logistique: [5, 300], garage: [20, 300], datacenter: [800, 30000],
}

export interface Previous {
  year: number
  /** factorId → kgCO2e of the previous bilan of the same site (values as saved then) */
  kgByFactor: Record<string, number>
}

export function buildHints(opts: {
  plan: PlanItem[]
  factors: LibraryFactor[]
  qty: Quantities
  docs: DocRef[]
  year: number
  months: number[]
  ctx: Context
  previous?: Previous | null
}): Hint[] {
  const { plan, factors, qty, docs, year, months, ctx, previous } = opts
  const byId = new Map(factors.map(f => [f.id, f]))
  const hints: Hint[] = []
  const monthly = new Set(plan.filter(p => p.monthly).flatMap(p => p.usedIds))

  for (const [fid, byMonth] of Object.entries(qty)) {
    const f = byId.get(fid)
    if (!f || total(byMonth) <= 0) continue
    const unit = f.unit.replace(/^kgCO2eq\//, '')
    const filled = months.filter(m => (byMonth[m] ?? 0) > 0)

    // Recurring consumption with holes in the period
    if (monthly.has(fid) && filled.length < months.length) {
      const missing = months.filter(m => !((byMonth[m] ?? 0) > 0))
      hints.push({ id: `gap:${fid}`, severity: 'warning', factorId: fid, month: missing[0],
        title: `${f.nameFr} : ${missing.length} mois sans donnée`,
        detail: `Consommation attendue chaque mois. Manquant : ${listMonths(missing)}. Si l’activité était arrêtée, précisez-le dans le message à l’expert.` })
    }

    // A month far from the others: entry error, or a unit slip when the ratio is close to 1 000
    if (filled.length >= 3) {
      for (const m of filled) {
        const med = median(filled.filter(o => o !== m).map(o => byMonth[o]))
        const v = byMonth[m]
        if (!(med > 0)) continue
        const ratio = v / med
        if (ratio > 5 || ratio < 1 / 5) {
          const thousand = (ratio > 500 && ratio < 2000) || (ratio < 1 / 500 && ratio > 1 / 2000)
          hints.push({ id: `spike:${fid}:${m}`, severity: 'warning', factorId: fid, month: m,
            title: thousand ? `${f.nameFr} : erreur d’unité probable en ${MONTHS[m - 1]}` : `${f.nameFr} : valeur inhabituelle en ${MONTHS[m - 1]}`,
            detail: thousand
              ? `${fr(v, 2)} ${unit} contre ${fr(med, 2)} les autres mois, soit un facteur 1 000 : kWh/MWh, litres/m³ ou kg/tonnes ? La saisie attend des ${unit}.`
              : `${fr(v, 2)} ${unit} contre ${fr(med, 2)} en médiane les autres mois (×${fr(ratio, 1)}). Vérifiez la pièce et l’unité.` })
        }
      }
    }

    // Proof for every month with data
    const proved = new Set(docs.filter(d => d.emission_factor_id === fid && d.year === year).map(d => d.month))
    const unproved = filled.filter(m => !proved.has(m))
    if (unproved.length) {
      hints.push({ id: `proof:${fid}`, severity: 'warning', factorId: fid, month: unproved[0],
        title: `${f.nameFr} : ${unproved.length} mois sans justificatif`,
        detail: `L’expert vérifie chaque donnée sur pièce. À joindre : ${listMonths(unproved)}.` })
    }

    // Retired factor still used
    if (f.status === 'retired') {
      const r = replacementFor(f, factors)
      hints.push({ id: `retired:${fid}`, severity: 'warning', factorId: fid, replacementId: r?.id,
        title: `${f.nameFr} : facteur remplacé dans la bibliothèque`,
        detail: r
          ? `Remplacé par « ${r.nameFr} » (${r.source}, ${fr(r.factorTotal, 4)} contre ${fr(f.factorTotal, 4)} kgCO₂e/${unit}). Le remplacement transfère quantités et justificatifs.`
          : 'Choisissez un facteur à jour pour cette source.' })
    }

    // Grid electricity of another country than the site
    if (f.subcategory === 'electricity' && ctx.country && f.region && !sameCountry(f.region, ctx.country) && f.status === 'active') {
      const r = electricityFor(ctx.country, factors)
      hints.push({ id: `country:${fid}`, severity: 'warning', factorId: fid, replacementId: r && r.id !== fid ? r.id : undefined,
        title: `${f.nameFr} : facteur d’un autre pays que le site (${ctx.country})`,
        detail: r ? `Le mix électrique du site est celui de « ${r.region} » : ${fr(r.factorTotal, 3)} kgCO₂e/kWh contre ${fr(f.factorTotal, 3)}.` : 'Choisissez le facteur du pays du site.' })
    }
  }

  // Double counting: the same physical energy under two factors of one poste, in the same months
  for (const p of plan.filter(p => p.energy && p.usedIds.length > 1)) {
    const units = new Map<string, string[]>()
    for (const id of p.usedIds) {
      const u = byId.get(id)!.unit
      units.set(u, [...(units.get(u) ?? []), id])
    }
    for (const ids of Array.from(units.values()).filter(ids => ids.length > 1)) {
      const overlap = months.filter(m => ids.filter(id => (qty[id]?.[m] ?? 0) > 0).length > 1)
      if (overlap.length) {
        hints.push({ id: `double:${p.id}:${ids.join('+')}`, severity: 'warning', factorId: ids[0], month: overlap[0],
          title: `${p.label} : double comptage possible`,
          detail: `${ids.map(id => `« ${byId.get(id)!.nameFr} »`).join(' et ')} sont saisis les mêmes mois (${listMonths(overlap)}). Si c’est le même carburant ou le même compteur, gardez un seul facteur.` })
      }
    }
  }

  // Electricity intensity against the floor area (annualised)
  const elec = plan.find(p => p.id === 'electricity')
  const range = ctx.siteType ? ELECTRICITY_INTENSITY[ctx.siteType] : undefined
  if (elec?.covered && range && ctx.surface && ctx.surface > 0) {
    const kwh = elec.usedIds.reduce((s, id) => s + total(qty[id]), 0)
    const filledMonths = months.filter(m => elec.usedIds.some(id => (qty[id]?.[m] ?? 0) > 0)).length
    if (filledMonths >= 3) {
      const perM2 = (kwh / filledMonths) * 12 / ctx.surface
      if (perM2 < range[0] || perM2 > range[1]) {
        hints.push({ id: 'intensity:electricity', severity: 'info', factorId: elec.usedIds[0],
          title: `Électricité : ${fr(perM2)} kWh/m²/an, hors de la plage habituelle`,
          detail: `Pour un site de ce type, on observe en général ${fr(range[0])} à ${fr(range[1])} kWh/m²/an (surface déclarée : ${fr(ctx.surface)} m²). Vérifiez la surface du site, l’unité ou un compteur manquant.` })
      }
    }
  }

  // Year-on-year consistency with the previous bilan of the site
  if (previous) {
    for (const p of plan) {
      const prevKg = Object.entries(previous.kgByFactor).filter(([id]) => byId.has(id) && belongsTo(p, byId.get(id)!)).reduce((s, [, kg]) => s + kg, 0)
      if (prevKg <= 0) continue
      if (!p.covered) {
        hints.push({ id: `yoymissing:${p.id}`, severity: 'warning',
          title: `${p.label} : présent en ${previous.year}, absent cette année`,
          detail: `${fr(prevKg / 1000, 1)} tCO₂e déclarées en ${previous.year}. Si l’activité a cessé, indiquez-le à l’expert ; sinon complétez la saisie.` })
      } else {
        const ratio = p.kg / prevKg
        if (ratio > 1.5 || ratio < 0.67) {
          hints.push({ id: `yoy:${p.id}`, severity: 'info', factorId: p.usedIds[0],
            title: `${p.label} : ${ratio > 1 ? '+' : ''}${fr((ratio - 1) * 100)} % par rapport à ${previous.year}`,
            detail: `${fr(p.kg / 1000, 1)} tCO₂e contre ${fr(prevKg / 1000, 1)} en ${previous.year}. Une variation forte doit s’expliquer (activité, période, facteur) : l’expert la demandera.` })
        }
      }
    }
  }

  // Declared activity without any data
  for (const p of plan) {
    if (!p.covered && !hints.some(h => h.id === `yoymissing:${p.id}`)) {
      hints.push({ id: `missing:${p.id}`, severity: 'info', title: `${p.label} : aucune donnée`, detail: `Vous avez indiqué cette activité. À collecter : ${p.collect.toLowerCase()}.` })
    }
  }
  const order = { warning: 0, info: 1 }
  return hints.sort((a, b) => order[a.severity] - order[b.severity])
}

/* ---------------- Pre-certification checklist ---------------- */

export interface CheckItem { id: string; label: string; ok: boolean; detail: string }

export function checklist(opts: {
  profileConfirmed: boolean
  plan: PlanItem[]
  hints: Hint[]
  saved: boolean
  hasData: boolean
  hasPrevious: boolean
}): CheckItem[] {
  const { profileConfirmed, plan, hints, saved, hasData, hasPrevious } = opts
  const covered = plan.filter(p => p.covered).length
  const count = (prefix: string) => hints.filter(h => h.id.startsWith(prefix)).length
  const s = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`
  const items: CheckItem[] = [
    { id: 'profile', label: 'Profil d’activité confirmé', ok: profileConfirmed, detail: profileConfirmed ? 'Les postes attendus sont établis.' : 'Confirmez vos activités pour établir le périmètre du bilan.' },
    { id: 'coverage', label: 'Tous les postes attendus sont renseignés', ok: plan.length > 0 && covered === plan.length, detail: `${covered} sur ${s(plan.length, 'poste', 'postes')} renseigné${covered > 1 ? 's' : ''}.` },
    { id: 'months', label: 'Consommations mensuelles complètes', ok: hasData && count('gap:') === 0, detail: count('gap:') ? `${s(count('gap:'), 'source', 'sources')} avec des mois manquants.` : 'Aucun mois manquant sur les consommations récurrentes.' },
    { id: 'proofs', label: 'Un justificatif pour chaque donnée', ok: hasData && count('proof:') === 0, detail: count('proof:') ? `${s(count('proof:'), 'source', 'sources')} sans justificatif complet.` : 'Chaque mois saisi a sa pièce justificative.' },
    { id: 'values', label: 'Valeurs cohérentes, sans erreur d’unité', ok: count('spike:') === 0 && count('intensity:') === 0, detail: count('spike:') + count('intensity:') ? `${s(count('spike:') + count('intensity:'), 'valeur', 'valeurs')} à vérifier.` : 'Aucune valeur aberrante détectée.' },
    { id: 'double', label: 'Pas de double comptage', ok: count('double:') === 0, detail: count('double:') ? `${s(count('double:'), 'poste', 'postes')} avec deux facteurs pour la même énergie.` : 'Chaque énergie n’est comptée qu’une fois.' },
    { id: 'factors', label: 'Facteurs à jour et adaptés au site', ok: count('retired:') === 0 && count('country:') === 0, detail: count('retired:') + count('country:') ? `${s(count('retired:') + count('country:'), 'facteur', 'facteurs')} à remplacer.` : 'Facteurs actifs, électricité du pays du site.' },
  ]
  if (hasPrevious) {
    items.push({ id: 'yoy', label: 'Cohérence avec le bilan précédent', ok: count('yoymissing:') === 0, detail: count('yoymissing:') ? `${s(count('yoymissing:'), 'poste', 'postes')} présents l’an dernier et absents cette année.` : count('yoy:') ? `${s(count('yoy:'), 'variation', 'variations')} forte${count('yoy:') > 1 ? 's' : ''} à justifier auprès de l’expert.` : 'Pas d’écart important avec l’an dernier.' })
  }
  items.push({ id: 'saved', label: 'Données enregistrées', ok: saved && hasData, detail: !hasData ? 'Aucune donnée saisie.' : saved ? 'Tout est enregistré.' : 'Enregistrez vos modifications.' })
  return items
}

/* ---------------- Synonym search ---------------- */

/** Everyday words → words found in factor names and keywords */
export const SYNONYMS: Record<string, string[]> = {
  gasoil: ['gazole', 'diesel'], gazole: ['diesel', 'gasoil'], diesel: ['gazole', 'gasoil'], carburant: ['gazole', 'essence', 'diesel'],
  essence: ['petrol', 'super'], super: ['essence'], courant: ['electricite'], seeg: ['electricite', 'eau'], electricite: ['kwh', 'reseau'],
  clim: ['frigorigene', 'climatiseur', 'r410a', 'r32'], climatiseur: ['frigorigene'], frigo: ['frigorigene', 'refrigerateur'],
  groupe: ['groupe electrogene', 'generateur'], generateur: ['groupe electrogene'], bouteille: ['butane', 'gaz'], gaz: ['butane', 'propane', 'gpl', 'gaz naturel'],
  avion: ['vol', 'flight', 'aerien'], billet: ['vol', 'avion'], camion: ['poids lourd', 'hgv', 'semi-remorque'], bateau: ['navire', 'ferry', 'marin'],
  navire: ['marin', 'soute'], torchere: ['torche', 'torchage'], poubelle: ['dechets', 'ordures'], ordures: ['dechets', 'dib'], dechet: ['dechets'],
  cantine: ['alimentation', 'repas', 'denrees'], repas: ['alimentation', 'denrees'], ordinateur: ['informatique', 'laptop', 'portable'],
  voiture: ['car', 'vehicule'], moto: ['motorbike', 'deux-roues'], charbon: ['charbon de bois', 'houille'], bois: ['bois de feu', 'buche'],
  ciment: ['clinker', 'cement'], fer: ['acier', 'steel'], tole: ['acier', 'aluminium'], huile: ['lubrifiant', 'pome'],
}

/** Every query word must match the factor, its tab or section (directly or through a synonym). R-410A = r410a. */
export function searchFactors(query: string, factors: LibraryFactor[]): LibraryFactor[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (!words.length) return factors
  // Factors matched through a synonym rank first: « clim » → refrigerants before « climat humide »
  const scored: { f: LibraryFactor; score: number }[] = []
  for (const f of factors) {
    const text = fold(`${f.nameFr} ${f.name} ${f.region} ${f.source} ${f.keywords.join(' ')} ${CATEGORY_LABELS[f.category] ?? ''} ${SUBCATEGORY_LABELS[f.subcategory] ?? ''}`)
    const hay = `${text} ${text.replace(/-/g, '')}`
    let score = 0
    const ok = words.every(w => {
      const viaSynonym = (SYNONYMS[w] ?? []).some(s => hay.includes(s))
      if (viaSynonym) score++
      return viaSynonym || hay.includes(w)
    })
    if (ok) scored.push({ f, score })
  }
  return scored.sort((x, y) => y.score - x.score).map(x => x.f)
}
