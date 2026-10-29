import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { parseId } from '@/lib/company'
import { safeFileHeaders } from '@/lib/uploads'
import { readFile } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export const dynamic = 'force-dynamic'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

// GET: download/serve a document by id
// Accessible to: the owning company, any admin, or the expert assigned to the certification
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [adminSession, expertSession, userSession] = await Promise.all([
      getSession('admin'), getSession('expert'), getSession('user'),
    ])
    if (!adminSession && !expertSession && !userSession) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const docId = parseId(params.id)
    if (!docId) return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })

    const docResult = await query(
      `SELECT d.*, a.id as assessment_id, s.company_id
       FROM audit_documents d
       JOIN assessments a ON d.assessment_id = a.id
       JOIN sites s ON a.site_id = s.id
       WHERE d.id = $1`,
      [docId]
    )
    if (docResult.rows.length === 0) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }
    const doc = docResult.rows[0]

    // Check each portal's session on its own merits — a cookie for one role never grants another
    let allowed =
      adminSession?.role === 'admin' ||
      (userSession?.role === 'user' && userSession.companyId === doc.company_id)
    if (!allowed && expertSession?.role === 'expert') {
      const certCheck = await query(
        'SELECT 1 FROM certification_requests WHERE assessment_id = $1 AND expert_user_id = $2',
        [doc.assessment_id, expertSession.userId]
      )
      allowed = certCheck.rows.length > 0
    }
    if (!allowed) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const filePath = path.join(UPLOAD_DIR, String(doc.assessment_id), path.basename(doc.filename))
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 })
    }

    const fileBuffer = await readFile(filePath)
    return new NextResponse(fileBuffer, {
      headers: safeFileHeaders(doc.filename, doc.original_name, fileBuffer.length),
    })
  } catch (error) {
    console.error('Document serve error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
