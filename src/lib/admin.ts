import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

/** Admin session, re-checked against the DB role (a demoted account loses access before its token expires). */
export async function getAdminSession() {
  const session = await getSession('admin')
  if (!session) return null
  const { rows } = await query('SELECT role FROM users WHERE id = $1', [session.userId])
  return rows[0]?.role === 'admin' ? session : null
}

export const forbidden = () => NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
