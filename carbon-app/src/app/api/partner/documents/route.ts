import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

async function getPartnerSession() {
  const token = cookies().get('token')?.value
  if (!token) return null
  try {
    const decoded = await verifyToken(token)
    if (!decoded || (decoded.role !== 'partner' && decoded.role !== 'admin')) return null
    return decoded
  } catch {
    return null
  }
}

// GET /api/partner/documents
export async function GET(req: NextRequest) {
  const session = await getPartnerSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const partnerIdParam = searchParams.get('partner_id')

  let partnerId: number | null = null
  if (session.role === 'admin' && partnerIdParam) {
    partnerId = parseInt(partnerIdParam)
  } else if (session.role === 'partner') {
    partnerId = session.partnerId ?? null
  }

  const result = partnerId
    ? await query(
        `SELECT d.*, cp.title as project_title
         FROM partner_documents d
         LEFT JOIN carbon_projects cp ON d.project_id = cp.id
         WHERE d.partner_id = $1
         ORDER BY d.created_at DESC`,
        [partnerId]
      )
    : await query(
        `SELECT d.*, cp.title as project_title, p.name as partner_name
         FROM partner_documents d
         LEFT JOIN carbon_projects cp ON d.project_id = cp.id
         LEFT JOIN partners p ON d.partner_id = p.id
         ORDER BY d.created_at DESC`
      )

  return NextResponse.json({ documents: result.rows })
}

// POST /api/partner/documents — register document metadata (file_url already uploaded)
export async function POST(req: NextRequest) {
  const session = await getPartnerSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const partnerId = session.role === 'partner' ? session.partnerId : null
  if (!partnerId) return NextResponse.json({ error: 'Partner ID manquant' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const { project_id, category, title, description, file_url, file_name, file_size_kb, mime_type } = body

  if (!title || !file_url || !category) {
    return NextResponse.json({ error: 'Titre, URL du fichier et catégorie requis' }, { status: 400 })
  }

  const result = await query(
    `INSERT INTO partner_documents
       (partner_id, project_id, category, title, description, file_url, file_name, file_size_kb, mime_type)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [partnerId, project_id || null, category, title, description || null, file_url, file_name || null, file_size_kb || null, mime_type || null]
  )

  return NextResponse.json({ document: result.rows[0] }, { status: 201 })
}
