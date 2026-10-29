import { query } from '@/lib/db'

export type NotifType =
  | 'cert_request'
  | 'cert_assigned'
  | 'cert_validated'
  | 'cert_rejected'
  | 'cert_comment'
  | 'new_subscription'
  | 'subscription_expiring'
  | 'assessment_saved'
  | 'system'

export async function createNotification(
  userId: number,
  type: NotifType,
  title: string,
  message: string,
  link?: string
) {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, message, link ?? null]
    )
  } catch (err) {
    // Never throw — notifications are best-effort
    console.error('createNotification failed:', err)
  }
}

/** Notify every admin user */
export async function notifyAllAdmins(
  type: NotifType,
  title: string,
  message: string,
  link?: string
) {
  try {
    const result = await query(`SELECT id FROM users WHERE role = 'admin'`)
    await Promise.all(
      result.rows.map(r => createNotification(r.id, type, title, message, link))
    )
  } catch (err) {
    console.error('notifyAllAdmins failed:', err)
  }
}

/** Notify every user belonging to a company */
export async function notifyCompanyUsers(
  companyId: number,
  type: NotifType,
  title: string,
  message: string,
  link?: string
) {
  try {
    const result = await query(`SELECT id FROM users WHERE company_id = $1`, [companyId])
    await Promise.all(
      result.rows.map(r => createNotification(r.id, type, title, message, link))
    )
  } catch (err) {
    console.error('notifyCompanyUsers failed:', err)
  }
}
