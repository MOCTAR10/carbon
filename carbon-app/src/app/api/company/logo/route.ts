import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getCompanySession, unauthorized } from '@/lib/company'
import { checkUpload, LOGO_EXTENSIONS, LOGO_MAX_BYTES } from '@/lib/uploads'
import { writeFile, mkdir, readdir, unlink } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

const LOGO_DIR = path.join(process.cwd(), 'public', 'logos')

/** Remove every stored logo file of a company except `keep`. */
async function removeOldLogos(companyId: number, keep?: string) {
  const files = await readdir(LOGO_DIR).catch(() => [] as string[])
  const prefix = `company-${companyId}`
  await Promise.all(
    files
      .filter(f => (f === `${prefix}.${f.split('.').pop()}` || f.startsWith(`${prefix}-`)) && f !== keep)
      .map(f => unlink(path.join(LOGO_DIR, f)).catch(() => {}))
  )
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCompanySession()
    if (!session) return unauthorized()

    const formData = await request.formData()
    const file = formData.get('logo') as File | null
    if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })

    // SVG is refused: it can carry scripts that would run on our origin
    const checked = await checkUpload(file, LOGO_EXTENSIONS, LOGO_MAX_BYTES)
    if ('error' in checked) return NextResponse.json({ error: checked.error }, { status: 400 })

    await mkdir(LOGO_DIR, { recursive: true })
    // Versioned name: a new logo is never hidden behind the CDN/nginx cache of the old one
    const filename = `company-${session.companyId}-${Date.now()}.${checked.ext === 'jpeg' ? 'jpg' : checked.ext}`
    await writeFile(path.join(LOGO_DIR, filename), checked.buffer)

    const logoUrl = `/logos/${filename}`
    await query('UPDATE companies SET logo_url = $1, updated_at = NOW() WHERE id = $2', [logoUrl, session.companyId])
    await removeOldLogos(session.companyId, filename)

    return NextResponse.json({ logoUrl })
  } catch (error) {
    console.error('Logo upload error:', error)
    return NextResponse.json({ error: 'Erreur lors du téléversement' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await getCompanySession()
    if (!session) return unauthorized()

    await query('UPDATE companies SET logo_url = NULL, updated_at = NOW() WHERE id = $1', [session.companyId])
    await removeOldLogos(session.companyId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logo delete error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
