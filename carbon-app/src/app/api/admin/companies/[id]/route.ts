import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function requireAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return false
  const result = await query('SELECT role FROM users WHERE id = $1', [session.userId])
  return result.rows.length > 0 && result.rows[0].role === 'admin'
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession('admin')
    if (!await requireAdmin(session)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const companyId = parseInt(params.id)

    const [companyResult, usersResult, subscriptionsResult, sitesResult] = await Promise.all([
      query('SELECT * FROM companies WHERE id = $1', [companyId]),
      query('SELECT id, email, first_name, last_name, phone, role, created_at FROM users WHERE company_id = $1 ORDER BY created_at DESC', [companyId]),
      query('SELECT * FROM subscriptions WHERE company_id = $1 ORDER BY created_at DESC', [companyId]),
      query(`SELECT s.id, s.name, s.type, s.address,
               COUNT(a.id) as assessment_count
             FROM sites s
             LEFT JOIN assessments a ON a.site_id = s.id
             WHERE s.company_id = $1
             GROUP BY s.id ORDER BY s.created_at DESC`, [companyId]),
    ])

    if (companyResult.rows.length === 0) {
      return NextResponse.json({ error: 'Entreprise non trouvée' }, { status: 404 })
    }

    const c = companyResult.rows[0]
    return NextResponse.json({
      company: {
        id: c.id,
        name: c.name,
        rccm: c.rccm,
        sector: c.sector,
        createdAt: c.created_at,
      },
      users: usersResult.rows.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        phone: u.phone,
        role: u.role,
        createdAt: u.created_at,
      })),
      subscriptions: subscriptionsResult.rows.map(s => ({
        id: s.id,
        plan: s.plan,
        amount: parseFloat(s.amount),
        currency: s.currency,
        paymentMethod: s.payment_method,
        paymentRef: s.payment_ref,
        status: s.status,
        startsAt: s.starts_at,
        expiresAt: s.expires_at,
        createdAt: s.created_at,
      })),
      sites: sitesResult.rows.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        address: s.address,
        assessmentCount: parseInt(s.assessment_count),
      })),
    })
  } catch (error) {
    console.error('Admin company detail error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession('admin')
    if (!await requireAdmin(session)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const companyId = parseInt(params.id)
    await query('DELETE FROM companies WHERE id = $1', [companyId])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin company delete error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
