import React from 'react'
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OGECDossierData {
  certId: number
  certificateNumber: string | null
  status: string
  ogecReference: string | null
  dossierCompiledAt: string | null
  companyName: string
  companySector: string
  companyRccm: string
  assessmentName: string
  assessmentYear: number
  approach: string
  totalCo2eq: number
  scope1: number
  scope2: number
  scope3: number
  expertName: string | null
  inspectionDate: string | null
  auditScheduledDate: string | null
  auditLocation: string | null
  auditChecklist: Record<string, Record<string, unknown>> | null
  inspectionNotes: string | null
  avisNumber: string | null
  avisDate: string | null
  avisPeriodStart: number | null
  avisPeriodEnd: number | null
  avisTotalCo2eq: number | null
  topEmissions: Array<{ category: string; scope: number; co2eq: number }>
  generatedAt: string
}

// ─── Palette ─────────────────────────────────────────────────────────────────

const C = {
  navy:    '#1e3a5f',
  dkNavy:  '#0f2137',
  ltNavy:  '#dbeafe',
  midNavy: '#93c5fd',
  green:   '#15803d',
  ltGreen: '#dcfce7',
  midGreen:'#86efac',
  gold:    '#92400e',
  ltGold:  '#fef3c7',
  gray:    '#6b7280',
  dkGray:  '#111827',
  midGray: '#374151',
  ltGray:  '#f9fafb',
  border:  '#e5e7eb',
  white:   '#ffffff',
  red:     '#b91c1c',
  ltRed:   '#fee2e2',
  orange:  '#c2410c',
  ltOrange:'#ffedd5',
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: C.white,
    paddingBottom: 50,
  },

  // Header band
  headerBand: {
    backgroundColor: C.dkNavy,
    paddingHorizontal: 36,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flexDirection: 'column' },
  headerBrand: { color: C.white, fontSize: 12, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5 },
  headerSub: { color: C.midNavy, fontSize: 7.5, marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  headerDocType: { color: C.midNavy, fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5 },
  headerRef: { color: '#93c5fd', fontSize: 7.5, marginTop: 3 },

  // Cover stripe
  coverStripe: {
    backgroundColor: C.ltNavy,
    borderBottomWidth: 3,
    borderBottomColor: C.navy,
    paddingHorizontal: 36,
    paddingVertical: 20,
  },
  coverTag: {
    color: C.navy,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  coverTitle: { color: C.dkGray, fontSize: 22, fontFamily: 'Helvetica-Bold' },
  coverMeta: { color: C.midGray, fontSize: 8.5, marginTop: 6 },

  // Body
  body: { paddingHorizontal: 36, paddingTop: 16 },

  // Section header
  sectionHeader: {
    backgroundColor: C.navy,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
    marginTop: 16,
    borderRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionNum: { color: C.midNavy, fontSize: 8, fontFamily: 'Helvetica-Bold', marginRight: 8, letterSpacing: 0.5 },
  sectionTitle: { color: C.white, fontSize: 9, fontFamily: 'Helvetica-Bold', letterSpacing: 0.3 },

  // Grid cells
  row2: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  row3: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  cell: {
    flex: 1,
    backgroundColor: C.ltGray,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 3,
    padding: 9,
  },
  cellHighlight: {
    flex: 1,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: C.midNavy,
    borderRadius: 3,
    padding: 9,
  },
  cellLabel: { color: C.gray, fontSize: 6.5, fontFamily: 'Helvetica-Bold', marginBottom: 4, letterSpacing: 0.8 },
  cellValue: { color: C.dkGray, fontSize: 9.5 },
  cellValueBold: { color: C.navy, fontSize: 10, fontFamily: 'Helvetica-Bold' },

  // Scope cards
  scopeRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  scopeCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    padding: 10,
    alignItems: 'center',
    backgroundColor: C.ltGray,
  },
  scopeValue: { color: C.midGray, fontSize: 14, fontFamily: 'Helvetica-Bold' },
  scopeLabel: { color: C.gray, fontSize: 7, marginTop: 3, textAlign: 'center' },
  scopeCardTotal: {
    flex: 2,
    borderWidth: 2,
    borderColor: C.navy,
    backgroundColor: C.ltNavy,
    borderRadius: 4,
    padding: 10,
    alignItems: 'center',
  },
  scopeValueTotal: { color: C.navy, fontSize: 18, fontFamily: 'Helvetica-Bold' },
  scopeLabelTotal: { color: C.navy, fontSize: 8, marginTop: 3, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  seuilBadge: {
    marginTop: 5,
    backgroundColor: C.green,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  seuilBadgeText: { color: C.white, fontSize: 7, fontFamily: 'Helvetica-Bold' },

  // Table
  table: { marginBottom: 12 },
  tableHead: { flexDirection: 'row', backgroundColor: C.navy, borderRadius: 3 },
  tableHeadCell: { color: C.white, fontSize: 7.5, fontFamily: 'Helvetica-Bold', padding: 6, flex: 1 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border },
  tableRowAlt: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.ltGray },
  tableCell: { color: C.midGray, fontSize: 8, padding: 6, flex: 1 },
  tableCellBold: { color: C.dkGray, fontSize: 8, fontFamily: 'Helvetica-Bold', padding: 6, flex: 1 },

  // Checklist
  checkSection: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  checkSectionHeader: {
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  checkSectionTitle: { color: C.navy, fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 0.3 },
  checkBody: { paddingHorizontal: 10, paddingVertical: 8 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  checkPill: {
    width: 40,
    paddingVertical: 2,
    borderRadius: 3,
    marginRight: 8,
    alignItems: 'center',
  },
  checkPillOk: { backgroundColor: C.green },
  checkPillFail: { backgroundColor: C.red },
  checkPillNa: { backgroundColor: C.gray },
  checkPillText: { color: C.white, fontSize: 7, fontFamily: 'Helvetica-Bold' },
  checkLabel: { color: C.midGray, fontSize: 8, flex: 1, lineHeight: 1.4 },
  checkNote: { color: C.gray, fontSize: 7.5, fontStyle: 'italic', marginTop: 4, marginLeft: 48, lineHeight: 1.4 },
  noDataMsg: { color: C.gray, fontSize: 8, fontStyle: 'italic', paddingVertical: 4 },

  // Opinion badge
  opinionFav:  { backgroundColor: C.ltGreen, borderWidth: 1.5, borderColor: C.green, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 4, alignSelf: 'flex-start' },
  opinionDef:  { backgroundColor: C.ltRed,   borderWidth: 1.5, borderColor: C.red,   paddingHorizontal: 14, paddingVertical: 7, borderRadius: 4, alignSelf: 'flex-start' },
  opinionCond: { backgroundColor: C.ltGold,  borderWidth: 1.5, borderColor: C.gold,  paddingHorizontal: 14, paddingVertical: 7, borderRadius: 4, alignSelf: 'flex-start' },
  opinionText: { fontSize: 10.5, fontFamily: 'Helvetica-Bold' },

  // Avis band
  avisBand: {
    backgroundColor: C.ltGold,
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: 5,
    padding: 14,
    marginBottom: 12,
  },
  avisLabel: { color: C.gold, fontSize: 7.5, fontFamily: 'Helvetica-Bold', marginBottom: 8, letterSpacing: 0.5 },
  avisValue: { color: C.dkGray, fontSize: 12, fontFamily: 'Helvetica-Bold' },

  // Status pill for documents table
  pillOk:   { color: C.green,  fontSize: 8 },
  pillWait: { color: C.orange, fontSize: 8 },

  // Note box
  noteBox: {
    backgroundColor: C.ltGray,
    borderLeftWidth: 3,
    borderLeftColor: C.navy,
    padding: 10,
    marginBottom: 10,
    borderRadius: 2,
  },
  noteText: { color: C.midGray, fontSize: 8.5, lineHeight: 1.5 },

  // Signature row
  sigRow: { flexDirection: 'row', gap: 10, marginTop: 28 },
  sigCell: {
    flex: 1,
    borderTopWidth: 1.5,
    borderTopColor: C.midGray,
    paddingTop: 8,
  },
  sigLabel: { color: C.gray, fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
  sigValue: { color: C.dkGray, fontSize: 9, marginTop: 4 },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: C.dkNavy,
    paddingHorizontal: 36,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: { color: C.midNavy, fontSize: 7 },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Safe number formatter — no locale (react-pdf locale support is unreliable)
function fmtNum(n: number | null | undefined, dec = 1): string {
  if (n == null) return '—'
  // Manual thousands separator with space
  const fixed = Math.abs(n).toFixed(dec)
  const parts = fixed.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') // non-breaking space
  return (n < 0 ? '-' : '') + parts.join(',')
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

// Map raw DB approach values to French labels
function approachLabel(a: string): string {
  const map: Record<string, string> = {
    operational_control:   'Controle operationnel',
    financial_control:     'Controle financier',
    equity_share:          'Part du capital',
    'Contrôle opérationnel': 'Controle operationnel',
    'Contrôle financier':    'Controle financier',
  }
  return map[a] ?? a
}

// Map raw DB category keys to French labels
const CAT_FR: Record<string, string> = {
  energy:       'Energie',
  non_energy:   'Combustion hors energie',
  transport:    'Transport & deplacements',
  freight:      'Fret & logistique',
  capital:      'Biens d\'equipement',
  inputs:       'Achats & matieres premieres',
  waste:        'Dechets & traitement eaux',
  water:        'Consommation d\'eau',
  business:     'Voyages d\'affaires',
  employees:    'Trajets domicile-travail',
  upstream:     'Energie amont',
  downstream:   'Produits vendus (aval)',
  other:        'Autres emissions',
}

function catLabel(c: string): string {
  return CAT_FR[c] ?? c
}

// Read a boolean from the checklist JSONB (handles both expert and PDF schemas)
function ck(cl: Record<string, Record<string, unknown>> | null, section: string, key: string): boolean | undefined {
  if (!cl) return undefined
  const sec = cl[section]
  if (!sec) return undefined
  const v = sec[key]
  if (typeof v === 'boolean') return v
  if (v === 'true') return true
  if (v === 'false') return false
  return undefined
}

function ckNote(cl: Record<string, Record<string, unknown>> | null, section: string): string {
  if (!cl) return ''
  return String(cl[section]?.notes ?? '')
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionNum}>{num}</Text>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  )
}

function CheckRow({ label, value }: { label: string; value: boolean | undefined }) {
  if (value === undefined) return null
  return (
    <View style={s.checkRow}>
      <View style={[s.checkPill, value ? s.checkPillOk : s.checkPillFail]}>
        <Text style={s.checkPillText}>{value ? 'OK' : 'NON'}</Text>
      </View>
      <Text style={s.checkLabel}>{label}</Text>
    </View>
  )
}

function CheckSection({ title, items, note }: {
  title: string
  items: { label: string; value: boolean | undefined }[]
  note?: string
}) {
  const defined = items.filter(i => i.value !== undefined)
  return (
    <View style={s.checkSection}>
      <View style={s.checkSectionHeader}>
        <Text style={s.checkSectionTitle}>{title}</Text>
      </View>
      <View style={s.checkBody}>
        {defined.length === 0 ? (
          <Text style={s.noDataMsg}>Aucune donnee de checklist enregistree pour cette section.</Text>
        ) : (
          defined.map((item, i) => <CheckRow key={i} label={item.label} value={item.value} />)
        )}
        {note && <Text style={s.checkNote}>Note : {note}</Text>}
      </View>
    </View>
  )
}

function Footer({ date }: { date: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>CarbonTrack - Dossier OGEC - Confidentiel</Text>
      <Text style={s.footerText}>{date}</Text>
      <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber}/${totalPages}`} />
    </View>
  )
}

// ─── Document ─────────────────────────────────────────────────────────────────

function OGECDossierDocument({ d }: { d: OGECDossierData }) {
  const cl = d.auditChecklist
  const opinion = cl?.opinion?.overall_opinion ?? cl?.expert_opinion?.recommendation ?? null
  const isFav = opinion === 'favorable' || opinion === 'FAVORABLE'
  const isDef = opinion === 'unfavorable' || opinion === 'DEFAVORABLE' || opinion === 'DÉFAVORABLE'
  const opinionStyle = isFav ? s.opinionFav : isDef ? s.opinionDef : s.opinionCond
  const opinionColor = isFav ? C.green : isDef ? C.red : C.gold
  const opinionText  = isFav ? 'FAVORABLE' : isDef ? 'DEFAVORABLE' : 'FAVORABLE AVEC RESERVES'
  const conditions: string[] = Array.isArray(cl?.opinion?.reservations) ? (cl!.opinion.reservations as string[]) :
                               Array.isArray(cl?.expert_opinion?.conditions) ? (cl!.expert_opinion.conditions as string[]) : []

  const isAssujetti = d.totalCo2eq >= 10000

  return (
    <Document>

      {/* ════════════════════════════════════════════════════════════════════
          PAGE 1 — Cover + Données Entreprise + Résumé GES
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.headerBand}>
          <View style={s.headerLeft}>
            <Text style={s.headerBrand}>CARBONTRACK</Text>
            <Text style={s.headerSub}>Systeme MRV Carbone - Gabon</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerDocType}>DOSSIER OGEC</Text>
            <Text style={s.headerRef}>Ref. CarbonTrack #{d.certId}</Text>
            {d.ogecReference && <Text style={s.headerRef}>Ref. OGEC : {d.ogecReference}</Text>}
          </View>
        </View>

        {/* Cover stripe */}
        <View style={s.coverStripe}>
          <Text style={s.coverTag}>Dossier de soumission - Ordonnance N{'\u00b0'}019/PR/2021</Text>
          <Text style={s.coverTitle}>{d.companyName}</Text>
          <Text style={s.coverMeta}>
            Exercice {d.assessmentYear}{'   \u00b7   '}{approachLabel(d.approach)}{'   \u00b7   '}
            {d.dossierCompiledAt ? `Compile le ${fmtDate(d.dossierCompiledAt)}` : 'Dossier en preparation'}
          </Text>
        </View>

        <View style={s.body}>

          {/* Section 1 - Company */}
          <SectionHeader num="1" title="DONNEES ENTREPRISE" />
          <View style={s.row2}>
            <View style={s.cell}>
              <Text style={s.cellLabel}>RAISON SOCIALE</Text>
              <Text style={s.cellValueBold}>{d.companyName}</Text>
            </View>
            <View style={s.cell}>
              <Text style={s.cellLabel}>N{'\u00b0'} RCCM</Text>
              <Text style={s.cellValue}>{d.companyRccm || '—'}</Text>
            </View>
          </View>
          <View style={s.row3}>
            <View style={s.cell}>
              <Text style={s.cellLabel}>SECTEUR D'ACTIVITE</Text>
              <Text style={s.cellValue}>{d.companySector || '—'}</Text>
            </View>
            <View style={s.cell}>
              <Text style={s.cellLabel}>APPROCHE DE CONSOLIDATION</Text>
              <Text style={s.cellValue}>{approachLabel(d.approach)}</Text>
            </View>
            <View style={s.cell}>
              <Text style={s.cellLabel}>ANNEE D'EXERCICE</Text>
              <Text style={s.cellValue}>{d.assessmentYear}</Text>
            </View>
          </View>
          {d.expertName && (
            <View style={s.row2}>
              <View style={s.cellHighlight}>
                <Text style={s.cellLabel}>EXPERT AUDITEUR</Text>
                <Text style={s.cellValue}>{d.expertName}</Text>
              </View>
              <View style={s.cell}>
                <Text style={s.cellLabel}>DATE D'AUDIT</Text>
                <Text style={s.cellValue}>{fmtDate(d.inspectionDate ?? d.auditScheduledDate)}</Text>
              </View>
            </View>
          )}

          {/* Section 2 - GES Summary */}
          <SectionHeader num="2" title="RESUME DU BILAN GES" />
          <Text style={[s.cellLabel, { marginBottom: 8 }]}>{d.assessmentName} — Exercice {d.assessmentYear}</Text>

          <View style={s.scopeRow}>
            <View style={s.scopeCard}>
              <Text style={s.scopeValue}>{fmtNum(d.scope1)}</Text>
              <Text style={s.scopeLabel}>Scope 1 (tCO2e){'\n'}Emissions directes</Text>
            </View>
            <View style={s.scopeCard}>
              <Text style={s.scopeValue}>{fmtNum(d.scope2)}</Text>
              <Text style={s.scopeLabel}>Scope 2 (tCO2e){'\n'}Energie indirecte</Text>
            </View>
            <View style={s.scopeCard}>
              <Text style={s.scopeValue}>{fmtNum(d.scope3)}</Text>
              <Text style={s.scopeLabel}>Scope 3 (tCO2e){'\n'}Autres indirectes</Text>
            </View>
            <View style={s.scopeCardTotal}>
              <Text style={s.scopeValueTotal}>{fmtNum(d.totalCo2eq)}</Text>
              <Text style={s.scopeLabelTotal}>TOTAL (tCO2e)</Text>
              <View style={[s.seuilBadge, isAssujetti ? {} : { backgroundColor: C.orange }]}>
                <Text style={s.seuilBadgeText}>
                  {isAssujetti ? 'Assujetti OGEC  >=10 000 tCO2e' : 'Non assujetti  <10 000 tCO2e'}
                </Text>
              </View>
            </View>
          </View>

          {d.topEmissions.length > 0 && (
            <>
              <Text style={[s.cellLabel, { marginBottom: 6 }]}>PRINCIPALES SOURCES D'EMISSIONS</Text>
              <View style={s.table}>
                <View style={s.tableHead}>
                  <Text style={[s.tableHeadCell, { flex: 0.6 }]}>Scope</Text>
                  <Text style={[s.tableHeadCell, { flex: 3 }]}>Categorie</Text>
                  <Text style={[s.tableHeadCell, { flex: 1.2 }]}>tCO2e</Text>
                  <Text style={[s.tableHeadCell, { flex: 0.8 }]}>% Total</Text>
                </View>
                {d.topEmissions.slice(0, 8).map((e, i) => (
                  <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                    <Text style={[s.tableCellBold, { flex: 0.6 }]}>{e.scope}</Text>
                    <Text style={[s.tableCell, { flex: 3 }]}>{catLabel(e.category)}</Text>
                    <Text style={[s.tableCellBold, { flex: 1.2 }]}>{fmtNum(e.co2eq)}</Text>
                    <Text style={[s.tableCell, { flex: 0.8 }]}>
                      {d.totalCo2eq > 0 ? `${fmtNum(e.co2eq / d.totalCo2eq * 100)}%` : '—'}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <Footer date={d.generatedAt} />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          PAGE 2 — Checklist Audit
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <View style={s.headerBand}>
          <View style={s.headerLeft}>
            <Text style={s.headerBrand}>CARBONTRACK - DOSSIER OGEC</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerRef}>{d.companyName} - {d.assessmentYear}</Text>
          </View>
        </View>

        <View style={s.body}>
          <SectionHeader num="3" title="CHECKLIST AUDIT - RESULTATS PAR SECTION" />

          {/* 3.1 Eligibilite */}
          <CheckSection
            title="3.1  ELIGIBILITE ET PERIMETRE"
            items={[
              { label: 'Seuil OGEC atteint (>= 10 000 tCO2e)', value: ck(cl, 'eligibility', 'threshold_met') ?? ck(cl, 'eligibility', 'threshold_applicable') },
              { label: 'Entite juridique identifiee et verifiee', value: ck(cl, 'eligibility', 'legal_entity_registered') ?? ck(cl, 'eligibility', 'legal_entity_verified') },
              { label: 'Scopes 1 & 2 completement couverts', value: ck(cl, 'eligibility', 'scope_1_2_complete') },
              { label: 'Scope 3 inclus si applicable', value: ck(cl, 'eligibility', 'scope_3_if_required') },
              { label: 'Declaration precedente verifiee', value: ck(cl, 'eligibility', 'scope_3_if_required') ?? ck(cl, 'eligibility', 'previous_declaration_exists') },
            ]}
            note={ckNote(cl, 'eligibility')}
          />

          {/* 3.2 Qualite des donnees */}
          <CheckSection
            title="3.2  QUALITE DES DONNEES"
            items={[
              { label: 'Donnees d\'activite documentees et tracables', value: ck(cl, 'data_quality', 'activity_data_documented') ?? ck(cl, 'data_quality', 'data_sources_documented') },
              { label: 'Facteurs d\'emission issus de sources reconnues', value: ck(cl, 'data_quality', 'emission_factors_sourced') ?? ck(cl, 'data_quality', 'emission_factors_appropriate') },
              { label: 'Methode de consolidation correcte', value: ck(cl, 'data_quality', 'uncertainty_acceptable') ?? ck(cl, 'data_quality', 'consolidation_method_correct') },
              { label: 'Perimetre organisationnel correct', value: ck(cl, 'data_quality', 'no_significant_gaps') ?? ck(cl, 'data_quality', 'scope_boundaries_correct') },
              { label: 'Absence de lacunes significatives', value: ck(cl, 'data_quality', 'no_significant_gaps') },
            ]}
            note={ckNote(cl, 'data_quality')}
          />

          {/* 3.3 Calculs */}
          <CheckSection
            title="3.3  CALCULS ET CONFORMITE ISO 14064"
            items={[
              { label: 'Methodologie conforme ISO 14064', value: ck(cl, 'calculations', 'method_conforms_iso14064') ?? ck(cl, 'calculations', 'methodology_followed') },
              { label: 'Scope 1 verifie et valide', value: ck(cl, 'calculations', 'unit_conversions_correct') ?? ck(cl, 'calculations', 'scope1_verified') },
              { label: 'Scope 2 verifie et valide', value: ck(cl, 'calculations', 'scope_totals_consistent') ?? ck(cl, 'calculations', 'scope2_verified') },
              { label: 'Scope 3 verifie et valide', value: ck(cl, 'calculations', 'no_double_counting') ?? ck(cl, 'calculations', 'scope3_verified') },
              { label: 'Absence de double comptage', value: ck(cl, 'calculations', 'no_double_counting') },
            ]}
            note={ckNote(cl, 'calculations')}
          />

          {/* 3.4 Visite de site */}
          <CheckSection
            title="3.4  VISITE DE SITE"
            items={[
              { label: 'Visite de site realisee', value: ck(cl, 'site_visit', 'site_visited') ?? ck(cl, 'site_visit', 'visit_conducted') },
            ]}
            note={[
              cl?.site_visit?.visit_date ? `Date de visite : ${fmtDate(String(cl.site_visit.visit_date))}` : '',
              cl?.site_visit?.visit_location ? `Lieu : ${cl.site_visit.visit_location}` : d.auditLocation ? `Lieu : ${d.auditLocation}` : '',
              ckNote(cl, 'site_visit'),
            ].filter(Boolean).join(' | ')}
          />

          {/* 3.5 Conformite OGEC */}
          <CheckSection
            title="3.5  CONFORMITE ARTICLES OGEC (Ordonnance N{'\u00b0'}019/PR/2021)"
            items={[
              { label: 'Art. 24 - Obligation de diagnostic GES respectee', value: ck(cl, 'ogec_compliance', 'art24_applicable') ?? ck(cl, 'ogec_compliance', 'article_24_met') },
              { label: 'Art. 25 - Rapport transmis a l\'OGEC dans les delais', value: ck(cl, 'ogec_compliance', 'art25_applicable') ?? ck(cl, 'ogec_compliance', 'article_25_content_complete') ?? ck(cl, 'ogec_compliance', 'art25_reporting_done') },
              { label: 'Art. 26 - Plan de reduction des emissions etabli', value: ck(cl, 'ogec_compliance', 'art26_applicable') ?? ck(cl, 'ogec_compliance', 'article_26_monitoring_plan') ?? ck(cl, 'ogec_compliance', 'art26_reduction_plan') },
              { label: 'Plan de surveillance present', value: ck(cl, 'ogec_compliance', 'monitoring_plan_present') },
              { label: 'Aucun transfert international sans accord CNC', value: ck(cl, 'ogec_compliance', 'no_international_transfer_without_cnc') },
            ]}
            note={ckNote(cl, 'ogec_compliance')}
          />
        </View>

        <Footer date={d.generatedAt} />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          PAGE 3 — Opinion Expert + Avis CNC + Documents
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <View style={s.headerBand}>
          <View style={s.headerLeft}>
            <Text style={s.headerBrand}>CARBONTRACK - DOSSIER OGEC</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerRef}>{d.companyName} - {d.assessmentYear}</Text>
          </View>
        </View>

        <View style={s.body}>

          {/* Section 4 - Expert Opinion */}
          <SectionHeader num="4" title="OPINION DE L'EXPERT AUDITEUR" />

          <View style={s.row2}>
            <View style={s.cellHighlight}>
              <Text style={s.cellLabel}>EXPERT DESIGNE</Text>
              <Text style={s.cellValueBold}>{d.expertName ?? '—'}</Text>
            </View>
            <View style={s.cell}>
              <Text style={s.cellLabel}>DATE D'AUDIT</Text>
              <Text style={s.cellValue}>{fmtDate(d.inspectionDate ?? d.auditScheduledDate)}</Text>
            </View>
            <View style={s.cell}>
              <Text style={s.cellLabel}>LIEU D'AUDIT</Text>
              <Text style={s.cellValue}>{d.auditLocation || '—'}</Text>
            </View>
          </View>

          {opinion ? (
            <View style={{ marginBottom: 12 }}>
              <Text style={[s.cellLabel, { marginBottom: 8 }]}>RECOMMANDATION DE L'EXPERT</Text>
              <View style={opinionStyle}>
                <Text style={[s.opinionText, { color: opinionColor }]}>{opinionText}</Text>
              </View>
            </View>
          ) : (
            <View style={s.noteBox}>
              <Text style={s.noteText}>Aucune opinion enregistree — l'expert n'a pas encore finalize la checklist d'audit.</Text>
            </View>
          )}

          {conditions.length > 0 && (
            <View style={s.noteBox}>
              <Text style={[s.cellLabel, { marginBottom: 6 }]}>CONDITIONS / RESERVES</Text>
              {conditions.map((c, i) => (
                <Text key={i} style={[s.noteText, { marginBottom: 3 }]}>- {c}</Text>
              ))}
            </View>
          )}

          {d.inspectionNotes && (
            <View style={s.noteBox}>
              <Text style={[s.cellLabel, { marginBottom: 5 }]}>NOTES D'INSPECTION</Text>
              <Text style={s.noteText}>{d.inspectionNotes}</Text>
            </View>
          )}

          {/* Section 5 - Avis CNC */}
          <SectionHeader num="5" title="AVIS DE CONFORMITE CNC" />

          {d.avisNumber ? (
            <View style={s.avisBand}>
              <Text style={s.avisLabel}>AVIS DE CONFORMITE - CONSEIL NATIONAL CLIMAT (CNC)</Text>
              <View style={s.row3}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cellLabel}>N{'\u00b0'} AVIS</Text>
                  <Text style={s.avisValue}>{d.avisNumber}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cellLabel}>DATE</Text>
                  <Text style={s.avisValue}>{fmtDate(d.avisDate)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cellLabel}>PERIODE</Text>
                  <Text style={s.avisValue}>{d.avisPeriodStart ?? '—'} - {d.avisPeriodEnd ?? '—'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cellLabel}>tCO2e VALIDEES</Text>
                  <Text style={s.avisValue}>{fmtNum(d.avisTotalCo2eq)}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={s.noteBox}>
              <Text style={s.noteText}>
                L'Avis de Conformite CNC n'a pas encore ete enregistre. Ce document officiel sera transmis par le Conseil National Climat apres examen du dossier. CarbonTrack l'enregistrera des reception.
              </Text>
            </View>
          )}

          {/* Section 6 - Documents */}
          <SectionHeader num="6" title="DOCUMENTS CONSTITUTIFS DU DOSSIER" />

          <View style={s.table}>
            <View style={s.tableHead}>
              <Text style={[s.tableHeadCell, { flex: 3 }]}>Document</Text>
              <Text style={[s.tableHeadCell, { flex: 1.2 }]}>Statut</Text>
              <Text style={[s.tableHeadCell, { flex: 2 }]}>Reference</Text>
            </View>
            {[
              {
                doc: 'Bilan GES - Rapport complet',
                ok: true,
                ref: `${d.assessmentName} (${d.assessmentYear})`
              },
              {
                doc: 'Rapport d\'audit expert',
                ok: !!d.expertName,
                ref: d.expertName ?? 'Expert non assigne'
              },
              {
                doc: 'Checklist audit (5 sections)',
                ok: !!(cl && Object.keys(cl).length > 0),
                ref: 'Voir page 2'
              },
              {
                doc: 'Avis de Conformite CNC',
                ok: !!d.avisNumber,
                ref: d.avisNumber ?? 'En attente CNC'
              },
              {
                doc: 'Recapitulatif CarbonTrack',
                ok: !!d.certificateNumber,
                ref: d.certificateNumber ?? 'En preparation'
              },
            ].map((row, i) => (
              <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={[s.tableCellBold, { flex: 3 }]}>{row.doc}</Text>
                <Text style={[s.tableCell, { flex: 1.2 }, row.ok ? s.pillOk : s.pillWait]}>
                  {row.ok ? '[OK] Inclus' : '[--] En attente'}
                </Text>
                <Text style={[s.tableCell, { flex: 2 }]}>{row.ref}</Text>
              </View>
            ))}
          </View>

          {/* Signatures */}
          <View style={s.sigRow}>
            <View style={s.sigCell}>
              <Text style={s.sigLabel}>REPRESENTANT ENTREPRISE</Text>
              <Text style={s.sigValue}>{d.companyName}</Text>
            </View>
            <View style={s.sigCell}>
              <Text style={s.sigLabel}>EXPERT AGREE</Text>
              <Text style={s.sigValue}>{d.expertName ?? 'A completer'}</Text>
            </View>
            <View style={s.sigCell}>
              <Text style={s.sigLabel}>PLATEFORME CARBONTRACK</Text>
              <Text style={s.sigValue}>Direction Technique</Text>
            </View>
          </View>
        </View>

        <Footer date={d.generatedAt} />
      </Page>

    </Document>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function generateOGECDossierPDF(data: OGECDossierData): Promise<Buffer> {
  const blob = await pdf(<OGECDossierDocument d={data} />).toBlob()
  const ab = await blob.arrayBuffer()
  return Buffer.from(ab)
}
