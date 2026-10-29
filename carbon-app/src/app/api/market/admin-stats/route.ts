import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || 'secret'

export async function GET() {
  try {
    const token = cookies().get('token')?.value
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const decoded = jwt.verify(token, JWT_SECRET) as any
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Run all 4 analytics queries in parallel
    const [monthlyResult, byTypeResult, byCountryResult, totalsResult] = await Promise.all([
      // Q1: Monthly volume (last 6 months)
      query(`
        SELECT
          DATE_TRUNC('month', created_at) AS month,
          SUM(tons_purchased)::numeric AS total_tons,
          SUM(amount_paid)::numeric AS total_amount,
          SUM(commission_amount)::numeric AS total_commission,
          COUNT(*)::int AS transactions
        FROM carbon_transactions
        WHERE created_at > NOW() - INTERVAL '6 months'
        GROUP BY month
        ORDER BY month ASC
      `),

      // Q2: By project type (local + global)
      query(`
        SELECT
          COALESCE(p.project_type, t.external_project_type, 'Autre') AS type,
          SUM(t.tons_purchased)::numeric AS tons,
          SUM(t.amount_paid)::numeric AS amount
        FROM carbon_transactions t
        LEFT JOIN carbon_projects p ON t.project_id = p.id
        GROUP BY type
        ORDER BY tons DESC
      `),

      // Q3: By country (local projects joined)
      query(`
        SELECT
          cp.country,
          SUM(ct.tons_purchased)::numeric AS tons,
          COUNT(*)::int AS count
        FROM carbon_transactions ct
        JOIN carbon_projects cp ON ct.project_id = cp.id
        GROUP BY cp.country
        ORDER BY tons DESC
        LIMIT 10
      `),

      // Q4: Global platform totals
      query(`
        SELECT
          COALESCE(SUM(tons_purchased), 0)::numeric AS total_tons,
          COALESCE(SUM(amount_paid), 0)::numeric AS total_amount,
          COALESCE(SUM(commission_amount), 0)::numeric AS total_commission,
          COUNT(*)::int AS total_transactions
        FROM carbon_transactions
        WHERE status = 'completed'
      `),
    ])

    const monthly = monthlyResult.rows.map(r => ({
      month: new Date(r.month).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
      monthRaw: r.month,
      totalTons: parseFloat(r.total_tons) || 0,
      totalAmount: parseFloat(r.total_amount) || 0,
      totalCommission: parseFloat(r.total_commission) || 0,
      transactions: r.transactions,
    }))

    const byType = byTypeResult.rows.map(r => ({
      type: r.type,
      tons: parseFloat(r.tons) || 0,
      amount: parseFloat(r.amount) || 0,
    }))

    const byCountry = byCountryResult.rows.map(r => ({
      country: r.country,
      tons: parseFloat(r.tons) || 0,
      count: r.count,
    }))

    const totals = totalsResult.rows[0] ? {
      totalTons: parseFloat(totalsResult.rows[0].total_tons) || 0,
      totalAmount: parseFloat(totalsResult.rows[0].total_amount) || 0,
      totalCommission: parseFloat(totalsResult.rows[0].total_commission) || 0,
      totalTransactions: totalsResult.rows[0].total_transactions || 0,
    } : { totalTons: 0, totalAmount: 0, totalCommission: 0, totalTransactions: 0 }

    return NextResponse.json({ monthly, byType, byCountry, totals })
  } catch (error) {
    console.error('Admin Market Stats Error:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des statistiques' }, { status: 500 })
  }
}
