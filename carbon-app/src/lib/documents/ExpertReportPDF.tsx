import React from 'react'
import {
  Document, Page, Text, View, StyleSheet,
  Image, pdf,
  Svg, Path, Rect, Line, G, Circle,
} from '@react-pdf/renderer'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmissionEntry {
  id: number
  scope: number
  category: string
  subcategory: string | null
  factorName: string
  quantity: number
  unit: string
  factorValue: number
  totalCo2eq: number
  month?: number | null
  ghgCategory: string | null
  description: string | null
}

export interface MonthRow {
  month: number
  label: string
  total: number
  scope1: number
  scope2: number
  scope3: number
}

export interface AuditChecklistData {
  eligibility: {
    threshold_met: boolean
    scope_1_2_complete: boolean
    scope_3_if_required: boolean
    approach_confirmed: string
    legal_entity_registered: boolean
    period_covered: string
    notes: string
  }
  data_quality: {
    activity_data_documented: boolean
    emission_factors_sourced: boolean
    uncertainty_acceptable: boolean
    no_significant_gaps: boolean
    monthly_data_available: boolean
    supporting_docs_provided: boolean
    notes: string
  }
  calculations: {
    method_conforms_iso14064: boolean
    unit_conversions_correct: boolean
    scope_totals_consistent: boolean
    no_double_counting: boolean
    emission_factors_current: boolean
    notes: string
  }
  site_visit: {
    site_visited: boolean
    visit_date: string
    sites_covered: string[]
    processes_observed: string[]
    inconsistencies_found: boolean
    inconsistency_details: string
    photos_taken: boolean
    notes: string
  }
  ogec_compliance: {
    article_24_met: boolean
    article_25_content_complete: boolean
    article_26_monitoring_plan: boolean
    declaration_conformite_signed: boolean
    no_international_transfer_without_cnc: boolean
    notes: string
  }
  opinion: {
    recommendation: 'favorable' | 'favorable_with_conditions' | 'unfavorable'
    conditions: string[]
    corrections_required: string[]
    overall_assessment: string
    recommendations: string
    expert_signature_date: string
  }
}

export interface ExpertReportData {
  certId: number
  missionNumber: string
  expertName: string
  expertEmail: string
  reportDate: string
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
  inspectionDate: string | null
  inspectionLocation: string | null
  checklist: AuditChecklistData
  qrCodeDataUrl?: string
  companyLogoDataUrl?: string | null
  greenLeavesLogoDataUrl?: string | null
  entries?: EmissionEntry[]
  byMonth?: MonthRow[]
  // Certified state — when status === 'certified', PDF takes on certified look
  status?: string | null
  certifiedAt?: string | null
  certificateNumber?: string | null
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const GREEN   = '#16a34a'
const DKGREEN = '#15803d'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a1a2e',
    paddingTop: 0,
    paddingBottom: 50,
    paddingHorizontal: 0,
  },

  // ── Page 1 header band: 3 columns (logo | title | QR) ──
  headerBand: {
    backgroundColor: GREEN,
    paddingHorizontal: 36,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  // Left column
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  glLogoWrap: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glLogoImg: { height: 40, width: 96, objectFit: 'contain' },
  glLogoCircle: {
    width: 48, height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glLogoText: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: GREEN },
  brandBlock: { flexDirection: 'column' },
  brandName: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#ffffff', letterSpacing: 0.5 },
  brandSub:  { fontSize: 7, color: '#bbf7d0', marginTop: 2 },
  // Center column
  headerCenter: { alignItems: 'center', flex: 1, marginHorizontal: 12 },
  docTitle:  { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'center' },
  docSub:    { fontSize: 7.5, color: '#bbf7d0', textAlign: 'center', marginTop: 3 },
  // Right column — QR code
  headerRight: { alignItems: 'center' },
  headerQrImage: { width: 60, height: 60 },
  headerQrCaption: { fontSize: 5.5, color: '#bbf7d0', marginTop: 3, textAlign: 'center' },

  // ── Simple page 2/3 header ──
  headerBandSimple: {
    backgroundColor: GREEN,
    paddingHorizontal: 36,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerSimpleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  glLogoWrapSmall: {
    backgroundColor: '#ffffff',
    borderRadius: 4,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glLogoSmall: { height: 26, width: 78, objectFit: 'contain' },
  glLogoCircleSmall: {
    width: 30, height: 30,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glLogoTextSmall: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: GREEN },
  headerSimpleRight: { alignItems: 'flex-end' },

  // Content area
  content: { paddingHorizontal: 36 },

  // ── Sections ──
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: DKGREEN,
    backgroundColor: '#f0fdf4',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#16a34a',
  },

  // ── Info rows ──
  infoRow: { flexDirection: 'row', marginBottom: 3 },
  infoLabel: { width: 145, color: '#6b7280', fontSize: 8 },
  infoValue: { flex: 1, fontFamily: 'Helvetica-Bold', fontSize: 8 },

  // ── Company row (logo + name) ──
  companyLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  companyLogoImg: { width: 48, height: 48, borderRadius: 4, marginRight: 10 },
  companyLogoFallback: {
    width: 48, height: 48, borderRadius: 4, marginRight: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1, borderColor: '#86efac',
    justifyContent: 'center', alignItems: 'center',
  },
  companyLogoFallbackText: { fontSize: 7, color: GREEN, fontFamily: 'Helvetica-Bold' },
  companyNameBig: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: DKGREEN },
  companySub: { fontSize: 8, color: '#6b7280', marginTop: 2 },

  // ── Checklist ──
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  checkBox: {
    width: 14, height: 14, borderRadius: 2,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 6, marginTop: 1,
  },
  checkYes: { backgroundColor: '#16a34a' },
  checkNo:  { backgroundColor: '#dc2626' },
  checkNA:  { backgroundColor: '#9ca3af' },
  checkMark: { color: 'white', fontSize: 8, fontFamily: 'Helvetica-Bold' },
  checkText: { flex: 1, fontSize: 8.5, lineHeight: 1.4 },
  checkNotes: { fontSize: 7.5, color: '#6b7280', marginTop: 2, marginLeft: 20, fontStyle: 'italic' },

  // ── Scopes table ──
  table: { marginTop: 6, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: DKGREEN, paddingVertical: 5, paddingHorizontal: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb', paddingVertical: 5, paddingHorizontal: 8 },
  tableTotal: { flexDirection: 'row', backgroundColor: '#f0fdf4', paddingVertical: 5, paddingHorizontal: 8 },
  tableCell: { flex: 1, fontSize: 8 },
  tableCellBold: { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  tableCellBoldWhite: { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  tableCellRight: { flex: 1, fontSize: 8, textAlign: 'right' },
  tableCellRightWhite: { flex: 1, fontSize: 8, textAlign: 'right', color: '#ffffff', fontFamily: 'Helvetica-Bold' },

  // ── Opinion section ──
  listBlock: { marginTop: 8 },
  listTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  listTitleWarn: { color: '#b45309' },
  listTitleDanger: { color: '#dc2626' },
  listTitleOk: { color: '#15803d' },
  listItem: { fontSize: 8, marginBottom: 2, paddingLeft: 10 },
  listItemWarn: { color: '#92400e' },
  listItemDanger: { color: '#b91c1c' },

  // ── Signature row (page 3) ──
  sigRow: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  signatureBox: { width: 190, borderTopWidth: 1, borderTopColor: '#9ca3af', paddingTop: 6 },
  signatureLabel: { fontSize: 7.5, color: '#6b7280', textAlign: 'center' },
  signatureName:  { fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 4 },

  // ── Entries detail page ──
  scopeHeader: {
    backgroundColor: DKGREEN,
    paddingVertical: 5,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    borderRadius: 2,
  },
  scopeHeaderText: { color: '#ffffff', fontSize: 8.5, fontFamily: 'Helvetica-Bold', flex: 1 },
  scopeTotal: { color: '#bbf7d0', fontSize: 8, fontFamily: 'Helvetica-Bold' },
  catHeader: {
    backgroundColor: '#f0fdf4',
    paddingVertical: 3,
    paddingHorizontal: 8,
    flexDirection: 'row',
    borderLeftWidth: 2,
    borderLeftColor: GREEN,
    marginBottom: 2,
    marginTop: 4,
  },
  catHeaderText: { color: DKGREEN, fontSize: 8, fontFamily: 'Helvetica-Bold', flex: 1 },
  catTotal: { color: DKGREEN, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  entryRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderBottomWidth: 0.3,
    borderBottomColor: '#f3f4f6',
  },
  entryRowAlt: { backgroundColor: '#fafafa' },
  entryCol1: { flex: 3, fontSize: 7.5, color: '#374151' },
  entryCol2: { flex: 1, fontSize: 7.5, color: '#374151', textAlign: 'right' },
  entryCol3: { flex: 1, fontSize: 7.5, color: '#374151', textAlign: 'right' },
  entryCol4: { width: 70, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: DKGREEN, textAlign: 'right' },
  entryColPct: { width: 40, fontSize: 7.5, color: '#9ca3af', textAlign: 'right' },
  entryTableHeader: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    marginBottom: 1,
  },
  entryThText: { fontSize: 7, color: '#6b7280', fontFamily: 'Helvetica-Bold' },

  // ── Footer ──
  footer: {
    position: 'absolute', bottom: 20, left: 36, right: 36,
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 0.5, borderTopColor: '#e5e7eb',
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: '#9ca3af' },

  // ── Certified state ──
  certifiedRibbon: {
    backgroundColor: '#fef3c7',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderTopColor: '#d97706',
    borderBottomColor: '#d97706',
    paddingVertical: 6,
    paddingHorizontal: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  certifiedRibbonLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  certifiedRibbonRight: { flexDirection: 'column', alignItems: 'flex-end' },
  certifiedBadge: {
    backgroundColor: '#15803d',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 2,
  },
  certifiedBadgeText: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    letterSpacing: 1.2,
  },
  certifiedRibbonTitle: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#7c2d12',
    letterSpacing: 0.6,
  },
  certifiedRibbonSub: {
    fontSize: 7,
    color: '#92400e',
    marginTop: 1,
  },
  certifiedRibbonNumber: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#7c2d12',
  },
  certifiedRibbonDate: {
    fontSize: 7,
    color: '#92400e',
    marginTop: 1,
  },
  // Page-1 large stamp block
  certifiedStamp: {
    marginTop: 4,
    marginBottom: 14,
    padding: 12,
    borderWidth: 2,
    borderColor: '#15803d',
    borderRadius: 6,
    backgroundColor: '#f0fdf4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  certifiedStampSeal: {
    width: 64, height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderColor: '#15803d',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  certifiedStampSealMark:  { fontSize: 28, color: '#15803d', fontFamily: 'Helvetica-Bold', lineHeight: 1 },
  certifiedStampSealLabel: { fontSize: 6.5, color: '#15803d', fontFamily: 'Helvetica-Bold', marginTop: 2, letterSpacing: 0.8 },
  certifiedStampBody:      { flex: 1 },
  certifiedStampTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#15803d',
    letterSpacing: 0.8,
  },
  certifiedStampSubtitle: {
    fontSize: 8,
    color: '#166534',
    marginTop: 2,
  },
  certifiedStampMeta: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 16,
  },
  certifiedStampMetaLabel: { fontSize: 6.5, color: '#6b7280', letterSpacing: 0.5 },
  certifiedStampMetaValue: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#14532d', marginTop: 1 },

  // Diagonal CERTIFIE watermark on every page
  watermark: {
    position: 'absolute',
    top: '38%',
    left: -60,
    right: -60,
    transform: 'rotate(-22deg)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.07,
  },
  watermarkText: {
    fontSize: 110,
    fontFamily: 'Helvetica-Bold',
    color: '#15803d',
    letterSpacing: 8,
  },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function sanitize(text: string | null | undefined): string {
  if (!text) return '—'
  return text
    .replace(/&amp;/g,   '&')
    .replace(/&lt;/g,    '<')
    .replace(/&gt;/g,    '>')
    .replace(/&quot;/g,  '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/g,   "'")
    .replace(/&nbsp;/g,  ' ')
    .replace(/&eacute;/g, 'e').replace(/&egrave;/g, 'e').replace(/&ecirc;/g, 'e')
    .replace(/&agrave;/g, 'a').replace(/&ccedil;/g, 'c').replace(/&ocirc;/g, 'o')
    .replace(/&ucirc;/g,  'u').replace(/&iuml;/g,   'i')
    .replace(/&hellip;/g, '...').replace(/&ndash;/g, '-').replace(/&mdash;/g, '-')
}

function Check({ value }: { value: boolean | undefined }) {
  const na = value === undefined
  return (
    <View style={[styles.checkBox, na ? styles.checkNA : value ? styles.checkYes : styles.checkNo]}>
      {na ? (
        <Svg width={10} height={10} viewBox="0 0 14 14">
          <Line x1={3} y1={7} x2={11} y2={7} stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />
        </Svg>
      ) : value ? (
        <Svg width={10} height={10} viewBox="0 0 14 14">
          <Path
            d="M 3 7.5 L 6 10.5 L 11 4"
            stroke="#ffffff"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      ) : (
        <Svg width={10} height={10} viewBox="0 0 14 14">
          <Line x1={4} y1={4} x2={10} y2={10} stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />
          <Line x1={10} y1={4} x2={4} y2={10} stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />
        </Svg>
      )}
    </View>
  )
}

function CheckItem({ label, value, notes }: { label: string; value: boolean; notes?: string }) {
  return (
    <View style={styles.checkRow}>
      <Check value={value} />
      <View style={{ flex: 1 }}>
        <Text style={styles.checkText}>{label}</Text>
        {notes ? <Text style={styles.checkNotes}>{notes}</Text> : null}
      </View>
    </View>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function CompanyLogoSmall({ dataUrl, name }: { dataUrl?: string | null; name: string }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return dataUrl ? (
    <Image src={dataUrl} style={styles.glLogoSmall} />
  ) : (
    <View style={[styles.glLogoCircleSmall, { backgroundColor: '#166534' }]}>
      <Text style={[styles.glLogoTextSmall, { color: '#ffffff', fontSize: 8 }]}>{initials}</Text>
    </View>
  )
}

function SecondaryHeader({ data }: { data: ExpertReportData }) {
  return (
    <View style={styles.headerBandSimple} fixed>
      <View style={styles.headerSimpleLeft}>
        <CompanyLogoSmall dataUrl={data.companyLogoDataUrl} name={data.companyName} />
        <View>
          <Text style={styles.brandName}>{sanitize(data.companyName)}</Text>
          <Text style={styles.brandSub}>Rapport d'Audit Expert GreenLeaves — {data.missionNumber}</Text>
        </View>
      </View>
      <View style={styles.headerSimpleRight}>
        <Text style={styles.docSub}>{data.assessmentYear}</Text>
        <Text style={styles.docSub}>CONFIDENTIEL</Text>
      </View>
    </View>
  )
}

function CertifiedWatermark() {
  return (
    <View style={styles.watermark} fixed>
      <Text style={styles.watermarkText}>CERTIFIE</Text>
    </View>
  )
}

function CertifiedRibbon({ data }: { data: ExpertReportData }) {
  return (
    <View style={styles.certifiedRibbon} fixed>
      <View style={styles.certifiedRibbonLeft}>
        <View style={styles.certifiedBadge}>
          <Text style={styles.certifiedBadgeText}>CERTIFIE</Text>
        </View>
        <View>
          <Text style={styles.certifiedRibbonTitle}>RAPPORT CERTIFIE GREENLEAVES</Text>
          <Text style={styles.certifiedRibbonSub}>
            Document officiel validé par l'autorité de certification
          </Text>
        </View>
      </View>
      <View style={styles.certifiedRibbonRight}>
        <Text style={styles.certifiedRibbonNumber}>N° {sanitize(data.certificateNumber)}</Text>
        <Text style={styles.certifiedRibbonDate}>Délivré le {fmtDate(data.certifiedAt)}</Text>
      </View>
    </View>
  )
}

function CertifiedStamp({ data }: { data: ExpertReportData }) {
  return (
    <View style={styles.certifiedStamp}>
      <View style={styles.certifiedStampSeal}>
        <Svg width={32} height={32} viewBox="0 0 24 24">
          <Path
            d="M 4 12.5 L 9.5 18 L 20 6.5"
            stroke="#15803d"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
        <Text style={styles.certifiedStampSealLabel}>OFFICIEL</Text>
      </View>
      <View style={styles.certifiedStampBody}>
        <Text style={styles.certifiedStampTitle}>BILAN CARBONE CERTIFIE</Text>
        <Text style={styles.certifiedStampSubtitle}>
          {sanitize(data.companyName)} — Exercice {data.assessmentYear}
        </Text>
        <View style={styles.certifiedStampMeta}>
          <View>
            <Text style={styles.certifiedStampMetaLabel}>N° DE CERTIFICAT</Text>
            <Text style={styles.certifiedStampMetaValue}>{sanitize(data.certificateNumber)}</Text>
          </View>
          <View>
            <Text style={styles.certifiedStampMetaLabel}>DATE DE CERTIFICATION</Text>
            <Text style={styles.certifiedStampMetaValue}>{fmtDate(data.certifiedAt)}</Text>
          </View>
          <View>
            <Text style={styles.certifiedStampMetaLabel}>EMISSIONS VALIDEES</Text>
            <Text style={styles.certifiedStampMetaValue}>{fmtNum(data.totalCo2eq)} tCO2e</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

function GlLogo({ dataUrl, size = 'large' }: { dataUrl?: string | null; size?: 'large' | 'small' }) {
  if (size === 'small') {
    return dataUrl ? (
      <View style={styles.glLogoWrapSmall}>
        <Image src={dataUrl} style={styles.glLogoSmall} />
      </View>
    ) : (
      <View style={styles.glLogoCircleSmall}>
        <Text style={styles.glLogoTextSmall}>GL</Text>
      </View>
    )
  }
  return dataUrl ? (
    <View style={styles.glLogoWrap}>
      <Image src={dataUrl} style={styles.glLogoImg} />
    </View>
  ) : (
    <View style={styles.glLogoCircle}>
      <Text style={styles.glLogoText}>GL</Text>
    </View>
  )
}

// ─── SVG Chart Helpers ───────────────────────────────────────────────────────

// Scope colors aligned with admin/expert convention
const CHART_S1 = '#22c55e'
const CHART_S2 = '#3b82f6'
const CHART_S3 = '#f59e0b'

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number, innerR: number): string {
  const x1 = cx + r * Math.cos(startAngle)
  const y1 = cy + r * Math.sin(startAngle)
  const x2 = cx + r * Math.cos(endAngle)
  const y2 = cy + r * Math.sin(endAngle)
  const xi2 = cx + innerR * Math.cos(endAngle)
  const yi2 = cy + innerR * Math.sin(endAngle)
  const xi1 = cx + innerR * Math.cos(startAngle)
  const yi1 = cy + innerR * Math.sin(startAngle)
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${xi1} ${yi1} Z`
}

function ScopeDonutSvg({ scope1, scope2, scope3, total }: { scope1: number; scope2: number; scope3: number; total: number }) {
  const slices = [
    { value: scope1, color: CHART_S1, label: 'Scope 1' },
    { value: scope2, color: CHART_S2, label: 'Scope 2' },
    { value: scope3, color: CHART_S3, label: 'Scope 3' },
  ].filter(s => s.value > 0)
  if (total <= 0 || slices.length === 0) {
    return (
      <View style={{ height: 100, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 8, color: '#9ca3af' }}>Aucune émission</Text>
      </View>
    )
  }
  const cx = 50, cy = 50, r = 45, innerR = 24
  let startAngle = -Math.PI / 2
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
      <Svg width={100} height={100} viewBox="0 0 100 100">
        {slices.map((s, i) => {
          const sweep = (s.value / total) * Math.PI * 2
          const path = arcPath(cx, cy, r, startAngle, startAngle + sweep, innerR)
          startAngle += sweep
          return <Path key={i} d={path} fill={s.color} />
        })}
      </Svg>
      <View style={{ flex: 1 }}>
        {slices.map((s, i) => {
          const pct = (s.value / total) * 100
          return (
            <View key={i} style={{ marginBottom: i === slices.length - 1 ? 0 : 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 7, height: 7, backgroundColor: s.color }} />
                  <Text style={{ fontSize: 7.5, color: '#374151', fontFamily: 'Helvetica-Bold' }}>{s.label}</Text>
                </View>
                <Text style={{ fontSize: 7.5, color: '#15803d', fontFamily: 'Helvetica-Bold' }}>{fmtNum(s.value)} tCO2e</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ flex: 1, height: 3, backgroundColor: '#e5e7eb', borderRadius: 1.5 }}>
                  <View style={{ width: `${Math.max(pct, 2)}%` as unknown as number, height: 3, backgroundColor: s.color, borderRadius: 1.5 }} />
                </View>
                <Text style={{ fontSize: 6.5, color: '#6b7280', width: 26, textAlign: 'right' }}>{pct.toFixed(1)}%</Text>
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

// Horizontal bars: SVG draws bars only, labels & values are View+Text overlays
function HorizontalBarsChart({
  items, barHeight = 16, gap = 4, labelMaxLen = 38,
}: {
  items: { label: string; value: number; color: string }[]
  barHeight?: number; gap?: number; labelMaxLen?: number
}) {
  if (items.length === 0) return null
  const max = Math.max(...items.map(i => i.value), 0.001)
  return (
    <View style={{ flexDirection: 'column' }}>
      {items.map((item, i) => {
        const pct = (item.value / max) * 100
        const lbl = item.label.length > labelMaxLen ? item.label.slice(0, labelMaxLen - 2) + '..' : item.label
        const valStr = item.value >= 1 ? fmtNum(item.value) + ' tCO2e' : (item.value * 1000).toFixed(0) + ' kgCO2e'
        return (
          <View key={i} style={{
            flexDirection: 'row', alignItems: 'center',
            marginBottom: i === items.length - 1 ? 0 : gap,
          }}>
            <Text style={{ width: 165, fontSize: 8, color: '#374151', paddingRight: 6, textAlign: 'right' }}>
              {sanitize(lbl)}
            </Text>
            <View style={{ flex: 1, height: barHeight, backgroundColor: '#f3f4f6', borderRadius: 2, overflow: 'hidden' }}>
              <View style={{
                width: `${Math.max(pct, 1)}%` as unknown as number,
                height: barHeight,
                backgroundColor: item.color,
              }} />
            </View>
            <Text style={{ width: 75, fontSize: 7.5, color: '#15803d', fontFamily: 'Helvetica-Bold', paddingLeft: 6, textAlign: 'left' }}>
              {valStr}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

// Monthly stacked bar — SVG for bars, View+Text overlays for axis labels & legend
function StackedMonthlyChart({
  months, width, height,
}: { months: MonthRow[]; width: number; height: number }) {
  const padL = 26, padR = 6, padT = 6, padB = 4
  const chartW = width - padL - padR
  const chartH = height - padT - padB
  const max = Math.max(...months.map(m => m.total), 0.001)
  const slotW = chartW / months.length
  const barW = slotW - 2
  const gridSteps = 4
  return (
    <View>
      {/* Y axis labels overlaid on the SVG */}
      <View style={{ position: 'relative', width, height }}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* Grid lines */}
          {Array.from({ length: gridSteps + 1 }).map((_, i) => {
            const gy = padT + (chartH / gridSteps) * i
            return <Line key={i} x1={padL} y1={gy} x2={width - padR} y2={gy} stroke="#e5e7eb" strokeWidth={0.4} />
          })}
          {/* Stacked bars */}
          {months.map((m, i) => {
            const x = padL + i * slotW + 1
            const stacks = [
              { val: m.scope1, color: CHART_S1 },
              { val: m.scope2, color: CHART_S2 },
              { val: m.scope3, color: CHART_S3 },
            ]
            let yCursor = padT + chartH
            return (
              <G key={m.month}>
                {stacks.map((s, si) => {
                  if (s.val <= 0) return null
                  const sh = (s.val / max) * chartH
                  yCursor -= sh
                  return <Rect key={si} x={x} y={yCursor} width={barW} height={sh} fill={s.color} />
                })}
              </G>
            )
          })}
        </Svg>
        {/* Y axis labels (overlay) */}
        {Array.from({ length: gridSteps + 1 }).map((_, i) => {
          const gv = max - (max / gridSteps) * i
          const gy = padT + (chartH / gridSteps) * i
          return (
            <Text key={i} style={{
              position: 'absolute',
              left: 0, top: gy - 4, width: padL - 4,
              fontSize: 5.5, color: '#9ca3af', textAlign: 'right',
            }}>
              {gv >= 1 ? gv.toFixed(0) + 't' : (gv * 1000).toFixed(0) + 'kg'}
            </Text>
          )
        })}
      </View>
      {/* Month X labels */}
      <View style={{ flexDirection: 'row', paddingLeft: padL, marginTop: 2 }}>
        {months.map((m, i) => (
          <View key={i} style={{ width: slotW, alignItems: 'center' }}>
            <Text style={{ fontSize: 6.5, color: '#6b7280' }}>{m.label.slice(0, 3)}</Text>
          </View>
        ))}
      </View>
      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 4 }}>
        {[
          { label: 'Scope 1', color: CHART_S1 },
          { label: 'Scope 2', color: CHART_S2 },
          { label: 'Scope 3', color: CHART_S3 },
        ].map((l, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 7, height: 7, backgroundColor: l.color }} />
            <Text style={{ fontSize: 7, color: '#374151' }}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Document ─────────────────────────────────────────────────────────────────

export function ExpertReportDocument({ data }: { data: ExpertReportData }) {
  const cl  = data.checklist
  const op  = cl.opinion

  const glLogo = data.greenLeavesLogoDataUrl
  const isCertified = data.status === 'certified'

  // Derived: top emitters + by-category (computed from entries when present)
  const allEntries = data.entries ?? []
  const topEmitters = [...allEntries]
    .filter(e => e.totalCo2eq > 0)
    .sort((a, b) => b.totalCo2eq - a.totalCo2eq)
    .slice(0, 8)
    .map(e => ({
      label: e.factorName,
      value: e.totalCo2eq,
      scope: e.scope,
      color: e.scope === 1 ? CHART_S1 : e.scope === 2 ? CHART_S2 : CHART_S3,
    }))
  const byCategoryMap: Record<string, { total: number; scope: number }> = {}
  for (const e of allEntries) {
    const cat = e.category || 'autre'
    if (!byCategoryMap[cat]) byCategoryMap[cat] = { total: 0, scope: e.scope }
    byCategoryMap[cat].total += e.totalCo2eq
  }
  const byCategory = Object.entries(byCategoryMap)
    .map(([cat, v]) => ({
      label: cat,
      value: v.total,
      color: v.scope === 1 ? CHART_S1 : v.scope === 2 ? CHART_S2 : CHART_S3,
    }))
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value)
  const hasMonthly = !!data.byMonth && data.byMonth.some(m => m.total > 0)

  return (
    <Document>
      {/* ══════════════════════════════════════════════════════════════════════
          Page 1 — Identification + Emissions
         ══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        {isCertified && <CertifiedWatermark />}

        {/* ── Header: Logo | Title | QR Code ── */}
        <View style={styles.headerBand} fixed>
          {/* Left: GL logo + brand */}
          <View style={styles.headerLeft}>
            <GlLogo dataUrl={glLogo} size="large" />
            <View style={styles.brandBlock}>
              <Text style={styles.brandName}>GreenLeaves</Text>
              <Text style={styles.brandSub}>Certification GES officielle — Republique Gabonaise</Text>
            </View>
          </View>

          {/* Center: document info */}
          <View style={styles.headerCenter}>
            <Text style={styles.docTitle}>
              {isCertified ? "CERTIFIE" : "RAPPORT D'AUDIT EXPERT"}
            </Text>
            <Text style={styles.docSub}>Mission N° {data.missionNumber}</Text>
            <Text style={styles.docSub}>Date : {fmtDate(data.reportDate)}</Text>
            <Text style={styles.docSub}>CONFIDENTIEL</Text>
          </View>

          {/* Right: QR code */}
          {data.qrCodeDataUrl && (
            <View style={styles.headerRight}>
              <Image src={data.qrCodeDataUrl} style={styles.headerQrImage} />
              <Text style={styles.headerQrCaption}>Verifier en ligne</Text>
            </View>
          )}
        </View>

        {isCertified && <CertifiedRibbon data={data} />}

        <View style={styles.content}>

          {isCertified && <CertifiedStamp data={data} />}

          {/* ── 1. Mission info ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. INFORMATIONS DE LA MISSION</Text>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Expert auditeur</Text><Text style={styles.infoValue}>{sanitize(data.expertName)}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Contact expert</Text><Text style={styles.infoValue}>{sanitize(data.expertEmail)}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Date du rapport</Text><Text style={styles.infoValue}>{fmtDate(data.reportDate)}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Date de visite terrain</Text><Text style={styles.infoValue}>{cl.site_visit.site_visited ? fmtDate(cl.site_visit.visit_date) : 'Audit documentaire uniquement'}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Lieu(x) visite(s)</Text><Text style={styles.infoValue}>{sanitize(data.inspectionLocation || cl.site_visit.sites_covered?.join(', '))}</Text></View>
          </View>

          {/* ── 2. Company info ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. INFORMATIONS DE L'ENTREPRISE</Text>

            <View style={styles.companyLogoRow}>
              {data.companyLogoDataUrl ? (
                <Image src={data.companyLogoDataUrl} style={styles.companyLogoImg} />
              ) : (
                <View style={styles.companyLogoFallback}>
                  <Text style={styles.companyLogoFallbackText}>LOGO</Text>
                </View>
              )}
              <View>
                <Text style={styles.companyNameBig}>{sanitize(data.companyName)}</Text>
                <Text style={styles.companySub}>{sanitize(data.companySector)}</Text>
              </View>
            </View>

            <View style={styles.infoRow}><Text style={styles.infoLabel}>N° RCCM</Text><Text style={styles.infoValue}>{sanitize(data.companyRccm)}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Bilan concerne</Text><Text style={styles.infoValue}>{sanitize(data.assessmentName)} — {data.assessmentYear}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Approche de consolidation</Text><Text style={styles.infoValue}>{data.approach === 'operational_control' ? 'Controle operationnel' : 'Quote-part du capital'}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Periode de reference</Text><Text style={styles.infoValue}>{sanitize(cl.eligibility.period_covered) || String(data.assessmentYear)}</Text></View>
          </View>

          {/* ── 3. Emissions ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. EMISSIONS GES DECLAREES (tCO2e)</Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={styles.tableCellBoldWhite}>Scope</Text>
                <Text style={styles.tableCellBoldWhite}>Description</Text>
                <Text style={styles.tableCellRightWhite}>Emissions (tCO2e)</Text>
                <Text style={styles.tableCellRightWhite}>% du total</Text>
              </View>
              {[
                { scope: 'Scope 1', desc: 'Emissions directes', val: data.scope1 },
                { scope: 'Scope 2', desc: 'Energie indirecte', val: data.scope2 },
                { scope: 'Scope 3', desc: 'Autres indirectes', val: data.scope3 },
              ].map(row => (
                <View key={row.scope} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{row.scope}</Text>
                  <Text style={styles.tableCell}>{row.desc}</Text>
                  <Text style={styles.tableCellRight}>{fmtNum(row.val)}</Text>
                  <Text style={styles.tableCellRight}>{data.totalCo2eq > 0 ? (row.val / data.totalCo2eq * 100).toFixed(1) + '%' : '—'}</Text>
                </View>
              ))}
              <View style={styles.tableTotal}>
                <Text style={styles.tableCellBold}>TOTAL</Text>
                <Text style={styles.tableCell}>Toutes sources confondues</Text>
                <Text style={[styles.tableCellBold, { textAlign: 'right' }]}>{fmtNum(data.totalCo2eq)}</Text>
                <Text style={[styles.tableCellBold, { textAlign: 'right' }]}>100%</Text>
              </View>
            </View>
          </View>

        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>GreenLeaves — Rapport d'Audit Expert N° {data.missionNumber}</Text>
          <Text style={styles.footerText}>{sanitize(data.companyName)} · {data.assessmentYear}</Text>
        </View>
      </Page>

      {/* ══════════════════════════════════════════════════════════════════════
          Page 2 — Analyses Graphiques (donut, monthly stack, top emitters, by category)
         ══════════════════════════════════════════════════════════════════════ */}
      {(data.totalCo2eq > 0 || allEntries.length > 0) && (
        <Page size="A4" style={styles.page}>
          {isCertified && <CertifiedWatermark />}
          <SecondaryHeader data={data} />
          {isCertified && <CertifiedRibbon data={data} />}

          <View style={styles.content}>
            <Text style={styles.sectionTitle}>4. ANALYSES GRAPHIQUES</Text>

            {/* Scope donut — full width, donut left + legend right with breathing room */}
            <View style={{ marginBottom: 12, padding: 10, backgroundColor: '#f9fafb', borderRadius: 4, borderWidth: 0.5, borderColor: '#e5e7eb' }}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#374151', marginBottom: 8 }}>Répartition par Scope</Text>
              <ScopeDonutSvg scope1={data.scope1} scope2={data.scope2} scope3={data.scope3} total={data.totalCo2eq} />
            </View>

            {/* Monthly stacked — full width */}
            {hasMonthly && (
              <View style={{ marginBottom: 12, padding: 10, backgroundColor: '#f9fafb', borderRadius: 4, borderWidth: 0.5, borderColor: '#e5e7eb' }} wrap={false}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#374151', marginBottom: 8 }}>Suivi mensuel par scope</Text>
                <StackedMonthlyChart months={data.byMonth!} width={500} height={120} />
              </View>
            )}

            {/* Top emitters horizontal bars */}
            {topEmitters.length > 0 && (
              <View style={{ marginBottom: 12, padding: 10, backgroundColor: '#f9fafb', borderRadius: 4, borderWidth: 0.5, borderColor: '#e5e7eb' }} wrap={false}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#374151', marginBottom: 8 }}>
                  Top {topEmitters.length} sources d&apos;émissions
                </Text>
                <HorizontalBarsChart items={topEmitters} barHeight={14} gap={5} />
              </View>
            )}

            {/* By-category horizontal bars */}
            {byCategory.length > 0 && (
              <View style={{ padding: 10, backgroundColor: '#f9fafb', borderRadius: 4, borderWidth: 0.5, borderColor: '#e5e7eb' }} wrap={false}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#374151', marginBottom: 8 }}>
                  Émissions par catégorie
                </Text>
                <HorizontalBarsChart items={byCategory} barHeight={14} gap={5} labelMaxLen={26} />
              </View>
            )}
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>GreenLeaves — Rapport d'Audit Expert N° {data.missionNumber}</Text>
            <Text style={styles.footerText}>{sanitize(data.companyName)} · {data.assessmentYear}</Text>
          </View>
        </Page>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Page 3 — Ventilation mensuelle des émissions
         ══════════════════════════════════════════════════════════════════════ */}
      {data.byMonth && data.byMonth.some(m => m.total > 0) && (() => {
        const activeMonths = data.byMonth!.filter(m => m.total > 0)
        const maxTotal = Math.max(...data.byMonth!.map(m => m.total), 0.001)
        const annualScope1 = data.byMonth!.reduce((s, m) => s + m.scope1, 0)
        const annualScope2 = data.byMonth!.reduce((s, m) => s + m.scope2, 0)
        const annualScope3 = data.byMonth!.reduce((s, m) => s + m.scope3, 0)
        const annualTotal  = data.byMonth!.reduce((s, m) => s + m.total,  0)
        return (
          <Page size="A4" style={styles.page}>
            {isCertified && <CertifiedWatermark />}
            <SecondaryHeader data={data} />
            {isCertified && <CertifiedRibbon data={data} />}

            <View style={styles.content}>
              <Text style={styles.sectionTitle}>5. VENTILATION MENSUELLE DES EMISSIONS GES</Text>
              <Text style={{ fontSize: 7.5, color: '#6b7280', marginBottom: 8, marginTop: 2 }}>
                {activeMonths.length} mois avec données sur 12 · Total annuel : {fmtNum(annualTotal)} tCO2e
              </Text>

              {/* Monthly table */}
              <View style={styles.table}>
                {/* Header */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableCellBoldWhite, { flex: 1.2 }]}>Mois</Text>
                  <Text style={[styles.tableCellRightWhite, { flex: 1.4 }]}>Scope 1</Text>
                  <Text style={[styles.tableCellRightWhite, { flex: 1.4 }]}>Scope 2</Text>
                  <Text style={[styles.tableCellRightWhite, { flex: 1.4 }]}>Scope 3</Text>
                  <Text style={[styles.tableCellRightWhite, { flex: 1.4 }]}>Total</Text>
                  <Text style={[styles.tableCellRightWhite, { flex: 0.8 }]}>%</Text>
                  <Text style={[styles.tableCellRightWhite, { flex: 2 }]}>Répartition</Text>
                </View>

                {data.byMonth!.map((m, idx) => {
                  const pct = annualTotal > 0 ? (m.total / annualTotal * 100) : 0
                  const barPct = m.total / maxTotal
                  const isEmpty = m.total === 0
                  return (
                    <View key={m.month} style={[
                      styles.tableRow,
                      idx % 2 === 0 ? {} : { backgroundColor: '#fafafa' },
                      isEmpty ? { opacity: 0.35 } : {},
                    ]}>
                      <Text style={[styles.tableCellBold, { flex: 1.2, fontSize: 7.5 }]}>{m.label}</Text>
                      <Text style={[styles.tableCellRight, { flex: 1.4, fontSize: 7.5, color: '#15803d' }]}>
                        {m.scope1 > 0 ? fmtNum(m.scope1) : '—'}
                      </Text>
                      <Text style={[styles.tableCellRight, { flex: 1.4, fontSize: 7.5, color: '#2563eb' }]}>
                        {m.scope2 > 0 ? fmtNum(m.scope2) : '—'}
                      </Text>
                      <Text style={[styles.tableCellRight, { flex: 1.4, fontSize: 7.5, color: '#d97706' }]}>
                        {m.scope3 > 0 ? fmtNum(m.scope3) : '—'}
                      </Text>
                      <Text style={[styles.tableCellBold, { flex: 1.4, textAlign: 'right', fontSize: 7.5 }]}>
                        {m.total > 0 ? fmtNum(m.total) : '—'}
                      </Text>
                      <Text style={[styles.tableCellRight, { flex: 0.8, fontSize: 7, color: '#9ca3af' }]}>
                        {m.total > 0 ? pct.toFixed(1) + '%' : ''}
                      </Text>
                      {/* Mini bar */}
                      <View style={[{ flex: 2, flexDirection: 'row', alignItems: 'center', paddingRight: 4 }]}>
                        {m.total > 0 && (
                          <View style={{
                            height: 6,
                            width: `${Math.round(barPct * 100)}%` as unknown as number,
                            backgroundColor: '#16a34a',
                            borderRadius: 2,
                          }} />
                        )}
                      </View>
                    </View>
                  )
                })}

                {/* Annual total row */}
                <View style={[styles.tableTotal, { borderTopWidth: 1, borderTopColor: '#d1fae5' }]}>
                  <Text style={[styles.tableCellBold, { flex: 1.2, fontSize: 7.5 }]}>TOTAL ANNUEL</Text>
                  <Text style={[styles.tableCellBold, { flex: 1.4, textAlign: 'right', fontSize: 7.5, color: '#15803d' }]}>
                    {annualScope1 > 0 ? fmtNum(annualScope1) : '—'}
                  </Text>
                  <Text style={[styles.tableCellBold, { flex: 1.4, textAlign: 'right', fontSize: 7.5, color: '#2563eb' }]}>
                    {annualScope2 > 0 ? fmtNum(annualScope2) : '—'}
                  </Text>
                  <Text style={[styles.tableCellBold, { flex: 1.4, textAlign: 'right', fontSize: 7.5, color: '#d97706' }]}>
                    {annualScope3 > 0 ? fmtNum(annualScope3) : '—'}
                  </Text>
                  <Text style={[styles.tableCellBold, { flex: 1.4, textAlign: 'right', fontSize: 7.5 }]}>
                    {fmtNum(annualTotal)}
                  </Text>
                  <Text style={[styles.tableCellBold, { flex: 0.8, textAlign: 'right', fontSize: 7.5 }]}>100%</Text>
                  <View style={{ flex: 2 }} />
                </View>
              </View>

              {/* Scope legend */}
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
                {[
                  { label: 'Scope 1 — Emissions directes',    color: '#15803d', val: annualScope1 },
                  { label: 'Scope 2 — Energie indirecte',     color: '#2563eb', val: annualScope2 },
                  { label: 'Scope 3 — Autres indirectes',     color: '#d97706', val: annualScope3 },
                ].map(s => (
                  <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: s.color }} />
                    <Text style={{ fontSize: 7, color: '#374151' }}>
                      {s.label} — {s.val > 0 ? fmtNum(s.val) + ' tCO2e' : '—'}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Peak month note */}
              {activeMonths.length > 0 && (() => {
                const peak = [...data.byMonth!].sort((a, b) => b.total - a.total)[0]
                return (
                  <View style={{ marginTop: 10, padding: 8, backgroundColor: '#f0fdf4', borderRadius: 3, borderLeftWidth: 2, borderLeftColor: '#16a34a' }}>
                    <Text style={{ fontSize: 7.5, color: '#166534' }}>
                      Mois de pointe : {peak.label} ({fmtNum(peak.total)} tCO2e — {(peak.total / annualTotal * 100).toFixed(1)}% du total annuel)
                    </Text>
                  </View>
                )
              })()}
            </View>

            <View style={styles.footer} fixed>
              <Text style={styles.footerText}>GreenLeaves — Rapport d'Audit Expert N° {data.missionNumber}</Text>
              <Text style={styles.footerText}>{sanitize(data.companyName)} · {data.assessmentYear}</Text>
            </View>
          </Page>
        )
      })()}

      {/* ══════════════════════════════════════════════════════════════════════
          Page 3 — Détail complet des émissions par source
         ══════════════════════════════════════════════════════════════════════ */}
      {data.entries && data.entries.length > 0 && (
        <Page size="A4" style={styles.page}>
          <SecondaryHeader data={data} />

          <View style={styles.content}>
            <Text style={styles.sectionTitle}>6. DETAIL COMPLET DES EMISSIONS GES PAR SOURCE</Text>

            {[1, 2, 3].map(scopeNum => {
              const scopeEntries = data.entries!.filter(e => e.scope === scopeNum)
              if (scopeEntries.length === 0) return null
              const scopeTotal = scopeEntries.reduce((s, e) => s + e.totalCo2eq, 0)
              const scopeLabel = scopeNum === 1
                ? 'SCOPE 1 — Emissions directes'
                : scopeNum === 2
                ? 'SCOPE 2 — Energie indirecte'
                : 'SCOPE 3 — Autres emissions indirectes'

              const catMap: Record<string, EmissionEntry[]> = {}
              for (const e of scopeEntries) {
                if (!catMap[e.category]) catMap[e.category] = []
                catMap[e.category].push(e)
              }

              return (
                <View key={scopeNum} style={{ marginBottom: 14 }}>
                  <View style={styles.scopeHeader}>
                    <Text style={styles.scopeHeaderText}>{scopeLabel}</Text>
                    <Text style={styles.scopeTotal}>{fmtNum(scopeTotal)} tCO2e</Text>
                  </View>
                  <View style={styles.entryTableHeader}>
                    <Text style={[styles.entryThText, { flex: 3 }]}>Source d'emission</Text>
                    <Text style={[styles.entryThText, { flex: 1, textAlign: 'right' }]}>Quantite</Text>
                    <Text style={[styles.entryThText, { flex: 1, textAlign: 'right' }]}>Unite</Text>
                    <Text style={[styles.entryThText, { width: 70, textAlign: 'right' }]}>tCO2e</Text>
                    <Text style={[styles.entryThText, { width: 40, textAlign: 'right' }]}>%</Text>
                  </View>
                  {Object.entries(catMap).map(([cat, catEntries]) => {
                    const catTotal = catEntries.reduce((s, e) => s + e.totalCo2eq, 0)
                    return (
                      <View key={cat}>
                        <View style={styles.catHeader}>
                          <Text style={styles.catHeaderText}>{sanitize(cat)}</Text>
                          <Text style={styles.catTotal}>{fmtNum(catTotal)} tCO2e</Text>
                        </View>
                        {catEntries.map((e, idx) => (
                          <View key={e.id} style={[styles.entryRow, idx % 2 === 1 ? styles.entryRowAlt : {}]}>
                            <Text style={styles.entryCol1}>{sanitize(e.factorName)}</Text>
                            <Text style={styles.entryCol2}>{fmtNum(e.quantity)}</Text>
                            <Text style={styles.entryCol3}>{sanitize(e.unit)}</Text>
                            <Text style={styles.entryCol4}>{fmtNum(e.totalCo2eq)}</Text>
                            <Text style={styles.entryColPct}>
                              {data.totalCo2eq > 0
                                ? (e.totalCo2eq / data.totalCo2eq * 100).toFixed(1) + '%'
                                : '—'}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )
                  })}
                </View>
              )
            })}
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>GreenLeaves — Rapport d'Audit Expert N° {data.missionNumber}</Text>
            <Text style={styles.footerText}>{sanitize(data.companyName)} · {data.assessmentYear}</Text>
          </View>
        </Page>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Page 3 — Checklist Sections 1-3
         ══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <SecondaryHeader data={data} />

        <View style={styles.content}>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. SECTION 1 — ELIGIBILITE ET PERIMETRE REGLEMENTAIRE</Text>
            <CheckItem label="Seuil reglementaire atteint (>=10 000 tCO2e Scope 1+2 — Art.24)" value={cl.eligibility.threshold_met} />
            <CheckItem label="Scope 1 et Scope 2 couverts completement" value={cl.eligibility.scope_1_2_complete} />
            <CheckItem label="Scope 3 inclus si >=50 000 tCO2e (Art.26)" value={cl.eligibility.scope_3_if_required} />
            <CheckItem label="Approche de consolidation justifiee et coherente" value={Boolean(cl.eligibility.approach_confirmed)} />
            <CheckItem label="Entite eligible et soumise a l'obligation de bilan GES" value={cl.eligibility.legal_entity_registered} />
            {cl.eligibility.notes && cl.eligibility.notes !== '—' ? <Text style={styles.checkNotes}>Notes : {sanitize(cl.eligibility.notes)}</Text> : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. SECTION 2 — QUALITE DES DONNEES</Text>
            <CheckItem label="Donnees d'activite documentees et sourcees (factures, compteurs, etc.)" value={cl.data_quality.activity_data_documented} />
            <CheckItem label="Facteurs d'emission issus de sources reconnues (IPCC, GHG Protocol, ISO 14064)" value={cl.data_quality.emission_factors_sourced} />
            <CheckItem label="Niveau d'incertitude acceptable et documente" value={cl.data_quality.uncertainty_acceptable} />
            <CheckItem label="Absence de lacunes significatives dans les donnees" value={cl.data_quality.no_significant_gaps} />
            <CheckItem label="Ventilation mensuelle disponible (si applicable)" value={cl.data_quality.monthly_data_available} />
            <CheckItem label="Pieces justificatives fournies" value={cl.data_quality.supporting_docs_provided} />
            {cl.data_quality.notes && cl.data_quality.notes !== '—' ? <Text style={styles.checkNotes}>Notes : {sanitize(cl.data_quality.notes)}</Text> : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. SECTION 3 — CALCULS ET METHODOLOGIE</Text>
            <CheckItem label="Methode de calcul conforme a ISO 14064-1 et/ou GHG Protocol" value={cl.calculations.method_conforms_iso14064} />
            <CheckItem label="Conversions d'unites correctes et documentees" value={cl.calculations.unit_conversions_correct} />
            <CheckItem label="Totaux par Scope coherents (Scope 1+2+3 = total declare)" value={cl.calculations.scope_totals_consistent} />
            <CheckItem label="Absence de double comptage identifiee" value={cl.calculations.no_double_counting} />
            <CheckItem label="Facteurs d'emission a jour et appropries au contexte gabonais" value={cl.calculations.emission_factors_current} />
            {cl.calculations.notes && cl.calculations.notes !== '—' ? <Text style={styles.checkNotes}>Notes : {sanitize(cl.calculations.notes)}</Text> : null}
          </View>

        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>GreenLeaves — Rapport d'Audit Expert N° {data.missionNumber}</Text>
          <Text style={styles.footerText}>{sanitize(data.companyName)} · {data.assessmentYear}</Text>
        </View>
      </Page>

      {/* ══════════════════════════════════════════════════════════════════════
          Page 4 — Checklist Sections 4-5 + Opinion + Signature
         ══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <SecondaryHeader data={data} />

        <View style={styles.content}>

          {/* ── 8. Site visit ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. SECTION 4 — VISITE DE SITE</Text>
            <CheckItem label="Visite terrain effectuee" value={cl.site_visit.site_visited} />
            {cl.site_visit.site_visited && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date de la visite</Text>
                  <Text style={styles.infoValue}>{fmtDate(cl.site_visit.visit_date)}</Text>
                </View>
                {cl.site_visit.sites_covered?.length > 0 && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Sites visites</Text>
                    <Text style={styles.infoValue}>{sanitize(cl.site_visit.sites_covered.join(', '))}</Text>
                  </View>
                )}
                {cl.site_visit.processes_observed?.length > 0 && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Processus observes</Text>
                    <Text style={styles.infoValue}>{sanitize(cl.site_visit.processes_observed.join(', '))}</Text>
                  </View>
                )}
                <CheckItem label="Incoherences constatees entre site et donnees declarees" value={cl.site_visit.inconsistencies_found} />
                {cl.site_visit.inconsistencies_found && cl.site_visit.inconsistency_details && (
                  <Text style={[styles.checkNotes, { color: '#dc2626' }]}>
                    Detail : {sanitize(cl.site_visit.inconsistency_details)}
                  </Text>
                )}
                <CheckItem label="Photos documentaires prises" value={cl.site_visit.photos_taken} />
              </>
            )}
            {cl.site_visit.notes && cl.site_visit.notes !== '—' ? <Text style={styles.checkNotes}>Notes : {sanitize(cl.site_visit.notes)}</Text> : null}
          </View>

          {/* ── 9. OGEC compliance ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. SECTION 5 — CONFORMITE REGLEMENTAIRE (ORDONNANCE N°019/PR/2021)</Text>
            <CheckItem label="Art.24 — Diagnostic GES conforme aux exigences reglementaires" value={cl.ogec_compliance.article_24_met} />
            <CheckItem label="Art.25 — Contenu du diagnostic complet (methode, FE, donnees, incertitudes)" value={cl.ogec_compliance.article_25_content_complete} />
            <CheckItem label="Art.26 — Plan de surveillance soumis et valide (si applicable)" value={cl.ogec_compliance.article_26_monitoring_plan} />
            <CheckItem label="Declaration de conformite signee par le representant legal" value={cl.ogec_compliance.declaration_conformite_signed} />
            <CheckItem label="Perimetre et donnees coherents avec la declaration officielle" value={cl.ogec_compliance.no_international_transfer_without_cnc} />
            {cl.ogec_compliance.notes && cl.ogec_compliance.notes !== '—' ? <Text style={styles.checkNotes}>Notes : {sanitize(cl.ogec_compliance.notes)}</Text> : null}
          </View>

          {/* ── 10. Opinion — fully dynamic ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>12. OPINION ET RECOMMANDATION DE L'EXPERT</Text>

            {op.overall_assessment && op.overall_assessment !== '—' && (
              <View style={styles.listBlock}>
                <Text style={styles.listTitle}>Constatations principales :</Text>
                <Text style={[styles.listItem, { color: '#1f2937', lineHeight: 1.5 }]}>{sanitize(op.overall_assessment)}</Text>
              </View>
            )}

            {op.conditions?.length > 0 && (
              <View style={styles.listBlock}>
                <Text style={[styles.listTitle, styles.listTitleWarn]}>Reserves et conditions a lever :</Text>
                {op.conditions.map((c, i) => (
                  <Text key={i} style={[styles.listItem, styles.listItemWarn]}>- {sanitize(c)}</Text>
                ))}
              </View>
            )}

            {op.corrections_required?.length > 0 && (
              <View style={styles.listBlock}>
                <Text style={[styles.listTitle, styles.listTitleDanger]}>Corrections requises :</Text>
                {op.corrections_required.map((c, i) => (
                  <Text key={i} style={[styles.listItem, styles.listItemDanger]}>- {sanitize(c)}</Text>
                ))}
              </View>
            )}

            {op.recommendations && op.recommendations !== '—' && (
              <View style={styles.listBlock}>
                <Text style={[styles.listTitle, styles.listTitleOk]}>Recommandations pour l'entreprise :</Text>
                <Text style={[styles.listItem, { color: '#1f2937', lineHeight: 1.5 }]}>{sanitize(op.recommendations)}</Text>
              </View>
            )}
          </View>

          {/* ── Signatures ── */}
          <View style={styles.sigRow}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Fait a Libreville, le {fmtDate(op.expert_signature_date || data.reportDate)}</Text>
              <Text style={{ height: 28 }} />
              <Text style={styles.signatureName}>{sanitize(data.expertName)}</Text>
              <Text style={styles.signatureLabel}>Expert GreenLeaves — Auditeur certifie</Text>
            </View>

            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Pour GreenLeaves</Text>
              <Text style={{ height: 28 }} />
              <Text style={styles.signatureName}>Direction de la Certification</Text>
              <Text style={styles.signatureLabel}>Autorite de certification agreee</Text>
            </View>
          </View>

        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>GreenLeaves — Rapport d'Audit Expert N° {data.missionNumber}</Text>
          <Text style={styles.footerText}>{sanitize(data.companyName)} · {data.assessmentYear}</Text>
        </View>
      </Page>
    </Document>
  )
}

// ─── Generator function ───────────────────────────────────────────────────────

export async function generateExpertReportPDF(data: ExpertReportData): Promise<Buffer> {
  const doc = <ExpertReportDocument data={data} />
  const instance = pdf(doc)
  const blob = await instance.toBlob()
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
