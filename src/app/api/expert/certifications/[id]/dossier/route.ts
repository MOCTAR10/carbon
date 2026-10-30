/**
 * GET /api/expert/certifications/[id]/dossier
 *
 * Full certification dossier (ZIP) that the accredited expert submits to the DGEPN:
 *   01_Dossier_certification.pdf   — summary (company, emissions, checklist, opinion)
 *   02_Rapport_audit_expert.pdf    — detailed expert audit report
 *   03_Detail_emissions.csv        — every emission entry of the assessment
 *   04_Pieces_justificatives/...   — supporting documents uploaded by the company
 * Accessible to: the assigned expert, or any admin.
 */

import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { zipSync, strToU8, Zippable } from 'fflate'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { PRIVATE_UPLOAD_DIR } from '@/lib/certification'
import { buildCertificationDossier } from '@/lib/documents/build-certification-dossier'
import { buildExpertReport, ReportUnavailableError } from '@/lib/documents/build-expert-report'

export const dynamic = 'force-dynamic'

function safe(name: string) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80)
}

/** Like safe(), but truncates the base name so the file extension survives */
function safeFile(name: string) {
  const ext = path.extname(name).slice(0, 10)
  return safe(path.basename(name, ext)).slice(0, 70) + safe(ext)
}

function csvCell(v: unknown) {
  const s = v == null ? '' : String(v)
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [adminSession, expertSession] = await Promise.all([getSession('admin'), getSession('expert')])
    const certId = parseInt(params.id)

    const certResult = await query(
      `SELECT cr.id, cr.status, cr.expert_user_id, cr.assessment_id,
              a.year as assessment_year, c.name as company_name
       FROM certification_requests cr
       JOIN assessments a ON a.id = cr.assessment_id
       JOIN companies c ON c.id = cr.company_id
       WHERE cr.id = $1`,
      [certId]
    )
    if (certResult.rows.length === 0) {
      return NextResponse.json({ error: 'Certification introuvable' }, { status: 404 })
    }
    const cert = certResult.rows[0]

    const allowed =
      adminSession?.role === 'admin' ||
      (expertSession?.role === 'expert' && expertSession.userId === cert.expert_user_id)
    if (!allowed) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const files: Zippable = {}

    files['01_Dossier_certification.pdf'] = new Uint8Array(await buildCertificationDossier(certId))
    const report = await buildExpertReport(certId)
    files['02_Rapport_audit_expert.pdf'] = new Uint8Array(report.buffer)

    // Emission detail (semicolon-separated + BOM so Excel FR opens it correctly)
    const entries = await query(
      `SELECT scope, category, subcategory, factor_name, quantity, unit, factor_value, total_co2eq, month, year, description
       FROM emission_entries WHERE assessment_id = $1 ORDER BY scope, category, factor_name, month`,
      [cert.assessment_id]
    )
    const header = ['Scope', 'Catégorie', 'Sous-catégorie', 'Facteur', 'Quantité', 'Unité', 'Facteur (kgCO2e/unité)', 'Total (kgCO2e)', 'Mois', 'Année', 'Description']
    const rows = entries.rows.map(e => [e.scope, e.category, e.subcategory, e.factor_name, e.quantity, e.unit, e.factor_value, e.total_co2eq, e.month, e.year, e.description])
    files['03_Detail_emissions.csv'] = strToU8('﻿' + [header, ...rows].map(r => r.map(csvCell).join(';')).join('\r\n'))

    // Supporting documents uploaded by the company, grouped by emission source
    const docs = await query(
      `SELECT ad.filename, ad.original_name, ad.year, ad.month, ee.scope, ee.factor_name
       FROM audit_documents ad
       LEFT JOIN LATERAL (
         SELECT scope, factor_name FROM emission_entries
         WHERE assessment_id = ad.assessment_id AND emission_factor_id = ad.emission_factor_id
         LIMIT 1
       ) ee ON TRUE
       WHERE ad.assessment_id = $1
       ORDER BY ee.scope, ee.factor_name, ad.year, ad.month`,
      [cert.assessment_id]
    )
    const missing: string[] = []
    for (const d of docs.rows) {
      const src = path.join(PRIVATE_UPLOAD_DIR, String(cert.assessment_id), path.basename(d.filename))
      if (!existsSync(src)) { missing.push(d.original_name); continue }
      const folder = safe(`Scope${d.scope ?? 'X'}_${d.factor_name ?? 'Autre'}`)
      const period = d.year && d.month ? `${d.year}-${String(d.month).padStart(2, '0')}_` : ''
      let name = `04_Pieces_justificatives/${folder}/${period}${safeFile(d.original_name)}`
      while (files[name]) name = name.replace(/(\.[^.]*)?$/, '_1$1')
      files[name] = new Uint8Array(await readFile(src))
    }
    if (missing.length > 0) {
      files['04_Pieces_justificatives/FICHIERS_MANQUANTS.txt'] =
        strToU8(`Fichiers référencés mais introuvables sur le serveur :\r\n${missing.join('\r\n')}\r\n`)
    }

    // Store without compression: PDFs/images are already compressed, and it keeps generation fast
    const zip = zipSync(files, { level: 0 })
    const filename = `Dossier_DGEPN_${safe(cert.company_name)}_${cert.assessment_year}_${certId}.zip`

    return new NextResponse(zip, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(zip.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (error instanceof ReportUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Dossier ZIP error:', error)
    return NextResponse.json({ error: 'Erreur lors de la génération du dossier' }, { status: 500 })
  }
}
