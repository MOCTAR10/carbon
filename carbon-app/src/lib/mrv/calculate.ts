/**
 * MRV Calculation Engine
 * Formulas for each Verra VCS / OGEC methodology.
 *
 * All values in tCO₂e unless stated otherwise.
 */

export interface MRVResult {
  baselineTco2:     number   // annual baseline emissions/sequestration
  projectEmissions: number   // project-related emissions (fuel use, etc.)
  leakageTco2:      number   // estimated leakage
  netReductions:    number   // baseline - projectEmissions - leakage
  bufferTons:       number   // netReductions × bufferPct / 100
  creditsEligible:  number   // netReductions - bufferTons
  details:          Record<string, number>  // intermediate values for transparency
}

// ─── VM0048 — REDD+ ───────────────────────────────────────────────────────────

export interface VM0048Params {
  deforestation_rate_ha_yr:  number  // ha/year historically deforested
  carbon_density_tco2_ha:    number  // tCO₂/ha average carbon stock
  area_ha:                   number  // project area in hectares
  leakage_pct?:              number  // % leakage (default 10)
  buffer_pct?:               number  // % buffer pool (default 15)
  project_emissions?:        number  // optional direct project emissions
}

export function calculateVM0048(p: VM0048Params): MRVResult {
  const leakagePct       = p.leakage_pct      ?? 10
  const bufferPct        = p.buffer_pct        ?? 15
  const projEmissions    = p.project_emissions ?? 0

  // Baseline: area × rate × density
  const baselineTco2 = p.area_ha * p.deforestation_rate_ha_yr * p.carbon_density_tco2_ha
  const leakageTco2  = baselineTco2 * (leakagePct / 100)
  const netReductions = Math.max(0, baselineTco2 - projEmissions - leakageTco2)
  const bufferTons    = netReductions * (bufferPct / 100)
  const creditsEligible = Math.max(0, netReductions - bufferTons)

  return {
    baselineTco2,
    projectEmissions: projEmissions,
    leakageTco2,
    netReductions,
    bufferTons,
    creditsEligible,
    details: {
      area_ha: p.area_ha,
      deforestation_rate_ha_yr: p.deforestation_rate_ha_yr,
      carbon_density_tco2_ha: p.carbon_density_tco2_ha,
      leakage_pct: leakagePct,
      buffer_pct: bufferPct,
    },
  }
}

// ─── VM0047 — ARR (Afforestation / Reforestation) ────────────────────────────

export interface VM0047Params {
  area_ha:                       number  // reforested area
  annual_increment_tco2_ha_yr:   number  // sequestration rate tCO₂/ha/year
  leakage_pct?:                  number  // default 5
  buffer_pct?:                   number  // default 12
  project_emissions?:            number
}

export function calculateVM0047(p: VM0047Params): MRVResult {
  const leakagePct    = p.leakage_pct      ?? 5
  const bufferPct     = p.buffer_pct        ?? 12
  const projEmissions = p.project_emissions ?? 0

  // ARR: baseline = 0 (no existing forest), sequestration = area × increment
  const baselineTco2  = 0
  const sequestration = p.area_ha * p.annual_increment_tco2_ha_yr
  const leakageTco2   = sequestration * (leakagePct / 100)
  const netReductions = Math.max(0, sequestration - projEmissions - leakageTco2)
  const bufferTons    = netReductions * (bufferPct / 100)
  const creditsEligible = Math.max(0, netReductions - bufferTons)

  return {
    baselineTco2: sequestration,   // treat gross sequestration as "baseline benefit"
    projectEmissions: projEmissions,
    leakageTco2,
    netReductions,
    bufferTons,
    creditsEligible,
    details: {
      area_ha: p.area_ha,
      annual_increment_tco2_ha_yr: p.annual_increment_tco2_ha_yr,
      gross_sequestration: sequestration,
      leakage_pct: leakagePct,
      buffer_pct: bufferPct,
    },
  }
}

// ─── VM0050 — Improved Cookstoves ────────────────────────────────────────────

export interface VM0050Params {
  households:            number   // number of beneficiary households
  fuel_saved_kg_yr:      number   // kg of fuel saved per household per year
  ef_biomass_tco2_kg?:   number   // emission factor for biomass (default IPCC: 0.001548)
  buffer_pct?:           number   // default 10
  project_emissions?:    number
}

export function calculateVM0050(p: VM0050Params): MRVResult {
  const ef           = p.ef_biomass_tco2_kg ?? 0.001548  // tCO₂/kg biomass (IPCC 2006)
  const bufferPct    = p.buffer_pct         ?? 10
  const projEmissions = p.project_emissions ?? 0

  const baselineTco2  = p.households * p.fuel_saved_kg_yr * ef
  const leakageTco2   = 0   // cookstoves: minimal leakage assumed
  const netReductions = Math.max(0, baselineTco2 - projEmissions - leakageTco2)
  const bufferTons    = netReductions * (bufferPct / 100)
  const creditsEligible = Math.max(0, netReductions - bufferTons)

  return {
    baselineTco2,
    projectEmissions: projEmissions,
    leakageTco2,
    netReductions,
    bufferTons,
    creditsEligible,
    details: {
      households: p.households,
      fuel_saved_kg_yr: p.fuel_saved_kg_yr,
      ef_biomass_tco2_kg: ef,
      buffer_pct: bufferPct,
    },
  }
}

// ─── VM0033 — Tidal Wetland / Mangrove ───────────────────────────────────────

export interface VM0033Params {
  restoration_area_ha:             number   // ha of mangrove restored
  sequestration_rate_tco2_ha_yr?:  number   // default IPCC coastal: 6.5 tCO₂/ha/yr
  buffer_pct?:                     number   // default 20 (higher for blue carbon)
  project_emissions?:              number
}

export function calculateVM0033(p: VM0033Params): MRVResult {
  const rate          = p.sequestration_rate_tco2_ha_yr ?? 6.5
  const bufferPct     = p.buffer_pct                    ?? 20
  const projEmissions = p.project_emissions              ?? 0

  const baselineTco2  = p.restoration_area_ha * rate
  const leakageTco2   = 0   // mangroves: no significant leakage
  const netReductions = Math.max(0, baselineTco2 - projEmissions - leakageTco2)
  const bufferTons    = netReductions * (bufferPct / 100)
  const creditsEligible = Math.max(0, netReductions - bufferTons)

  return {
    baselineTco2,
    projectEmissions: projEmissions,
    leakageTco2,
    netReductions,
    bufferTons,
    creditsEligible,
    details: {
      restoration_area_ha: p.restoration_area_ha,
      sequestration_rate_tco2_ha_yr: rate,
      buffer_pct: bufferPct,
    },
  }
}

// ─── Universal dispatcher ─────────────────────────────────────────────────────

export function calculateMRV(
  methodologyCode: string,
  params: Record<string, number>
): MRVResult {
  switch (methodologyCode) {
    case 'VM0048':
      return calculateVM0048(params as unknown as VM0048Params)
    case 'VM0047':
      return calculateVM0047(params as unknown as VM0047Params)
    case 'VM0050':
      return calculateVM0050(params as unknown as VM0050Params)
    case 'VM0033':
      return calculateVM0033(params as unknown as VM0033Params)
    default:
      throw new Error(`Méthodologie non reconnue: ${methodologyCode}`)
  }
}
