// Emission factors extracted from the Carbon-Footprint_Template.xlsx
// Based on Base Carbone (ADEME) and GHG Protocol standards

export interface EmissionFactor {
  id: string
  category: string
  subcategory: string
  name: string
  nameFr: string
  unit: string
  factorUpstream: number
  factorCombustion: number
  factorTotal: number
  source: string
  sourceRef: string
  region: string
  uncertainty: number
}

// ===== SCOPE 1: Émissions directes =====

export const ENERGY_FUELS_STATIONARY: EmissionFactor[] = [
  // Butane & Propane (PCI: 12.66 kWh/kg, 12.78 kWh/kg → per kg)
  { id: 'butane_fr', category: 'energy', subcategory: 'fuels_stationary', name: 'Butane (maritime included)', nameFr: 'Butane (maritime inclus)', unit: 'kgCO2eq/kg', factorUpstream: 0.506, factorCombustion: 2.95, factorTotal: 3.46, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-GAZ-001', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'propane_fr', category: 'energy', subcategory: 'fuels_stationary', name: 'Propane (maritime included)', nameFr: 'Propane (maritime inclus)', unit: 'kgCO2eq/kg', factorUpstream: 0.498, factorCombustion: 2.98, factorTotal: 3.48, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-GAZ-002', region: 'France métropolitaine', uncertainty: 0.05 },
  // Gaz naturel (PCI: 10.4 kWh/m³ → per m³)
  { id: 'natural_gas_eu', category: 'energy', subcategory: 'fuels_stationary', name: 'Natural Gas', nameFr: 'Gaz naturel (Europe)', unit: 'kgCO2eq/m\u00B3', factorUpstream: 0.405, factorCombustion: 2.13, factorTotal: 2.54, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-EU-GAZ-010', region: 'Europe', uncertainty: 0.05 },
  { id: 'natural_gas_fr_2015', category: 'energy', subcategory: 'fuels_stationary', name: 'Natural gas 2015 (Consumption mix)', nameFr: 'Gaz naturel 2015 (mix conso, France)', unit: 'kgCO2eq/m\u00B3', factorUpstream: 0.413, factorCombustion: 1.94, factorTotal: 2.36, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-GAZ-011', region: 'France', uncertainty: 0.05 },
  // Gaz industriels (kWh — usage industriel specialise)
  { id: 'steel_furnace_gas', category: 'energy', subcategory: 'fuels_stationary', name: 'Steel furnace gas', nameFr: 'Gaz de four à acier', unit: 'kgCO2eq/kWh', factorUpstream: 0, factorCombustion: 0.659, factorTotal: 0.659, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-GAZ-020', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'coke_oven_gas', category: 'energy', subcategory: 'fuels_stationary', name: 'Coke-oven gas', nameFr: 'Gaz de cokerie', unit: 'kgCO2eq/kWh', factorUpstream: 0, factorCombustion: 0.171, factorTotal: 0.171, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-GAZ-021', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'blast_furnace_gas', category: 'energy', subcategory: 'fuels_stationary', name: 'Blast furnace gas', nameFr: 'Gaz de haut fourneau', unit: 'kgCO2eq/kWh', factorUpstream: 0, factorCombustion: 0.966, factorTotal: 0.966, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-GAZ-022', region: 'France métropolitaine', uncertainty: 0.05 },
  // Liquides (PCI ~10.0 kWh/L diesel/fioul → per litre)
  { id: 'diesel_fr', category: 'energy', subcategory: 'fuels_stationary', name: 'Road diesel', nameFr: 'Gazole routier', unit: 'kgCO2eq/litre', factorUpstream: 0.677, factorCombustion: 2.54, factorTotal: 3.22, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-LIQ-001', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'off_road_diesel', category: 'energy', subcategory: 'fuels_stationary', name: 'Off road diesel', nameFr: 'Gazole non routier (GNR)', unit: 'kgCO2eq/litre', factorUpstream: 0.671, factorCombustion: 2.56, factorTotal: 3.23, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-LIQ-002', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'fuel_oil_fr', category: 'energy', subcategory: 'fuels_stationary', name: 'Domestic fuel oil', nameFr: 'Fioul domestique', unit: 'kgCO2eq/litre', factorUpstream: 0.527, factorCombustion: 2.72, factorTotal: 3.25, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-LIQ-003', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'heavy_fuel_oil', category: 'energy', subcategory: 'fuels_stationary', name: 'Heavy fuel oil (commercial)', nameFr: 'Fioul lourd (commercial)', unit: 'kgCO2eq/litre', factorUpstream: 0.446, factorCombustion: 3.06, factorTotal: 3.50, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-LIQ-004', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'bitumens_fr', category: 'energy', subcategory: 'fuels_stationary', name: 'Bitumens', nameFr: 'Bitumes', unit: 'kgCO2eq/tonne', factorUpstream: 319, factorCombustion: 3245, factorTotal: 3564, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-LIQ-010', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'naphtha_fr', category: 'energy', subcategory: 'fuels_stationary', name: 'Naphtha', nameFr: 'Naphta', unit: 'kgCO2eq/litre', factorUpstream: 0.301, factorCombustion: 2.15, factorTotal: 2.45, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-LIQ-011', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'shale_oil', category: 'energy', subcategory: 'fuels_stationary', name: 'Shale oil', nameFr: 'Huile de schiste', unit: 'kgCO2eq/litre', factorUpstream: 4.81, factorCombustion: 2.77, factorTotal: 7.58, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-LIQ-012', region: 'France métropolitaine', uncertainty: 0.05 },
  // Charbon & solides (PCI variable → per tonne)
  { id: 'coal_fr', category: 'energy', subcategory: 'fuels_stationary', name: 'Concentrated coal', nameFr: 'Houille agglomérée', unit: 'kgCO2eq/tonne', factorUpstream: 239, factorCombustion: 2588, factorTotal: 2828, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-SOL-001', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'anthracite_fr', category: 'energy', subcategory: 'fuels_stationary', name: 'Anthracite', nameFr: 'Anthracite', unit: 'kgCO2eq/tonne', factorUpstream: 255, factorCombustion: 2848, factorTotal: 3104, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-SOL-002', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'lignite_fr', category: 'energy', subcategory: 'fuels_stationary', name: 'Lignite briquette', nameFr: 'Briquette de lignite', unit: 'kgCO2eq/tonne', factorUpstream: 134, factorCombustion: 1499, factorTotal: 1634, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-SOL-003', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'steam_coal', category: 'energy', subcategory: 'fuels_stationary', name: 'Steam coal', nameFr: 'Charbon vapeur', unit: 'kgCO2eq/tonne', factorUpstream: 230, factorCombustion: 2484, factorTotal: 2714, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-SOL-004', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'peat_fr', category: 'energy', subcategory: 'fuels_stationary', name: 'Peat', nameFr: 'Tourbe', unit: 'kgCO2eq/tonne', factorUpstream: 105, factorCombustion: 1313, factorTotal: 1419, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-SOL-005', region: 'France métropolitaine', uncertainty: 0.05 },
  // Coke & Dechets (per tonne)
  { id: 'coke_fr', category: 'energy', subcategory: 'fuels_stationary', name: 'Coke from hard coal', nameFr: 'Coke de houille', unit: 'kgCO2eq/tonne', factorUpstream: 249, factorCombustion: 3034, factorTotal: 3284, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-SOL-010', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'coke_lignite', category: 'energy', subcategory: 'fuels_stationary', name: 'Coke from lignite', nameFr: 'Coke de lignite', unit: 'kgCO2eq/tonne', factorUpstream: 230, factorCombustion: 2830, factorTotal: 3060, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-SOL-011', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'coke_oil', category: 'energy', subcategory: 'fuels_stationary', name: 'Coke from oil', nameFr: 'Coke de pétrole', unit: 'kgCO2eq/tonne', factorUpstream: 359, factorCombustion: 3036, factorTotal: 3393, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-SOL-012', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'used_tyres', category: 'energy', subcategory: 'fuels_stationary', name: 'Used tyres (fuel mix)', nameFr: 'Pneus usagés (mix)', unit: 'kgCO2eq/tonne', factorUpstream: 97.5, factorCombustion: 3795, factorTotal: 3893, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-DEC-001', region: 'France métropolitaine', uncertainty: 0.05 },
]

export const ENERGY_FUELS_ORGANIC: EmissionFactor[] = [
  // Biodiesel (PCI: 9.2 kWh/L → per litre)
  { id: 'biodiesel_max', category: 'energy', subcategory: 'fuels_organic', name: 'Biodiesel (with land-use change, max)', nameFr: 'Biodiesel (avec changement usage des sols, max)', unit: 'kgCO2eq/litre', factorUpstream: 7.18, factorCombustion: 0, factorTotal: 7.18, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-BIO-001', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'biodiesel_no_luc', category: 'energy', subcategory: 'fuels_organic', name: 'Biodiesel (without land-use change)', nameFr: 'Biodiesel (sans changement usage des sols)', unit: 'kgCO2eq/litre', factorUpstream: 1.01, factorCombustion: 0, factorTotal: 1.01, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-BIO-002', region: 'France métropolitaine', uncertainty: 0.05 },
  // Bioethanol (PCI: 5.9 kWh/L → per litre)
  { id: 'bioethanol_max', category: 'energy', subcategory: 'fuels_organic', name: 'Bioethanol (with land-use change, max)', nameFr: 'Bioéthanol (avec changement usage des sols, max)', unit: 'kgCO2eq/litre', factorUpstream: 0.714, factorCombustion: 0, factorTotal: 0.714, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-BIO-003', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'bioethanol_no_luc', category: 'energy', subcategory: 'fuels_organic', name: 'Bioethanol (without land-use change)', nameFr: 'Bioéthanol (sans changement usage des sols)', unit: 'kgCO2eq/litre', factorUpstream: 0.850, factorCombustion: 0, factorTotal: 0.850, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-BIO-004', region: 'France métropolitaine', uncertainty: 0.05 },
  // Biogaz & Biomethane (PCI: 6.0 kWh/m³, 10.0 kWh/m³ → per m³)
  { id: 'biogas_network', category: 'energy', subcategory: 'fuels_organic', name: 'Biogas injected in network (avg mix)', nameFr: 'Biogaz injecté réseau (mix moyen)', unit: 'kgCO2eq/m\u00B3', factorUpstream: 0.257, factorCombustion: 0.00936, factorTotal: 0.264, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-BIO-010', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'biomethane_fr', category: 'energy', subcategory: 'fuels_organic', name: 'Biomethane (STEU, injected)', nameFr: 'Biométhane (STEU, injecté réseau)', unit: 'kgCO2eq/m\u00B3', factorUpstream: 0.134, factorCombustion: 0.0293, factorTotal: 0.163, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-BIO-011', region: 'France métropolitaine', uncertainty: 0.05 },
  // Bois & biomasse (PCI variable → per tonne)
  { id: 'wood_log_fr', category: 'energy', subcategory: 'fuels_organic', name: 'Wood log (20% humidity)', nameFr: 'Bûches de bois (20% humidité)', unit: 'kgCO2eq/tonne', factorUpstream: 40.7, factorCombustion: 71.4, factorTotal: 112.1, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-BIO-020', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'wood_pellets_fr', category: 'energy', subcategory: 'fuels_organic', name: 'Wood pellets (8% humidity)', nameFr: 'Granules de bois (8% humidité)', unit: 'kgCO2eq/tonne', factorUpstream: 77.1, factorCombustion: 65.8, factorTotal: 141.0, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-BIO-021', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'woodchips_fr', category: 'energy', subcategory: 'fuels_organic', name: 'Woodchips (25% humidity)', nameFr: 'Plaquettes forestières (25% humidité)', unit: 'kgCO2eq/tonne', factorUpstream: 37.0, factorCombustion: 43.6, factorTotal: 79.2, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-BIO-022', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'sawdust_fr', category: 'energy', subcategory: 'fuels_organic', name: 'Sawdust (50% humidity)', nameFr: 'Sciure (50% humidité)', unit: 'kgCO2eq/tonne', factorUpstream: 5.98, factorCombustion: 0.438, factorTotal: 6.6, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-BIO-023', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'straw_fr', category: 'energy', subcategory: 'fuels_organic', name: 'Straw (10% humidity)', nameFr: 'Paille (10% humidité)', unit: 'kgCO2eq/tonne', factorUpstream: 215.5, factorCombustion: 0, factorTotal: 214.2, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-BIO-024', region: 'France métropolitaine', uncertainty: 0.05 },
]

export const ENERGY_FUELS_MOBILE: EmissionFactor[] = [
  { id: 'gasoline_mobile', category: 'energy', subcategory: 'fuels_mobile', name: 'Gasoline (lead free)', nameFr: 'Essence sans plomb', unit: 'kgCO2eq/litre', factorUpstream: 0.528, factorCombustion: 2.28, factorTotal: 2.808, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-MOB-001', region: 'France métropolitaine', uncertainty: 0.1 },
  { id: 'diesel_mobile', category: 'energy', subcategory: 'fuels_mobile', name: 'Road diesel', nameFr: 'Gazole routier', unit: 'kgCO2eq/litre', factorUpstream: 0.605, factorCombustion: 2.67, factorTotal: 3.275, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-MOB-002', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'diesel_b30', category: 'energy', subcategory: 'fuels_mobile', name: 'Diesel oil (B30)', nameFr: 'Gazole B30', unit: 'kgCO2eq/litre', factorUpstream: 0.605, factorCombustion: 1.87, factorTotal: 2.475, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-MOB-003', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'lpg_mobile', category: 'energy', subcategory: 'fuels_mobile', name: 'LPG for vehicles', nameFr: 'GPL carburant', unit: 'kgCO2eq/litre', factorUpstream: 0.256, factorCombustion: 1.54, factorTotal: 1.796, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-MOB-004', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'lng_mobile', category: 'energy', subcategory: 'fuels_mobile', name: 'LNG (road/maritime)', nameFr: 'GNL (route/maritime)', unit: 'kgCO2eq/litre', factorUpstream: 0.421, factorCombustion: 2.04, factorTotal: 2.461, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-MOB-005', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'cng_mobile', category: 'energy', subcategory: 'fuels_mobile', name: 'CNG for road vehicle', nameFr: 'GNC (véhicules routiers)', unit: 'kgCO2eq/m\u00B3', factorUpstream: 0.445, factorCombustion: 1.94, factorTotal: 2.39, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-MOB-006', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'jet_fuel_a1', category: 'energy', subcategory: 'fuels_mobile', name: 'Jet fuel A1/A', nameFr: 'Kérosène aviation (Jet A1)', unit: 'kgCO2eq/litre', factorUpstream: 0.573, factorCombustion: 2.52, factorTotal: 3.093, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-GL-MOB-010', region: 'Global', uncertainty: 0.05 },
  { id: 'avgas', category: 'energy', subcategory: 'fuels_mobile', name: 'Aviation gasoline (AvGas)', nameFr: 'Essence aviation (AvGas)', unit: 'kgCO2eq/litre', factorUpstream: 0.573, factorCombustion: 2.52, factorTotal: 3.093, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-GL-MOB-011', region: 'Global', uncertainty: 0.05 },
  { id: 'hfo_maritime', category: 'energy', subcategory: 'fuels_mobile', name: 'HFO (Heavy Fuel Oil, maritime)', nameFr: 'Fioul lourd (maritime)', unit: 'kgCO2eq/litre', factorUpstream: 0.516, factorCombustion: 3.25, factorTotal: 3.766, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-GL-MOB-012', region: 'Global', uncertainty: 0.05 },
  { id: 'mdo_maritime', category: 'energy', subcategory: 'fuels_mobile', name: 'MDO (Marine Diesel Oil)', nameFr: 'MDO (diesel maritime)', unit: 'kgCO2eq/litre', factorUpstream: 0.605, factorCombustion: 2.79, factorTotal: 3.395, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-GL-MOB-013', region: 'Global', uncertainty: 0.05 },
]

// ===== SCOPE 2: Émissions indirectes liées à l'énergie =====

export const ELECTRICITY_FACTORS: EmissionFactor[] = [
  // France metropolitaine par usage (2018)
  { id: 'elec_fr_industry', category: 'energy', subcategory: 'electricity', name: '2018 - Electricity industry', nameFr: 'Électricité 2018 - Industrie', unit: 'kgCO2eq/kWh', factorUpstream: 0.0105, factorCombustion: 0.0243, factorTotal: 0.0348, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-ELEC-001', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'elec_fr_heating', category: 'energy', subcategory: 'electricity', name: '2018 - Electricity heating', nameFr: 'Électricité 2018 - Chauffage', unit: 'kgCO2eq/kWh', factorUpstream: 0.0237, factorCombustion: 0.119, factorTotal: 0.143, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-ELEC-002', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'elec_fr_transport', category: 'energy', subcategory: 'electricity', name: '2018 - Electricity transports', nameFr: 'Électricité 2018 - Transports', unit: 'kgCO2eq/kWh', factorUpstream: 0.0105, factorCombustion: 0.0237, factorTotal: 0.0342, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-ELEC-003', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'elec_fr_lighting', category: 'energy', subcategory: 'electricity', name: '2018 - Electricity lighting (ind)', nameFr: 'Électricité 2018 - Éclairage industriel', unit: 'kgCO2eq/kWh', factorUpstream: 0.0135, factorCombustion: 0.0465, factorTotal: 0.060, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-ELEC-004', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'elec_fr_other', category: 'energy', subcategory: 'electricity', name: '2018 - Electricity other uses', nameFr: 'Électricité 2018 - Autres usages', unit: 'kgCO2eq/kWh', factorUpstream: 0.0113, factorCombustion: 0.0299, factorTotal: 0.0412, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-ELEC-005', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'elec_fr_hotwater', category: 'energy', subcategory: 'electricity', name: '2018 - Electricity hot water', nameFr: 'Électricité 2018 - Eau chaude sanitaire', unit: 'kgCO2eq/kWh', factorUpstream: 0.0123, factorCombustion: 0.0371, factorTotal: 0.0494, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-ELEC-006', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'elec_fr_aircon', category: 'energy', subcategory: 'electricity', name: '2018 - Electricity air conditioning', nameFr: 'Électricité 2018 - Climatisation', unit: 'kgCO2eq/kWh', factorUpstream: 0.0105, factorCombustion: 0.0238, factorTotal: 0.0343, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-ELEC-007', region: 'France métropolitaine', uncertainty: 0.05 },
  { id: 'elec_fr_cooking', category: 'energy', subcategory: 'electricity', name: '2018 - Electricity cooking', nameFr: 'Électricité 2018 - Cuisson', unit: 'kgCO2eq/kWh', factorUpstream: 0.0118, factorCombustion: 0.0336, factorTotal: 0.0454, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-ELEC-008', region: 'France métropolitaine', uncertainty: 0.05 },
  // Europe & Ameriques
  { id: 'elec_eu', category: 'energy', subcategory: 'electricity', name: 'Electricity Europe average', nameFr: 'Électricité Europe moyenne', unit: 'kgCO2eq/kWh', factorUpstream: 0.042, factorCombustion: 0.420, factorTotal: 0.420, source: 'IEA/EEA 2021', sourceRef: 'IEA-2021-EU-AVG', region: 'Europe', uncertainty: 0.1 },
  { id: 'elec_de', category: 'energy', subcategory: 'electricity', name: 'Electricity Germany', nameFr: 'Électricité Allemagne', unit: 'kgCO2eq/kWh', factorUpstream: 0.059, factorCombustion: 0.461, factorTotal: 0.461, source: 'IEA 2021', sourceRef: 'IEA-2021-DE', region: 'Allemagne', uncertainty: 0.1 },
  { id: 'elec_uk', category: 'energy', subcategory: 'electricity', name: 'Electricity UK', nameFr: 'Électricité Royaume-Uni', unit: 'kgCO2eq/kWh', factorUpstream: 0.034, factorCombustion: 0.233, factorTotal: 0.233, source: 'DEFRA 2023', sourceRef: 'DEFRA-2023-UK-ELEC', region: 'Royaume-Uni', uncertainty: 0.1 },
  { id: 'elec_us', category: 'energy', subcategory: 'electricity', name: 'Electricity USA', nameFr: 'Électricité États-Unis', unit: 'kgCO2eq/kWh', factorUpstream: 0.055, factorCombustion: 0.417, factorTotal: 0.417, source: 'EPA eGRID 2022', sourceRef: 'EPA-EGRID-2022-US', region: 'États-Unis', uncertainty: 0.1 },
  { id: 'elec_br', category: 'energy', subcategory: 'electricity', name: 'Electricity Brazil', nameFr: 'Électricité Brésil', unit: 'kgCO2eq/kWh', factorUpstream: 0.012, factorCombustion: 0.074, factorTotal: 0.086, source: 'IEA 2021', sourceRef: 'IEA-2021-BR', region: 'Brésil', uncertainty: 0.15 },
  // Asie
  { id: 'elec_cn', category: 'energy', subcategory: 'electricity', name: 'Electricity China', nameFr: 'Électricité Chine', unit: 'kgCO2eq/kWh', factorUpstream: 0.08, factorCombustion: 0.681, factorTotal: 0.681, source: 'IEA 2021', sourceRef: 'IEA-2021-CN', region: 'Chine', uncertainty: 0.15 },
  { id: 'elec_in', category: 'energy', subcategory: 'electricity', name: 'Electricity India', nameFr: 'Électricité Inde', unit: 'kgCO2eq/kWh', factorUpstream: 0.09, factorCombustion: 0.708, factorTotal: 0.798, source: 'IEA 2021', sourceRef: 'IEA-2021-IN', region: 'Inde', uncertainty: 0.15 },
  // Afrique centrale & occidentale
  { id: 'elec_gabon', category: 'energy', subcategory: 'electricity', name: 'Electricity Gabon', nameFr: 'Électricité Gabon', unit: 'kgCO2eq/kWh', factorUpstream: 0.04, factorCombustion: 0.466, factorTotal: 0.506, source: 'IEA/UNFCCC 2021', sourceRef: 'IEA-2021-GA', region: 'Gabon', uncertainty: 0.2 },
  { id: 'elec_cameroon', category: 'energy', subcategory: 'electricity', name: 'Electricity Cameroon', nameFr: 'Électricité Cameroun', unit: 'kgCO2eq/kWh', factorUpstream: 0.03, factorCombustion: 0.230, factorTotal: 0.260, source: 'IEA/UNFCCC 2021', sourceRef: 'IEA-2021-CM', region: 'Cameroun', uncertainty: 0.2 },
  { id: 'elec_senegal', category: 'energy', subcategory: 'electricity', name: 'Electricity Senegal', nameFr: 'Électricité Sénégal', unit: 'kgCO2eq/kWh', factorUpstream: 0.06, factorCombustion: 0.620, factorTotal: 0.680, source: 'IEA/UNFCCC 2021', sourceRef: 'IEA-2021-SN', region: 'Sénégal', uncertainty: 0.2 },
  { id: 'elec_civ', category: 'energy', subcategory: 'electricity', name: 'Electricity Cote d\'Ivoire', nameFr: 'Électricité Côte d\'Ivoire', unit: 'kgCO2eq/kWh', factorUpstream: 0.04, factorCombustion: 0.430, factorTotal: 0.470, source: 'IEA/UNFCCC 2021', sourceRef: 'IEA-2021-CI', region: 'Côte d\'Ivoire', uncertainty: 0.2 },
  { id: 'elec_congo_rdc', category: 'energy', subcategory: 'electricity', name: 'Electricity DR Congo', nameFr: 'Électricité RD Congo', unit: 'kgCO2eq/kWh', factorUpstream: 0.005, factorCombustion: 0.003, factorTotal: 0.008, source: 'IEA/UNFCCC 2021', sourceRef: 'IEA-2021-CD', region: 'RD Congo', uncertainty: 0.25 },
  { id: 'elec_congo', category: 'energy', subcategory: 'electricity', name: 'Electricity Congo-Brazzaville', nameFr: 'Électricité Congo-Brazzaville', unit: 'kgCO2eq/kWh', factorUpstream: 0.02, factorCombustion: 0.168, factorTotal: 0.188, source: 'IEA/UNFCCC 2021', sourceRef: 'IEA-2021-CG', region: 'Congo-Brazzaville', uncertainty: 0.25 },
  { id: 'elec_guinea', category: 'energy', subcategory: 'electricity', name: 'Electricity Guinea (Equatorial)', nameFr: 'Électricité Guinée équatoriale', unit: 'kgCO2eq/kWh', factorUpstream: 0.05, factorCombustion: 0.520, factorTotal: 0.570, source: 'IEA/UNFCCC 2021', sourceRef: 'IEA-2021-GQ', region: 'Guinée équatoriale', uncertainty: 0.25 },
  // Afrique du Nord & Est
  { id: 'elec_morocco', category: 'energy', subcategory: 'electricity', name: 'Electricity Morocco', nameFr: 'Électricité Maroc', unit: 'kgCO2eq/kWh', factorUpstream: 0.06, factorCombustion: 0.636, factorTotal: 0.696, source: 'IEA 2021', sourceRef: 'IEA-2021-MA', region: 'Maroc', uncertainty: 0.15 },
  { id: 'elec_tunisia', category: 'energy', subcategory: 'electricity', name: 'Electricity Tunisia', nameFr: 'Électricité Tunisie', unit: 'kgCO2eq/kWh', factorUpstream: 0.05, factorCombustion: 0.480, factorTotal: 0.530, source: 'IEA 2021', sourceRef: 'IEA-2021-TN', region: 'Tunisie', uncertainty: 0.15 },
  { id: 'elec_algeria', category: 'energy', subcategory: 'electricity', name: 'Electricity Algeria', nameFr: 'Électricité Algérie', unit: 'kgCO2eq/kWh', factorUpstream: 0.05, factorCombustion: 0.530, factorTotal: 0.580, source: 'IEA 2021', sourceRef: 'IEA-2021-DZ', region: 'Algérie', uncertainty: 0.15 },
  { id: 'elec_south_africa', category: 'energy', subcategory: 'electricity', name: 'Electricity South Africa', nameFr: 'Électricité Afrique du Sud', unit: 'kgCO2eq/kWh', factorUpstream: 0.08, factorCombustion: 0.928, factorTotal: 1.008, source: 'Eskom/IEA 2021', sourceRef: 'IEA-2021-ZA', region: 'Afrique du Sud', uncertainty: 0.1 },
  { id: 'elec_nigeria', category: 'energy', subcategory: 'electricity', name: 'Electricity Nigeria', nameFr: 'Électricité Nigeria', unit: 'kgCO2eq/kWh', factorUpstream: 0.05, factorCombustion: 0.410, factorTotal: 0.460, source: 'IEA/UNFCCC 2021', sourceRef: 'IEA-2021-NG', region: 'Nigeria', uncertainty: 0.2 },
  { id: 'elec_kenya', category: 'energy', subcategory: 'electricity', name: 'Electricity Kenya', nameFr: 'Électricité Kenya', unit: 'kgCO2eq/kWh', factorUpstream: 0.02, factorCombustion: 0.128, factorTotal: 0.148, source: 'IEA/UNFCCC 2021', sourceRef: 'IEA-2021-KE', region: 'Kenya', uncertainty: 0.2 },
  { id: 'elec_ethiopia', category: 'energy', subcategory: 'electricity', name: 'Electricity Ethiopia', nameFr: 'Électricité Éthiopie', unit: 'kgCO2eq/kWh', factorUpstream: 0.003, factorCombustion: 0.017, factorTotal: 0.020, source: 'IEA/UNFCCC 2021', sourceRef: 'IEA-2021-ET', region: 'Éthiopie', uncertainty: 0.2 },
  // Default global (for countries not listed)
  { id: 'elec_world_avg', category: 'energy', subcategory: 'electricity', name: 'Electricity World average', nameFr: 'Électricité Moyenne mondiale', unit: 'kgCO2eq/kWh', factorUpstream: 0.06, factorCombustion: 0.475, factorTotal: 0.535, source: 'IEA 2021', sourceRef: 'IEA-2021-WORLD', region: 'Global', uncertainty: 0.15 },
]

export const STEAM_COOLING_FACTORS: EmissionFactor[] = [
  { id: 'steam_fr', category: 'energy', subcategory: 'steam', name: 'Steam (heat network)', nameFr: 'Vapeur (réseau de chaleur)', unit: 'kgCO2eq/kWh', factorUpstream: 0.025, factorCombustion: 0.177, factorTotal: 0.202, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-RCH-001', region: 'France métropolitaine', uncertainty: 0.1 },
  { id: 'cooling_fr', category: 'energy', subcategory: 'cooling', name: 'Cooling (network)', nameFr: 'Froid (réseau)', unit: 'kgCO2eq/kWh', factorUpstream: 0.01, factorCombustion: 0.041, factorTotal: 0.051, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-RCH-002', region: 'France métropolitaine', uncertainty: 0.1 },
]

// ===== NON-ENERGY EMISSIONS =====

export const REFRIGERANT_FACTORS: EmissionFactor[] = [
  { id: 'r134a', category: 'non_energy', subcategory: 'refrigerants', name: 'R-134a (HFC)', nameFr: 'R-134a (HFC)', unit: 'kgCO2eq/kg', factorUpstream: 0, factorCombustion: 1430, factorTotal: 1430, source: 'IPCC AR5 (2014)', sourceRef: 'IPCC-AR5-GWP-R134A', region: 'Global', uncertainty: 0.1 },
  { id: 'r410a', category: 'non_energy', subcategory: 'refrigerants', name: 'R-410A (HFC)', nameFr: 'R-410A (HFC)', unit: 'kgCO2eq/kg', factorUpstream: 0, factorCombustion: 2088, factorTotal: 2088, source: 'IPCC AR5 (2014)', sourceRef: 'IPCC-AR5-GWP-R410A', region: 'Global', uncertainty: 0.1 },
  { id: 'r404a', category: 'non_energy', subcategory: 'refrigerants', name: 'R-404A (HFC)', nameFr: 'R-404A (HFC)', unit: 'kgCO2eq/kg', factorUpstream: 0, factorCombustion: 3922, factorTotal: 3922, source: 'IPCC AR5 (2014)', sourceRef: 'IPCC-AR5-GWP-R404A', region: 'Global', uncertainty: 0.1 },
  { id: 'r407c', category: 'non_energy', subcategory: 'refrigerants', name: 'R-407C (HFC)', nameFr: 'R-407C (HFC)', unit: 'kgCO2eq/kg', factorUpstream: 0, factorCombustion: 1774, factorTotal: 1774, source: 'IPCC AR5 (2014)', sourceRef: 'IPCC-AR5-GWP-R407C', region: 'Global', uncertainty: 0.1 },
  { id: 'r32', category: 'non_energy', subcategory: 'refrigerants', name: 'R-32 (HFC)', nameFr: 'R-32 (HFC)', unit: 'kgCO2eq/kg', factorUpstream: 0, factorCombustion: 675, factorTotal: 675, source: 'IPCC AR5 (2014)', sourceRef: 'IPCC-AR5-GWP-R32', region: 'Global', uncertainty: 0.1 },
  { id: 'co2_process', category: 'non_energy', subcategory: 'process', name: 'CO2 direct emissions', nameFr: 'Émissions directes CO2', unit: 'kgCO2eq/kg CO2', factorUpstream: 0, factorCombustion: 1, factorTotal: 1, source: 'IPCC (2006 GL)', sourceRef: 'IPCC-2006-GL-CO2', region: 'Global', uncertainty: 0.05 },
  { id: 'n2o_process', category: 'non_energy', subcategory: 'process', name: 'N2O emissions', nameFr: 'Émissions N2O', unit: 'kgCO2eq/kg N2O', factorUpstream: 0, factorCombustion: 265, factorTotal: 265, source: 'IPCC AR5 (2014)', sourceRef: 'IPCC-AR5-GWP-N2O', region: 'Global', uncertainty: 0.1 },
  { id: 'ch4_process', category: 'non_energy', subcategory: 'process', name: 'CH4 emissions', nameFr: 'Émissions CH4', unit: 'kgCO2eq/kg CH4', factorUpstream: 0, factorCombustion: 28, factorTotal: 28, source: 'IPCC AR5 (2014)', sourceRef: 'IPCC-AR5-GWP-CH4', region: 'Global', uncertainty: 0.1 },
]

// ===== SCOPE 3: Émissions indirectes =====

export const INPUTS_METALS: EmissionFactor[] = [
  { id: 'steel_fr', category: 'inputs', subcategory: 'metals', name: 'Steel or tinplate', nameFr: 'Acier ou fer blanc', unit: 'kgCO2eq/tonne', factorUpstream: 2210, factorCombustion: 0, factorTotal: 2210, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-MAT-001', region: 'Europe', uncertainty: 0.3 },
  { id: 'steel_recycled_fr', category: 'inputs', subcategory: 'metals', name: 'Steel (recycled)', nameFr: 'Acier (recyclé)', unit: 'kgCO2eq/tonne', factorUpstream: 938, factorCombustion: 0, factorTotal: 938, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-MAT-002', region: 'Europe', uncertainty: 0.3 },
  { id: 'aluminium_fr', category: 'inputs', subcategory: 'metals', name: 'Aluminium', nameFr: 'Aluminium', unit: 'kgCO2eq/tonne', factorUpstream: 7800, factorCombustion: 0, factorTotal: 7800, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-MAT-003', region: 'Europe', uncertainty: 0.3 },
  { id: 'aluminium_recycled_fr', category: 'inputs', subcategory: 'metals', name: 'Aluminium (recycled)', nameFr: 'Aluminium (recyclé)', unit: 'kgCO2eq/tonne', factorUpstream: 562, factorCombustion: 0, factorTotal: 562, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-MAT-004', region: 'Europe', uncertainty: 0.3 },
  { id: 'copper_fr', category: 'inputs', subcategory: 'metals', name: 'Copper', nameFr: 'Cuivre', unit: 'kgCO2eq/tonne', factorUpstream: 1450, factorCombustion: 0, factorTotal: 1450, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-MAT-005', region: 'Europe', uncertainty: 0.3 },
  { id: 'nickel_fr', category: 'inputs', subcategory: 'metals', name: 'Nickel', nameFr: 'Nickel', unit: 'kgCO2eq/tonne', factorUpstream: 9170, factorCombustion: 0, factorTotal: 9170, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR-MAT-006', region: 'Europe', uncertainty: 0.3 },
]

export const INPUTS_PLASTICS: EmissionFactor[] = [
  { id: 'pet_fr', category: 'inputs', subcategory: 'plastics', name: 'Plastic (PET)', nameFr: 'Plastique (PET)', unit: 'kgCO2eq/tonne', factorUpstream: 3270, factorCombustion: 0, factorTotal: 3270, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.3 },
  { id: 'nylon_fr', category: 'inputs', subcategory: 'plastics', name: 'Nylon', nameFr: 'Nylon', unit: 'kgCO2eq/tonne', factorUpstream: 7630, factorCombustion: 0, factorTotal: 7630, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.3 },
  { id: 'plastic_avg_fr', category: 'inputs', subcategory: 'plastics', name: 'Plastic (average)', nameFr: 'Plastique (moyenne)', unit: 'kgCO2eq/tonne', factorUpstream: 2380, factorCombustion: 0, factorTotal: 2380, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.3 },
  { id: 'hdpe_fr', category: 'inputs', subcategory: 'plastics', name: 'HDPE', nameFr: 'PEHD', unit: 'kgCO2eq/tonne', factorUpstream: 1900, factorCombustion: 0, factorTotal: 1900, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.3 },
  { id: 'pvc_fr', category: 'inputs', subcategory: 'plastics', name: 'PVC', nameFr: 'PVC', unit: 'kgCO2eq/tonne', factorUpstream: 2810, factorCombustion: 0, factorTotal: 2810, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.3 },
]

export const INPUTS_OTHER: EmissionFactor[] = [
  { id: 'glass_fr', category: 'inputs', subcategory: 'glass', name: 'Glass', nameFr: 'Verre', unit: 'kgCO2eq/tonne', factorUpstream: 1170, factorCombustion: 0, factorTotal: 1170, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.3 },
  { id: 'paper_fr', category: 'inputs', subcategory: 'paper', name: 'Paper/Cardboard', nameFr: 'Papier/Carton', unit: 'kgCO2eq/tonne', factorUpstream: 919, factorCombustion: 0, factorTotal: 919, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.3 },
  { id: 'paper_recycled_fr', category: 'inputs', subcategory: 'paper', name: 'Paper recycled', nameFr: 'Papier recyclé', unit: 'kgCO2eq/tonne', factorUpstream: 662, factorCombustion: 0, factorTotal: 662, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.3 },
  { id: 'concrete_fr', category: 'inputs', subcategory: 'construction', name: 'Concrete', nameFr: 'Béton', unit: 'kgCO2eq/tonne', factorUpstream: 152, factorCombustion: 0, factorTotal: 152, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.3 },
  { id: 'cement_fr', category: 'inputs', subcategory: 'construction', name: 'Cement', nameFr: 'Ciment', unit: 'kgCO2eq/tonne', factorUpstream: 866, factorCombustion: 0, factorTotal: 866, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.3 },
  { id: 'water_fr', category: 'inputs', subcategory: 'utilities', name: 'Water supply', nameFr: 'Eau potable', unit: 'kgCO2eq/m³', factorUpstream: 0.132, factorCombustion: 0, factorTotal: 0.132, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.3 },
]

// ===== FREIGHT =====

export const FREIGHT_FACTORS: EmissionFactor[] = [
  // Route — charge moyenne par véhicule intégrée (user entre les km parcourus)
  { id: 'truck_artic_fr', category: 'freight', subcategory: 'road', name: 'Articulated truck 40t (avg load 20t)', nameFr: 'Camion articulé 40t (charge moy. 20t)', unit: 'kgCO2eq/km', factorUpstream: 0.143, factorCombustion: 0.546, factorTotal: 0.766, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.1 },
  { id: 'truck_rigid_fr', category: 'freight', subcategory: 'road', name: 'Rigid truck 12t (avg load 5t)', nameFr: 'Camion rigide 12t (charge moy. 5t)', unit: 'kgCO2eq/km', factorUpstream: 0.102, factorCombustion: 0.388, factorTotal: 0.570, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.1 },
  { id: 'van_fr', category: 'freight', subcategory: 'road', name: 'Van <3.5t (avg load 0.5t)', nameFr: 'Utilitaire <3.5t (charge moy. 0.5t)', unit: 'kgCO2eq/km', factorUpstream: 0.075, factorCombustion: 0.286, factorTotal: 0.397, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.2 },
  // Fret externalisé — par expédition type (user entre les km de distance)
  { id: 'air_freight', category: 'freight', subcategory: 'air', name: 'Air freight (per tonne shipped)', nameFr: 'Fret aérien (par tonne expédiée)', unit: 'kgCO2eq/km', factorUpstream: 0.172, factorCombustion: 0.860, factorTotal: 1.12, source: 'GHG Protocol / ADEME', sourceRef: 'GHG-2023-GL', region: 'Global', uncertainty: 0.2 },
  { id: 'rail_freight_fr', category: 'freight', subcategory: 'rail', name: 'Rail freight (per wagon 30t)', nameFr: 'Fret ferroviaire (par wagon 30t)', unit: 'kgCO2eq/km', factorUpstream: 0.0741, factorCombustion: 0.161, factorTotal: 0.235, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.1 },
  { id: 'maritime_freight', category: 'freight', subcategory: 'maritime', name: 'Maritime container (20ft, 14t)', nameFr: 'Container maritime (20ft, 14t)', unit: 'kgCO2eq/km', factorUpstream: 0.0231, factorCombustion: 0.115, factorTotal: 0.224, source: 'GHG Protocol / ADEME', sourceRef: 'GHG-2023-GL', region: 'Global', uncertainty: 0.2 },
  { id: 'river_freight_fr', category: 'freight', subcategory: 'river', name: 'River freight (per barge 300t)', nameFr: 'Fret fluvial (péniche 300t)', unit: 'kgCO2eq/km', factorUpstream: 1.62, factorCombustion: 8.10, factorTotal: 11.25, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.15 },
]

// ===== PEOPLE TRANSPORT =====

export const TRANSPORT_PEOPLE_FACTORS: EmissionFactor[] = [
  { id: 'car_gasoline', category: 'transport', subcategory: 'car', name: 'Passenger car (gasoline)', nameFr: 'Voiture essence', unit: 'kgCO2eq/km', factorUpstream: 0.0374, factorCombustion: 0.164, factorTotal: 0.201, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.1 },
  { id: 'car_diesel', category: 'transport', subcategory: 'car', name: 'Passenger car (diesel)', nameFr: 'Voiture diesel', unit: 'kgCO2eq/km', factorUpstream: 0.0374, factorCombustion: 0.164, factorTotal: 0.218, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.1 },
  { id: 'car_electric', category: 'transport', subcategory: 'car', name: 'Electric car', nameFr: 'Voiture électrique', unit: 'kgCO2eq/km', factorUpstream: 0.04, factorCombustion: 0.019, factorTotal: 0.103, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.15 },
  { id: 'car_hybrid', category: 'transport', subcategory: 'car', name: 'Hybrid car', nameFr: 'Voiture hybride', unit: 'kgCO2eq/km', factorUpstream: 0.035, factorCombustion: 0.103, factorTotal: 0.152, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.15 },
  { id: 'bus_fr', category: 'transport', subcategory: 'bus', name: 'Bus (urban)', nameFr: 'Bus (urbain)', unit: 'kgCO2eq/passager.km', factorUpstream: 0.02, factorCombustion: 0.103, factorTotal: 0.131, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.15 },
  { id: 'train_tgv', category: 'transport', subcategory: 'train', name: 'TGV', nameFr: 'TGV', unit: 'kgCO2eq/passager.km', factorUpstream: 0.00046, factorCombustion: 0.00173, factorTotal: 0.00373, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.1 },
  { id: 'train_ter', category: 'transport', subcategory: 'train', name: 'TER', nameFr: 'TER', unit: 'kgCO2eq/passager.km', factorUpstream: 0.0082, factorCombustion: 0.0238, factorTotal: 0.0338, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.1 },
  { id: 'metro_fr', category: 'transport', subcategory: 'metro', name: 'Métro', nameFr: 'Métro', unit: 'kgCO2eq/passager.km', factorUpstream: 0.00098, factorCombustion: 0.00298, factorTotal: 0.00498, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.1 },
  { id: 'plane_short', category: 'transport', subcategory: 'plane', name: 'Plane (<1000km)', nameFr: 'Avion court-courrier (<1000km)', unit: 'kgCO2eq/passager.km', factorUpstream: 0.0412, factorCombustion: 0.206, factorTotal: 0.259, source: 'GHG Protocol / ADEME', sourceRef: 'GHG-2023-GL', region: 'Global', uncertainty: 0.15 },
  { id: 'plane_medium', category: 'transport', subcategory: 'plane', name: 'Plane (1000-3500km)', nameFr: 'Avion moyen-courrier (1000-3500km)', unit: 'kgCO2eq/passager.km', factorUpstream: 0.0275, factorCombustion: 0.137, factorTotal: 0.187, source: 'GHG Protocol / ADEME', sourceRef: 'GHG-2023-GL', region: 'Global', uncertainty: 0.15 },
  { id: 'plane_long', category: 'transport', subcategory: 'plane', name: 'Plane (>3500km)', nameFr: 'Avion long-courrier (>3500km)', unit: 'kgCO2eq/passager.km', factorUpstream: 0.0275, factorCombustion: 0.137, factorTotal: 0.152, source: 'GHG Protocol / ADEME', sourceRef: 'GHG-2023-GL', region: 'Global', uncertainty: 0.15 },
]

// ===== WASTE =====

export const WASTE_FACTORS: EmissionFactor[] = [
  { id: 'waste_concrete', category: 'waste', subcategory: 'building', name: 'Concrete waste', nameFr: 'Déchets béton', unit: 'kgCO2eq/tonne', factorUpstream: 0.49, factorCombustion: 0.73, factorTotal: 1.22, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.3 },
  { id: 'waste_wood', category: 'waste', subcategory: 'building', name: 'Wood waste (B)', nameFr: 'Déchets bois (B)', unit: 'kgCO2eq/tonne', factorUpstream: 2, factorCombustion: 3.11, factorTotal: 5.11, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.3 },
  { id: 'waste_inert', category: 'waste', subcategory: 'mineral', name: 'Mixed inert waste', nameFr: 'Déchets inertes mélangés', unit: 'kgCO2eq/tonne', factorUpstream: 1, factorCombustion: 4.58, factorTotal: 5.58, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.3 },
  { id: 'waste_organic_compost', category: 'waste', subcategory: 'organic', name: 'Organic waste (compost)', nameFr: 'Déchets organiques (compost)', unit: 'kgCO2eq/tonne', factorUpstream: 0, factorCombustion: 5.25, factorTotal: 5.25, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.5 },
  { id: 'waste_paper_incin', category: 'waste', subcategory: 'organic', name: 'Paper waste (incineration)', nameFr: 'Déchets papier (incinération)', unit: 'kgCO2eq/tonne', factorUpstream: 18, factorCombustion: 28.6, factorTotal: 46.6, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.3 },
  { id: 'waste_plastic', category: 'waste', subcategory: 'plastic', name: 'Plastic waste', nameFr: 'Déchets plastique', unit: 'kgCO2eq/tonne', factorUpstream: 18, factorCombustion: 18, factorTotal: 36, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.3 },
  { id: 'waste_household', category: 'waste', subcategory: 'household', name: 'Household waste', nameFr: 'Ordures ménagères', unit: 'kgCO2eq/tonne', factorUpstream: 18, factorCombustion: 455, factorTotal: 473, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.5 },
  { id: 'waste_dangerous', category: 'waste', subcategory: 'dangerous', name: 'Dangerous waste', nameFr: 'Déchets dangereux', unit: 'kgCO2eq/tonne', factorUpstream: 18, factorCombustion: 50, factorTotal: 68, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.5 },
  { id: 'wastewater', category: 'waste', subcategory: 'water', name: 'Wastewater', nameFr: 'Eaux usées', unit: 'kgCO2eq/m³', factorUpstream: 0, factorCombustion: 0.265, factorTotal: 0.265, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.5 },
]

// ===== CAPITAL GOODS =====

export const CAPITAL_GOODS_FACTORS: EmissionFactor[] = [
  { id: 'building_office', category: 'capital', subcategory: 'buildings', name: 'Office building', nameFr: 'Bâtiment de bureau', unit: 'kgCO2eq/m²', factorUpstream: 425, factorCombustion: 0, factorTotal: 425, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.5 },
  { id: 'building_warehouse', category: 'capital', subcategory: 'buildings', name: 'Warehouse', nameFr: 'Entrepôt', unit: 'kgCO2eq/m²', factorUpstream: 350, factorCombustion: 0, factorTotal: 350, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.5 },
  { id: 'building_industrial', category: 'capital', subcategory: 'buildings', name: 'Industrial building', nameFr: 'Bâtiment industriel', unit: 'kgCO2eq/m²', factorUpstream: 500, factorCombustion: 0, factorTotal: 500, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.5 },
  { id: 'vehicle_car', category: 'capital', subcategory: 'vehicles', name: 'Passenger vehicle', nameFr: 'Véhicule particulier', unit: 'kgCO2eq/unité', factorUpstream: 6000, factorCombustion: 0, factorTotal: 6000, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.5 },
  { id: 'vehicle_truck', category: 'capital', subcategory: 'vehicles', name: 'Truck', nameFr: 'Camion', unit: 'kgCO2eq/unité', factorUpstream: 30000, factorCombustion: 0, factorTotal: 30000, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.5 },
  { id: 'it_laptop', category: 'capital', subcategory: 'it', name: 'Laptop', nameFr: 'Ordinateur portable', unit: 'kgCO2eq/unité', factorUpstream: 156, factorCombustion: 0, factorTotal: 156, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.3 },
  { id: 'it_desktop', category: 'capital', subcategory: 'it', name: 'Desktop + screen', nameFr: 'Ordinateur fixe + écran', unit: 'kgCO2eq/unité', factorUpstream: 350, factorCombustion: 0, factorTotal: 350, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.3 },
  { id: 'it_server', category: 'capital', subcategory: 'it', name: 'Server', nameFr: 'Serveur', unit: 'kgCO2eq/unité', factorUpstream: 1100, factorCombustion: 0, factorTotal: 1100, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.3 },
  { id: 'it_phone', category: 'capital', subcategory: 'it', name: 'Smartphone', nameFr: 'Smartphone', unit: 'kgCO2eq/unité', factorUpstream: 39, factorCombustion: 0, factorTotal: 39, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.3 },
  { id: 'furniture_desk', category: 'capital', subcategory: 'furniture', name: 'Office desk', nameFr: 'Bureau', unit: 'kgCO2eq/unité', factorUpstream: 100, factorCombustion: 0, factorTotal: 100, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.5 },
  { id: 'furniture_chair', category: 'capital', subcategory: 'furniture', name: 'Office chair', nameFr: 'Chaise de bureau', unit: 'kgCO2eq/unité', factorUpstream: 72, factorCombustion: 0, factorTotal: 72, source: 'Base Carbone ADEME', sourceRef: 'BC-2023-FR', region: 'France métropolitaine', uncertainty: 0.5 },
]

// All factors combined
export const ALL_EMISSION_FACTORS: EmissionFactor[] = [
  ...ENERGY_FUELS_STATIONARY,
  ...ENERGY_FUELS_ORGANIC,
  ...ENERGY_FUELS_MOBILE,
  ...ELECTRICITY_FACTORS,
  ...STEAM_COOLING_FACTORS,
  ...REFRIGERANT_FACTORS,
  ...INPUTS_METALS,
  ...INPUTS_PLASTICS,
  ...INPUTS_OTHER,
  ...FREIGHT_FACTORS,
  ...TRANSPORT_PEOPLE_FACTORS,
  ...WASTE_FACTORS,
  ...CAPITAL_GOODS_FACTORS,
]

// Category labels in French
export const CATEGORY_LABELS: Record<string, string> = {
  'energy': 'Énergie',
  'non_energy': 'Hors énergie',
  'inputs': 'Intrants',
  'freight': 'Fret',
  'transport': 'Transport de personnes',
  'waste': 'Déchets directs',
  'capital': 'Immobilisations',
}

// Subcategory labels in French
export const SUBCATEGORY_LABELS: Record<string, string> = {
  'fuels_stationary': 'Combustibles fossiles (sources fixes)',
  'fuels_organic': 'Combustibles organiques',
  'fuels_mobile': 'Combustibles (sources mobiles)',
  'electricity': 'Électricité',
  'steam': 'Vapeur',
  'cooling': 'Froid',
  'refrigerants': 'Fluides frigorigènes',
  'process': 'Procédés industriels',
  'metals': 'Métaux',
  'plastics': 'Plastiques',
  'glass': 'Verre',
  'paper': 'Papiers, cartons',
  'construction': 'Matériaux de construction',
  'utilities': 'Eau & Utilités',
  'road': 'Routier',
  'air': 'Aérien',
  'rail': 'Ferroviaire',
  'maritime': 'Maritime',
  'river': 'Fluvial',
  'car': 'Voiture',
  'bus': 'Bus',
  'train': 'Train',
  'metro': 'Métro',
  'plane': 'Avion',
  'building': 'Déchets du bâtiment',
  'mineral': 'Déchets minéraux',
  'organic': 'Déchets organiques',
  'plastic': 'Déchets plastiques',
  'household': 'Ordures ménagères',
  'dangerous': 'Déchets dangereux',
  'water': 'Eaux usées',
  'buildings': 'Bâtiments',
  'vehicles': 'Véhicules',
  'it': 'Informatique',
  'furniture': 'Mobilier',
}

// GHG Protocol scope mapping
export const SCOPE_MAPPING: Record<string, { scope: number; ghgCategory: string; isoCategory: string }> = {
  'fuels_stationary': { scope: 1, ghgCategory: '1-1 Émissions directes de combustion fixe', isoCategory: '1-1' },
  'fuels_organic': { scope: 1, ghgCategory: '1-1 Émissions directes de combustion fixe', isoCategory: '1-1' },
  'fuels_mobile': { scope: 1, ghgCategory: '1-2 Émissions directes de combustion mobile', isoCategory: '1-2' },
  'refrigerants': { scope: 1, ghgCategory: '1-4 Émissions directes fugitives', isoCategory: '1-4' },
  'process': { scope: 1, ghgCategory: '1-3 Émissions directes de procédé', isoCategory: '1-3' },
  'electricity': { scope: 2, ghgCategory: '2-1 Électricité', isoCategory: '2-1' },
  'steam': { scope: 2, ghgCategory: '2-2 Vapeur, chaleur, froid', isoCategory: '2-2' },
  'cooling': { scope: 2, ghgCategory: '2-2 Vapeur, chaleur, froid', isoCategory: '2-2' },
  'metals': { scope: 3, ghgCategory: '3-1 Achats de biens et services', isoCategory: '3-1' },
  'plastics': { scope: 3, ghgCategory: '3-1 Achats de biens et services', isoCategory: '3-1' },
  'glass': { scope: 3, ghgCategory: '3-1 Achats de biens et services', isoCategory: '3-1' },
  'paper': { scope: 3, ghgCategory: '3-1 Achats de biens et services', isoCategory: '3-1' },
  'construction': { scope: 3, ghgCategory: '3-1 Achats de biens et services', isoCategory: '3-1' },
  'utilities': { scope: 3, ghgCategory: '3-1 Achats de biens et services', isoCategory: '3-1' },
  'buildings': { scope: 3, ghgCategory: '3-2 Immobilisations', isoCategory: '3-2' },
  'vehicles': { scope: 3, ghgCategory: '3-2 Immobilisations', isoCategory: '3-2' },
  'it': { scope: 3, ghgCategory: '3-2 Immobilisations', isoCategory: '3-2' },
  'furniture': { scope: 3, ghgCategory: '3-2 Immobilisations', isoCategory: '3-2' },
  'road': { scope: 3, ghgCategory: '3-4 Fret amont', isoCategory: '3-4' },
  'air': { scope: 3, ghgCategory: '3-4 Fret amont', isoCategory: '3-4' },
  'rail': { scope: 3, ghgCategory: '3-4 Fret amont', isoCategory: '3-4' },
  'maritime': { scope: 3, ghgCategory: '3-4 Fret amont', isoCategory: '3-4' },
  'river': { scope: 3, ghgCategory: '3-4 Fret amont', isoCategory: '3-4' },
  'car': { scope: 3, ghgCategory: '3-7 Déplacements domicile-travail', isoCategory: '3-7' },
  'bus': { scope: 3, ghgCategory: '3-7 Déplacements domicile-travail', isoCategory: '3-7' },
  'train': { scope: 3, ghgCategory: '3-6 Déplacements professionnels', isoCategory: '3-6' },
  'metro': { scope: 3, ghgCategory: '3-7 Déplacements domicile-travail', isoCategory: '3-7' },
  'plane': { scope: 3, ghgCategory: '3-6 Déplacements professionnels', isoCategory: '3-6' },
  'building': { scope: 3, ghgCategory: '3-5 Déchets', isoCategory: '3-5' },
  'mineral': { scope: 3, ghgCategory: '3-5 Déchets', isoCategory: '3-5' },
  'organic': { scope: 3, ghgCategory: '3-5 Déchets', isoCategory: '3-5' },
  'plastic': { scope: 3, ghgCategory: '3-5 Déchets', isoCategory: '3-5' },
  'household': { scope: 3, ghgCategory: '3-5 Déchets', isoCategory: '3-5' },
  'dangerous': { scope: 3, ghgCategory: '3-5 Déchets', isoCategory: '3-5' },
  'water': { scope: 3, ghgCategory: '3-5 Déchets', isoCategory: '3-5' },
}
