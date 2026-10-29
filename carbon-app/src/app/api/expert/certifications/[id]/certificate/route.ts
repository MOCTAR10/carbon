/**
 * POST /api/expert/certifications/[id]/certificate
 *
 * The assigned expert uploads the digital copy of the certificate issued by the CNC
 * (multipart: file, certificateNumber, certifiedAt). Moves the request to 'certified'.
 * Re-uploading on a certified request replaces the current copy (older files are kept).
 */

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { notifyAllAdmins, notifyCompanyUsers } from '@/lib/notifications'
import { PRIVATE_UPLOAD_DIR, CERTIFICATE_MIME_TYPES, CERTIFICATE_MAX_BYTES } from '@/lib/certification'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession('expert')
    if (!session || session.role !== 'expert') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const certId = parseInt(params.id)
    const owned = await query(
      `SELECT cr.id, cr.status, cr.company_id, cr.assessment_id, a.name as assessment_name
       FROM certification_requests cr
       JOIN assessments a ON a.id = cr.assessment_id
       WHERE cr.id = $1 AND cr.expert_user_id = $2`,
      [certId, session.userId]
    )
    if (owned.rows.length === 0) {
      return NextResponse.json({ error: 'Certification introuvable ou non assignée' }, { status: 404 })
    }
    const cert = owned.rows[0]
    if (!['submitted_to_cnc', 'certified'].includes(cert.status)) {
      return NextResponse.json({ error: 'Enregistrez d\'abord le dépôt du dossier au CNC' }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const certificateNumber = String(formData.get('certificateNumber') ?? '').trim()
    const certifiedAt = String(formData.get('certifiedAt') ?? '').trim()

    if (!file || !certificateNumber || !certifiedAt) {
      return NextResponse.json({ error: 'Fichier, numéro et date du certificat requis' }, { status: 400 })
    }
    if (!CERTIFICATE_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Format accepté : PDF, JPG ou PNG' }, { status: 400 })
    }
    if (file.size > CERTIFICATE_MAX_BYTES) {
      return NextResponse.json({ error: 'Fichier trop volumineux (20 Mo maximum)' }, { status: 400 })
    }

    // The certificate number is what the public /verify page looks up — it must be unique
    const dup = await query(
      `SELECT id FROM certification_requests WHERE certificate_number = $1 AND id <> $2`,
      [certificateNumber, certId]
    )
    if (dup.rows.length > 0) {
      return NextResponse.json({ error: 'Ce numéro de certificat est déjà utilisé' }, { status: 409 })
    }

    const dir = path.join(PRIVATE_UPLOAD_DIR, String(cert.assessment_id))
    await mkdir(dir, { recursive: true })
    const ext = path.extname(file.name).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.pdf'
    const filename = `certificate_${certId}_${Date.now()}${ext}`
    await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()))

    await query(
      `INSERT INTO certification_documents (certification_id, doc_type, filename, original_name, file_size, mime_type, uploaded_by)
       VALUES ($1, 'certificate', $2, $3, $4, $5, $6)`,
      [certId, filename, file.name, file.size, file.type, session.userId]
    )

    const wasCertified = cert.status === 'certified'
    await query(
      `UPDATE certification_requests
       SET status = 'certified', certificate_number = $1, certified_at = $2, updated_at = NOW()
       WHERE id = $3`,
      [certificateNumber, certifiedAt, certId]
    )
    await query(
      `UPDATE assessments SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [cert.assessment_id]
    )

    if (!wasCertified) {
      await notifyCompanyUsers(
        cert.company_id,
        'cert_validated',
        'Bilan carbone certifié par le CNC',
        `Le certificat CNC de "${cert.assessment_name}" (N° ${certificateNumber}) est disponible au téléchargement.`,
        `/dashboard/certifications`
      )
      await notifyAllAdmins(
        'cert_validated',
        'Certificat CNC reçu',
        `L'expert a téléversé le certificat CNC de "${cert.assessment_name}" (N° ${certificateNumber}).`,
        `/admin/certifications/${certId}`
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Expert certificate upload error:', error)
    return NextResponse.json({ error: 'Erreur lors du téléversement' }, { status: 500 })
  }
}
