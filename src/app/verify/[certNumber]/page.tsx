import { query } from '@/lib/db'
import { Leaf, ShieldCheck, Building2, Calendar, Award, User, BarChart3, Globe2, FileText, ChevronRight, Scale, ExternalLink, Clock } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface TopSource {
  category: string
  scope: number
  totalCo2eq: number
}

interface CertData {
  id: number
  status: string
  certificateNumber: string | null
  certifiedAt: string | null
  expertName: string | null
  expertEmail: string | null
  inspectionDate: string | null
  auditLocation: string | null
  cncCertificateNumber: string | null
  cncCertificateGeneratedAt: string | null
  avisNumber: string | null
  avisDate: string | null
  avisPeriodStart: number | null
  avisPeriodEnd: number | null
  avisTotalCo2eq: number | null
  assessmentName: string
  assessmentYear: number
  approach: string
  totalCo2eq: number
  scope1: number
  scope2: number
  scope3: number
  companyName: string
  companySector: string | null
  companyRccm: string | null
  companyLogoUrl: string | null
  siteName: string
  siteType: string
  siteAddress: string | null
  topSources: TopSource[]
}

async function getCert(certNumber: string): Promise<CertData | null> {
  try {
    const result = await query(
      `SELECT
         cr.id, cr.status, cr.certificate_number, cr.certified_at,
         cr.expert_name, cr.expert_email, cr.inspection_date, cr.audit_location,
         cr.cnc_certificate_number, cr.cnc_certificate_generated_at,
         cr.avis_number, cr.avis_date,
         cr.avis_period_start, cr.avis_period_end, cr.avis_total_co2eq,
         a.id as assessment_id, a.name as assessment_name, a.year as assessment_year,
         a.total_co2eq, a.scope1_co2eq, a.scope2_co2eq, a.scope3_co2eq, a.approach,
         c.id as company_id, c.name as company_name, c.sector, c.rccm, c.logo_url,
         s.name as site_name, s.type as site_type, s.address as site_address
       FROM certification_requests cr
       JOIN assessments a ON a.id = cr.assessment_id
       JOIN sites s ON s.id = a.site_id
       JOIN companies c ON c.id = cr.company_id
       WHERE cr.certificate_number = $1 OR cr.cnc_certificate_number = $1`,
      [certNumber]
    )
    if (result.rows.length === 0) return null
    const r = result.rows[0]

    const entriesResult = await query(
      `SELECT category, scope, SUM(total_co2eq) AS total_co2eq
       FROM emission_entries
       WHERE assessment_id = $1
       GROUP BY category, scope
       ORDER BY SUM(total_co2eq) DESC
       LIMIT 10`,
      [r.assessment_id]
    )

    const topSources: TopSource[] = entriesResult.rows.map((e: any) => ({
      category: e.category,
      scope: e.scope,
      totalCo2eq: parseFloat(e.total_co2eq ?? 0),
    }))

    return {
      id: r.id, status: r.status, certificateNumber: r.certificate_number,
      certifiedAt: r.certified_at, expertName: r.expert_name,
      expertEmail: r.expert_email, inspectionDate: r.inspection_date,
      auditLocation: r.audit_location,
      cncCertificateNumber: r.cnc_certificate_number,
      cncCertificateGeneratedAt: r.cnc_certificate_generated_at,
      avisNumber: r.avis_number, avisDate: r.avis_date,
      avisPeriodStart: r.avis_period_start, avisPeriodEnd: r.avis_period_end,
      avisTotalCo2eq: r.avis_total_co2eq ? parseFloat(r.avis_total_co2eq) : null,
      assessmentName: r.assessment_name, assessmentYear: parseInt(r.assessment_year),
      approach: r.approach ?? 'Contrôle opérationnel',
      totalCo2eq: parseFloat(r.total_co2eq ?? 0),
      scope1: parseFloat(r.scope1_co2eq ?? 0),
      scope2: parseFloat(r.scope2_co2eq ?? 0),
      scope3: parseFloat(r.scope3_co2eq ?? 0),
      companyName: r.company_name, companySector: r.sector,
      companyRccm: r.rccm, companyLogoUrl: r.logo_url,
      siteName: r.site_name, siteType: r.site_type, siteAddress: r.site_address,
      topSources,
    }
  } catch {
    return null
  }
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtCO2(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} MtCO₂e`
  if (v >= 1_000) return `${(v / 1_000).toFixed(2)} tCO₂e`
  return `${v.toFixed(0)} kgCO₂e`
}

function pct(v: number, total: number) {
  if (!total) return '0%'
  return `${(v / total * 100).toFixed(1)}%`
}

function DonutChart({ s1, s2, s3 }: { s1: number; s2: number; s3: number }) {
  const total = s1 + s2 + s3 || 1
  const p1 = s1 / total * 100
  const p2 = s2 / total * 100
  const p3 = s3 / total * 100

  // SVG donut with three arcs
  const r = 60
  const cx = 80
  const cy = 80
  const circumference = 2 * Math.PI * r

  const arc = (offset: number, pct: number) => {
    const len = circumference * (pct / 100)
    const dash = `${len} ${circumference - len}`
    return { strokeDasharray: dash, strokeDashoffset: -offset }
  }

  const o1 = 0
  const o2 = circumference * (p1 / 100)
  const o3 = o2 + circumference * (p2 / 100)

  return (
    <svg width="160" height="160" viewBox="0 0 160 160" className="flex-shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth="20" />
      {s1 > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#DC2626" strokeWidth="20"
                strokeLinecap="round" {...arc(o1, p1)}
                transform={`rotate(-90 ${cx} ${cy})`} />
      )}
      {s2 > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F97316" strokeWidth="20"
                strokeLinecap="round" {...arc(o2, p2)}
                transform={`rotate(-90 ${cx} ${cy})`} />
      )}
      {s3 > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#3B82F6" strokeWidth="20"
                strokeLinecap="round" {...arc(o3, p3)}
                transform={`rotate(-90 ${cx} ${cy})`} />
      )}
      <text x={cx} y={cy - 8} textAnchor="middle" className="text-[22px]" fill="#111827" fontWeight="bold" fontSize="22">{Math.round(total)}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#6B7280" fontSize="12">tCO₂e</text>
    </svg>
  )
}

const SCOPE_LABELS: Record<number, string> = { 1: 'Scope 1', 2: 'Scope 2', 3: 'Scope 3' }

function fmtCertStatus(status: string) {
  const map: Record<string, string> = {
    pending: 'En attente', assigned: 'Expert assigné', in_progress: 'En cours',
    audit_done: 'Audit terminé', certified: 'Certifié',
    submitted_to_cnc: 'Transmis au CNC', certificate_generated: 'Certificat CNC émis',
    rejected: 'Rejeté',
  }
  return map[status] || status
}

export default async function VerifyPage({ params }: { params: { certNumber: string } }) {
  const cert = await getCert(params.certNumber)

  if (!cert) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Certificat introuvable</h1>
          <p className="text-gray-500 text-sm mb-6">
            Aucun certificat ne correspond au numéro <strong className="font-mono text-gray-700">{params.certNumber}</strong>.
          </p>
          <Link href="/" className="text-emerald-600 hover:text-emerald-700 font-medium text-sm">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    )
  }

  const maxSource = Math.max(...cert.topSources.map(s => s.totalCo2eq), 1)

  const isCertified = cert.status === 'certified' || cert.status === 'certificate_generated'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ═══════════ Header ═══════════ */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 rounded-sm shadow-sm" viewBox="0 0 3 2" aria-label="Gabon">
                <rect width="3" height="0.67" fill="#009E60" />
                <rect y="0.66" width="3" height="0.67" fill="#FCD116" />
                <rect y="1.33" width="3" height="0.67" fill="#3A75C4" />
              </svg>
              <span className="text-xs text-gray-400 hidden sm:inline font-medium">République Gabonaise</span>
              <span className="text-gray-300 hidden sm:inline">|</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center">
                  <Leaf className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-gray-900 hidden sm:inline">GreenLeaves</span>
              </div>
            </div>
            <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold">
              Certificat vérifié
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* ═══════════ Page Title ═══════════ */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Rapport de certification</h1>
          <p className="text-sm text-gray-500 mt-1">
            Bilan carbone certifié selon les normes ISO 14064-1 et le GHG Protocol
          </p>
        </div>

        {/* ═══════════ Company + Certification ═══════════ */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-5">
          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100">
                  {cert.companyLogoUrl
                    ? <img src={cert.companyLogoUrl} alt={cert.companyName} className="h-full w-auto object-contain" />
                    : <Building2 className="w-8 h-8 text-gray-400" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{cert.companyName}</h2>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-sm text-gray-500">
                    {cert.companySector && <span>{cert.companySector}</span>}
                    <span>RCCM: {cert.companyRccm || '—'}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {cert.siteName} · {cert.siteType}{cert.siteAddress ? ` · ${cert.siteAddress}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-1.5">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  isCertified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {isCertified ? 'Certifié ✓' : fmtCertStatus(cert.status)}
                </span>
                {cert.certificateNumber && (
                  <span className="text-xs text-gray-400 font-mono">N° {cert.certificateNumber}</span>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 px-5 sm:px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Certifié le</p>
              <p className="text-sm font-semibold text-gray-900">{fmtDate(cert.certifiedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Exercice</p>
              <p className="text-sm font-semibold text-gray-900">{cert.assessmentYear}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Bilan</p>
              <p className="text-sm font-semibold text-gray-900 truncate">{cert.assessmentName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Approche</p>
              <p className="text-sm font-semibold text-gray-900">{cert.approach}</p>
            </div>
          </div>
        </div>

        {/* ═══════════ Emissions — Donut + Scope cards ═══════════ */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-5">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Émissions de gaz à effet de serre</h3>
          </div>
          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <DonutChart s1={cert.scope1} s2={cert.scope2} s3={cert.scope3} />
              <div className="flex-1 w-full space-y-3">
                <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-gray-900">{fmtCO2(cert.totalCo2eq)}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-red-700">Scope 1</span>
                      <span className="text-[10px] text-red-500 font-medium">{pct(cert.scope1, cert.totalCo2eq)}</span>
                    </div>
                    <p className="text-sm font-bold text-red-700">{fmtCO2(cert.scope1)}</p>
                    <p className="text-[10px] text-red-400 mt-0.5">Émissions directes</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-orange-700">Scope 2</span>
                      <span className="text-[10px] text-orange-500 font-medium">{pct(cert.scope2, cert.totalCo2eq)}</span>
                    </div>
                    <p className="text-sm font-bold text-orange-700">{fmtCO2(cert.scope2)}</p>
                    <p className="text-[10px] text-orange-400 mt-0.5">Énergie indirecte</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-blue-700">Scope 3</span>
                      <span className="text-[10px] text-blue-500 font-medium">{pct(cert.scope3, cert.totalCo2eq)}</span>
                    </div>
                    <p className="text-sm font-bold text-blue-700">{fmtCO2(cert.scope3)}</p>
                    <p className="text-[10px] text-blue-400 mt-0.5">Autres émissions indirectes</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Top sources bars ─── */}
            {cert.topSources.length > 0 && (
              <div className="mt-6 pt-5 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Principales sources d&apos;émissions</h4>
                <div className="space-y-2">
                  {cert.topSources.map((s, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[10px] text-gray-400 w-5 text-right flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-gray-700 truncate font-medium">{s.category}</span>
                          <span className="text-[10px] text-gray-500 flex-shrink-0 ml-2">
                            {fmtCO2(s.totalCo2eq)} · {pct(s.totalCo2eq, cert.totalCo2eq)}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(s.totalCo2eq / maxSource) * 100}%`,
                              backgroundColor: s.scope === 1 ? '#DC2626' : s.scope === 2 ? '#F97316' : '#3B82F6',
                            }}
                          />
                        </div>
                      </div>
                      <span className={`text-[10px] font-medium w-14 text-right flex-shrink-0 ${
                        s.scope === 1 ? 'text-red-600' : s.scope === 2 ? 'text-orange-600' : 'text-blue-600'
                      }`}>
                        {SCOPE_LABELS[s.scope] || `S${s.scope}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════ Expert Info ═══════════ */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-5">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900 text-sm">Auditeur certifieur</h3>
          </div>
          <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Expert</p>
              <p className="text-sm font-semibold text-gray-900">{cert.expertName || '—'}</p>
              {cert.expertEmail && <p className="text-xs text-gray-400">{cert.expertEmail}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-500">Date d&apos;inspection</p>
              <p className="text-sm font-semibold text-gray-900">{fmtDate(cert.inspectionDate)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Lieu d&apos;audit</p>
              <p className="text-sm font-semibold text-gray-900">{cert.auditLocation || '—'}</p>
            </div>
          </div>
        </div>

        {/* ═══════════ Avis de conformité + CNC ═══════════ */}
        <div className="grid sm:grid-cols-2 gap-5 mb-5">
          {cert.avisNumber && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-600" />
                <h3 className="font-semibold text-gray-900 text-sm">Avis de conformité</h3>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">N° avis</span>
                  <span className="text-sm font-bold text-gray-900 font-mono">{cert.avisNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Date</span>
                  <span className="text-sm font-semibold text-gray-900">{fmtDate(cert.avisDate)}</span>
                </div>
                {cert.avisPeriodStart && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Période</span>
                    <span className="text-sm font-semibold text-gray-900">{cert.avisPeriodStart}–{cert.avisPeriodEnd}</span>
                  </div>
                )}
                {cert.avisTotalCo2eq != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">tCO₂e validées</span>
                    <span className="text-sm font-bold text-emerald-700">{fmtCO2(cert.avisTotalCo2eq)}</span>
                  </div>
                )}
                <div className="pt-2">
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                    Conforme — Ordonnance N°019/PR/2021
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className={`bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden ${!cert.avisNumber ? 'sm:col-span-2' : ''}`}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Certification nationale CNC</h3>
            </div>
            <div className="p-5">
              {cert.cncCertificateNumber ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Certificat CNC N°</span>
                    <span className="text-sm font-bold text-gray-900 font-mono">{cert.cncCertificateNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Émis le</span>
                    <span className="text-sm font-semibold text-gray-900">{fmtDate(cert.cncCertificateGeneratedAt)}</span>
                  </div>
                  <div className="pt-2">
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                      Certifié ✓
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">
                    En attente de certification par le Conseil National du Climat
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════ Legal footer ═══════════ */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-gray-900">Document de certification officiel</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed max-w-2xl mx-auto">
              Ce document atteste que <strong>{cert.companyName}</strong> a réalisé son bilan
              d&apos;émissions de gaz à effet de serre pour l&apos;exercice {cert.assessmentYear},
              conformément aux exigences de l&apos;Ordonnance N°019/PR/2021 et aux normes
              ISO 14064-1 et GHG Protocol. Le présent certificat est délivré par la plateforme
              nationale GreenLeaves.
            </p>
            <div className="flex items-center justify-center gap-4 mt-4 text-[10px] text-gray-400">
              <span>Plateforme GreenLeaves · CarbonTrack</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">Vérifié numériquement</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

