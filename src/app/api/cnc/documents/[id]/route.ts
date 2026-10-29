import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { readFile } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export const dynamic = 'force-dynamic'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession('cnc')
    if (!session || session.role !== 'cnc') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const docId = parseInt(params.id)
    const docResult = await query(
      `SELECT cd.*, cr.assessment_id
       FROM certification_documents cd
       JOIN certification_requests cr ON cr.id = cd.certification_id
       WHERE cd.id = $1`,
      [docId]
    )

    if (docResult.rows.length === 0) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    const doc = docResult.rows[0]
    const filePath = path.join(UPLOAD_DIR, String(doc.assessment_id), doc.filename)

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Fichier introuvable sur le serveur' }, { status: 404 })
    }

    const fileBuffer = await readFile(filePath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': doc.mime_type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(doc.original_name)}"`,
        'Content-Length': String(fileBuffer.length),
      },
    })
  } catch (error) {
    console.error('CNC document serve error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
