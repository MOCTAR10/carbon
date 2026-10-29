import React from 'react'
import { Document, Page, Text, View, Image, StyleSheet, pdf } from '@react-pdf/renderer'

// "Fiche de suivi" — tracking sheet for a company's certification request.
// Not a certificate: the official certificate is issued by the CNC and uploaded by the expert.

export interface SuiviStep {
  label: string
  done: boolean
  date: string | null
  detail?: string | null
}

export interface SuiviDemandeData {
  certId: number
  statusLabel: string
  rejected: boolean
  rejectionReason: string | null
  companyName: string
  companyRccm: string
  companySector: string
  assessmentName: string
  assessmentYear: number
  siteName: string
  totalCo2eq: number
  scope1: number
  scope2: number
  scope3: number
  expertName: string | null
  certificateNumber: string | null
  steps: SuiviStep[]
  generatedAt: string
  greenLeavesLogoDataUrl: string | null
}

const GREEN = '#166534'
const GREY = '#6b7280'

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: GREEN, paddingBottom: 12, marginBottom: 18 },
  logo: { height: 34 },
  brand: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: GREEN },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  subtitle: { fontSize: 9, color: GREY, textAlign: 'right', marginTop: 2 },
  statusBox: { borderWidth: 1, borderRadius: 4, padding: 10, marginBottom: 16 },
  statusOk: { borderColor: GREEN, backgroundColor: '#f0fdf4' },
  statusRejected: { borderColor: '#b91c1c', backgroundColor: '#fef2f2' },
  statusLabel: { fontSize: 9, color: GREY },
  statusValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: GREEN, marginBottom: 6, textTransform: 'uppercase' },
  row: { flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
  rowLabel: { width: '40%', color: GREY },
  rowValue: { width: '60%', fontFamily: 'Helvetica-Bold' },
  step: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 1, marginRight: 8 },
  dotDone: { backgroundColor: GREEN },
  dotTodo: { backgroundColor: '#d1d5db' },
  stepLabel: { fontFamily: 'Helvetica-Bold' },
  stepMeta: { fontSize: 9, color: GREY, marginTop: 1 },
  notice: { marginTop: 10, padding: 10, backgroundColor: '#f9fafb', borderRadius: 4, fontSize: 8.5, color: GREY, lineHeight: 1.4 },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 8, color: GREY, textAlign: 'center' },
})

function fmtDate(d: string | null) {
  if (!d) return '—'
  const date = new Date(d)
  return isNaN(date.getTime()) ? d : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// Emission totals are stored in kgCO2e
function fmtT(kg: number) {
  return `${(kg / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 }).replace(/[  ]/g, ' ')} tCO2e`
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  )
}

function SuiviDemandeDocument({ d }: { d: SuiviDemandeData }) {
  return (
    <Document title={`Suivi de demande de certification #${d.certId}`} author="GreenLeaves — CarbonTrack">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {/* react-pdf <Image> has no alt attribute */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          {d.greenLeavesLogoDataUrl ? <Image src={d.greenLeavesLogoDataUrl} style={s.logo} /> : <Text style={s.brand}>GreenLeaves</Text>}
          <View>
            <Text style={s.title}>Fiche de suivi de demande</Text>
            <Text style={s.subtitle}>Certification du bilan carbone — Demande n° {d.certId}</Text>
          </View>
        </View>

        <View style={[s.statusBox, d.rejected ? s.statusRejected : s.statusOk]}>
          <Text style={s.statusLabel}>Statut actuel</Text>
          <Text style={s.statusValue}>{d.statusLabel}</Text>
          {d.rejected && d.rejectionReason ? <Text style={s.stepMeta}>Motif : {d.rejectionReason}</Text> : null}
          {d.certificateNumber ? <Text style={s.stepMeta}>Certificat CNC n° {d.certificateNumber}</Text> : null}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Entreprise et bilan</Text>
          <Row label="Entreprise" value={d.companyName} />
          <Row label="RCCM" value={d.companyRccm || '—'} />
          <Row label="Secteur" value={d.companySector || '—'} />
          <Row label="Bilan" value={`${d.assessmentName} (${d.assessmentYear})`} />
          <Row label="Site" value={d.siteName} />
          <Row label="Émissions totales déclarées" value={fmtT(d.totalCo2eq)} />
          <Row label="Scope 1 / 2 / 3" value={`${fmtT(d.scope1)} / ${fmtT(d.scope2)} / ${fmtT(d.scope3)}`} />
          <Row label="Expert accrédité" value={d.expertName ?? 'Non encore assigné'} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Étapes de la demande</Text>
          {d.steps.map(step => (
            <View key={step.label} style={s.step}>
              <View style={[s.dot, step.done ? s.dotDone : s.dotTodo]} />
              <View>
                <Text style={s.stepLabel}>{step.label}</Text>
                <Text style={s.stepMeta}>
                  {step.done ? (step.date ? fmtDate(step.date) : 'Effectué') : 'En attente'}
                  {step.detail ? ` — ${step.detail}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={s.notice}>
          {'Ce document atteste uniquement de l’état d’avancement de la demande de certification sur la plateforme ' +
            'CarbonTrack. Il ne constitue pas un certificat. Le certificat officiel est délivré par le Conseil National ' +
            'du Climat (CNC) à l’issue de l’examen du dossier déposé par l’expert accrédité, puis mis à disposition ' +
            'sur la plateforme.'}
        </Text>

        <Text style={s.footer} fixed>
          GreenLeaves — CarbonTrack · Document généré le {fmtDate(d.generatedAt)}
        </Text>
      </Page>
    </Document>
  )
}

export async function generateSuiviDemandePDF(data: SuiviDemandeData): Promise<Buffer> {
  const blob = await pdf(<SuiviDemandeDocument d={data} />).toBlob()
  return Buffer.from(await blob.arrayBuffer())
}
