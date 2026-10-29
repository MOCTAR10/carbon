/**
 * GET /api/certification-documents/[id]
 *
 * Serves a certification document (e.g. the CNC certificate uploaded by the expert).
 * Accessible to: any admin, the expert assigned to the certification, or the owning company.
 */

import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { PRIVATE_UPLOAD_DIR } from '@/lib/certification'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [adminSession, expertSession, userSession] = await Promise.all([
      getSession('admin'), getSession('expert'), getSession('user'),
    ])
    if (!adminSession && !expertSession && !userSession) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const docResult = await query(
      `SELECT cd.filename, cd.original_name, cd.mime_type,
              cr.assessment_id, cr.company_id, cr.expert_user_id
       FROM certification_documents cd
       JOIN certification_requests cr ON cr.id = cd.certification_id
       WHERE cd.id = $1`,
      [parseInt(params.id)]
    )
    if (docResult.rows.length === 0) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }
    const doc = docResult.rows[0]

    // Check each portal's session on its own merits — a cookie for one role never grants another
    const allowed =
      adminSession?.role === 'admin' ||
      (expertSession?.role === 'expert' && expertSession.userId === doc.expert_user_id) ||
      (userSession?.role === 'user' && userSession.companyId === doc.company_id)
    if (!allowed) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const filePath = path.join(PRIVATE_UPLOAD_DIR, String(doc.assessment_id), path.basename(doc.filename))
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Fichier introuvable sur le serveur' }, { status: 404 })
    }

    const fileBuffer = await readFile(filePath)
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': doc.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(doc.original_name)}`,
        'Content-Length': String(fileBuffer.length),
      },
    })
  } catch (error) {
    console.error('Certification document serve error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
