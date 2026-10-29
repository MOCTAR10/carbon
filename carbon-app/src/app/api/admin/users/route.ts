import { NextRequest, NextResponse } from 'next/server'
import { getSession, hashPassword } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function requireAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return false
  const result = await query('SELECT role FROM users WHERE id = $1', [session.userId])
  return result.rows.length > 0 && result.rows[0].role === 'admin'
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession('admin')
    if (!await requireAdmin(session)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 20
    const offset = (page - 1) * limit

    let whereClause = 'WHERE 1=1'
    const params: unknown[] = []
    let paramIdx = 1

    if (search) {
      whereClause += ` AND (u.email ILIKE $${paramIdx} OR u.first_name ILIKE $${paramIdx} OR u.last_name ILIKE $${paramIdx} OR c.name ILIKE $${paramIdx})`
      params.push(`%${search}%`)
      paramIdx++
    }
    if (role) {
      whereClause += ` AND u.role = $${paramIdx}`
      params.push(role)
      paramIdx++
    }

    const countResult = await query(
      `SELECT COUNT(*) as count FROM users u LEFT JOIN companies c ON u.company_id = c.id ${whereClause}`,
      params
    )

    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role, u.created_at,
              c.id as company_id, c.name as company_name
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    )

    return NextResponse.json({
      users: result.rows.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        phone: u.phone,
        role: u.role,
        createdAt: u.created_at,
        company: u.company_id ? { id: u.company_id, name: u.company_name } : null,
      })),
      total: parseInt(countResult.rows[0].count),
      page,
      pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    })
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession('admin')
    if (!await requireAdmin(session)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { firstName, lastName, email, password, phone, companyId, role } = await request.json()

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: 'Tous les champs obligatoires doivent être remplis' }, { status: 400 })
    }
    if (role === 'user' && !companyId) {
      return NextResponse.json({ error: 'L\'entreprise est requise pour ce rôle' }, { status: 400 })
    }

    if (!['user', 'admin', 'expert'].includes(role)) {
      return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
    }

    // Check email uniqueness
    const existing = await query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Un compte avec cet email existe déjà' }, { status: 409 })
    }

    // Verify company exists (skip for system roles — expert, admin)
    if (companyId) {
      const company = await query('SELECT id FROM companies WHERE id = $1', [companyId])
      if (company.rows.length === 0) {
        return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 })
      }
    }

    const passwordHash = await hashPassword(password)

    const result = await query(
      `INSERT INTO users (first_name, last_name, email, password_hash, phone, company_id, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, first_name, last_name, role, created_at`,
      [firstName, lastName, email, passwordHash, phone || null, companyId || null, role]
    )

    const u = result.rows[0]
    return NextResponse.json({
      success: true,
      user: {
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        role: u.role,
        createdAt: u.created_at,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Admin create user error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
