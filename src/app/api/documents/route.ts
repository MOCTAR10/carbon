import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getCompanySession, unauthorized, parseId, ownsAssessment, certificationLock, lockedResponse } from '@/lib/company'
import { checkUpload, EVIDENCE_EXTENSIONS, EVIDENCE_MAX_BYTES } from '@/lib/uploads'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
const FACTOR_ID_RE = /^[a-zA-Z0-9_-]{1,100}$/

// GET: list documents for an assessment (optionally filtered by factorId, year, month)
export async function GET(request: NextRequest) {
  try {
    const session = await getCompanySession()
    if (!session) return unauthorized()

    const sp = request.nextUrl.searchParams
    const assessmentId = parseId(sp.get('assessmentId'))
    if (!assessmentId) return NextResponse.json({ error: 'assessmentId requis' }, { status: 400 })
    if (!(await ownsAssessment(assessmentId, session.companyId))) {
      return NextResponse.json({ error: 'Non trouvé' }, { status: 404 })
    }

    const factorId = sp.get('factorId')
    const year = parseId(sp.get('year'))
    const month = parseId(sp.get('month'))

    let sql = 'SELECT * FROM audit_documents WHERE assessment_id = $1'
    const params: (string | number)[] = [assessmentId]

    if (factorId) {
      sql += ` AND emission_factor_id = $${params.length + 1}`
      params.push(factorId)
    }
    if (year) {
      sql += ` AND year = $${params.length + 1}`
      params.push(year)
    }
    if (month) {
      sql += ` AND month = $${params.length + 1}`
      params.push(month)
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
    const session = await getCompanySession()
    if (!session) return unauthorized()

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const assessmentId = parseId(formData.get('assessmentId'))
    const factorId = String(formData.get('factorId') ?? '')
    const year = parseId(formData.get('year'))
    const month = parseId(formData.get('month'))

    if (!file || !assessmentId || !FACTOR_ID_RE.test(factorId) || !year || !month || month > 12) {
      return NextResponse.json({ error: 'Données manquantes ou invalides' }, { status: 400 })
    }
    if (!(await ownsAssessment(assessmentId, session.companyId))) {
      return NextResponse.json({ error: 'Non trouvé' }, { status: 404 })
    }
    if (await certificationLock(assessmentId)) return lockedResponse()

    const checked = await checkUpload(file, EVIDENCE_EXTENSIONS, EVIDENCE_MAX_BYTES)
    if ('error' in checked) return NextResponse.json({ error: checked.error }, { status: 400 })

    const assessmentDir = path.join(UPLOAD_DIR, String(assessmentId))
    await mkdir(assessmentDir, { recursive: true })

    const safeName = `${factorId}_${year}_${month}_${Date.now()}.${checked.ext}`
    const filePath = path.join(assessmentDir, safeName)
    await writeFile(filePath, checked.buffer)

    try {
      const result = await query(
        `INSERT INTO audit_documents (assessment_id, emission_factor_id, year, month, filename, original_name, file_size, mime_type, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [assessmentId, factorId, year, month, safeName, file.name.slice(0, 255), file.size, checked.mime.slice(0, 100), session.userId]
      )
      return NextResponse.json(result.rows[0], { status: 201 })
    } catch (e) {
      await unlink(filePath).catch(() => {}) // don't leave orphan files behind
      throw e
    }
  } catch (error) {
    console.error('Document upload error:', error)
    return NextResponse.json({ error: 'Erreur lors du téléversement' }, { status: 500 })
  }
}

// DELETE: remove a document
export async function DELETE(request: NextRequest) {
  try {
    const session = await getCompanySession()
    if (!session) return unauthorized()

    const body = await request.json().catch(() => ({}))
    const id = parseId(body.id)
    const assessmentId = parseId(body.assessmentId)
    if (!id || !assessmentId) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })

    if (!(await ownsAssessment(assessmentId, session.companyId))) {
      return NextResponse.json({ error: 'Non trouvé' }, { status: 404 })
    }
    if (await certificationLock(assessmentId)) return lockedResponse()

    const doc = await query('SELECT * FROM audit_documents WHERE id = $1 AND assessment_id = $2', [id, assessmentId])
    if (doc.rows.length === 0) return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })

    await query('DELETE FROM audit_documents WHERE id = $1', [id])
    const filePath = path.join(UPLOAD_DIR, String(assessmentId), path.basename(doc.rows[0].filename))
    await unlink(filePath).catch(() => { /* file may not exist */ })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Document delete error:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
