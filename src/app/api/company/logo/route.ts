import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const LOGO_DIR = path.join(process.cwd(), 'public', 'logos')
const MAX_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('logo') as File | null

    if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Format invalide. Accepté : JPG, PNG, WebP, SVG' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Fichier trop lourd (max 2 Mo)' }, { status: 400 })
    }

    if (!existsSync(LOGO_DIR)) await mkdir(LOGO_DIR, { recursive: true })

    const ext = file.type === 'image/svg+xml' ? 'svg'
      : file.type === 'image/webp' ? 'webp'
      : file.type === 'image/png' ? 'png' : 'jpg'

    const filename = `company-${session.companyId}.${ext}`
    const filepath = path.join(LOGO_DIR, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)

    const logoUrl = `/logos/${filename}`
    await query('UPDATE companies SET logo_url = $1, updated_at = NOW() WHERE id = $2', [logoUrl, session.companyId])

    return NextResponse.json({ logoUrl })
  } catch (error) {
    console.error('Logo upload error:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'upload' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    await query('UPDATE companies SET logo_url = NULL, updated_at = NOW() WHERE id = $1', [session.companyId])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logo delete error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
