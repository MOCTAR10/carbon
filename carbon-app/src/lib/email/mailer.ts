/**
 * Nodemailer transporter — singleton
 * Reads SMTP config from environment variables.
 *
 * Required env vars:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * Setup: npm install nodemailer @types/nodemailer
 */

import nodemailer from 'nodemailer'

let _transporter: nodemailer.Transporter | null = null

export function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter

  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST   ?? 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT ?? '587'),
    secure: process.env.SMTP_PORT === '465',  // true only for port 465
    auth: {
      user: process.env.SMTP_USER ?? '',
      pass: process.env.SMTP_PASS ?? '',
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  })

  return _transporter
}

export const FROM = process.env.SMTP_FROM ?? 'CarbonTrack <noreply@carbontrack.ga>'

/**
 * Send an email. Returns true on success, false on failure.
 * Never throws — logs error internally.
 */
export async function sendMail(options: nodemailer.SendMailOptions): Promise<boolean> {
  // If SMTP not configured, log and return false (graceful degradation in dev)
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[mailer] SMTP_USER / SMTP_PASS not set — email not sent')
    console.info('[mailer] Would send:', {
      to: options.to,
      subject: options.subject,
      attachments: (options.attachments as { filename?: string }[] | undefined)?.map(a => a.filename),
    })
    return false
  }

  try {
    const transporter = getTransporter()
    await transporter.sendMail({ from: FROM, ...options })
    return true
  } catch (err) {
    console.error('[mailer] Send failed:', err)
    return false
  }
}
