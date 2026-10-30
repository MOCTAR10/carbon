// Builds scripts/migrate-emission-factors-sources-2026.sql from the official DEFRA/DESNZ 2024 flat file and the
// documented IPCC / IMO calculations below, then prints a review table.
//   1. Download https://assets.publishing.service.gov.uk/media/6722567c10b0d582ee8c4953/ghg-conversion-factors-2024-FlatFormat_v1_1.xlsx
//   2. node scripts/factors/build-sources-2026.cjs <path to the xlsx>
// Values are read from the file, never retyped; each DEFRA row cites its ids in source_ref.
const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')
if (!process.argv[2]) { console.error('Usage: node scripts/factors/build-sources-2026.cjs <DEFRA 2024 flat file .xlsx>'); process.exit(1) }
const sheetRows = XLSX.utils.sheet_to_json(XLSX.readFile(process.argv[2]).Sheets['Factors by Category'], { header: 1, defval: '' })
const head = sheetRows.findIndex(r => r.includes('Scope') && r.includes('Level 1'))
const rows = sheetRows.slice(head + 1).filter(r => r.length).map(r => Object.fromEntries(sheetRows[head].map((h, i) => [h, r[i]])))
const OUT = path.join(__dirname, '..', 'migrate-emission-factors-sources-2026.sql')

const VAL = 'GHG Conversion Factor 2024'
const byId = new Map(rows.map(r => [r.ID, r]))
const kg = r => r['GHG/Unit'] === 'kg CO2e'
function wttOf(r) {
  const c = rows.filter(w => kg(w) && /^WTT-/.test(w['Level 1']) && w['Level 3'] === r['Level 3'] && w['Level 4'] === r['Level 4'] && w['Column Text'] === r['Column Text'] && w.UOM === r.UOM)
  if (c.length <= 1) return c[0]
  const l2 = r['Level 2'].toLowerCase()
  return c.find(w => w['Level 2'].toLowerCase().includes(l2)) ?? c.find(w => w.ID.split('_').slice(2).join('_') === r.ID.split('_').slice(2).join('_'))
}

// AR5 GWP (same basis as the existing library: CH4 28, N2O 265)
const GWP = { CH4: 28, N2O: 265 }
const r4 = n => Math.round(n * 1e4) / 1e4
const r2 = n => Math.round(n * 100) / 100

const T = {
  stationary: ['energy', 'fuels_stationary', 1, '1-1 Émissions directes de combustion fixe', '1-1'],
  organic: ['energy', 'fuels_organic', 1, '1-1 Émissions directes de combustion fixe', '1-1'],
  mobile: ['energy', 'fuels_mobile', 1, '1-2 Émissions directes de combustion mobile', '1-2'],
  marine: ['energy', 'marine_fuels', 1, '1-2 Émissions directes de combustion mobile', '1-2'],
  refrig: ['non_energy', 'refrigerants', 1, '1-4 Émissions directes fugitives', '1-4'],
  process: ['non_energy', 'process', 1, '1-3 Émissions directes de procédé', '1-3'],
  flare: ['non_energy', 'flaring_venting', 1, '1-1 Émissions directes de combustion fixe', '1-1'],
  vent: ['non_energy', 'flaring_venting', 1, '1-4 Émissions directes fugitives', '1-4'],
  effluent: ['non_energy', 'effluents_biogas', 1, '1-4 Émissions directes fugitives', '1-4'],
  road: ['freight', 'road', 3, '3-4 Fret amont', '3-4'],
  sea: ['freight', 'maritime', 3, '3-4 Fret amont', '3-4'],
  airf: ['freight', 'air', 3, '3-4 Fret amont', '3-4'],
  railf: ['freight', 'rail', 3, '3-4 Fret amont', '3-4'],
  plane: ['transport', 'plane', 3, '3-6 Déplacements professionnels', '3-6'],
  car: ['transport', 'car', 3, '3-7 Déplacements domicile-travail', '3-7'],
  bus: ['transport', 'bus', 3, '3-7 Déplacements domicile-travail', '3-7'],
  ferry: ['transport', 'ferry', 3, '3-6 Déplacements professionnels', '3-6'],
  w_household: ['waste', 'household', 3, '3-5 Déchets', '3-5'],
  w_organic: ['waste', 'organic', 3, '3-5 Déchets', '3-5'],
  w_building: ['waste', 'building', 3, '3-5 Déchets', '3-5'],
  w_plastic: ['waste', 'plastic', 3, '3-5 Déchets', '3-5'],
  w_water: ['waste', 'water', 3, '3-5 Déchets', '3-5'],
  utilities: ['inputs', 'utilities', 3, '3-1 Achats de biens et services', '3-1'],
  construction: ['inputs', 'construction', 3, '3-1 Achats de biens et services', '3-1'],
  plastics: ['inputs', 'plastics', 3, '3-1 Achats de biens et services', '3-1'],
  glass: ['inputs', 'glass', 3, '3-1 Achats de biens et services', '3-1'],
  paper: ['inputs', 'paper', 3, '3-1 Achats de biens et services', '3-1'],
  food: ['inputs', 'food', 3, '3-1 Achats de biens et services', '3-1'],
  tyres: ['inputs', 'tyres', 3, '3-1 Achats de biens et services', '3-1'],
  textiles: ['inputs', 'textiles', 3, '3-1 Achats de biens et services', '3-1'],
  lubricants: ['inputs', 'lubricants', 3, '3-1 Achats de biens et services', '3-1'],
}
const UNIT = { litres: 'litre', tonnes: 'tonne', 'cubic metres': 'm³', kg: 'kg', 'tonne.km': 'tonne.km', 'passenger.km': 'passager.km', km: 'km' }

const out = []
/** DEFRA row by id; withWtt adds its well-to-tank counterpart as upstream. perKg divides a per-tonne row by 1000. */
function defra(id, tpl, nameFr, name, opts = {}) {
  const r = byId.get(id)
  if (!r || !kg(r) || r[VAL] === '') throw new Error(`DEFRA ${id} introuvable ou vide`)
  const w = opts.wtt === false ? null : wttOf(r)
  if (opts.wtt !== false && !w) throw new Error(`WTT introuvable pour ${id} ${r['Level 3']}`)
  const div = opts.perKg ? 1000 : 1
  const comb = Number(r[VAL]) / div
  const up = w ? Number(w[VAL]) / div : 0
  out.push({
    tpl, nameFr, name, unit: opts.perKg ? 'kg' : UNIT[r.UOM], comb, up,
    source: 'DEFRA 2024', sourceRef: `UK DESNZ GHG conversion factors 2024 v1.1 · ${id}${w ? ` + WTT ${w.ID}` : ''}`, year: 2024,
    region: opts.region ?? 'International (moyenne UK)', unc: opts.unc ?? 0.1, licence: 'Open Government Licence v3.0', ...opts,
  })
}
function calc(tpl, nameFr, name, unit, value, source, sourceRef, opts = {}) {
  out.push({ tpl, nameFr, name, unit, comb: value, up: 0, source, sourceRef, year: opts.year ?? 2006, region: 'International (défaut GIEC)', unc: opts.unc ?? 0.3, licence: '', ...opts })
}

// ── Énergie : combustibles fixes (groupes électrogènes, chaudières, fours) ──
const GEN = ['groupe électrogène', 'générateur', 'GE']
defra('1_101_1012_8_1', T.stationary, 'Gazole 100 % minéral — groupe électrogène, chaudière', 'Diesel (100% mineral) — stationary', { id: 'defra24_diesel_station_l', keywords: [...GEN, 'gasoil', 'diesel'], sectors: [], siteTypes: [], unc: 0.05 })
defra('1_101_1012_15_1', T.stationary, 'Gazole 100 % minéral (à la tonne)', 'Diesel (100% mineral) — per tonne', { id: 'defra24_diesel_station_t', keywords: [...GEN, 'gasoil', 'diesel'], unc: 0.05 })
defra('1_101_1014_8_1', T.stationary, 'Gasoil non routier (engins, chaudières)', 'Gas oil', { id: 'defra24_gas_oil_l', keywords: ['GNR', 'engins', 'gasoil rouge', 'chaudière'], sectors: ['construction', 'mines', 'agriculture', 'foresterie'], unc: 0.05 })
defra('1_101_1013_8_1', T.stationary, 'Fioul lourd (fuel oil)', 'Fuel oil', { id: 'defra24_fuel_oil_l', keywords: ['fuel', 'HFO', 'four', 'chaudière', 'centrale thermique'], sectors: ['industrie', 'energie', 'petrole_gaz'], unc: 0.05 })
defra('1_101_1013_15_1', T.stationary, 'Fioul lourd (fuel oil, à la tonne)', 'Fuel oil — per tonne', { id: 'defra24_fuel_oil_t', keywords: ['fuel', 'HFO', 'four', 'centrale thermique'], sectors: ['industrie', 'energie', 'petrole_gaz'], unc: 0.05 })
defra('1_101_1010_8_1', T.stationary, 'Pétrole lampant / kérosène de chauffage', 'Burning oil (kerosene)', { id: 'defra24_kerosene_l', keywords: ['kérosène', 'pétrole lampant', 'lampe'], unc: 0.05 })
defra('1_100_1003_8_1', T.stationary, 'GPL (au litre)', 'LPG', { id: 'defra24_lpg_l', keywords: ['gaz', 'GPL', 'cuisson'], unc: 0.05 })
defra('1_100_1000_15_1', T.stationary, 'Butane — bouteilles de gaz (au kg)', 'Butane — per kg', { id: 'defra24_butane_kg', perKg: true, keywords: ['bouteille', 'gaz', 'cuisine', 'restauration', 'cantine', 'B12'], sectors: ['tourisme', 'agroalimentaire', 'education', 'sante'], siteTypes: ['restaurant', 'hotel', 'ecole', 'clinique'], unc: 0.05 })
defra('1_100_1007_15_1', T.stationary, 'Propane (au kg)', 'Propane — per kg', { id: 'defra24_propane_kg', perKg: true, keywords: ['bouteille', 'gaz', 'citerne'], unc: 0.05 })
defra('1_100_1005_1_1', T.stationary, 'Gaz naturel (100 % fossile, au m³)', 'Natural gas (100% mineral)', { id: 'defra24_natural_gas_m3', keywords: ['gaz naturel', 'turbine', 'chaudière', 'gaz combustible'], sectors: ['petrole_gaz', 'energie', 'industrie'], unc: 0.05 })
defra('1_102_1025_15_1', T.stationary, 'Charbon (usage industriel)', 'Coal (industrial)', { id: 'defra24_coal_industrial_t', keywords: ['houille', 'charbon minéral'], sectors: ['industrie', 'mines'], unc: 0.05 })

// ── Énergie : combustibles mobiles ──
const FLEET = ['véhicule', 'flotte', 'carburant', 'pick-up', '4x4']
defra('1_101_1012_8_1', T.mobile, 'Gazole 100 % minéral — véhicules et engins', 'Diesel (100% mineral) — vehicles', { id: 'defra24_diesel_mobile_l', keywords: [...FLEET, 'gasoil', 'diesel', 'camion', 'engin'], unc: 0.05 })
defra('1_101_1018_8_1', T.mobile, 'Essence 100 % minérale — véhicules', 'Petrol (100% mineral)', { id: 'defra24_petrol_l', keywords: [...FLEET, 'super', 'essence', 'moto'], unc: 0.05 })
defra('1_101_1009_8_1', T.mobile, 'Kérosène aviation (Jet A-1) — hélicoptères, avions propres', 'Aviation turbine fuel', { id: 'defra24_jet_fuel_l', keywords: ['hélicoptère', 'avion', 'Jet A1', 'offshore'], sectors: ['petrole_gaz', 'mines', 'transport'], unc: 0.05 })

// ── Combustibles marins (nouveau poste) ──
const SHIP = ['navire', 'bateau', 'barge', 'remorqueur', 'soute', 'supply', 'offshore', 'plongée', 'soudage sous-marin', 'pêche']
const SHIP_SECTORS = ['petrole_gaz', 'peche', 'transport', 'mines']
defra('1_101_1023_8_1', T.marine, 'Gasoil marin MGO (au litre)', 'Marine gas oil', { id: 'defra24_mgo_l', keywords: [...SHIP, 'MGO', 'MDO'], sectors: SHIP_SECTORS, unc: 0.05 })
defra('1_101_1023_15_1', T.marine, 'Gasoil marin MGO (à la tonne)', 'Marine gas oil — per tonne', { id: 'defra24_mgo_t', keywords: [...SHIP, 'MGO', 'MDO'], sectors: SHIP_SECTORS, unc: 0.05 })
defra('1_101_1024_8_1', T.marine, 'Fioul marin (au litre)', 'Marine fuel oil', { id: 'defra24_mfo_l', keywords: [...SHIP, 'HFO', 'IFO', 'fuel lourd'], sectors: SHIP_SECTORS, unc: 0.05 })
defra('1_101_1024_15_1', T.marine, 'Fioul marin (à la tonne)', 'Marine fuel oil — per tonne', { id: 'defra24_mfo_t', keywords: [...SHIP, 'HFO', 'IFO', 'fuel lourd'], sectors: SHIP_SECTORS, unc: 0.05 })
// IMO MEPC.308(73) Cf (t CO2 / t fuel, tank-to-wake) + IPCC 2006 vol.2 tab. 3.5.3 navigation CH4 7 kg/TJ, N2O 2 kg/TJ
const imo = (cf, ncv) => r2(cf * 1000 + 7 * ncv / 1000 * GWP.CH4 + 2 * ncv / 1000 * GWP.N2O)
const IMO_NOTE = (cf, ncv) => `OMI MEPC.308(73) Cf ${cf} tCO2/t ; CH4 7 et N2O 2 kg/TJ (GIEC 2006 vol.2 tab. 3.5.3), PCI ${ncv} MJ/kg, PRG AR5 — combustion seule`
calc(T.marine, 'Fioul lourd HFO (soutes, à la tonne)', 'Heavy fuel oil — IMO', 'tonne', imo(3.114, 40.4), 'OMI 2018 / GIEC 2006', IMO_NOTE(3.114, 40.4), { id: 'imo_hfo_t', keywords: [...SHIP, 'HFO', 'IFO 380', 'soute'], sectors: SHIP_SECTORS, year: 2018, region: 'International (OMI)', unc: 0.05 })
calc(T.marine, 'Fioul très basse teneur en soufre VLSFO (à la tonne)', 'Light fuel oil / VLSFO — IMO', 'tonne', imo(3.151, 41.2), 'OMI 2018 / GIEC 2006', IMO_NOTE(3.151, 41.2), { id: 'imo_vlsfo_t', keywords: [...SHIP, 'VLSFO', 'LFO', '0,5 %'], sectors: SHIP_SECTORS, year: 2018, region: 'International (OMI)', unc: 0.05 })
calc(T.marine, 'Diesel marin MGO / MDO (soutes, à la tonne)', 'Marine diesel / gas oil — IMO', 'tonne', imo(3.206, 43.0), 'OMI 2018 / GIEC 2006', IMO_NOTE(3.206, 43.0), { id: 'imo_mgo_t', keywords: [...SHIP, 'MGO', 'MDO', 'DMA'], sectors: SHIP_SECTORS, year: 2018, region: 'International (OMI)', unc: 0.05 })

// ── Biomasse : charbon de bois et bois de feu (GIEC, CO2 biogénique exclu) ──
// GIEC 2006 vol.2 tab. 2.4 (commercial/institutionnel) : charbon de bois CH4 200, N2O 1 kg/TJ, PCI 29,5 TJ/Gg ; bois CH4 300, N2O 4 kg/TJ, PCI 15,6 TJ/Gg
const bio = (ch4, n2o, ncv) => r2((ch4 * GWP.CH4 + n2o * GWP.N2O) * ncv / 1000)
calc(T.organic, 'Charbon de bois (CH4 et N2O, CO2 biogénique exclu)', 'Charcoal', 'tonne', bio(200, 1, 29.5), 'GIEC 2006', 'GIEC 2006 vol.2 tab. 2.4 : CH4 200 kg/TJ, N2O 1 kg/TJ, PCI 29,5 TJ/Gg, PRG AR5 ; CO2 biogénique déclaré à part', { id: 'ipcc_charcoal_t', keywords: ['charbon de bois', 'braise', 'cuisson', 'restauration'], sectors: ['tourisme', 'agroalimentaire'], siteTypes: ['restaurant', 'hotel'], unc: 0.5 })
calc(T.organic, 'Bois de feu (CH4 et N2O, CO2 biogénique exclu)', 'Firewood', 'tonne', bio(300, 4, 15.6), 'GIEC 2006', 'GIEC 2006 vol.2 tab. 2.4 : CH4 300 kg/TJ, N2O 4 kg/TJ, PCI 15,6 TJ/Gg, PRG AR5 ; CO2 biogénique déclaré à part', { id: 'ipcc_firewood_t', keywords: ['bois', 'bûches', 'séchoir', 'four', 'chaudière biomasse', 'déchets de scierie'], sectors: ['foresterie', 'agroalimentaire', 'tourisme'], unc: 0.5 })

// ── Fluides frigorigènes et gaz fluorés (PRG AR5, DEFRA 2024) — gaz absents de la bibliothèque ──
const COOL = ['climatisation', 'clim', 'fuite', 'recharge', 'froid']
const refr = (id, slug, nameFr, extra = {}) => defra(id, T.refrig, nameFr, nameFr, { id: `defra24_${slug}`, wtt: false, region: 'International', unc: 0.1, keywords: COOL, ...extra })
refr('3_202_2389_3_1', 'r22', 'R-22 (HCFC, ancien parc de climatiseurs)', { keywords: [...COOL, 'R22', 'fréon'] })
refr('3_201_2131_3_1', 'r407a', 'R-407A (HFC)')
refr('3_201_2191_3_1', 'r417a', 'R-417A (HFC)')
refr('3_201_2227_3_1', 'r422d', 'R-422D (HFC)')
refr('3_201_2332_3_1', 'r507a', 'R-507A (HFC, froid commercial)', { keywords: [...COOL, 'chambre froide', 'congélation'], siteTypes: ['supermarche', 'entrepot', 'restaurant'] })
refr('3_204_2473_3_1', 'r290', 'R-290 propane (fluide naturel)')
refr('3_204_2476_3_1', 'r600a', 'R-600a isobutane (réfrigérateurs)', { keywords: [...COOL, 'réfrigérateur', 'frigo'] })
refr('3_200_2002_3_1', 'r744', 'R-744 CO₂ (fluide naturel)')
refr('3_204_2494_3_1', 'r1234yf', 'R-1234yf (HFO, climatisation automobile)', { keywords: [...COOL, 'voiture', 'véhicule'] })
refr('3_200_2077_3_1', 'sf6', 'SF₆ (hexafluorure de soufre, postes électriques)', { keywords: ['SF6', 'disjoncteur', 'poste HT', 'cellule', 'fuite'], sectors: ['energie', 'industrie', 'mines'] })

// ── Procédés (GIEC 2006 vol.3 ch.2, stœchiométrie) ──
calc(T.process, 'Calcination de calcaire (CaCO₃)', 'Limestone calcination', 'tonne', 440, 'GIEC 2006', 'GIEC 2006 vol.3 tab. 2.1 : 0,43971 tCO2/t CaCO3 (stœchiométrie)', { id: 'ipcc_limestone_t', keywords: ['calcaire', 'chaux', 'carbonate', 'four'], sectors: ['industrie', 'mines', 'construction', 'chimie'], unc: 0.05 })
calc(T.process, 'Calcination de dolomie (CaMg(CO₃)₂)', 'Dolomite calcination', 'tonne', 477, 'GIEC 2006', 'GIEC 2006 vol.3 tab. 2.1 : 0,47732 tCO2/t dolomie (stœchiométrie)', { id: 'ipcc_dolomite_t', keywords: ['dolomie', 'chaux', 'carbonate'], sectors: ['industrie', 'mines', 'chimie'], unc: 0.05 })
calc(T.process, 'Production de clinker (cimenterie)', 'Clinker production', 'tonne', 520, 'GIEC 2006', 'GIEC 2006 vol.3 §2.2.1.1 Tier 1 : 0,52 tCO2/t clinker (dont correction CKD)', { id: 'ipcc_clinker_t', keywords: ['ciment', 'clinker', 'cimenterie', 'four'], sectors: ['construction', 'industrie'], siteTypes: ['usine'], unc: 0.1 })
calc(T.process, 'Production de chaux vive', 'Quicklime production', 'tonne', 750, 'GIEC 2006', 'GIEC 2006 vol.3 tab. 2.4 : 0,75 tCO2/t chaux calcique', { id: 'ipcc_quicklime_t', keywords: ['chaux', 'chaux vive', 'four à chaux'], sectors: ['industrie', 'mines', 'chimie'], unc: 0.1 })

// ── Torchage et ventage (nouveau poste) ──
// Gaz à 15 °C / 1 atm : 23,645 L/mol. Efficacité de torche 98 % (API Compendium 2021) ; CH4 imbrûlé compté.
const VM = 23.645
const gasCalc = (comp, eff) => {
  const C = { CH4: 1, C2H6: 2, C3H8: 3, C4H10: 4, C5H12: 5 }
  const hcC = Object.entries(comp).reduce((s, [k, x]) => s + (C[k] ?? 0) * x, 0)
  const co2 = (eff * hcC + (comp.CO2 ?? 0)) * 44.01 / VM
  const ch4 = (1 - eff) * comp.CH4 * 16.04 / VM
  return r4(co2 + ch4 * GWP.CH4)
}
const DRY = { CH4: 0.95, C2H6: 0.03, CO2: 0.01, N2: 0.01 }
const ASSOC = { CH4: 0.75, C2H6: 0.10, C3H8: 0.07, C4H10: 0.04, C5H12: 0.02, CO2: 0.01, N2: 0.01 }
const FLARE = ['torchère', 'torche', 'torchage', 'brûlage', 'flare']
const VENT = ['ventage', 'évent', 'dégazage', 'purge', 'venting', 'méthane']
calc(T.flare, 'Gaz torché — gaz naturel sec', 'Flared gas — dry natural gas', 'm³', gasCalc(DRY, 0.98), 'GIEC 2006 / API 2021', 'Bilan carbone à 15 °C : CH4 95 %, C2H6 3 %, CO2 1 %, N2 1 % ; efficacité de torche 98 % (API Compendium 2021) ; CH4 imbrûlé PRG 28', { id: 'flare_dry_gas_m3', keywords: [...FLARE, 'gaz naturel'], sectors: ['petrole_gaz', 'energie'], unc: 0.25 })
calc(T.flare, 'Gaz torché — gaz associé (riche)', 'Flared gas — associated gas', 'm³', gasCalc(ASSOC, 0.98), 'GIEC 2006 / API 2021', 'Bilan carbone à 15 °C : CH4 75 %, C2 10 %, C3 7 %, C4 4 %, C5+ 2 %, CO2 1 %, N2 1 % ; efficacité 98 % ; préférez l’analyse de votre gaz', { id: 'flare_assoc_gas_m3', keywords: [...FLARE, 'gaz associé', 'champ pétrolier', 'production'], sectors: ['petrole_gaz'], unc: 0.3 })
calc(T.vent, 'Gaz ventilé — gaz naturel sec', 'Vented gas — dry natural gas', 'm³', gasCalc(DRY, 0), 'GIEC 2006', 'Gaz rejeté sans combustion à 15 °C : CH4 95 % (0,644 kg CH4/m³) × PRG 28 + CO2 1 %', { id: 'vent_dry_gas_m3', keywords: [...VENT, 'gaz naturel'], sectors: ['petrole_gaz', 'energie'], unc: 0.2 })
calc(T.vent, 'Gaz ventilé — gaz associé', 'Vented gas — associated gas', 'm³', gasCalc(ASSOC, 0), 'GIEC 2006', 'Gaz rejeté sans combustion à 15 °C : CH4 75 % (0,509 kg CH4/m³) × PRG 28 + CO2 1 %', { id: 'vent_assoc_gas_m3', keywords: [...VENT, 'gaz associé', 'champ pétrolier'], sectors: ['petrole_gaz'], unc: 0.3 })

// ── Effluents et biogaz (nouveau poste) — GIEC 2006 vol.5 ch.6 ──
// Bo industriel 0,25 kg CH4/kg DCO ; domestique 0,6 kg CH4/kg DBO5 ; MCF tab. 6.3 et 6.8
const AGRO = ['agriculture', 'agroalimentaire']
const effl = (id, nameFr, name, mcf, extra) => calc(T.effluent, nameFr, name, 'kg DCO', r4(0.25 * mcf * GWP.CH4), 'GIEC 2006', `GIEC 2006 vol.5 ch.6 : Bo 0,25 kg CH4/kg DCO × MCF ${String(mcf).replace('.', ',')} × PRG 28`, { id, unc: 0.3, ...extra })
const EFF = ['effluent', 'eaux usées', 'DCO', 'lagune', 'bassin', 'station d’épuration', 'STEP']
effl('effluent_lagoon_deep_cod', 'Effluents en lagune anaérobie profonde (> 2 m) ou réacteur sans récupération', 'Anaerobic deep lagoon / reactor without recovery', 0.8, { keywords: [...EFF, 'POME', 'huile de palme', 'huilerie', 'anaérobie'], sectors: [...AGRO, 'industrie', 'eau'] })
effl('effluent_lagoon_shallow_cod', 'Effluents en lagune anaérobie peu profonde (< 2 m)', 'Anaerobic shallow lagoon', 0.2, { keywords: [...EFF, 'POME', 'anaérobie'], sectors: [...AGRO, 'industrie', 'eau'] })
effl('effluent_aerobic_poor_cod', 'Effluents en traitement aérobie mal géré (surchargé)', 'Aerobic treatment, not well managed', 0.3, { keywords: [...EFF, 'aérobie', 'boues activées'], sectors: [...AGRO, 'industrie', 'eau'] })
effl('effluent_discharge_cod', 'Effluents rejetés sans traitement (rivière, mer)', 'Untreated discharge to river or sea', 0.1, { keywords: [...EFF, 'rejet', 'rivière', 'lagune côtière'], sectors: [...AGRO, 'industrie', 'eau', 'mines'] })
// POME : 0,65 m³ d'effluent par tonne de régimes (FFB), DCO 50 kg/m³, lagune profonde
calc(T.effluent, 'POME en lagune ouverte — par tonne de régimes traités (FFB)', 'Palm oil mill effluent in open lagoons — per tonne FFB', 'tonne FFB', r2(0.65 * 50 * 0.25 * 0.8 * GWP.CH4), 'GIEC 2006', 'Hypothèses : 0,65 m³ POME/t FFB, DCO 50 kg/m³, Bo 0,25, MCF 0,8 (lagune profonde), PRG 28 — mesurez la DCO pour affiner', { id: 'pome_open_lagoon_ffb', keywords: ['POME', 'huile de palme', 'huilerie', 'régimes', 'FFB', 'palmeraie'], sectors: AGRO, siteTypes: ['usine', 'exploitation_agricole'], unc: 0.5 })
// Domestique (bases-vie, camps) : DBO 37 g/hab/j (Afrique, GIEC 2006 tab. 6.4)
const BOD_YR = 37 * 365 / 1000
calc(T.effluent, 'Fosse septique — par résident permanent et par an', 'Septic system — per resident per year', 'personne.an', r2(BOD_YR * 0.6 * 0.5 * GWP.CH4), 'GIEC 2006', 'DBO 37 g/hab/j (Afrique, tab. 6.4) × Bo 0,6 × MCF 0,5 (fosse septique) × PRG 28', { id: 'septic_resident_yr', keywords: ['fosse septique', 'base-vie', 'camp', 'sanitaires', 'eaux noires'], sectors: ['petrole_gaz', 'mines', 'foresterie', 'construction', 'agriculture', 'tourisme'], siteTypes: ['chantier', 'hotel', 'exploitation_agricole'], unc: 0.5 })
calc(T.effluent, 'Latrines (climat humide) — par résident permanent et par an', 'Latrine, wet climate — per resident per year', 'personne.an', r2(BOD_YR * 0.6 * 0.7 * GWP.CH4), 'GIEC 2006', 'DBO 37 g/hab/j (Afrique) × Bo 0,6 × MCF 0,7 (latrine, nappe haute / climat humide) × PRG 28', { id: 'latrine_resident_yr', keywords: ['latrine', 'base-vie', 'camp', 'sanitaires'], sectors: ['mines', 'foresterie', 'construction', 'agriculture'], siteTypes: ['chantier', 'exploitation_agricole'], unc: 0.5 })
calc(T.effluent, 'N₂O des effluents (par kg d’azote rejeté)', 'N2O from effluent nitrogen', 'kg N', r4(0.005 * 44 / 28 * GWP.N2O), 'GIEC 2006', 'GIEC 2006 vol.5 §6.3 : 0,005 kg N2O-N/kg N × 44/28 × PRG 265', { id: 'effluent_n2o_n', keywords: ['azote', 'N2O', 'effluent', 'nitrates'], sectors: [...AGRO, 'eau', 'industrie'], unc: 0.5 })
// Biogaz : 60 % CH4 → 0,407 kg CH4/m³ à 15 °C ; torchères selon outil MDP « Tool 06 » (ouverte 50 %, fermée 90 % par défaut)
const BIOGAS_CH4 = 0.6 * 16.04 / VM
const BIO = ['biogaz', 'digesteur', 'méthaniseur', 'décharge', 'POME']
calc(T.effluent, 'Biogaz rejeté sans combustion (60 % CH₄)', 'Biogas vented (60% CH4)', 'm³', r4(BIOGAS_CH4 * GWP.CH4), 'GIEC 2006', 'Biogaz 60 % CH4 à 15 °C = 0,407 kg CH4/m³ × PRG 28', { id: 'biogas_vented_m3', keywords: [...BIO, 'fuite', 'évent'], sectors: [...AGRO, 'eau', 'industrie'], unc: 0.3 })
calc(T.effluent, 'Biogaz brûlé en torchère ouverte (60 % CH₄)', 'Biogas open flare', 'm³', r4(BIOGAS_CH4 * 0.5 * GWP.CH4), 'MDP / GIEC 2006', 'CH4 imbrûlé : efficacité par défaut 50 % (outil MDP TOOL06, torchère ouverte non surveillée) ; CO2 biogénique exclu', { id: 'biogas_open_flare_m3', keywords: [...BIO, 'torchère', 'torche'], sectors: [...AGRO, 'eau', 'industrie'], unc: 0.4 })
calc(T.effluent, 'Biogaz brûlé en torchère fermée (60 % CH₄)', 'Biogas enclosed flare', 'm³', r4(BIOGAS_CH4 * 0.1 * GWP.CH4), 'MDP / GIEC 2006', 'CH4 imbrûlé : efficacité par défaut 90 % (outil MDP TOOL06, torchère fermée) ; CO2 biogénique exclu', { id: 'biogas_enclosed_flare_m3', keywords: [...BIO, 'torchère', 'torche'], sectors: [...AGRO, 'eau', 'industrie'], unc: 0.3 })

// ── Fret (par tonne.km, DEFRA 2024, combustion + amont) ──
const FRT = ['transport', 'livraison', 'expédition', 'tonne.km']
defra('27_304_3140_14_1', T.road, 'Camion (moyenne poids lourds, charge moyenne)', 'HGV average laden', { id: 'defra24_hgv_avg_tkm', keywords: [...FRT, 'camion', 'poids lourd', 'grumier'], sectors: ['transport', 'foresterie', 'commerce', 'mines'] })
defra('27_304_3132_14_1', T.road, 'Semi-remorque > 33 t (charge moyenne)', 'Articulated HGV >33t', { id: 'defra24_hgv_artic_tkm', keywords: [...FRT, 'semi-remorque', 'grumier', 'citerne'], sectors: ['transport', 'foresterie', 'mines'] })
defra('27_304_3120_14_1', T.road, 'Porteur > 17 t (charge moyenne)', 'Rigid HGV >17t', { id: 'defra24_hgv_rigid_tkm', keywords: [...FRT, 'camion porteur'], sectors: ['transport', 'commerce', 'construction'] })
defra('27_306_3140_14_1', T.road, 'Camion frigorifique (moyenne)', 'Refrigerated HGV average', { id: 'defra24_hgv_reefer_tkm', keywords: [...FRT, 'frigorifique', 'froid', 'chaîne du froid'], sectors: ['agroalimentaire', 'commerce', 'peche', 'sante'] })
defra('27_303_3102_14_1', T.road, 'Utilitaire diesel ≤ 3,5 t', 'Van (diesel, up to 3.5t)', { id: 'defra24_van_tkm', keywords: [...FRT, 'utilitaire', 'fourgon', 'messagerie'], sectors: ['commerce', 'transport'] })
defra('27_320_3235_14_1', T.sea, 'Porte-conteneurs (moyenne)', 'Container ship average', { id: 'defra24_container_ship_tkm', keywords: [...FRT, 'conteneur', 'import', 'export', 'port', 'Owendo'], sectors: ['commerce', 'industrie', 'transport', 'agroalimentaire'] })
defra('27_320_3221_14_1', T.sea, 'Vraquier (moyenne)', 'Bulk carrier average', { id: 'defra24_bulk_carrier_tkm', keywords: [...FRT, 'vrac', 'minerai', 'manganèse', 'clinker'], sectors: ['mines', 'industrie', 'construction'] })
defra('27_320_3228_14_1', T.sea, 'Cargo général (moyenne)', 'General cargo average', { id: 'defra24_general_cargo_tkm', keywords: [...FRT, 'cargo', 'bois', 'grumes', 'colis lourds'], sectors: ['foresterie', 'industrie', 'commerce'] })
defra('27_317_3158_14_1', T.airf, 'Fret aérien international (avec forçage radiatif)', 'Air freight international, with RF', { id: 'defra24_air_freight_tkm', keywords: [...FRT, 'avion', 'aérien', 'DHL', 'express'], sectors: ['commerce', 'sante', 'tech'] })
defra('27_315_3151_14_1', T.railf, 'Fret ferroviaire', 'Freight train', { id: 'defra24_rail_freight_tkm', keywords: [...FRT, 'train', 'Transgabonais', 'SETRAG', 'wagon'], sectors: ['mines', 'foresterie', 'transport'] })

// ── Déplacements (DEFRA 2024, combustion + amont) ──
const TRAVEL = ['mission', 'déplacement', 'voyage']
defra('21_316_3180_11_1', T.plane, 'Vol international — classe économique (avec forçage radiatif)', 'International flight economy, with RF', { id: 'defra24_flight_economy_pkm', keywords: [...TRAVEL, 'avion', 'vol', 'billet'], unc: 0.15 })
defra('21_316_3184_11_1', T.plane, 'Vol international — classe affaires (avec forçage radiatif)', 'International flight business, with RF', { id: 'defra24_flight_business_pkm', keywords: [...TRAVEL, 'avion', 'vol', 'billet', 'business'], unc: 0.15 })
defra('21_316_3178_11_1', T.plane, 'Vol international — passager moyen (avec forçage radiatif)', 'International flight average passenger, with RF', { id: 'defra24_flight_avg_pkm', keywords: [...TRAVEL, 'avion', 'vol', 'billet'], unc: 0.15 })
defra('25_301_3069_4_1', T.car, 'Voiture diesel moyenne (par km)', 'Average car, diesel', { id: 'defra24_car_diesel_km', keywords: ['voiture', 'trajet', 'domicile', '4x4'] })
defra('25_301_3070_4_1', T.car, 'Voiture essence moyenne (par km)', 'Average car, petrol', { id: 'defra24_car_petrol_km', keywords: ['voiture', 'trajet', 'domicile'] })
defra('25_301_3071_4_1', T.car, 'Voiture hybride moyenne (par km)', 'Average car, hybrid', { id: 'defra24_car_hybrid_km', keywords: ['voiture', 'hybride'] })
defra('25_302_3080_4_1', T.car, 'Moto moyenne (par km)', 'Motorbike average', { id: 'defra24_motorbike_km', keywords: ['moto', 'deux-roues', 'coursier'] })
defra('25_313_3141_11_1', T.car, 'Taxi (par passager.km)', 'Taxi, per passenger.km', { id: 'defra24_taxi_pkm', keywords: ['taxi', 'clando', 'course'] })
defra('25_314_3145_11_1', T.bus, 'Bus urbain moyen', 'Average local bus', { id: 'defra24_bus_pkm', keywords: ['bus', 'Sogatra', 'transport en commun', 'navette'] })
defra('25_314_3146_11_1', T.bus, 'Autocar', 'Coach', { id: 'defra24_coach_pkm', keywords: ['car', 'autocar', 'navette personnel', 'ramassage'] })
defra('23_318_3188_11_1', T.ferry, 'Ferry / bateau — passager à pied', 'Ferry, foot passenger', { id: 'defra24_ferry_foot_pkm', keywords: ['ferry', 'bateau', 'Port-Gentil', 'vedette', 'traversée'] })
defra('23_318_3190_11_1', T.ferry, 'Ferry — passager moyen (avec ou sans véhicule)', 'Ferry, average passenger', { id: 'defra24_ferry_avg_pkm', keywords: ['ferry', 'bateau', 'Port-Gentil', 'traversée'] })

// ── Déchets (DEFRA 2024 : enfouissement et compostage) ──
const WST = ['déchets', 'décharge', 'enfouissement', 'Mindoubé']
defra('20_507_5313_15_1', T.w_household, 'Déchets industriels banals (DIB) — mis en décharge', 'Commercial & industrial waste — landfill', { id: 'defra24_ci_waste_landfill_t', wtt: false, keywords: [...WST, 'DIB', 'ordures', 'poubelles'] , unc: 0.3 })
defra('20_507_5292_15_1', T.w_organic, 'Déchets alimentaires — mis en décharge', 'Food waste — landfill', { id: 'defra24_food_waste_landfill_t', wtt: false, keywords: [...WST, 'restes alimentaires', 'cantine', 'biodéchets'], sectors: ['tourisme', 'agroalimentaire', 'commerce', 'education', 'sante'], siteTypes: ['restaurant', 'hotel', 'supermarche', 'ecole', 'clinique'], unc: 0.3 })
defra('20_507_5291_15_1', T.w_organic, 'Déchets alimentaires — compostés', 'Food waste — composting', { id: 'defra24_food_waste_compost_t', wtt: false, keywords: ['compost', 'biodéchets', 'restes alimentaires'], unc: 0.3 })
defra('20_506_5453_15_1', T.w_organic, 'Papier et carton — mis en décharge', 'Paper and board — landfill', { id: 'defra24_paper_landfill_t', wtt: false, keywords: [...WST, 'papier', 'carton', 'archives'], unc: 0.3 })
defra('20_500_5257_15_1', T.w_building, 'Bois — mis en décharge', 'Wood — landfill', { id: 'defra24_wood_landfill_t', wtt: false, keywords: [...WST, 'bois', 'chutes', 'sciure', 'palettes', 'connexes de scierie'], sectors: ['foresterie', 'construction', 'industrie'], unc: 0.3 })
defra('20_505_5383_15_1', T.w_plastic, 'Plastiques — mis en décharge (transport inclus)', 'Plastics — landfill', { id: 'defra24_plastic_landfill_t', wtt: false, keywords: [...WST, 'plastique', 'emballages'], unc: 0.3 })

// ── Eau (DEFRA 2024) ──
defra('17_404_4005_1_1', T.utilities, 'Eau potable du réseau', 'Water supply', { id: 'defra24_water_supply_m3', wtt: false, keywords: ['eau', 'SEEG', 'facture d’eau'], unc: 0.3 })
defra('18_405_4006_1_1', T.w_water, 'Eaux usées envoyées au réseau / à une station', 'Water treatment', { id: 'defra24_water_treatment_m3', wtt: false, keywords: ['eaux usées', 'assainissement', 'égout'], unc: 0.3 })

// ── Achats de matières (DEFRA 2024, production de matière primaire) ──
const mat = (id, tpl, slug, nameFr, name, extra = {}) => defra(id, tpl, nameFr, name, { id: `defra24_${slug}_t`, wtt: false, unc: 0.3, ...extra })
mat('19_500_5000_15_1', T.construction, 'aggregates', 'Granulats', 'Aggregates', { keywords: ['granulats', 'sable', 'gravier', 'latérite', 'concassé'], sectors: ['construction', 'mines'], siteTypes: ['chantier'] })
mat('19_500_5012_15_1', T.construction, 'asphalt', 'Enrobé bitumineux (asphalte)', 'Asphalt', { keywords: ['bitume', 'enrobé', 'route', 'goudron'], sectors: ['construction'], siteTypes: ['chantier'] })
mat('19_500_5016_15_1', T.construction, 'bricks', 'Briques', 'Bricks', { keywords: ['briques', 'parpaings', 'maçonnerie'], sectors: ['construction', 'immobilier'], siteTypes: ['chantier'] })
mat('19_500_5020_15_1', T.construction, 'concrete', 'Béton', 'Concrete', { keywords: ['béton', 'BPE', 'fondations'], sectors: ['construction', 'immobilier'], siteTypes: ['chantier'] })
mat('19_500_5024_15_1', T.construction, 'insulation', 'Isolants', 'Insulation', { keywords: ['isolant', 'laine de verre', 'isolation'], sectors: ['construction', 'immobilier'], siteTypes: ['chantier'] })
mat('19_505_5120_15_1', T.plastics, 'plastics_avg', 'Plastiques (moyenne)', 'Average plastics', { keywords: ['plastique', 'emballages', 'bidons'] })
mat('19_505_5124_15_1', T.plastics, 'plastic_film', 'Film plastique', 'Plastic film', { keywords: ['film', 'sachets', 'emballage', 'filet'], sectors: ['emballage', 'agroalimentaire', 'commerce'] })
mat('19_501_5056_15_1', T.glass, 'glass', 'Verre (bouteilles, vitrage)', 'Glass', { keywords: ['verre', 'bouteilles'], sectors: ['agroalimentaire', 'construction'] })
mat('19_506_5160_15_1', T.paper, 'paper_board', 'Papier et carton (moyenne)', 'Paper and board', { keywords: ['papier', 'carton', 'ramettes', 'emballage'] })
mat('19_501_5064_15_1', T.food, 'food', 'Denrées alimentaires et boissons (moyenne)', 'Food and drink', { keywords: ['repas', 'cantine', 'restauration', 'nourriture', 'boissons', 'achats alimentaires'], sectors: ['tourisme', 'education', 'sante', 'agroalimentaire', 'commerce'], siteTypes: ['restaurant', 'hotel', 'ecole', 'clinique', 'supermarche'], unc: 0.5 })
mat('19_500_5044_15_1', T.tyres, 'tyres', 'Pneumatiques', 'Tyres', { keywords: ['pneus', 'pneumatiques', 'flotte', 'engins'], sectors: ['transport', 'mines', 'foresterie', 'construction'], siteTypes: ['garage', 'logistique'] })
mat('19_501_5060_15_1', T.textiles, 'clothing', 'Vêtements et EPI textiles', 'Clothing', { keywords: ['tenues', 'uniformes', 'EPI', 'vêtements de travail', 'textile'], unc: 0.5 })
mat('19_500_5036_15_1', T.lubricants, 'mineral_oil', 'Huiles minérales et lubrifiants', 'Mineral oil', { keywords: ['huile', 'lubrifiant', 'vidange', 'graisse'], sectors: ['transport', 'mines', 'industrie', 'petrole_gaz', 'foresterie'], siteTypes: ['garage', 'usine'] })

// ── Contrôles et sortie ──
const ids = new Set()
for (const f of out) {
  if (!/^[a-z0-9][a-z0-9_]{1,99}$/.test(f.id)) throw new Error(`id invalide ${f.id}`)
  if (ids.has(f.id)) throw new Error(`doublon ${f.id}`)
  ids.add(f.id)
  if (!(f.comb + f.up >= 0)) throw new Error(`valeur ${f.id}`)
}
const q = s => s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`
const arr = a => `ARRAY[${(a ?? []).map(q).join(', ')}]::text[]`
const num = n => String(Number(n.toPrecision(10)))
const values = out.map(f => {
  const [category, subcategory, scope, ghg, iso] = f.tpl
  const total = f.comb + f.up
  return `  (${[q(f.id), q(category), q(subcategory), q(f.name), q(f.nameFr), q(`kgCO2eq/${f.unit}`), num(f.up), num(f.comb), num(total), scope, q(ghg), q(iso), q(f.source), q(f.sourceRef), f.year, q(f.region), f.unc, q(f.licence), arr(f.keywords), arr(f.sectors), arr(f.siteTypes)].join(', ')})`
})

const sql = `-- Emission factor library, 2026 extension (${out.length} factors) and three new postes:
--   * Torchage et ventage (non_energy/flaring_venting), Effluents et biogaz (non_energy/effluents_biogas),
--     Combustibles marins (energy/marine_fuels — the two existing ADEME marine fuels move there).
-- Sources:
--   * DEFRA/DESNZ 2024 GHG conversion factors v1.1 (flat file), Open Government Licence v3.0. Fuel and transport
--     totals = direct factor + its WTT (well-to-tank) factor, the same "amont + combustion" convention as the
--     ADEME factors already in the library. Each row cites both DEFRA ids in source_ref.
--   * GIEC/IPCC 2006 Guidelines (vol.2 energy, vol.3 industrial processes, vol.5 waste) with AR5 GWP
--     (CH4 28, N2O 265, as the rest of the library). Calculations and assumptions are stated in source_ref.
--   * OMI/IMO MEPC.308(73) carbon factors Cf for bunker fuels.
-- Generated by scripts/factors/build-sources-2026.cjs (do not edit by hand): values come from the official files.
-- Idempotent: INSERT … ON CONFLICT DO NOTHING (an admin edit is never overwritten).

INSERT INTO emission_factors (id, category, subcategory, name, name_fr, unit, factor_upstream, factor_combustion, factor_total,
  scope, ghg_category, iso_category, source, source_ref, source_year, region, uncertainty, licence, keywords, sectors, site_types)
VALUES
${values.join(',\n')}
ON CONFLICT (id) DO NOTHING;

-- Existing ADEME marine fuels join the new "Combustibles marins" poste (display only: saved entries keep their values)
UPDATE emission_factors SET subcategory = 'marine_fuels', updated_at = NOW()
WHERE id IN ('hfo_maritime', 'mdo_maritime') AND subcategory = 'fuels_mobile';
UPDATE emission_factors SET keywords = ARRAY['navire', 'bateau', 'soute', 'HFO', 'offshore']::text[]
WHERE id = 'hfo_maritime' AND keywords = '{}';
UPDATE emission_factors SET keywords = ARRAY['navire', 'bateau', 'soute', 'MDO', 'MGO', 'offshore']::text[]
WHERE id = 'mdo_maritime' AND keywords = '{}';
`
fs.writeFileSync(OUT, sql)

// Review table
for (const f of out) console.log(f.id.padEnd(30), f.tpl[1].padEnd(17), ('S' + f.tpl[2]).padEnd(3), String(r4(f.comb + f.up)).padStart(10), `kgCO2eq/${f.unit}`.padEnd(24), f.sourceRef.slice(0, 70))
console.log(out.length, 'facteurs →', OUT)
