/**
 * PATCH /api/admin/projects/[id]/vvb-status
 * Update VVB verification status, add CARs/CLs, record final opinion.
 * Auth: admin only.
 *
 * Actions via body.action:
 *   'update_status'  — { verificationId, status }
 *   'add_car'        — { verificationId, text }
 *   'resolve_car'    — { verificationId, carId }
 *   'add_cl'         — { verificationId, text }
 *   'answer_cl'      — { verificationId, clId, answer }
 *   'record_opinion' — { verificationId, opinion, opinionText, opinionDate, reportUrl? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getSession('admin')
  if (!session) return null
  const r = await query('SELECT role FROM users WHERE id = $1', [session.userId])
  if (r.rows.length === 0 || r.rows[0].role !== 'admin') return null
  return session
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const projectId = parseInt(params.id)
  const body = await req.json()
  const { action, verificationId } = body

  if (!verificationId) {
    return NextResponse.json({ error: 'verificationId requis' }, { status: 400 })
  }

  // Load verification row (and verify it belongs to this project)
  const vRes = await query(
    `SELECT * FROM vvb_verifications WHERE id = $1 AND project_id = $2`,
    [verificationId, projectId]
  )
  if (vRes.rows.length === 0) {
    return NextResponse.json({ error: 'Vérification introuvable' }, { status: 404 })
  }
  const v = vRes.rows[0]

  switch (action) {

    case 'update_status': {
      const { status } = body
      if (!status) return NextResponse.json({ error: 'status requis' }, { status: 400 })
      await query(
        `UPDATE vvb_verifications SET status = $1, updated_at = NOW() WHERE id = $2`,
        [status, verificationId]
      )
      await query(
        `UPDATE carbon_projects SET vvb_status = $1, updated_at = NOW() WHERE id = $2`,
        [status, projectId]
      )
      break
    }

    case 'add_car': {
      const { text } = body
      if (!text) return NextResponse.json({ error: 'text requis' }, { status: 400 })
      const cars = Array.isArray(v.cars) ? v.cars : []
      const newCar = {
        id:          Date.now(),
        text,
        issued_at:   new Date().toISOString(),
        resolved_at: null,
        resolved:    false,
      }
      await query(
        `UPDATE vvb_verifications SET cars = $1::jsonb, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify([...cars, newCar]), verificationId]
      )
      return NextResponse.json({ car: newCar })
    }

    case 'resolve_car': {
      const { carId } = body
      const cars = (Array.isArray(v.cars) ? v.cars : []) as { id: number; resolved: boolean; resolved_at: string | null }[]
      const updated = cars.map(c =>
        c.id === carId ? { ...c, resolved: true, resolved_at: new Date().toISOString() } : c
      )
      await query(
        `UPDATE vvb_verifications SET cars = $1::jsonb, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(updated), verificationId]
      )
      break
    }

    case 'add_cl': {
      const { text } = body
      if (!text) return NextResponse.json({ error: 'text requis' }, { status: 400 })
      const cls = Array.isArray(v.cls) ? v.cls : []
      const newCl = {
        id:          Date.now(),
        text,
        issued_at:   new Date().toISOString(),
        answered_at: null,
        answer:      null,
      }
      await query(
        `UPDATE vvb_verifications SET cls = $1::jsonb, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify([...cls, newCl]), verificationId]
      )
      return NextResponse.json({ cl: newCl })
    }

    case 'answer_cl': {
      const { clId, answer } = body
      const cls = (Array.isArray(v.cls) ? v.cls : []) as { id: number; answered_at: string | null; answer: string | null }[]
      const updated = cls.map(c =>
        c.id === clId ? { ...c, answer, answered_at: new Date().toISOString() } : c
      )
      await query(
        `UPDATE vvb_verifications SET cls = $1::jsonb, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(updated), verificationId]
      )
      break
    }

    case 'record_opinion': {
      const { opinion, opinionText, opinionDate, reportUrl } = body
      if (!opinion) return NextResponse.json({ error: 'opinion requis' }, { status: 400 })

      const finalStatus = opinion === 'approved'
        ? 'approved'
        : opinion === 'conditionally_approved'
          ? 'conditionally_approved'
          : 'rejected'

      await query(
        `UPDATE vvb_verifications
         SET opinion = $1, opinion_text = $2, opinion_date = $3,
             report_url = $4, status = $5, updated_at = NOW()
         WHERE id = $6`,
        [opinion, opinionText ?? null, opinionDate ?? null, reportUrl ?? null, finalStatus, verificationId]
      )
      await query(
        `UPDATE carbon_projects
         SET vvb_opinion = $1, vvb_status = $2, vvb_report_url = $3, updated_at = NOW()
         WHERE id = $4`,
        [opinion, finalStatus, reportUrl ?? null, projectId]
      )
      break
    }

    default:
      return NextResponse.json({ error: `Action inconnue: ${action}` }, { status: 400 })
  }

  // Return updated verification
  const updated = await query(
    `SELECT * FROM vvb_verifications WHERE id = $1`,
    [verificationId]
  )
  return NextResponse.json({ verification: updated.rows[0] })
}

// GET — list verifications for a project
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const projectId = parseInt(params.id)
  const result = await query(
    `SELECT v.*, u.first_name, u.last_name
     FROM vvb_verifications v
     LEFT JOIN users u ON u.id = v.assigned_by
     WHERE v.project_id = $1
     ORDER BY v.created_at DESC`,
    [projectId]
  )
  return NextResponse.json({ verifications: result.rows })
}
