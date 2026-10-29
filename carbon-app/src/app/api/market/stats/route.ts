import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'secret'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const token = cookies().get('token')?.value
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    
    const decoded = jwt.verify(token, JWT_SECRET) as any
    const companyId = decoded.companyId

    const txResult = await query(
      `SELECT t.*, p.title as local_project_name, p.project_type as local_project_type 
       FROM carbon_transactions t
       LEFT JOIN carbon_projects p ON t.project_id = p.id
       WHERE t.company_id = $1
       ORDER BY t.created_at DESC`,
      [companyId]
    )

    const transactions = txResult.rows.map(tx => ({
      ...tx,
      tons_purchased: parseFloat(tx.tons_purchased),
      amount_paid: parseFloat(tx.amount_paid),
      display_name: tx.local_project_name || tx.external_project_name || 'Projet International Certifié',
      display_type: tx.local_project_type || tx.external_project_type || 'Reforestation Mondiale',
      date: new Date(tx.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })
    }))

    const totalTons = transactions.reduce((sum, tx) => sum + tx.tons_purchased, 0)
    const totalInvested = transactions.reduce((sum, tx) => sum + tx.amount_paid, 0)

    // Aggregate by project type for chart
    const byType = transactions.reduce((acc, tx) => {
      const type = tx.display_type
      acc[type] = (acc[type] || 0) + tx.tons_purchased
      return acc
    }, {} as Record<string, number>)

    const chartData = Object.entries(byType).map(([name, value]) => ({ 
      name, 
      value,
      percentage: Math.round(((value as number) / (totalTons || 1)) * 100)
    })).sort((a, b) => (b.value as number) - (a.value as number))

    return NextResponse.json({
      transactions,
      stats: {
        totalTons,
        totalInvested,
        chartData
      }
    })
  } catch (error) {
    console.error('Market Stats Error:', error)
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 })
  }
}
