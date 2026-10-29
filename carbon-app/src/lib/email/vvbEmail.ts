/**
 * VVB Document Package Email
 * Sends the PDD and latest Monitoring Report to a VVB contact.
 */

import { sendMail } from './mailer'
import { generatePDDPDF, PDDData } from '@/lib/documents/PDDPDF'
import { generateMonitoringReportPDF, MonitoringReportData } from '@/lib/documents/MonitoringReportPDF'

export interface VVBEmailPayload {
  // VVB recipient
  vvbName: string
  vvbEmail: string
  vvbContact?: string

  // Project
  projectId: number
  projectTitle: string
  methodologyCode: string
  standard: string
  country: string
  partnerName: string

  // Docs
  pddData: PDDData
  monitoringData?: MonitoringReportData | null

  // Admin who sent
  adminName?: string
  appUrl?: string
}

// ─── HTML email body ──────────────────────────────────────────────────────────

function buildHtml(p: VVBEmailPayload): string {
  const appUrl = p.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://carbontrack.ga'
  const standardLabel: Record<string, string> = {
    verra_vcs:     'Verra VCS (Verified Carbon Standard)',
    gold_standard: 'Gold Standard for the Global Goals',
    ogec:          'OGEC — Ordonnance N°019/PR/2021 (Gabon)',
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Demande de vérification — CarbonTrack</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">

  <!-- Header -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 16px 0;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#166534;border-radius:8px 8px 0 0;">
          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0;color:#86efac;font-size:11px;letter-spacing:2px;font-weight:bold;">CARBONTRACK</p>
              <p style="margin:4px 0 0;color:#fff;font-size:18px;font-weight:bold;">Demande de Vérification — Projet Carbone</p>
              <p style="margin:4px 0 0;color:#86efac;font-size:12px;">Verification / Validation Request</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Body -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:0 16px 32px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none;">
          <tr>
            <td style="padding:32px;">

              <!-- Salutation -->
              <p style="color:#374151;font-size:14px;margin:0 0 16px;">
                ${p.vvbContact ? `Cher/Chère ${p.vvbContact},` : `Madame, Monsieur,`}
              </p>

              <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px;">
                La plateforme <strong>CarbonTrack</strong> vous contacte au nom du partenaire
                <strong>${p.partnerName}</strong> pour vous soumettre une demande de vérification / validation
                d'un projet carbone dans le cadre du standard <strong>${standardLabel[p.standard] ?? p.standard}</strong>.
              </p>

              <!-- Project card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;margin:0 0 24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;color:#15803d;font-size:11px;font-weight:bold;letter-spacing:1px;">PROJET SOUMIS À VÉRIFICATION</p>
                    <p style="margin:0 0 12px;color:#111827;font-size:18px;font-weight:bold;">${p.projectTitle}</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:50%;vertical-align:top;padding-right:12px;">
                          <p style="margin:0 0 6px;font-size:12px;color:#6b7280;font-weight:bold;">MÉTHODOLOGIE</p>
                          <p style="margin:0 0 14px;font-size:13px;color:#374151;font-weight:bold;">${p.methodologyCode}</p>
                          <p style="margin:0 0 6px;font-size:12px;color:#6b7280;font-weight:bold;">PAYS</p>
                          <p style="margin:0;font-size:13px;color:#374151;">${p.country}</p>
                        </td>
                        <td style="width:50%;vertical-align:top;">
                          <p style="margin:0 0 6px;font-size:12px;color:#6b7280;font-weight:bold;">STANDARD</p>
                          <p style="margin:0 0 14px;font-size:13px;color:#374151;">${standardLabel[p.standard] ?? p.standard}</p>
                          <p style="margin:0 0 6px;font-size:12px;color:#6b7280;font-weight:bold;">PARTENAIRE</p>
                          <p style="margin:0;font-size:13px;color:#374151;">${p.partnerName}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Documents -->
              <p style="color:#374151;font-size:14px;font-weight:bold;margin:0 0 8px;">Documents joints :</p>
              <ul style="color:#374151;font-size:14px;line-height:1.8;margin:0 0 24px;padding-left:20px;">
                <li><strong>Project Design Document (PDD)</strong> — présentation complète du projet, baseline, additionnalité, plan de surveillance</li>
                ${p.monitoringData ? `<li><strong>Rapport de Surveillance MRV</strong> — données d'activité et résultats de la dernière période de suivi</li>` : ''}
              </ul>

              <!-- Request -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:1px solid #d97706;border-radius:6px;margin:0 0 24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 6px;color:#92400e;font-size:12px;font-weight:bold;">SERVICES DEMANDÉS</p>
                    <ul style="margin:4px 0 0;padding-left:16px;color:#78350f;font-size:13px;line-height:1.7;">
                      <li>Vérification / validation du projet selon la méthodologie ${p.methodologyCode}</li>
                      <li>Émission d'une opinion de vérification (favorable / sous conditions / défavorable)</li>
                      <li>Émission d'un rapport de vérification officiel</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px;">
                Pourriez-vous nous confirmer votre disponibilité et nous communiquer vos conditions
                (délai, tarif, informations complémentaires requises) ?
                Nous sommes à votre disposition pour toute question.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:#15803d;border-radius:6px;padding:12px 24px;">
                    <a href="${appUrl}" style="color:#fff;font-size:14px;font-weight:bold;text-decoration:none;">
                      Accéder à la plateforme CarbonTrack →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#374151;font-size:14px;margin:0 0 4px;">Cordialement,</p>
              <p style="color:#111827;font-size:14px;font-weight:bold;margin:0 0 4px;">
                ${p.adminName ?? 'L\'équipe CarbonTrack'}
              </p>
              <p style="color:#6b7280;font-size:12px;margin:0;">CarbonTrack — Plateforme MRV Carbone · Gabon</p>

              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
              <p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.5;">
                Cet email a été envoyé automatiquement par la plateforme CarbonTrack.
                Les documents joints sont générés à partir des données saisies par le partenaire.
                Référence interne : projet #${p.projectId}
              </p>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
}

// ─── Plain text fallback ──────────────────────────────────────────────────────

function buildText(p: VVBEmailPayload): string {
  return `Demande de vérification — CarbonTrack
======================================

${p.vvbContact ? `Cher/Chère ${p.vvbContact},` : 'Madame, Monsieur,'}

La plateforme CarbonTrack vous contacte au nom de ${p.partnerName} pour une demande de vérification du projet suivant :

Projet   : ${p.projectTitle}
Méthode  : ${p.methodologyCode}
Standard : ${p.standard}
Pays     : ${p.country}

Documents joints : PDD${p.monitoringData ? ', Rapport de Surveillance MRV' : ''}

Pourriez-vous nous confirmer votre disponibilité et vos conditions ?

Cordialement,
${p.adminName ?? "L'équipe CarbonTrack"}
CarbonTrack — Plateforme MRV Carbone · Gabon`
}

// ─── Main send function ───────────────────────────────────────────────────────

export interface VVBEmailResult {
  sent: boolean
  attachments: string[]
  pdfSizes: { pdd?: number; monitoring?: number }
}

export async function sendVVBDocumentEmail(payload: VVBEmailPayload): Promise<VVBEmailResult> {
  const attachments: { filename: string; content: Buffer }[] = []
  const sizes: { pdd?: number; monitoring?: number } = {}

  // Generate PDD PDF
  try {
    const buf = await generatePDDPDF(payload.pddData)
    const filename = `PDD_${payload.projectTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`
    attachments.push({ filename, content: buf })
    sizes.pdd = buf.length
  } catch (err) {
    console.error('[vvbEmail] PDD generation failed:', err)
  }

  // Generate Monitoring Report PDF if data provided
  if (payload.monitoringData) {
    try {
      const buf = await generateMonitoringReportPDF(payload.monitoringData)
      const filename = `MonitoringReport_${payload.projectTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`
      attachments.push({ filename, content: buf })
      sizes.monitoring = buf.length
    } catch (err) {
      console.error('[vvbEmail] Monitoring Report generation failed:', err)
    }
  }

  const sent = await sendMail({
    to:          `${payload.vvbContact ? payload.vvbContact + ' <' + payload.vvbEmail + '>' : payload.vvbEmail}`,
    subject:     `[CarbonTrack] Demande de vérification — ${payload.projectTitle} (${payload.methodologyCode})`,
    html:        buildHtml(payload),
    text:        buildText(payload),
    attachments: attachments.map(a => ({
      filename:    a.filename,
      content:     a.content,
      contentType: 'application/pdf',
    })),
  })

  return {
    sent,
    attachments: attachments.map(a => a.filename),
    pdfSizes: sizes,
  }
}
