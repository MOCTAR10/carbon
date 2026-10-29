import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const { status } = await request.json()
    if (!['in_progress', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }

    const check = await query(
      `SELECT a.id FROM assessments a JOIN sites s ON a.site_id = s.id
       WHERE a.id = $1 AND s.company_id = $2`,
      [id, session.companyId]
    )
    if (check.rows.length === 0) {
      return NextResponse.json({ error: 'Bilan non trouvé' }, { status: 404 })
    }

    await query(
      'UPDATE assessments SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, id]
    )
    const result = await query('SELECT * FROM assessments WHERE id = $1', [id])
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Assessment status update error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    // Verify bilan belongs to user's company
    const check = await query(
      `SELECT a.id, a.status
       FROM assessments a
       JOIN sites s ON a.site_id = s.id
       WHERE a.id = $1 AND s.company_id = $2`,
      [id, session.companyId]
    )

    if (check.rows.length === 0) {
      return NextResponse.json({ error: 'Bilan non trouvé' }, { status: 404 })
    }

    if (check.rows[0].status !== 'draft') {
      return NextResponse.json(
        { error: 'Seuls les bilans en brouillon peuvent être supprimés' },
        { status: 400 }
      )
    }

    // Remove child records first (FK constraints)
    await query('DELETE FROM emission_entries WHERE assessment_id = $1', [id])
    await query('DELETE FROM certification_requests WHERE assessment_id = $1', [id]).catch(() => {})
    await query('DELETE FROM assessments WHERE id = $1', [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Assessment delete error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
