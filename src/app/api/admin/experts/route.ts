import { NextRequest, NextResponse } from 'next/server'
import { getSession, hashPassword } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function requireAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return false
  const result = await query('SELECT role FROM users WHERE id = $1', [session.userId])
  return result.rows.length > 0 && result.rows[0].role === 'admin'
}

async function ensureExpertColumn() {
  await query(
    `ALTER TABLE certification_requests ADD COLUMN IF NOT EXISTS expert_user_id INTEGER REFERENCES users(id)`,
    []
  )
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession('admin')
    if (!await requireAdmin(session)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    await ensureExpertColumn()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const params: unknown[] = []
    let whereExtra = ''
    if (search) {
      params.push(`%${search}%`)
      whereExtra = ` AND (u.email ILIKE $1 OR u.first_name ILIKE $1 OR u.last_name ILIKE $1)`
    }

    const countResult = await query(
      `SELECT COUNT(*) as count FROM users u WHERE u.role = 'expert'${whereExtra}`,
      params
    )

    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.created_at,
              (SELECT COUNT(*) FROM certification_requests cr WHERE cr.expert_user_id = u.id) as assignment_count
       FROM users u
       WHERE u.role = 'expert'${whereExtra}
       ORDER BY u.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    )

    return NextResponse.json({
      experts: result.rows.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        phone: u.phone,
        createdAt: u.created_at,
        assignmentCount: parseInt(u.assignment_count),
      })),
      total: parseInt(countResult.rows[0].count),
      page,
      pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    })
  } catch (error) {
    console.error('Admin experts GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession('admin')
    if (!await requireAdmin(session)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { firstName, lastName, email, password, phone } = await request.json()

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: 'Prénom, nom, email et mot de passe sont obligatoires' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 6 caractères' }, { status: 400 })
    }

    // Check email uniqueness
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()])
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Un compte avec cet email existe déjà' }, { status: 409 })
    }

    // Experts always belong to CarbonTrack Administration company
    const company = await query(`SELECT id FROM companies WHERE name = 'CarbonTrack Administration' LIMIT 1`)
    if (company.rows.length === 0) {
      return NextResponse.json({ error: 'Entreprise CarbonTrack Administration introuvable. Exécutez seed-admin.js.' }, { status: 500 })
    }
    const companyId = company.rows[0].id

    const passwordHash = await hashPassword(password)

    const result = await query(
      `INSERT INTO users (first_name, last_name, email, password_hash, phone, company_id, role)
       VALUES ($1, $2, $3, $4, $5, $6, 'expert')
       RETURNING id, email, first_name, last_name, role, created_at`,
      [firstName, lastName, email.toLowerCase().trim(), passwordHash, phone || null, companyId]
    )

    const u = result.rows[0]
    return NextResponse.json({
      success: true,
      expert: {
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        role: u.role,
        createdAt: u.created_at,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Admin create expert error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
