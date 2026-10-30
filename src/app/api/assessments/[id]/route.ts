import { NextRequest, NextResponse } from 'next/server'
import { rm } from 'fs/promises'
import path from 'path'
import { query, withTransaction } from '@/lib/db'
import { getCompanySession, unauthorized, parseId, certificationLock, lockedResponse } from '@/lib/company'

export const dynamic = 'force-dynamic'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

async function findOwned(id: number, companyId: number) {
  const r = await query(
    `SELECT a.*, s.name AS site_name, s.type AS site_type, s.country AS site_country, s.address AS site_address, s.surface AS site_surface, c.sector AS company_sector
     FROM assessments a JOIN sites s ON a.site_id = s.id JOIN companies c ON c.id = s.company_id
     WHERE a.id = $1 AND s.company_id = $2`,
    [id, companyId]
  )
  return r.rows[0] ?? null
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCompanySession()
    if (!session) return unauthorized()
    const id = parseId(params.id)
    if (!id) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const assessment = await findOwned(id, session.companyId)
    if (!assessment) return NextResponse.json({ error: 'Bilan non trouvé' }, { status: 404 })
    return NextResponse.json({ ...assessment, certification_lock: await certificationLock(id) })
  } catch (error) {
    console.error('Assessment fetch error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCompanySession()
    if (!session) return unauthorized()

    const id = parseId(params.id)
    if (!id) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const { status } = await request.json().catch(() => ({}))
    if (!['in_progress', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }

    if (!(await findOwned(id, session.companyId))) {
      return NextResponse.json({ error: 'Bilan non trouvé' }, { status: 404 })
    }
    // While a certification request is open, the bilan's state is owned by the workflow
    if (await certificationLock(id)) return lockedResponse()

    const result = await query(
      'UPDATE assessments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    )
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Assessment status update error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCompanySession()
    if (!session) return unauthorized()

    const id = parseId(params.id)
    if (!id) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    if (!(await findOwned(id, session.companyId))) {
      return NextResponse.json({ error: 'Bilan non trouvé' }, { status: 404 })
    }
    if (await certificationLock(id)) {
      return NextResponse.json(
        { error: 'Un bilan soumis à certification ne peut pas être supprimé.' },
        { status: 409 }
      )
    }

    // Remaining requests are rejected ones (history) — removed with the bilan, atomically
    await withTransaction(async (client) => {
      await client.query(
        'DELETE FROM certification_documents WHERE certification_id IN (SELECT id FROM certification_requests WHERE assessment_id = $1)',
        [id]
      )
      await client.query('DELETE FROM certification_requests WHERE assessment_id = $1', [id])
      await client.query('DELETE FROM audit_documents WHERE assessment_id = $1', [id])
      await client.query('DELETE FROM emission_entries WHERE assessment_id = $1', [id])
      await client.query('DELETE FROM assessments WHERE id = $1', [id])
    })
    await rm(path.join(UPLOAD_DIR, String(id)), { recursive: true, force: true }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Assessment delete error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
