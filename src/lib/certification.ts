import path from 'path'

// Certification workflow (CNC portal removed — the accredited expert carries the dossier to the CNC):
//   pending → assigned (admin assigns an expert)
//           → in_progress (expert starts the review / field audit)
//           → audit_done (expert finalises the field audit)
//           → submitted_to_cnc (expert deposited the dossier at the CNC)
//           → certified (expert uploaded the CNC-issued certificate)
//   any non-final status → rejected

export const CERT_STATUSES = [
  'pending', 'assigned', 'in_progress', 'audit_done', 'submitted_to_cnc', 'certified', 'rejected',
] as const
export type CertStatus = typeof CERT_STATUSES[number]

/** Statuses that block a new request for the same assessment */
export const OPEN_CERT_STATUSES: CertStatus[] = ['pending', 'assigned', 'in_progress', 'audit_done', 'submitted_to_cnc', 'certified']

export const FINAL_CERT_STATUSES: CertStatus[] = ['certified', 'rejected']

export const CERT_STATUS_LABELS: Record<CertStatus, string> = {
  pending:          'En attente',
  assigned:         'Expert assigné',
  in_progress:      'Audit en cours',
  audit_done:       'Audit terminé',
  submitted_to_cnc: 'Déposé au CNC',
  certified:        'Certifié',
  rejected:         'Rejeté',
}

/** Private storage root (symlinked to shared/private-uploads in prod — never served by nginx) */
export const PRIVATE_UPLOAD_DIR = path.join(process.cwd(), 'uploads')

export const CERTIFICATE_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
export const CERTIFICATE_MAX_BYTES = 20 * 1024 * 1024
