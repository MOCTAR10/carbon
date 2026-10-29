import React from 'react'
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MonitoringRecord {
  activity_type: string
  value: number
  unit: string | null
  notes: string | null
}

export interface MonitoringReportData {
  // Project
  projectId: number
  projectTitle: string
  projectTypeMrv: string | null
  methodologyCode: string
  standard: string
  country: string
  areaHa: number | null
  partnerName: string

  // Period
  periodId: number
  periodStart: string
  periodEnd: string
  periodStatus: string

  // Monitoring records
  records: MonitoringRecord[]

  // MRV results
  baselineTco2: number
  projectEmissions: number
  leakageTco2: number
  netReductions: number
  bufferTons: number
  creditsEligible: number
  calculatedAt: string | null

  // Meta
  generatedAt: string
  reportVersion: string
}

// ─── Palette ─────────────────────────────────────────────────────────────────

const C = {
  green:   '#15803d',
  dkGreen: '#166534',
  ltGreen: '#dcfce7',
  midGreen:'#86efac',
  teal:    '#0f766e',
  ltTeal:  '#ccfbf1',
  gray:    '#6b7280',
  dkGray:  '#111827',
  midGray: '#374151',
  ltGray:  '#f9fafb',
  border:  '#e5e7eb',
  white:   '#ffffff',
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: C.white,
    paddingBottom: 45,
  },
  headerBand: {
    backgroundColor: C.teal,
    paddingHorizontal: 36,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerBrand: { color: C.white, fontSize: 11, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  headerSub: { color: C.ltTeal, fontSize: 8, marginTop: 2 },
  headerDocType: { color: C.ltTeal, fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5 },
  headerVersion: { color: '#99f6e4', fontSize: 7, marginTop: 3 },

  coverArea: {
    backgroundColor: C.ltTeal,
    paddingHorizontal: 36,
    paddingVertical: 20,
    borderBottomWidth: 2,
    borderBottomColor: C.teal,
  },
  coverLabel: { color: C.teal, fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, marginBottom: 5 },
  coverTitle: { color: C.dkGray, fontSize: 16, fontFamily: 'Helvetica-Bold', lineHeight: 1.3 },
  coverPeriod: { color: C.midGray, fontSize: 9, marginTop: 5 },

  body: { paddingHorizontal: 36, paddingTop: 16 },

  sectionHeader: {
    backgroundColor: C.teal,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
    marginTop: 14,
    borderRadius: 2,
  },
  sectionTitle: { color: C.white, fontSize: 9, fontFamily: 'Helvetica-Bold' },

  row2: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  cell: {
    flex: 1,
    backgroundColor: C.ltGray,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 3,
    padding: 8,
  },
  cellLabel: { color: C.gray, fontSize: 7, fontFamily: 'Helvetica-Bold', marginBottom: 3, letterSpacing: 0.5 },
  cellValue: { color: C.dkGray, fontSize: 9 },

  table: { marginBottom: 12 },
  tableHead: { flexDirection: 'row', backgroundColor: C.teal },
  tableHeadCell: { color: C.white, fontSize: 7.5, fontFamily: 'Helvetica-Bold', padding: 5, flex: 1 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border },
  tableRowAlt: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.ltGray },
  tableCell: { color: C.midGray, fontSize: 8, padding: 5, flex: 1 },
  tableCellBold: { color: C.dkGray, fontSize: 8, fontFamily: 'Helvetica-Bold', padding: 5, flex: 1 },
  tableCellGreen: { color: C.green, fontSize: 8, fontFamily: 'Helvetica-Bold', padding: 5, flex: 1 },

  mrvGrid: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  mrvCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    padding: 8,
    alignItems: 'center',
  },
  mrvValue: { color: C.dkGray, fontSize: 11, fontFamily: 'Helvetica-Bold' },
  mrvLabel: { color: C.gray, fontSize: 7, marginTop: 3, textAlign: 'center' },
  mrvCardHighlight: {
    flex: 2,
    borderWidth: 2,
    borderColor: C.green,
    backgroundColor: C.ltGreen,
    borderRadius: 4,
    padding: 8,
    alignItems: 'center',
  },
  mrvValueHighlight: { color: C.dkGreen, fontSize: 14, fontFamily: 'Helvetica-Bold' },
  mrvLabelHighlight: { color: C.green, fontSize: 8, marginTop: 3, textAlign: 'center', fontFamily: 'Helvetica-Bold' },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: C.ltGreen,
    borderWidth: 1,
    borderColor: C.midGreen,
  },
  statusText: { color: C.green, fontSize: 8, fontFamily: 'Helvetica-Bold' },

  noteBox: {
    backgroundColor: C.ltGray,
    borderLeftWidth: 3,
    borderLeftColor: C.teal,
    padding: 10,
    marginBottom: 10,
    borderRadius: 2,
  },
  noteText: { color: C.midGray, fontSize: 8.5, lineHeight: 1.5 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.teal,
    paddingHorizontal: 36,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: { color: C.ltTeal, fontSize: 7 },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, dec = 2) {
  if (n == null) return '—'
  return n.toLocaleString('fr-FR', { maximumFractionDigits: dec })
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

const STATUS_LABELS: Record<string, string> = {
  open:         'Ouverte',
  data_entered: 'Données saisies',
  calculated:   'MRV calculé',
  verified:     'Vérifié',
}

const TYPE_LABELS: Record<string, string> = {
  redd_plus:    'REDD+',
  arr:          'ARR — Boisement / Reboisement',
  reforestation:'Reforestation',
  cookstoves:   'Foyers Améliorés',
  mangrove:     'Restauration Mangroves',
  blue_carbon:  'Carbone Bleu',
  solar:        'Énergie Solaire',
}

const STANDARD_LABELS: Record<string, string> = {
  verra_vcs:     'Verra VCS',
  gold_standard: 'Gold Standard',
  ogec:          'OGEC (Gabon)',
}

function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{num}  {title}</Text>
    </View>
  )
}

function Footer({ date, version }: { date: string; version: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>CarbonTrack — Rapport de Surveillance MRV — Confidentiel</Text>
      <Text style={s.footerText}>{date} · v{version}</Text>
      <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber}/${totalPages}`} />
    </View>
  )
}

// ─── Document ─────────────────────────────────────────────────────────────────

function MonitoringReportDocument({ d }: { d: MonitoringReportData }) {
  const hasResults = d.creditsEligible > 0 || d.netReductions > 0 || d.baselineTco2 > 0

  return (
    <Document>
      {/* ── Page 1: Cover + Project + Period ── */}
      <Page size="A4" style={s.page}>
        <View style={s.headerBand}>
          <View>
            <Text style={s.headerBrand}>CARBONTRACK</Text>
            <Text style={s.headerSub}>Rapport de Surveillance MRV</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.headerDocType}>MONITORING REPORT</Text>
            <Text style={s.headerVersion}>Période #{d.periodId} · v{d.reportVersion}</Text>
          </View>
        </View>

        <View style={s.coverArea}>
          <Text style={s.coverLabel}>RAPPORT DE SURVEILLANCE — MRV CARBONE</Text>
          <Text style={s.coverTitle}>{d.projectTitle}</Text>
          <Text style={s.coverPeriod}>
            Période : {fmtDate(d.periodStart)} → {fmtDate(d.periodEnd)}
            {' '}·{' '}{STANDARD_LABELS[d.standard] ?? d.standard}
            {' '}·{' '}{d.methodologyCode}
          </Text>
        </View>

        <View style={s.body}>
          <SectionHeader num="1" title="INFORMATIONS PROJET" />

          <View style={s.row2}>
            <View style={s.cell}>
              <Text style={s.cellLabel}>PROJET</Text>
              <Text style={s.cellValue}>{d.projectTitle}</Text>
            </View>
            <View style={s.cell}>
              <Text style={s.cellLabel}>PARTENAIRE</Text>
              <Text style={s.cellValue}>{d.partnerName}</Text>
            </View>
          </View>
          <View style={s.row2}>
            <View style={s.cell}>
              <Text style={s.cellLabel}>TYPE</Text>
              <Text style={s.cellValue}>{TYPE_LABELS[d.projectTypeMrv ?? ''] ?? d.projectTypeMrv ?? '—'}</Text>
            </View>
            <View style={s.cell}>
              <Text style={s.cellLabel}>PAYS</Text>
              <Text style={s.cellValue}>{d.country}</Text>
            </View>
            <View style={s.cell}>
              <Text style={s.cellLabel}>SUPERFICIE</Text>
              <Text style={s.cellValue}>{d.areaHa != null ? `${fmt(d.areaHa, 1)} ha` : '—'}</Text>
            </View>
          </View>

          <SectionHeader num="2" title="PÉRIODE DE SURVEILLANCE" />

          <View style={s.row2}>
            <View style={s.cell}>
              <Text style={s.cellLabel}>DÉBUT DE PÉRIODE</Text>
              <Text style={s.cellValue}>{fmtDate(d.periodStart)}</Text>
            </View>
            <View style={s.cell}>
              <Text style={s.cellLabel}>FIN DE PÉRIODE</Text>
              <Text style={s.cellValue}>{fmtDate(d.periodEnd)}</Text>
            </View>
            <View style={s.cell}>
              <Text style={s.cellLabel}>STATUT</Text>
              <Text style={[s.cellValue, { color: C.teal, fontFamily: 'Helvetica-Bold' }]}>
                {STATUS_LABELS[d.periodStatus] ?? d.periodStatus}
              </Text>
            </View>
            <View style={s.cell}>
              <Text style={s.cellLabel}>MÉTHODOLOGIE</Text>
              <Text style={s.cellValue}>{d.methodologyCode}</Text>
            </View>
          </View>

          <SectionHeader num="3" title="DONNÉES D'ACTIVITÉ COLLECTÉES" />

          {d.records.length === 0 ? (
            <View style={s.noteBox}>
              <Text style={s.noteText}>Aucune donnée d{'\u2019'}activité enregistrée pour cette période.</Text>
            </View>
          ) : (
            <View style={s.table}>
              <View style={s.tableHead}>
                <Text style={[s.tableHeadCell, { flex: 2 }]}>Type d{'\u2019'}activité</Text>
                <Text style={s.tableHeadCell}>Valeur</Text>
                <Text style={s.tableHeadCell}>Unité</Text>
                <Text style={[s.tableHeadCell, { flex: 2 }]}>Notes</Text>
              </View>
              {d.records.map((r, i) => (
                <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                  <Text style={[s.tableCellBold, { flex: 2 }]}>{r.activity_type.replace(/_/g, ' ')}</Text>
                  <Text style={s.tableCell}>{fmt(r.value)}</Text>
                  <Text style={s.tableCell}>{r.unit ?? '—'}</Text>
                  <Text style={[s.tableCell, { flex: 2 }]}>{r.notes ?? ''}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Footer date={d.generatedAt} version={d.reportVersion} />
      </Page>

      {/* ── Page 2: MRV Results ── */}
      <Page size="A4" style={s.page}>
        <View style={s.headerBand}>
          <View>
            <Text style={s.headerBrand}>CARBONTRACK · MONITORING REPORT</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.headerVersion}>{d.projectTitle}</Text>
          </View>
        </View>

        <View style={s.body}>
          <SectionHeader num="4" title="RÉSULTATS MRV — QUANTIFICATION DES RÉDUCTIONS" />

          {!hasResults ? (
            <View style={s.noteBox}>
              <Text style={s.noteText}>
                Le calcul MRV n{'\u2019'}a pas encore été effectué pour cette période. Veuillez saisir les données d{'\u2019'}activité et lancer le calcul depuis la plateforme CarbonTrack.
              </Text>
            </View>
          ) : (
            <>
              {/* KPI Grid */}
              <View style={s.mrvGrid}>
                <View style={s.mrvCard}>
                  <Text style={s.mrvValue}>{fmt(d.baselineTco2)}</Text>
                  <Text style={s.mrvLabel}>Baseline (tCO₂e)</Text>
                </View>
                <View style={s.mrvCard}>
                  <Text style={s.mrvValue}>{fmt(d.projectEmissions)}</Text>
                  <Text style={s.mrvLabel}>Émissions projet</Text>
                </View>
                <View style={s.mrvCard}>
                  <Text style={s.mrvValue}>{fmt(d.leakageTco2)}</Text>
                  <Text style={s.mrvLabel}>Fuites</Text>
                </View>
              </View>
              <View style={s.mrvGrid}>
                <View style={s.mrvCard}>
                  <Text style={s.mrvValue}>{fmt(d.netReductions)}</Text>
                  <Text style={s.mrvLabel}>Réductions nettes</Text>
                </View>
                <View style={s.mrvCard}>
                  <Text style={s.mrvValue}>{fmt(d.bufferTons)}</Text>
                  <Text style={s.mrvLabel}>Pool tampon</Text>
                </View>
                <View style={s.mrvCardHighlight}>
                  <Text style={s.mrvValueHighlight}>{fmt(d.creditsEligible)} tCO₂e</Text>
                  <Text style={s.mrvLabelHighlight}>Crédits carbone éligibles</Text>
                </View>
              </View>

              {/* Calculation breakdown */}
              <View style={s.table}>
                <View style={s.tableHead}>
                  <Text style={[s.tableHeadCell, { flex: 2 }]}>Composante</Text>
                  <Text style={s.tableHeadCell}>Formule</Text>
                  <Text style={s.tableHeadCell}>Valeur (tCO₂e)</Text>
                  <Text style={s.tableHeadCell}>% du baseline</Text>
                </View>
                {[
                  { comp: 'Baseline', formula: 'Paramètres × méthodo', val: d.baselineTco2, pct: null },
                  { comp: 'Émissions projet', formula: 'EP', val: d.projectEmissions, pct: d.baselineTco2 > 0 ? d.projectEmissions / d.baselineTco2 * 100 : 0 },
                  { comp: 'Fuites (leakage)', formula: 'Baseline × leakage%', val: d.leakageTco2, pct: d.baselineTco2 > 0 ? d.leakageTco2 / d.baselineTco2 * 100 : 0 },
                  { comp: 'Réductions nettes', formula: 'Base − EP − L', val: d.netReductions, pct: d.baselineTco2 > 0 ? d.netReductions / d.baselineTco2 * 100 : 0 },
                  { comp: 'Pool tampon', formula: 'Net × buffer%', val: d.bufferTons, pct: d.netReductions > 0 ? d.bufferTons / d.netReductions * 100 : 0 },
                  { comp: 'Crédits éligibles', formula: 'Net − Buffer', val: d.creditsEligible, pct: d.baselineTco2 > 0 ? d.creditsEligible / d.baselineTco2 * 100 : 0 },
                ].map((r, i) => (
                  <View key={r.comp} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                    <Text style={[r.comp === 'Crédits éligibles' ? s.tableCellGreen : s.tableCellBold, { flex: 2 }]}>{r.comp}</Text>
                    <Text style={s.tableCell}>{r.formula}</Text>
                    <Text style={r.comp === 'Crédits éligibles' ? s.tableCellGreen : s.tableCell}>{fmt(r.val)}</Text>
                    <Text style={s.tableCell}>{r.pct != null ? `${fmt(r.pct, 1)}%` : '—'}</Text>
                  </View>
                ))}
              </View>

              {d.calculatedAt && (
                <Text style={[s.noteText, { marginBottom: 8 }]}>
                  Calcul effectué le {new Date(d.calculatedAt).toLocaleDateString('fr-FR')} via le moteur MRV CarbonTrack.
                </Text>
              )}
            </>
          )}

          <SectionHeader num="5" title="CONCLUSIONS ET RECOMMANDATIONS" />

          <View style={s.noteBox}>
            <Text style={[s.cellLabel, { marginBottom: 5 }]}>RÉSUMÉ DE LA PÉRIODE</Text>
            <Text style={s.noteText}>
              {hasResults
                ? `Sur la période ${fmtDate(d.periodStart)} → ${fmtDate(d.periodEnd)}, le projet "${d.projectTitle}" a généré ${fmt(d.creditsEligible)} tCO₂e de crédits carbone éligibles selon la méthodologie ${d.methodologyCode}. Les réductions nettes s'élèvent à ${fmt(d.netReductions)} tCO₂e, après déduction des émissions projet (${fmt(d.projectEmissions)} tCO₂e), des fuites (${fmt(d.leakageTco2)} tCO₂e) et du pool tampon (${fmt(d.bufferTons)} tCO₂e).`
                : `Rapport de surveillance pour la période ${fmtDate(d.periodStart)} → ${fmtDate(d.periodEnd)}. Le calcul MRV est en attente de données d'activité.`}
            </Text>
          </View>

          {/* Signature block */}
          <View style={[s.row2, { marginTop: 28 }]}>
            <View style={[s.cell, { paddingTop: 36 }]}>
              <View style={{ borderTopWidth: 1, borderTopColor: C.gray, paddingTop: 6 }}>
                <Text style={s.cellLabel}>PARTENAIRE / DÉVELOPPEUR</Text>
                <Text style={s.cellValue}>{d.partnerName}</Text>
              </View>
            </View>
            <View style={[s.cell, { paddingTop: 36 }]}>
              <View style={{ borderTopWidth: 1, borderTopColor: C.gray, paddingTop: 6 }}>
                <Text style={s.cellLabel}>VÉRIFICATEUR (VVB)</Text>
                <Text style={[s.cellValue, { color: C.gray }]}>À désigner — validation requise</Text>
              </View>
            </View>
          </View>

          <View style={[s.noteBox, { marginTop: 14, borderLeftColor: '#1d4ed8', backgroundColor: '#dbeafe' }]}>
            <Text style={[s.noteText, { color: '#1e40af' }]}>
              Ce rapport de surveillance est généré automatiquement par la plateforme CarbonTrack. Il doit être soumis à un VVB accrédité pour vérification avant émission officielle des crédits carbone.
            </Text>
          </View>
        </View>

        <Footer date={d.generatedAt} version={d.reportVersion} />
      </Page>
    </Document>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function generateMonitoringReportPDF(data: MonitoringReportData): Promise<Buffer> {
  const blob = await pdf(<MonitoringReportDocument d={data} />).toBlob()
  const ab = await blob.arrayBuffer()
  return Buffer.from(ab)
}
