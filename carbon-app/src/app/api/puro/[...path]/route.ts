import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

const PURO_BASE = 'https://mypuro.api.purouat.com/mypuro/api'

async function getCredentials(session: Awaited<ReturnType<typeof getSession>>, searchParams: URLSearchParams) {
  if (!session) return null

  let partnerId: number | null = null

  if (session.role === 'partner') {
    partnerId = session.partnerId || null
  } else if (session.role === 'admin') {
    const pid = searchParams.get('partner_id')
    partnerId = pid ? parseInt(pid) : null
  }

  if (!partnerId) return null

  const result = await query(
    'SELECT puro_api_key, puro_api_secret FROM partners WHERE id = $1 AND puro_api_key IS NOT NULL',
    [partnerId]
  )
  if (!result.rows[0]?.puro_api_key) return null

  return {
    key: result.rows[0].puro_api_key as string,
    secret: result.rows[0].puro_api_secret as string,
    partnerId,
  }
}

async function proxyRequest(req: NextRequest, params: { path: string[] }) {
  const session = await getSession()
  const url = new URL(req.url)

  const creds = await getCredentials(session, url.searchParams)
  if (!creds) {
    return NextResponse.json({ error: 'Non autorisé ou clé Puro.earth non configurée' }, { status: 401 })
  }

  // Build Puro URL — strip our internal params
  url.searchParams.delete('partner_id')
  const puroPath = params.path.join('/')
  const qs = url.searchParams.toString()
  const puroUrl = `${PURO_BASE}/${puroPath}${qs ? '?' + qs : ''}`

  const basicAuth = Buffer.from(`${creds.key}:${creds.secret}`).toString('base64')
  const idempotencyKey = `ct-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  const headers: Record<string, string> = {
    Authorization: `Basic ${basicAuth}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  let body: string | undefined
  if (req.method !== 'GET') {
    headers['Idempotency-Key'] = idempotencyKey
    try { body = await req.text() } catch { /* empty body */ }
  }

  try {
    const puroRes = await fetch(puroUrl, { method: req.method, headers, body })
    const data = await puroRes.json().catch(() => ({}))

    // Log significant mutations to our DB
    if (req.method === 'POST' && puroPath.includes('retirement')) {
      const parsedBody = body ? JSON.parse(body) : {}
      await query(
        `INSERT INTO puro_submissions (partner_id, submission_type, puro_transaction_id, account_number, tons, status, request_payload, response_payload, idempotency_key)
         VALUES ($1, 'retirement', $2, $3, $4, $5, $6, $7, $8)`,
        [
          creds.partnerId,
          (data as any)?.transactionId || null,
          parsedBody.accountNumber || null,
          parsedBody.quantity || null,
          puroRes.ok ? 'success' : 'failed',
          JSON.stringify(parsedBody),
          JSON.stringify(data),
          idempotencyKey,
        ]
      ).catch(err => console.error('[Puro log error]', err))
    }

    return NextResponse.json(data, { status: puroRes.status })
  } catch (err) {
    console.error('[Puro Proxy Error]', err)
    return NextResponse.json({ error: 'Erreur connexion Puro.earth UAT' }, { status: 502 })
  }
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params)
}
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params)
}
export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params)
}
