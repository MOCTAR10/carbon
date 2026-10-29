import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

async function getAdminSession() {
  const token = cookies().get('token')?.value
  if (!token) return null
  try {
    const decoded = await verifyToken(token)
    if (!decoded || decoded.role !== 'admin') return null
    return decoded
  } catch {
    return null
  }
}

// PATCH /api/partner/documents/[id] — admin approve or reject
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })

  const docId = parseInt(params.id)
  if (isNaN(docId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const { status, admin_note } = body

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'Statut invalide (approved | rejected | pending)' }, { status: 400 })
  }

  const result = await query(
    `UPDATE partner_documents
     SET status = $1, admin_note = $2, reviewed_by = $3, reviewed_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [status, admin_note || null, session.userId, docId]
  )

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
  }

  return NextResponse.json({ document: result.rows[0] })
}
