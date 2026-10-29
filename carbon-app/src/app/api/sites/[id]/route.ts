import { NextRequest, NextResponse } from 'next/server'
import { rm } from 'fs/promises'
import path from 'path'
import { query, withTransaction } from '@/lib/db'
import { getCompanySession, unauthorized, parseId } from '@/lib/company'

export const dynamic = 'force-dynamic'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

const str = (v: unknown, max: number) => {
  if (v === null || v === undefined) return null
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCompanySession()
    if (!session) return unauthorized()
    const id = parseId(params.id)
    if (!id) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })

    const name = str(body.name, 255)
    if (!name) return NextResponse.json({ error: 'Le nom du site est requis' }, { status: 400 })
    const type = str(body.type, 100) ?? 'bureau'
    const address = str(body.address, 500)
    const description = str(body.description, 2000)
    const country = str(body.country, 100)
    if ([type, address, description, country].includes(undefined)) {
      return NextResponse.json({ error: 'Champs invalides' }, { status: 400 })
    }
    let surface: number | null = null
    if (body.surface !== null && body.surface !== undefined && body.surface !== '') {
      surface = Number(body.surface)
      if (!Number.isFinite(surface) || surface < 0 || surface > 1e10) {
        return NextResponse.json({ error: 'Surface invalide' }, { status: 400 })
      }
    }

    const result = await query(
      `UPDATE sites SET name = $1, type = $2, address = $3, surface = $4, description = $5, country = $6, updated_at = NOW()
       WHERE id = $7 AND company_id = $8 RETURNING *`,
      [name, type, address, surface, description, country, id, session.companyId]
    )
    if (!result.rows[0]) return NextResponse.json({ error: 'Site non trouvé' }, { status: 404 })
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Site update error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCompanySession()
    if (!session) return unauthorized()
    const id = parseId(params.id)
    if (!id) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const owned = await query('SELECT 1 FROM sites WHERE id = $1 AND company_id = $2', [id, session.companyId])
    if (!owned.rows.length) return NextResponse.json({ error: 'Site non trouvé' }, { status: 404 })

    const live = await query(
      `SELECT 1 FROM certification_requests cr JOIN assessments a ON cr.assessment_id = a.id
       WHERE a.site_id = $1 AND cr.status <> 'rejected' LIMIT 1`,
      [id]
    )
    if (live.rows.length) {
      return NextResponse.json(
        { error: 'Ce site a un bilan soumis à certification : il ne peut pas être supprimé.' },
        { status: 409 }
      )
    }

    const assessmentIds = await withTransaction(async (client) => {
      const a = await client.query('SELECT id FROM assessments WHERE site_id = $1', [id])
      const ids: number[] = a.rows.map((r: { id: number }) => r.id)
      if (ids.length) {
        await client.query(
          'DELETE FROM certification_documents WHERE certification_id IN (SELECT id FROM certification_requests WHERE assessment_id = ANY($1::int[]))',
          [ids]
        )
        await client.query('DELETE FROM certification_requests WHERE assessment_id = ANY($1::int[])', [ids])
        await client.query('DELETE FROM audit_documents WHERE assessment_id = ANY($1::int[])', [ids])
        await client.query('DELETE FROM emission_entries WHERE assessment_id = ANY($1::int[])', [ids])
        await client.query('DELETE FROM assessments WHERE id = ANY($1::int[])', [ids])
      }
      await client.query('DELETE FROM sites WHERE id = $1 AND company_id = $2', [id, session.companyId])
      return ids
    })
    await Promise.all(assessmentIds.map(aid =>
      rm(path.join(UPLOAD_DIR, String(aid)), { recursive: true, force: true }).catch(() => {})
    ))

    return NextResponse.json({ success: true, deletedAssessments: assessmentIds.length })
  } catch (error) {
    console.error('Site delete error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
