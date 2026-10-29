import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { notifyCompanyUsers, notifyAllAdmins, notifyAllCnc } from '@/lib/notifications'
import { generateCNCCertificatPDF, CNCCertificatData } from '@/lib/documents/CNCCertificatPDF'
import { readFile } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession('cnc')
    if (!session || session.role !== 'cnc') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const certId = parseInt(params.id)

    const result = await query(
      `SELECT
         cr.id, cr.status, cr.certificate_number as gl_certificate_number,
         cr.certified_at, cr.expert_name,
         cr.avis_number, cr.avis_date,
         cr.avis_period_start, cr.avis_period_end, cr.avis_total_co2eq,
         a.id as assessment_id, a.name as assessment_name, a.year as assessment_year,
         a.total_co2eq, a.scope1_co2eq, a.scope2_co2eq, a.scope3_co2eq, a.approach,
         c.id as company_id, c.name as company_name, c.sector, c.rccm, c.logo_url,
         s.name as site_name
       FROM certification_requests cr
       JOIN assessments a ON a.id = cr.assessment_id
       JOIN sites s ON s.id = a.site_id
       JOIN companies c ON c.id = cr.company_id
       WHERE cr.id = $1 AND cr.cnc_user_id = $2`,
      [certId, session.userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Certification introuvable' }, { status: 404 })
    }

    const r = result.rows[0]

    // Load company logo if exists
    let companyLogoDataUrl: string | null = null
    if (r.logo_url) {
      try {
        const logoPath = path.join(process.cwd(), 'public', r.logo_url.replace(/^\//, ''))
        const ext = path.extname(logoPath).slice(1)
        const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
        const logoBuffer = await readFile(logoPath)
        companyLogoDataUrl = `data:${mime};base64,${logoBuffer.toString('base64')}`
      } catch { /* logo not found, skip */ }
    }

    const now = new Date()
    const certificateNumber = `CNC-GL-${r.assessment_year}-${String(certId).padStart(4, '0')}`

    const data: CNCCertificatData = {
      certId,
      certificateNumber,
      glCertificateNumber: r.gl_certificate_number ?? `CT-GL-${r.assessment_year}-${String(certId).padStart(6, '0')}`,
      companyName: r.company_name,
      companySector: r.sector ?? '',
      companyRccm: r.rccm ?? '',
      siteName: r.site_name,
      assessmentName: r.assessment_name,
      assessmentYear: parseInt(r.assessment_year),
      approach: r.approach ?? 'Contrôle opérationnel',
      totalCo2eq: parseFloat(r.total_co2eq ?? 0),
      scope1: parseFloat(r.scope1_co2eq ?? 0),
      scope2: parseFloat(r.scope2_co2eq ?? 0),
      scope3: parseFloat(r.scope3_co2eq ?? 0),
      expertName: r.expert_name ?? '—',
      avisNumber: r.avis_number ?? null,
      avisDate: r.avis_date ?? null,
      periodStart: r.avis_period_start != null ? parseInt(r.avis_period_start) : null,
      periodEnd: r.avis_period_end != null ? parseInt(r.avis_period_end) : null,
      avisTotalCo2eq: r.avis_total_co2eq != null ? parseFloat(r.avis_total_co2eq) : null,
      issuedAt: now.toISOString(),
      companyLogoDataUrl,
    }

    let pdfBuffer: Buffer
    try {
      pdfBuffer = await generateCNCCertificatPDF(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur génération PDF'
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    // Store the certificate
    const safeCompany = r.company_name?.replace(/[^a-z0-9]/gi, '_') ?? 'company'
    const certDir = path.join(process.cwd(), 'public', 'uploads', 'cnc-certificates')
    const filename = `CNC_${safeCompany}_${r.assessment_year}_${now.toISOString().slice(0, 10)}.pdf`
    const { mkdir, writeFile } = await import('fs/promises')
    const { existsSync } = await import('fs')
    if (!existsSync(certDir)) await mkdir(certDir, { recursive: true })
    const filepath = path.join(certDir, filename)
    await writeFile(filepath, pdfBuffer)

    const pdfUrl = `/uploads/cnc-certificates/${filename}`

    await query(
      `UPDATE certification_requests
       SET status = 'certificate_generated',
           cnc_certificate_number = $1,
           cnc_certificate_pdf_url = $2,
           cnc_certificate_generated_at = NOW(),
           cnc_reviewed_at = COALESCE(cnc_reviewed_at, NOW()),
           updated_at = NOW()
       WHERE id = $3`,
      [certificateNumber, pdfUrl, certId]
    )

    // Notify company, admins, and other CNC members
    await notifyCompanyUsers(
      r.company_id,
      'cert_validated',
      'Certificat officiel CNC émis',
      `Le Conseil National du Climat a émis le certificat officiel N° ${certificateNumber} pour "${r.assessment_name}".`,
      `/dashboard/certifications`
    )
    await notifyAllAdmins(
      'cert_comment',
      'Certificat CNC généré',
      `Le CNC a généré le certificat officiel N° ${certificateNumber} pour ${r.company_name} — "${r.assessment_name}".`,
      `/admin/certifications/${certId}`
    )
    await notifyAllCnc(
      'cert_comment',
      'Certificat CNC émis',
      `Le certificat officiel N° ${certificateNumber} a été émis pour ${r.company_name}.`,
      `/cnc/certifications/${certId}`
    )

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('CNC generate certificate error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
