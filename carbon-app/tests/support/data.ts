// Shared test data. Every account the suite creates uses the QA_DOMAIN so cleanup can find it.
export const QA_DOMAIN = 'qa.carbontrack.test'
export const PASSWORD = 'Qa-Regression-2026!'

export const ADMIN = { email: `admin@${QA_DOMAIN}`, password: PASSWORD, firstName: 'Awa', lastName: 'Admin' }
export const EXPERT = { email: `expert@${QA_DOMAIN}`, password: PASSWORD, firstName: 'Eli', lastName: 'Expert' }

export const YEAR = new Date().getFullYear()

let seq = 0
/** Unique per worker + call: emails, names and the client IP the rate limiter keys on. */
export function uid(prefix = 'co') {
  seq++
  return `${prefix}-${process.pid}-${Date.now().toString(36)}-${seq}`
}

/** Distinct X-Real-IP per context so the login/register rate limits never couple tests together. */
export function fakeIp() {
  const r = () => Math.floor(Math.random() * 250) + 1
  return `10.${r()}.${r()}.${r()}`
}

// Minimal valid files (magic bytes are what the server checks)
export const FILES = {
  pdf: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n'),
  png: Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex'),
  html: Buffer.from('<html><script>alert(1)</script></html>'),
  svg: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
}

// Butane (France) — 3.46 kgCO2e/kg, scope 1. Used as the reference factor in calculation checks.
export const BUTANE = { id: 'butane_fr', factor: 3.46, scope: 1 }
