/**
 * GET   /api/admin/credits/[id]           — credit detail + transaction history
 * PATCH /api/admin/credits/[id]           — transfer | retire | cancel | dispute
 *
 * Auth: admin only.
 * All operations are immutable — transactions are appended, credits only
 * change status and quantity_* columns (never deleted).
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

// â”€â”€â”€ GET â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const creditId = parseInt(params.id)

  const creditRes = await query(
    `SELECT cc.*, cp.title as project_title, p.name as partner_name
     FROM carbon_credits cc
     JOIN carbon_projects cp ON cp.id = cc.project_id
     LEFT JOIN partners p ON p.id = cp.partner_id
     WHERE cc.id = $1`,
    [creditId]
  )
  if (creditRes.rows.length === 0) {
    return NextResponse.json({ error: 'Crédit introuvable' }, { status: 404 })
  }

  const txRes = await query(
    `SELECT ct.*, u.first_name || ' ' || u.last_name as performed_by_name
     FROM credit_transactions ct
     LEFT JOIN users u ON u.id = ct.performed_by
     WHERE ct.credit_id = $1
     ORDER BY ct.created_at DESC`,
    [creditId]
  )

  return NextResponse.json({
    credit:       creditRes.rows[0],
    transactions: txRes.rows,
  })
}

// â”€â”€â”€ PATCH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const creditId = parseInt(params.id)
  const body = await req.json()
  const { action } = body

  // Load credit
  const creditRes = await query('SELECT * FROM carbon_credits WHERE id = $1', [creditId])
  if (creditRes.rows.length === 0) {
    return NextResponse.json({ error: 'Crédit introuvable' }, { status: 404 })
  }
  const credit = creditRes.rows[0]

  switch (action) {

    // â”€â”€ Retire â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Records a retirement that was confirmed by Verra on their registry.
    // Publicly disclosed per Verra ToU Â§6.4: quantity, serial, vintage, date,
    // project info, beneficial owner, retirement reason.
    case 'retire': {
      const { quantity, beneficialOwner, beneficialOwnerEmail, retirementReason, notes } = body

      if (!quantity || !beneficialOwner || !retirementReason) {
        return NextResponse.json({
          error: 'quantity, beneficialOwner et retirementReason requis',
        }, { status: 400 })
      }

      const qty    = parseFloat(quantity)
      const active = parseFloat(credit.quantity_active)

      if (qty > active + 0.001) {
        return NextResponse.json({
          error: `Quantité demandée (${qty}) supérieure aux crédits actifs (${active.toFixed(2)})`,
        }, { status: 400 })
      }

      await query(
        `UPDATE carbon_credits
         SET quantity_active  = quantity_active - $1,
             quantity_retired = quantity_retired + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [qty, creditId]
      )

      // Determine new status
      const newActive   = active - qty
      const newRetired  = parseFloat(credit.quantity_retired) + qty
      const newStatus   = newActive <= 0.001 ? 'fully_retired' : 'partially_retired'
      await query('UPDATE carbon_credits SET status = $1 WHERE id = $2', [newStatus, creditId])

      await query(
        `INSERT INTO credit_transactions
           (credit_id, project_id, tx_type, quantity,
            from_holder, beneficial_owner, beneficial_owner_email,
            retirement_reason, serial_numbers, tx_date, performed_by, notes)
         VALUES ($1,$2,'retirement',$3,$4,$5,$6,$7,$8,CURRENT_DATE,$9,$10)`,
        [
          creditId,
          credit.project_id,
          qty,
          credit.serial_number,
          beneficialOwner,
          beneficialOwnerEmail ?? null,
          retirementReason,
          [credit.serial_number],
          session.userId,
          notes ?? null,
        ]
      )

      break
    }

    // â”€â”€ Cancel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Used for over-issuance, disputes, reversal events.
    case 'cancel': {
      const { quantity, reason, notes } = body
      if (!quantity || !reason) {
        return NextResponse.json({ error: 'quantity et reason requis' }, { status: 400 })
      }

      const qty    = parseFloat(quantity)
      const active = parseFloat(credit.quantity_active)

      if (qty > active + 0.001) {
        return NextResponse.json({ error: 'Quantité supérieure aux crédits actifs' }, { status: 400 })
      }

      await query(
        `UPDATE carbon_credits
         SET quantity_active    = quantity_active - $1,
             quantity_cancelled = quantity_cancelled + $1,
             status = CASE WHEN quantity_active - $1 <= 0.001 THEN 'cancelled' ELSE status END,
             updated_at = NOW()
         WHERE id = $2`,
        [qty, creditId]
      )

      await query(
        `INSERT INTO credit_transactions
           (credit_id, project_id, tx_type, quantity,
            serial_numbers, dispute_reason, tx_date, performed_by, notes)
         VALUES ($1,$2,'cancellation',$3,$4,$5,CURRENT_DATE,$6,$7)`,
        [
          creditId,
          credit.project_id,
          qty,
          [credit.serial_number],
          reason,
          session.userId,
          notes ?? null,
        ]
      )
      break
    }

    // â”€â”€ Flag dispute â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'dispute': {
      const { reason } = body
      await query(
        'UPDATE carbon_credits SET status = \'disputed\', updated_at = NOW() WHERE id = $1',
        [creditId]
      )
      await query(
        `INSERT INTO credit_transactions
           (credit_id, project_id, tx_type, quantity,
            serial_numbers, dispute_reason, tx_date, performed_by)
         VALUES ($1,$2,'dispute_flag',$3,$4,$5,CURRENT_DATE,$6)`,
        [creditId, credit.project_id, 0, [credit.serial_number], reason ?? null, session.userId]
      )
      break
    }

    // â”€â”€ Link to Verra registry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    case 'link_verra': {
      const { verraProjectId, verraCreditRef } = body
      await query(
        `UPDATE carbon_credits
         SET verra_project_id = $1, verra_credit_ref = $2, updated_at = NOW()
         WHERE id = $3`,
        [verraProjectId ?? null, verraCreditRef ?? null, creditId]
      )
      break
    }

    default:
      return NextResponse.json({ error: `Action inconnue: ${action}` }, { status: 400 })
  }

  const updated = await query('SELECT * FROM carbon_credits WHERE id = $1', [creditId])
  return NextResponse.json({ credit: updated.rows[0] })
}
