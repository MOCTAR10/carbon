import React from 'react'
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PDDData {
  // Project identity
  projectId: number
  projectTitle: string
  projectType: string
  projectTypeMrv: string | null
  methodologyCode: string
  methodologyName: string
  standard: string
  country: string
  locationName: string | null
  areaHa: number | null
  startDate: string | null
  endDate: string | null
  description: string | null
  partnerName: string

  // Baseline
  baselineTco2Yr: number | null
  baselineParameters: Record<string, number | string>
  additionnality: Record<string, boolean> | null
  baselineNotes: string | null
  baselineCalculatedAt: string | null

  // Latest MRV period (optional)
  latestPeriodStart: string | null
  latestPeriodEnd: string | null
  baselineTco2: number
  projectEmissions: number
  leakageTco2: number
  netReductions: number
  bufferTons: number
  creditsEligible: number

  // Meta
  generatedAt: string
  pddVersion: string
}

// ─── Palette ─────────────────────────────────────────────────────────────────

const C = {
  green:    '#15803d',
  dkGreen:  '#166534',
  ltGreen:  '#dcfce7',
  midGreen: '#86efac',
  blue:     '#1d4ed8',
  ltBlue:   '#dbeafe',
  gray:     '#6b7280',
  dkGray:   '#111827',
  midGray:  '#374151',
  ltGray:   '#f9fafb',
  border:   '#e5e7eb',
  white:    '#ffffff',
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: C.white,
    paddingBottom: 45,
  },
  // Header band
  headerBand: {
    backgroundColor: C.dkGreen,
    paddingHorizontal: 36,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: { flex: 1 },
  headerBrand: { color: C.white, fontSize: 11, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  headerSub: { color: C.midGreen, fontSize: 8, marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  headerDocType: { color: C.midGreen, fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5 },
  headerVersion: { color: '#86efac', fontSize: 7, marginTop: 3 },

  // Cover title area
  coverArea: {
    backgroundColor: C.ltGreen,
    paddingHorizontal: 36,
    paddingVertical: 22,
    borderBottomWidth: 2,
    borderBottomColor: C.green,
  },
  coverType: { color: C.green, fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, marginBottom: 6 },
  coverTitle: { color: C.dkGray, fontSize: 18, fontFamily: 'Helvetica-Bold', lineHeight: 1.3 },
  coverMeta: { color: C.midGray, fontSize: 8.5, marginTop: 6 },

  // Body
  body: { paddingHorizontal: 36, paddingTop: 18 },

  // Section header
  sectionHeader: {
    backgroundColor: C.green,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
    marginTop: 16,
    borderRadius: 2,
  },
  sectionTitle: { color: C.white, fontSize: 9, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
  sectionNum: { color: C.midGreen, fontSize: 8, marginRight: 6 },

  // 2-col grid
  row2: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  cell: { flex: 1, backgroundColor: C.ltGray, borderWidth: 1, borderColor: C.border, borderRadius: 3, padding: 8 },
  cellLabel: { color: C.gray, fontSize: 7, fontFamily: 'Helvetica-Bold', marginBottom: 3, letterSpacing: 0.5 },
  cellValue: { color: C.dkGray, fontSize: 9 },

  // Table
  table: { marginBottom: 10 },
  tableHead: { flexDirection: 'row', backgroundColor: C.dkGreen },
  tableHeadCell: { color: C.white, fontSize: 7.5, fontFamily: 'Helvetica-Bold', padding: 5, flex: 1 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border },
  tableRowAlt: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.ltGray },
  tableCell: { color: C.midGray, fontSize: 8, padding: 5, flex: 1 },
  tableCellBold: { color: C.dkGray, fontSize: 8, fontFamily: 'Helvetica-Bold', padding: 5, flex: 1 },
  tableCellGreen: { color: C.green, fontSize: 8, fontFamily: 'Helvetica-Bold', padding: 5, flex: 1 },

  // Additionality check
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, paddingHorizontal: 2 },
  checkBox: { width: 12, height: 12, borderWidth: 1, borderColor: C.border, borderRadius: 2, marginRight: 8, alignItems: 'center', justifyContent: 'center' },
  checkBoxPassed: { backgroundColor: C.green, borderColor: C.green },
  checkMark: { color: C.white, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  checkLabel: { color: C.midGray, fontSize: 8.5, flex: 1 },

  // MRV summary card
  mrvGrid: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  mrvCard: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 8, alignItems: 'center' },
  mrvValue: { color: C.dkGray, fontSize: 12, fontFamily: 'Helvetica-Bold' },
  mrvLabel: { color: C.gray, fontSize: 7, marginTop: 2, textAlign: 'center' },
  mrvCardGreen: { flex: 1, borderWidth: 1.5, borderColor: C.green, backgroundColor: C.ltGreen, borderRadius: 4, padding: 8, alignItems: 'center' },
  mrvValueGreen: { color: C.dkGreen, fontSize: 13, fontFamily: 'Helvetica-Bold' },

  // Monitoring table row
  monRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 5, paddingHorizontal: 2 },
  monCell: { fontSize: 8, color: C.midGray, flex: 1 },
  monHead: { fontSize: 7.5, color: C.white, fontFamily: 'Helvetica-Bold', flex: 1, padding: 5 },

  // Note / description block
  noteBox: {
    backgroundColor: C.ltGray, borderLeftWidth: 3, borderLeftColor: C.green,
    padding: 10, marginBottom: 10, borderRadius: 2,
  },
  noteText: { color: C.midGray, fontSize: 8.5, lineHeight: 1.5 },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.dkGreen,
    paddingHorizontal: 36,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: { color: C.midGreen, fontSize: 7 },
  pageNum: { color: C.midGreen, fontSize: 7 },
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

const STANDARD_LABELS: Record<string, string> = {
  verra_vcs:     'Verra VCS (Verified Carbon Standard)',
  gold_standard: 'Gold Standard for the Global Goals',
  ogec:          'OGEC — Ordonnance N°019/PR/2021 (Gabon)',
}

const TYPE_LABELS: Record<string, string> = {
  redd_plus:    'REDD+ — Conservation des Forêts',
  arr:          'ARR — Boisement / Reboisement',
  reforestation:'Reforestation',
  cookstoves:   'Foyers Améliorés (Cookstoves)',
  mangrove:     'Restauration de Mangroves',
  blue_carbon:  'Carbone Bleu',
  solar:        'Énergie Solaire',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>
        <Text style={s.sectionNum}>{num}  </Text>{title}
      </Text>
    </View>
  )
}

function Cell2({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.cell}>
      <Text style={s.cellLabel}>{label}</Text>
      <Text style={s.cellValue}>{value}</Text>
    </View>
  )
}

function Footer({ date, version }: { date: string; version: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>CarbonTrack — Document généré automatiquement — Confidentiel</Text>
      <Text style={s.footerText}>{date} · v{version}</Text>
      <Text style={s.pageNum} render={({ pageNumber, totalPages }) => `Page ${pageNumber}/${totalPages}`} />
    </View>
  )
}

// ─── Main Document ────────────────────────────────────────────────────────────

function PDDDocument({ d }: { d: PDDData }) {
  const additionality = d.additionnality ?? {}
  const barriersPassed = Object.values(additionality).filter(Boolean).length
  const addPassed = barriersPassed >= 2

  const params = d.baselineParameters ?? {}

  const monitoringParams = [
    { param: 'Superficie du projet', freq: 'Annuelle', resp: 'Partenaire NGO' },
    { param: 'Taux de déforestation / séquestration', freq: 'Annuelle', resp: 'Partenaire NGO' },
    { param: 'Émissions directes du projet', freq: 'Annuelle', resp: 'Partenaire NGO' },
    { param: 'Facteurs d\'émission locaux', freq: 'Tous les 5 ans', resp: 'Vérificateur VVB' },
    { param: 'Données socio-économiques (bénéficiaires)', freq: 'Annuelle', resp: 'Partenaire NGO' },
    { param: 'Pool tampon (buffer)', freq: 'Par période MRV', resp: 'CarbonTrack' },
  ]

  return (
    <Document>
      {/* ── Page 1: Cover + Project Details ── */}
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.headerBand}>
          <View style={s.headerLeft}>
            <Text style={s.headerBrand}>CARBONTRACK</Text>
            <Text style={s.headerSub}>Plateforme MRV Carbone · Gabon</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerDocType}>PROJECT DESIGN DOCUMENT</Text>
            <Text style={s.headerVersion}>v{d.pddVersion} · #{d.projectId}</Text>
          </View>
        </View>

        {/* Cover title */}
        <View style={s.coverArea}>
          <Text style={s.coverType}>{TYPE_LABELS[d.projectTypeMrv ?? ''] ?? d.projectType}</Text>
          <Text style={s.coverTitle}>{d.projectTitle}</Text>
          <Text style={s.coverMeta}>
            {STANDARD_LABELS[d.standard] ?? d.standard}  ·  {d.methodologyCode}  ·  {d.country}
          </Text>
        </View>

        {/* Body */}
        <View style={s.body}>
          <SectionHeader num="1" title="IDENTIFICATION DU PROJET" />

          <View style={s.row2}>
            <Cell2 label="Intitulé du projet" value={d.projectTitle} />
            <Cell2 label="Développeur / Partenaire" value={d.partnerName} />
          </View>
          <View style={s.row2}>
            <Cell2 label="Type de projet" value={TYPE_LABELS[d.projectTypeMrv ?? ''] ?? d.projectType} />
            <Cell2 label="Pays / Région" value={`${d.country}${d.locationName ? ' — ' + d.locationName : ''}`} />
          </View>
          <View style={s.row2}>
            <Cell2 label="Standard de certification" value={STANDARD_LABELS[d.standard] ?? d.standard} />
            <Cell2 label="Code méthodologie" value={`${d.methodologyCode} — ${d.methodologyName}`} />
          </View>
          <View style={s.row2}>
            <Cell2 label="Superficie" value={d.areaHa != null ? `${fmt(d.areaHa, 1)} ha` : '—'} />
            <Cell2 label="Période de crédit" value={`${fmtDate(d.startDate)} → ${fmtDate(d.endDate)}`} />
          </View>

          <SectionHeader num="2" title="DESCRIPTION DE L'ACTIVITÉ PROJET" />

          <View style={s.noteBox}>
            <Text style={s.noteText}>
              {d.description
                ? d.description
                : `Ce projet de type "${TYPE_LABELS[d.projectTypeMrv ?? ''] ?? d.projectType}" est développé au ${d.country} dans le cadre du standard ${STANDARD_LABELS[d.standard] ?? d.standard}, en application de la méthodologie ${d.methodologyCode}. Il vise à réduire ou séquestrer des émissions de gaz à effet de serre de manière mesurable, reportable et vérifiable (MRV).`}
            </Text>
          </View>
        </View>

        <Footer date={d.generatedAt} version={d.pddVersion} />
      </Page>

      {/* ── Page 2: Methodology + Baseline ── */}
      <Page size="A4" style={s.page}>
        <View style={s.headerBand}>
          <View style={s.headerLeft}>
            <Text style={s.headerBrand}>CARBONTRACK · PDD</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerVersion}>{d.projectTitle}</Text>
          </View>
        </View>

        <View style={s.body}>
          <SectionHeader num="3" title="APPLICATION DE LA MÉTHODOLOGIE" />

          <View style={s.row2}>
            <Cell2 label="Méthodologie" value={d.methodologyCode} />
            <Cell2 label="Nom complet" value={d.methodologyName} />
          </View>
          <View style={s.row2}>
            <Cell2 label="Organisme" value={STANDARD_LABELS[d.standard] ?? d.standard} />
            <Cell2 label="Conditions d'applicabilité" value="Vérifiées par l'équipe projet" />
          </View>

          <SectionHeader num="4" title="SCÉNARIO DE RÉFÉRENCE (BASELINE)" />

          {/* Parameters table */}
          <View style={s.table}>
            <View style={s.tableHead}>
              <Text style={[s.tableHeadCell, { flex: 2 }]}>Paramètre</Text>
              <Text style={s.tableHeadCell}>Valeur</Text>
              <Text style={s.tableHeadCell}>Source</Text>
            </View>
            {Object.entries(params).map(([key, val], i) => (
              <View key={key} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={[s.tableCell, { flex: 2 }]}>{key.replace(/_/g, ' ')}</Text>
                <Text style={s.tableCellBold}>{String(val)}</Text>
                <Text style={s.tableCell}>Données terrain</Text>
              </View>
            ))}
            <View style={[s.tableRow, { backgroundColor: C.ltGreen }]}>
              <Text style={[s.tableCellBold, { flex: 2 }]}>Baseline annuel calculé</Text>
              <Text style={s.tableCellGreen}>{fmt(d.baselineTco2Yr)} tCO₂e/an</Text>
              <Text style={s.tableCell}>Calcul {d.methodologyCode}</Text>
            </View>
          </View>

          {d.baselineNotes && (
            <View style={s.noteBox}>
              <Text style={[s.cellLabel, { marginBottom: 4 }]}>NOTES BASELINE</Text>
              <Text style={s.noteText}>{d.baselineNotes}</Text>
            </View>
          )}

          <SectionHeader num="4.1" title="TEST D'ADDITIONNALITÉ" />

          <View style={{ marginBottom: 10 }}>
            {[
              { key: 'barrier_investment', label: 'Barrière financière / investissement — le projet n\'est pas la solution la plus rentable sans crédits carbone' },
              { key: 'barrier_regulatory', label: 'Barrière réglementaire / technique — absence de cadre légal obligeant l\'activité sans le mécanisme carbone' },
              { key: 'barrier_social',     label: 'Barrière sociale / institutionnelle — obstacles communautaires, organisationnels ou de capacité levés par le projet' },
            ].map(b => {
              const passed = !!additionality[b.key]
              return (
                <View key={b.key} style={s.checkRow}>
                  <View style={[s.checkBox, passed ? s.checkBoxPassed : {}]}>
                    {passed && <Text style={s.checkMark}>✓</Text>}
                  </View>
                  <Text style={s.checkLabel}>{b.label}</Text>
                </View>
              )
            })}
            <View style={[s.noteBox, { marginTop: 8 }]}>
              <Text style={[s.noteText, { color: addPassed ? C.green : '#b91c1c', fontFamily: 'Helvetica-Bold' }]}>
                Verdict additionnalité : {addPassed
                  ? `CONFORME — ${barriersPassed}/3 barrières passées (seuil ≥ 2)`
                  : `NON CONFORME — ${barriersPassed}/3 barrières passées (seuil ≥ 2 requis)`}
              </Text>
            </View>
          </View>
        </View>

        <Footer date={d.generatedAt} version={d.pddVersion} />
      </Page>

      {/* ── Page 3: MRV + Monitoring Plan + Safeguards ── */}
      <Page size="A4" style={s.page}>
        <View style={s.headerBand}>
          <View style={s.headerLeft}>
            <Text style={s.headerBrand}>CARBONTRACK · PDD</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerVersion}>{d.projectTitle}</Text>
          </View>
        </View>

        <View style={s.body}>
          <SectionHeader num="5" title="QUANTIFICATION DES RÉDUCTIONS D'ÉMISSIONS" />

          {d.latestPeriodStart ? (
            <>
              <Text style={[s.cellLabel, { marginBottom: 8 }]}>
                Période de référence : {fmtDate(d.latestPeriodStart)} → {fmtDate(d.latestPeriodEnd)}
              </Text>
              <View style={s.mrvGrid}>
                <View style={s.mrvCard}>
                  <Text style={s.mrvValue}>{fmt(d.baselineTco2)}</Text>
                  <Text style={s.mrvLabel}>tCO₂e Baseline</Text>
                </View>
                <View style={s.mrvCard}>
                  <Text style={s.mrvValue}>{fmt(d.projectEmissions)}</Text>
                  <Text style={s.mrvLabel}>Émissions projet</Text>
                </View>
                <View style={s.mrvCard}>
                  <Text style={s.mrvValue}>{fmt(d.leakageTco2)}</Text>
                  <Text style={s.mrvLabel}>Fuites (leakage)</Text>
                </View>
                <View style={s.mrvCard}>
                  <Text style={s.mrvValue}>{fmt(d.bufferTons)}</Text>
                  <Text style={s.mrvLabel}>Pool tampon</Text>
                </View>
              </View>
              <View style={[s.mrvGrid, { marginBottom: 14 }]}>
                <View style={s.mrvCard}>
                  <Text style={s.mrvValue}>{fmt(d.netReductions)}</Text>
                  <Text style={s.mrvLabel}>Réductions nettes</Text>
                </View>
                <View style={[s.mrvCardGreen, { flex: 2 }]}>
                  <Text style={s.mrvValueGreen}>{fmt(d.creditsEligible)} tCO₂e</Text>
                  <Text style={[s.mrvLabel, { color: C.dkGreen }]}>Crédits carbone éligibles</Text>
                </View>
              </View>

              {/* Calculation details table */}
              <View style={s.table}>
                <View style={s.tableHead}>
                  <Text style={[s.tableHeadCell, { flex: 2 }]}>Composante</Text>
                  <Text style={s.tableHeadCell}>Formule</Text>
                  <Text style={s.tableHeadCell}>Valeur (tCO₂e)</Text>
                </View>
                {[
                  { comp: 'Baseline émissions', formula: 'Paramètres × méthodologie', val: d.baselineTco2 },
                  { comp: 'Émissions projet (EP)', formula: 'Activités directes', val: d.projectEmissions },
                  { comp: 'Fuites (L)', formula: 'Baseline × leakage_%', val: d.leakageTco2 },
                  { comp: 'Réductions nettes', formula: 'Baseline − EP − L', val: d.netReductions },
                  { comp: 'Pool tampon', formula: 'Net × buffer_%', val: d.bufferTons },
                  { comp: 'Crédits éligibles', formula: 'Net − Buffer', val: d.creditsEligible },
                ].map((r, i) => (
                  <View key={r.comp} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                    <Text style={[s.tableCellBold, { flex: 2 }]}>{r.comp}</Text>
                    <Text style={s.tableCell}>{r.formula}</Text>
                    <Text style={r.comp === 'Crédits éligibles' ? s.tableCellGreen : s.tableCell}>
                      {fmt(r.val)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={s.noteBox}>
              <Text style={s.noteText}>
                Aucune période de suivi calculée. Les quantifications seront disponibles après la première période MRV.
              </Text>
            </View>
          )}

          <SectionHeader num="6" title="PLAN DE SURVEILLANCE (MONITORING)" />

          <View style={s.table}>
            <View style={s.tableHead}>
              <Text style={[s.monHead, { flex: 2 }]}>Paramètre surveillé</Text>
              <Text style={s.monHead}>Fréquence</Text>
              <Text style={s.monHead}>Responsable</Text>
            </View>
            {monitoringParams.map((mp, i) => (
              <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={[s.tableCell, { flex: 2 }]}>{mp.param}</Text>
                <Text style={s.tableCell}>{mp.freq}</Text>
                <Text style={s.tableCell}>{mp.resp}</Text>
              </View>
            ))}
          </View>

          <SectionHeader num="7" title="GARANTIES ENVIRONNEMENTALES ET SOCIALES" />

          <View style={s.row2}>
            <View style={s.cell}>
              <Text style={s.cellLabel}>GARANTIES ENVIRONNEMENTALES</Text>
              <Text style={s.noteText}>• Absence d{'\u2019'}impact négatif sur la biodiversité locale{'\n'}• Pas de recours aux pesticides chimiques interdits{'\n'}• Gestion durable des ressources en eau{'\n'}• Restauration des espèces autochtones privilégiée</Text>
            </View>
            <View style={s.cell}>
              <Text style={s.cellLabel}>GARANTIES SOCIALES</Text>
              <Text style={s.noteText}>• Consultation des communautés locales préalable{'\n'}• Mécanisme de partage des bénéfices documenté{'\n'}• Pas de déplacement involontaire de populations{'\n'}• Respect des droits fonciers coutumiers</Text>
            </View>
          </View>
        </View>

        <Footer date={d.generatedAt} version={d.pddVersion} />
      </Page>

      {/* ── Page 4: Validation + Signatures ── */}
      <Page size="A4" style={s.page}>
        <View style={s.headerBand}>
          <View style={s.headerLeft}>
            <Text style={s.headerBrand}>CARBONTRACK · PDD</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerVersion}>{d.projectTitle}</Text>
          </View>
        </View>

        <View style={s.body}>
          <SectionHeader num="8" title="STATUT DE VALIDATION ET ENREGISTREMENT" />

          <View style={s.row2}>
            <Cell2 label="Statut de validation" value="En cours de préparation / soumission" />
            <Cell2 label="Organisme de validation (VVB)" value="À désigner" />
          </View>
          <View style={s.row2}>
            <Cell2 label="Référence registre" value="Attribuée après validation" />
            <Cell2 label="Date de génération PDD" value={d.generatedAt} />
          </View>

          <View style={[s.noteBox, { marginTop: 8 }]}>
            <Text style={[s.cellLabel, { marginBottom: 4 }]}>DÉCLARATION DU DÉVELOPPEUR</Text>
            <Text style={s.noteText}>
              Le soussigné certifie que les informations contenues dans ce Project Design Document sont exactes, complètes et conformes aux exigences de la méthodologie {d.methodologyCode} et du standard {STANDARD_LABELS[d.standard] ?? d.standard}. Ce document a été préparé en vue de la validation et de l{'\u2019'}enregistrement du projet auprès de l{'\u2019'}organisme de certification compétent.
            </Text>
          </View>

          {/* Signature blocks */}
          <View style={[s.row2, { marginTop: 24 }]}>
            <View style={[s.cell, { paddingTop: 40 }]}>
              <View style={{ borderTopWidth: 1, borderTopColor: C.gray, paddingTop: 6 }}>
                <Text style={s.cellLabel}>DÉVELOPPEUR DE PROJET</Text>
                <Text style={s.cellValue}>{d.partnerName}</Text>
              </View>
            </View>
            <View style={[s.cell, { paddingTop: 40 }]}>
              <View style={{ borderTopWidth: 1, borderTopColor: C.gray, paddingTop: 6 }}>
                <Text style={s.cellLabel}>PLATEFORME CARBONTRACK</Text>
                <Text style={s.cellValue}>Direction Technique</Text>
              </View>
            </View>
          </View>

          {/* Disclaimer */}
          <View style={[s.noteBox, { marginTop: 20, backgroundColor: C.ltBlue, borderLeftColor: C.blue }]}>
            <Text style={[s.noteText, { color: C.blue }]}>
              Ce document est généré automatiquement par la plateforme CarbonTrack à partir des données saisies par le partenaire. Il constitue une ébauche de PDD et doit être complété et validé par un organisme de validation accrédité (VVB) avant soumission au registre {STANDARD_LABELS[d.standard] ?? d.standard}.
            </Text>
          </View>
        </View>

        <Footer date={d.generatedAt} version={d.pddVersion} />
      </Page>
    </Document>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function generatePDDPDF(data: PDDData): Promise<Buffer> {
  const blob = await pdf(<PDDDocument d={data} />).toBlob()
  const ab = await blob.arrayBuffer()
  return Buffer.from(ab)
}
