// Server-side guards shared by the company (role 'user') API routes.
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export type CompanySession = { userId: number; email: string; companyId: number; role: 'user' }

/** Company session or null: the `token` cookie must belong to a company user with a company. */
export async function getCompanySession(): Promise<CompanySession | null> {
  const s = await getSession()
  if (!s || s.role !== 'user' || !s.companyId) return null
  return s as CompanySession
}

export const unauthorized = () => NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

/** Strict positive integer id ("12" → 12; "12abc", " 12", "-1" → null). */
export function parseId(v: unknown): number | null {
  if (typeof v === 'number') return Number.isInteger(v) && v > 0 ? v : null
  if (typeof v !== 'string' || !/^\d{1,10}$/.test(v)) return null
  const n = Number(v)
  return n > 0 ? n : null
}

/** True when the assessment belongs to the company. */
export async function ownsAssessment(assessmentId: number, companyId: number) {
  const r = await query(
    'SELECT 1 FROM assessments a JOIN sites s ON a.site_id = s.id WHERE a.id = $1 AND s.company_id = $2',
    [assessmentId, companyId]
  )
  return r.rows.length > 0
}

/**
 * Status of the certification request that locks the assessment's data, or null when editable.
 * Data is frozen from submission onwards (any status but rejected): the expert audits exactly what was submitted.
 */
export async function certificationLock(assessmentId: number): Promise<string | null> {
  const r = await query(
    `SELECT status FROM certification_requests
     WHERE assessment_id = $1 AND status <> 'rejected'
     ORDER BY requested_at DESC LIMIT 1`,
    [assessmentId]
  )
  return r.rows[0]?.status ?? null
}

export const lockedResponse = () =>
  NextResponse.json(
    { error: 'Ce bilan est en cours de certification : ses données sont verrouillées.' },
    { status: 409 }
  )
