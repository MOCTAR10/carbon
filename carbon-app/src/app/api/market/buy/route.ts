import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'secret'

export async function POST(req: Request) {
  try {
    const token = cookies().get('token')?.value
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    
    const decoded = jwt.verify(token, JWT_SECRET) as any
    const companyId = decoded.companyId

    const body = await req.json()
    // Added project_title and project_type to snapshot API purchases
    const { project_id, tons, price_per_ton, is_local, payment_method, project_title, project_type } = body

    if (!project_id || !tons || tons <= 0) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    const amountPaid = tons * price_per_ton
    // Commission: 20% for local NGOs, 10% for global projects
    let commissionPercentage = is_local ? 0.20 : 0.10; 

    // Handle Global Blockchain projects (Toucan)
    // In production, this would trigger a retirement on-chain via a wallet.
    // For now, we simulate the "Blockchain Retirement" log.
    let external_tx_hash = null
    if (!is_local && typeof project_id === 'string' && project_id.startsWith('toucan_')) {
      // Simulate a Polygon transaction hash for the carbon retirement
      external_tx_hash = '0x' + Math.random().toString(16).substring(2, 42)
    }

    const commissionAmount = amountPaid * commissionPercentage
    const partnerCredited = is_local ? (amountPaid - commissionAmount) : 0;

    const insertTx = await query(
      `INSERT INTO carbon_transactions (
        company_id, project_id, tons_purchased, amount_paid, 
        commission_amount, partner_credited, payment_method, status, 
        external_project_name, external_project_type
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        companyId, 
        is_local ? project_id : null, 
        tons, 
        amountPaid, 
        commissionAmount, 
        partnerCredited, 
        payment_method || 'api', 
        'completed', 
        is_local ? null : project_title, 
        is_local ? null : project_type
      ]
    )

    if (is_local) {
      // For local projects, we deduct the tons and credit the partner's wallet
      const projUpdate = await query(
        `UPDATE carbon_projects SET tons_sold = tons_sold + $1 WHERE id = $2 RETURNING partner_id`,
        [tons, project_id]
      )

      if (projUpdate.rows.length > 0 && projUpdate.rows[0].partner_id) {
        // The NGO partner receives 80% of the funds directly in their wallet
        await query(
          `UPDATE partners SET wallet_balance = wallet_balance + $1 WHERE id = $2`,
          [partnerCredited, projUpdate.rows[0].partner_id]
        )
      }
    }

    return NextResponse.json({ 
        success: true, 
        transactionId: insertTx.rows[0].id,
        message: 'Crédits carbone achetés.'
    })

  } catch (error) {
    console.error('Market Buy API Error:', error)
    return NextResponse.json({ error: 'Erreur lors de l’achat réseau' }, { status: 500 })
  }
}
