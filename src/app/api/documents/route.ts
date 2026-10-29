import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export const dynamic = 'force-dynamic'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

// GET: list documents for an assessment (optionally filtered by factorId, year, month)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const sp = request.nextUrl.searchParams
    const assessmentId = sp.get('assessmentId')
    if (!assessmentId) return NextResponse.json({ error: 'assessmentId requis' }, { status: 400 })

    // Access check
    const ac = await query(
      'SELECT a.id FROM assessments a JOIN sites s ON a.site_id = s.id WHERE a.id = $1 AND s.company_id = $2',
      [assessmentId, session.companyId]
    )
    if (ac.rows.length === 0) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 })

    const factorId = sp.get('factorId')
    const year = sp.get('year')
    const month = sp.get('month')

    let sql = 'SELECT * FROM audit_documents WHERE assessment_id = $1'
    const params: (string | number)[] = [parseInt(assessmentId)]

    if (factorId) {
      sql += ` AND emission_factor_id = $${params.length + 1}`
      params.push(factorId)
    }
    if (year) {
      sql += ` AND year = $${params.length + 1}`
      params.push(parseInt(year))
    }
    if (month) {
      sql += ` AND month = $${params.length + 1}`
      params.push(parseInt(month))
    }

    sql += ' ORDER BY created_at DESC'
    const result = await query(sql, params)
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Documents fetch error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST: upload a document
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const assessmentId = formData.get('assessmentId') as string
    const factorId = formData.get('factorId') as string
    const year = formData.get('year') as string
    const month = formData.get('month') as string

    if (!file || !assessmentId || !factorId || !year || !month) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    // Access check
    const ac = await query(
      'SELECT a.id FROM assessments a JOIN sites s ON a.site_id = s.id WHERE a.id = $1 AND s.company_id = $2',
      [assessmentId, session.companyId]
    )
    if (ac.rows.length === 0) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 })

    // Ensure upload dir exists
    const assessmentDir = path.join(UPLOAD_DIR, assessmentId)
    if (!existsSync(assessmentDir)) {
      await mkdir(assessmentDir, { recursive: true })
    }

    // Generate unique filename
    const ext = path.extname(file.name) || ''
    const timestamp = Date.now()
    const safeName = `${factorId}_${year}_${month}_${timestamp}${ext}`.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = path.join(assessmentDir, safeName)

    // Write file
    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    // Insert DB record
    const result = await query(
      `INSERT INTO audit_documents (assessment_id, emission_factor_id, year, month, filename, original_name, file_size, mime_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        parseInt(assessmentId),
        factorId,
        parseInt(year),
        parseInt(month),
        safeName,
        file.name,
        file.size,
        file.type || 'application/octet-stream',
        session.userId,
      ]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('Document upload error:', error)
    return NextResponse.json({ error: 'Erreur upload' }, { status: 500 })
  }
}

// DELETE: remove a document
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id, assessmentId } = await request.json()
    if (!id || !assessmentId) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })

    // Access check
    const ac = await query(
      'SELECT a.id FROM assessments a JOIN sites s ON a.site_id = s.id WHERE a.id = $1 AND s.company_id = $2',
      [assessmentId, session.companyId]
    )
    if (ac.rows.length === 0) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 })

    // Get doc info before deleting
    const doc = await query('SELECT * FROM audit_documents WHERE id = $1 AND assessment_id = $2', [id, assessmentId])
    if (doc.rows.length === 0) return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })

    // Delete file from disk
    const filePath = path.join(UPLOAD_DIR, String(assessmentId), doc.rows[0].filename)
    try { await unlink(filePath) } catch { /* file may not exist */ }

    // Delete DB record
    await query('DELETE FROM audit_documents WHERE id = $1', [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Document delete error:', error)
    return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 })
  }
}
