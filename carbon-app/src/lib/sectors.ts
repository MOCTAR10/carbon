// Company sector codes (stored in companies.sector) → display labels. Mirrors the options in /register.
export const SECTOR_LABELS: Record<string, string> = {
  petrole_gaz: 'Pétrole & Gaz',
  mines: 'Mines & Extraction minière',
  foresterie: 'Foresterie, Bois & Papier',
  agriculture: 'Agriculture & Agro-industrie',
  peche: 'Pêche & Aquaculture',
  eau: 'Eau & Assainissement',
  energie: 'Énergie & Utilities',
  industrie: 'Industrie manufacturière',
  construction: 'Construction & BTP',
  chimie: 'Chimie & Pétrochimie',
  agroalimentaire: 'Agroalimentaire & Boissons',
  emballage: 'Imprimerie & Emballage',
  commerce: 'Commerce & Distribution',
  transport: 'Transport & Logistique',
  banque: 'Finance, Banque & Assurance',
  telecom: 'Télécommunications',
  tech: 'Technologies & Numérique',
  sante: 'Santé & Pharmaceutique',
  education: 'Éducation & Formation',
  immobilier: 'Immobilier & Foncier',
  tourisme: 'Tourisme, Hôtellerie & Restauration',
  medias: 'Médias & Communication',
  administration: 'Administrations & Services publics',
  ong: 'ONG & Associations',
  organisations_int: 'Organisations internationales',
  autre: 'Autre secteur',
}

export function sectorLabel(code: string) {
  return SECTOR_LABELS[code] ?? code
}
