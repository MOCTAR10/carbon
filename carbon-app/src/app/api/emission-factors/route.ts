import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAllFactors } from '@/lib/factor-library'

export const dynamic = 'force-dynamic'

/**
 * Factor library for data entry. Retired factors are included (flagged) so bilans that already use one
 * still display it; the picker only offers active ones. Any signed-in portal (company, expert, admin).
 */
export async function GET() {
  try {
    const session = (await getSession('user')) ?? (await getSession('expert')) ?? (await getSession('admin'))
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const factors = await getAllFactors()
    return NextResponse.json(
      { factors },
      { headers: { 'Cache-Control': 'private, max-age=60' } },
    )
  } catch (error) {
    console.error('Emission factors error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
