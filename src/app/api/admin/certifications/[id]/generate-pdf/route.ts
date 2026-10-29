/**
 * POST /api/admin/certifications/[id]/generate-pdf
 *
 * Generates and streams the Expert Audit Report PDF.
 * Accessible to: admin, assigned expert, or the company that owns the cert.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { buildExpertReport, ReportUnavailableError } from '@/lib/documents/build-expert-report'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [adminSession, expertSession, userSession] = await Promise.all([
      getSession('admin'), getSession('expert'), getSession('user'),
    ])
    if (!adminSession && !expertSession && !userSession) {
      return NextResponse.json({ error: 'Session expirée — reconnectez-vous' }, { status: 403 })
    }

    const certId = parseInt(params.id)
    const access = await query(
      `SELECT company_id, expert_user_id FROM certification_requests WHERE id = $1`,
      [certId]
    )
    if (access.rows.length === 0) {
      return NextResponse.json({ error: 'Certification introuvable' }, { status: 404 })
    }
    const { company_id, expert_user_id } = access.rows[0]

    // Each portal cookie is checked against its own role
    const allowed =
      adminSession?.role === 'admin' ||
      (expertSession?.role === 'expert' && expertSession.userId === expert_user_id) ||
      (userSession?.role === 'user' && userSession.companyId === company_id)
    if (!allowed) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { buffer, filename } = await buildExpertReport(certId)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      buffer.length.toString(),
        'Cache-Control':       'no-store',
      },
    })
  } catch (error) {
    if (error instanceof ReportUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Generate PDF error:', error)
    return NextResponse.json({ error: 'Erreur lors de la génération du PDF' }, { status: 500 })
  }
}
