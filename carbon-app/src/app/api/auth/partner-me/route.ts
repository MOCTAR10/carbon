import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'partner') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const userResult = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role, u.partner_id,
              p.id as pid, p.name as partner_name, p.type as partner_type, p.country,
              p.virtual_card_number, p.wallet_balance, p.puro_connected,
              p.puro_account_number, p.puro_facility_code, p.puro_api_key,
              p.mission, p.website, p.contact_email, p.logo_url
       FROM users u
       LEFT JOIN partners p ON u.partner_id = p.id
       WHERE u.id = $1`,
      [session.userId]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const u = userResult.rows[0]

    // Get partner sales stats
    const statsResult = await query(
      `SELECT
         COALESCE(SUM(ct.tons_purchased), 0) as total_tons_sold,
         COALESCE(SUM(ct.partner_credited), 0) as total_earned,
         COUNT(ct.id) as total_transactions
       FROM carbon_transactions ct
       JOIN carbon_projects cp ON ct.project_id = cp.id
       WHERE cp.partner_id = $1`,
      [u.partner_id]
    )
    const stats = statsResult.rows[0]

    // Get recent transactions
    const txResult = await query(
      `SELECT ct.id, ct.tons_purchased, ct.amount_paid, ct.partner_credited,
              ct.status, ct.created_at, cp.title as project_title
       FROM carbon_transactions ct
       JOIN carbon_projects cp ON ct.project_id = cp.id
       WHERE cp.partner_id = $1
       ORDER BY ct.created_at DESC LIMIT 10`,
      [u.partner_id]
    )

    return NextResponse.json({
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      phone: u.phone,
      role: u.role,
      partner: u.partner_id ? {
        id: u.pid,
        name: u.partner_name,
        type: u.partner_type,
        country: u.country,
        virtualCardNumber: u.virtual_card_number,
        walletBalance: parseFloat(u.wallet_balance || '0'),
        puroConnected: u.puro_connected || false,
        puroAccountNumber: u.puro_account_number || null,
        puroFacilityCode: u.puro_facility_code || null,
        // Never expose the API secret, only signal if key is set
        puroKeyConfigured: !!u.puro_api_key,
        mission: u.mission || null,
        website: u.website || null,
        contactEmail: u.contact_email || null,
        logoUrl: u.logo_url || null,
      } : null,
      stats: {
        totalTonsSold: parseFloat(stats.total_tons_sold),
        totalEarned: parseFloat(stats.total_earned),
        totalTransactions: parseInt(stats.total_transactions),
      },
      recentTransactions: txResult.rows.map(r => ({
        id: r.id,
        tonsPurchased: parseFloat(r.tons_purchased),
        amountPaid: parseFloat(r.amount_paid),
        partnerCredited: parseFloat(r.partner_credited || '0'),
        status: r.status,
        createdAt: r.created_at,
        projectTitle: r.project_title,
      })),
    })
  } catch (error) {
    console.error('Partner-me error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
