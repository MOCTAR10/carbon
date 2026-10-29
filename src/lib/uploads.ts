// Upload validation + safe serving for user-supplied files.
// Never trust the client's file name or MIME type: the type is chosen server-side from the
// extension AND the file's magic bytes, and files are served with headers that stop the
// browser from executing them on our origin.

type Kind = { mime: string; magic?: (b: Buffer) => boolean; inline: boolean }

const startsWith = (b: Buffer, ...bytes: number[]) => bytes.every((x, i) => b[i] === x)
const isZip = (b: Buffer) => startsWith(b, 0x50, 0x4b, 0x03, 0x04)
const isOle = (b: Buffer) => startsWith(b, 0xd0, 0xcf, 0x11, 0xe0)

const KINDS: Record<string, Kind> = {
  pdf:  { mime: 'application/pdf', magic: b => startsWith(b, 0x25, 0x50, 0x44, 0x46), inline: true },
  png:  { mime: 'image/png',       magic: b => startsWith(b, 0x89, 0x50, 0x4e, 0x47), inline: true },
  jpg:  { mime: 'image/jpeg',      magic: b => startsWith(b, 0xff, 0xd8, 0xff), inline: true },
  jpeg: { mime: 'image/jpeg',      magic: b => startsWith(b, 0xff, 0xd8, 0xff), inline: true },
  webp: { mime: 'image/webp',      magic: b => b.subarray(8, 12).toString('ascii') === 'WEBP', inline: true },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', magic: isZip, inline: false },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', magic: isZip, inline: false },
  xls:  { mime: 'application/vnd.ms-excel', magic: isOle, inline: false },
  doc:  { mime: 'application/msword', magic: isOle, inline: false },
  csv:  { mime: 'text/csv', inline: false },
  txt:  { mime: 'text/plain', inline: false },
}

export const EVIDENCE_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'xlsx', 'docx', 'xls', 'doc', 'csv']
export const LOGO_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']
export const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024
export const LOGO_MAX_BYTES = 2 * 1024 * 1024

export type CheckedFile = { ext: string; mime: string; buffer: Buffer }

/** Validate an uploaded File; returns the server-chosen ext/mime or a French error message. */
export async function checkUpload(
  file: File, allowed: string[], maxBytes: number,
): Promise<CheckedFile | { error: string }> {
  if (!file || file.size === 0) return { error: 'Fichier vide' }
  if (file.size > maxBytes) return { error: `Fichier trop volumineux (max ${Math.round(maxBytes / 1024 / 1024)} Mo)` }
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  const kind = KINDS[ext]
  if (!kind || !allowed.includes(ext)) {
    return { error: `Format non accepté. Formats autorisés : ${allowed.map(e => e.toUpperCase()).join(', ')}` }
  }
  const buffer = Buffer.from(await file.arrayBuffer())
  if (kind.magic && !kind.magic(buffer)) return { error: 'Le contenu du fichier ne correspond pas à son extension' }
  return { ext, mime: kind.mime, buffer }
}

/** Response headers for serving a stored user file. Unknown/legacy types are forced to download. */
export function safeFileHeaders(storedName: string, originalName: string, size: number): Record<string, string> {
  const ext = (storedName.split('.').pop() || '').toLowerCase()
  const kind = KINDS[ext]
  const mime = kind?.mime ?? 'application/octet-stream'
  const disposition = kind?.inline ? 'inline' : 'attachment'
  const headers: Record<string, string> = {
    'Content-Type': mime,
    'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(originalName)}`,
    'Content-Length': String(size),
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
  }
  // Chrome refuses to render PDFs under a sandbox CSP; its PDF viewer cannot script our origin anyway
  if (mime !== 'application/pdf') {
    headers['Content-Security-Policy'] = "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox"
  }
  return headers
}
