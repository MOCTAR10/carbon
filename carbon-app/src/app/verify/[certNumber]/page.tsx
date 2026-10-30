import { query } from '@/lib/db'
import Link from 'next/link'
import { Leaf, ShieldCheck, Building2, Calendar, User, MapPin, Layers, FileCheck2, Scale, Clock, ArrowUpRight, Check } from 'lucide-react'
import { SCOPES, co2UnitFor, fmtCO2, fmtPct, MONTHS_FR, type CO2Unit } from '@/lib/utils'
import { sectorLabel } from '@/lib/sectors'
import { CATEGORY_LABELS } from '@/lib/emission-factors'
import { siteTypeLabel } from '@/app/dashboard/reports/report-utils'

export const dynamic = 'force-dynamic'

// Public page: what a certified company shares with partners. Never expose internal notes or staff e-mails here.

interface TopSource {
  category: string
  scope: number
  totalCo2eq: number
}

interface CertData {
  status: string
  certificateNumber: string | null
  certifiedAt: string | null
  expertName: string | null
  inspectionDate: string | null
  auditLocation: string | null
  avisNumber: string | null
  avisDate: string | null
  avisPeriodStart: number | null
  avisPeriodEnd: number | null
  avisTotalCo2eq: number | null
  assessmentName: string
  assessmentYear: number
  startMonth: number
  endMonth: number
  approach: string | null
  totalCo2eq: number
  scope1: number
  scope2: number
  scope3: number
  companyName: string
  companySector: string | null
  companyRccm: string | null
  companyLogoUrl: string | null
  siteName: string
  siteType: string | null
  siteAddress: string | null
  topSources: TopSource[]
}

async function getCert(certNumber: string): Promise<CertData | null> {
  try {
    const result = await query(
      `SELECT
         cr.status, cr.certificate_number, cr.certified_at,
         cr.expert_name, cr.inspection_date, cr.audit_location,
         cr.avis_number, cr.avis_date,
         cr.avis_period_start, cr.avis_period_end, cr.avis_total_co2eq,
         a.id as assessment_id, a.name as assessment_name, a.year as assessment_year,
         COALESCE(a.start_month, 1) AS start_month, COALESCE(a.end_month, 12) AS end_month,
         a.total_co2eq, a.scope1_co2eq, a.scope2_co2eq, a.scope3_co2eq, a.approach,
         c.name as company_name, c.sector, c.rccm, c.logo_url,
         s.name as site_name, s.type as site_type, s.address as site_address
       FROM certification_requests cr
       JOIN assessments a ON a.id = cr.assessment_id
       JOIN sites s ON s.id = a.site_id
       JOIN companies c ON c.id = cr.company_id
       WHERE cr.certificate_number = $1`,
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
       LIMIT 8`,
      [r.assessment_id]
    )

    return {
      status: r.status,
      certificateNumber: r.certificate_number,
      certifiedAt: r.certified_at,
      expertName: r.expert_name,
      inspectionDate: r.inspection_date,
      auditLocation: r.audit_location,
      avisNumber: r.avis_number,
      avisDate: r.avis_date,
      avisPeriodStart: r.avis_period_start,
      avisPeriodEnd: r.avis_period_end,
      avisTotalCo2eq: r.avis_total_co2eq ? parseFloat(r.avis_total_co2eq) : null,
      assessmentName: r.assessment_name,
      assessmentYear: parseInt(r.assessment_year),
      startMonth: Number(r.start_month),
      endMonth: Number(r.end_month),
      approach: r.approach,
      totalCo2eq: parseFloat(r.total_co2eq ?? 0),
      scope1: parseFloat(r.scope1_co2eq ?? 0),
      scope2: parseFloat(r.scope2_co2eq ?? 0),
      scope3: parseFloat(r.scope3_co2eq ?? 0),
      companyName: r.company_name,
      companySector: r.sector,
      companyRccm: r.rccm,
      companyLogoUrl: r.logo_url,
      siteName: r.site_name,
      siteType: r.site_type,
      siteAddress: r.site_address,
      topSources: entriesResult.rows.map((e: { category: string; scope: number; total_co2eq: string }) => ({
        category: e.category,
        scope: Number(e.scope),
        totalCo2eq: parseFloat(e.total_co2eq ?? '0'),
      })),
    }
  } catch {
    return null
  }
}

const APPROACH_FR: Record<string, string> = {
  operational_control: 'Contrôle opérationnel',
  financial_control: 'Contrôle financier',
  equity_share: 'Part du capital',
}

const STATUS_FR: Record<string, string> = {
  pending: 'Demande en attente', assigned: 'Expert assigné', in_progress: 'Audit terrain en cours',
  audit_done: 'Audit validé', submitted_to_cnc: 'Déposé à la DGEPN', certified: 'Certifié', rejected: 'Demande refusée',
}

function longDate(d: string | Date | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function periodLabel(year: number, start: number, end: number) {
  if (start === 1 && end === 12) return `Année complète ${year}`
  return `${MONTHS_FR[start - 1]} – ${MONTHS_FR[end - 1]} ${year}`
}

function Value({ kg, unit, big }: { kg: number; unit: CO2Unit; big?: boolean }) {
  const v = fmtCO2(kg, unit)
  return (
    <span className="whitespace-nowrap">
      <span className={big ? 'font-display text-4xl font-light tracking-tight tabular-nums sm:text-5xl' : 'font-display text-2xl tabular-nums'}>{v.value}</span>
      <span className={big ? 'ml-2 text-base text-ink-500' : 'ml-1.5 text-xs text-ink-500'}>{v.unit}</span>
    </span>
  )
}

function Donut({ values, unit }: { values: number[]; unit: CO2Unit }) {
  const total = values.reduce((s, v) => s + v, 0)
  const r = 64
  const c = 2 * Math.PI * r
  let offset = 0
  const t = fmtCO2(total, unit)
  return (
    <div className="relative size-44 flex-shrink-0">
      <svg viewBox="0 0 160 160" className="size-full -rotate-90" aria-hidden>
        <circle cx="80" cy="80" r={r} fill="none" stroke="#EFE8D6" strokeWidth="16" />
        {total > 0 && values.map((v, i) => {
          const len = (v / total) * c
          const el = (
            <circle key={i} cx="80" cy="80" r={r} fill="none" stroke={SCOPES[i].hex} strokeWidth="16"
              strokeDasharray={`${Math.max(len - 2, 0)} ${c}`} strokeDashoffset={-offset} />
          )
          offset += len
          return el
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">Total</span>
        <span className="font-display text-2xl tabular-nums text-forest-900">{t.value}</span>
        <span className="text-xs text-ink-500">{t.unit}</span>
      </div>
    </div>
  )
}

function Fact({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-ink-500"><Icon className="size-3.5 flex-shrink-0 text-gold-600" aria-hidden /> {label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-ink-800">{children}</dd>
    </div>
  )
}

function Header() {
  return (
    <header className="border-b border-ivory-300 bg-ivory-50/90 print:bg-transparent">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <svg className="h-4 w-6 flex-shrink-0 rounded-[2px] shadow-sm" viewBox="0 0 3 2" aria-label="Drapeau du Gabon" role="img">
            <rect width="3" height="0.67" fill="#009E60" />
            <rect y="0.66" width="3" height="0.67" fill="#FCD116" />
            <rect y="1.33" width="3" height="0.67" fill="#3A75C4" />
          </svg>
          <span className="hidden text-xs font-medium text-ink-500 sm:inline">République gabonaise</span>
          <span className="hidden h-4 w-px bg-ivory-400 sm:inline-block" aria-hidden />
          <span className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-forest-900 text-gold-300"><Leaf className="size-3.5" aria-hidden /></span>
            <span className="font-display text-base text-forest-900">GreenLeaves</span>
            <span className="hidden text-xs text-ink-400 sm:inline">· CarbonTrack</span>
          </span>
        </div>
        <span className="flex-shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-700">Vérification publique</span>
      </div>
    </header>
  )
}

export default async function VerifyPage({ params }: { params: { certNumber: string } }) {
  let certNumber = params.certNumber
  try { certNumber = decodeURIComponent(certNumber) } catch { /* already decoded / malformed: use as is */ }
  const cert = await getCert(certNumber)

  if (!cert) {
    return (
      <div className="min-h-screen bg-ivory-100 font-sans text-ink-800">
        <Header />
        <main className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
          <span className="flex size-14 items-center justify-center rounded-full border border-ivory-300 bg-white">
            <ShieldCheck className="size-6 text-ink-400" aria-hidden />
          </span>
          <h1 className="mt-5 font-display text-3xl text-forest-900">Certificat introuvable</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            Aucun certificat ne correspond au numéro <strong className="break-all font-semibold text-ink-700">{certNumber}</strong>.
            Vérifiez le numéro inscrit sur le certificat ou contactez l’entreprise qui vous l’a transmis.
          </p>
          <Link href="/" className="mt-8 text-sm font-semibold text-forest-700 underline-offset-4 hover:underline">
            Retour à l’accueil
          </Link>
        </main>
      </div>
    )
  }

  const isCertified = cert.status === 'certified'
  const unit = co2UnitFor(cert.totalCo2eq)
  const scopeValues = [cert.scope1, cert.scope2, cert.scope3]
  const maxSource = Math.max(...cert.topSources.map(s => s.totalCo2eq), 1)

  return (
    <div className="min-h-screen bg-ivory-100 font-sans text-ink-800">
      <Header />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
        {/* ── Title + seal ── */}
        <section className="relative overflow-hidden rounded-3xl bg-forest-900 bg-forest-grain p-6 text-ivory-50 shadow-lifted sm:p-10 print:bg-white print:text-ink-900 print:shadow-none">
          <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full border border-gold-400/15 print:hidden" aria-hidden />
          <div className="pointer-events-none absolute -right-6 -top-6 size-44 rounded-full border border-gold-400/15 print:hidden" aria-hidden />
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-300">Bilan carbone certifié</p>
          <h1 className="mt-3 font-display text-3xl font-light leading-tight sm:text-5xl">Rapport de certification</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-forest-100/80 print:text-ink-600">
            Inventaire des émissions de gaz à effet de serre établi selon le GHG Protocol et l’ISO 14064-1,
            audité sur site par un expert accrédité, puis certifié par la DGEPN (Direction Générale de l’Environnement et de la Protection de la Nature) après avis du Conseil National Climat (CNC).
          </p>

          <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-gold-400/30 bg-white/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 print:border-ink-300">
            <div className="flex items-center gap-4">
              <span className={isCertified
                ? 'flex size-14 flex-shrink-0 items-center justify-center rounded-full bg-gold-400 text-forest-950 ring-4 ring-gold-400/25'
                : 'flex size-14 flex-shrink-0 items-center justify-center rounded-full border border-white/25 text-forest-100'}>
                {isCertified ? <Check className="size-7" strokeWidth={2.5} aria-hidden /> : <Clock className="size-6" aria-hidden />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gold-300">{isCertified ? 'Certifié ✓ — certificat authentique' : STATUS_FR[cert.status] ?? cert.status}</p>
                {cert.certificateNumber && (
                  <p className="mt-1 break-all font-display text-2xl text-ivory-50 sm:text-3xl print:text-ink-900">{`N° ${cert.certificateNumber}`}</p>
                )}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:text-right">
              <div>
                <dt className="text-xs text-forest-100/70 print:text-ink-500">Délivré le</dt>
                <dd className="mt-0.5 font-semibold">{longDate(cert.certifiedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-forest-100/70 print:text-ink-500">Exercice</dt>
                <dd className="mt-0.5 font-semibold">{cert.assessmentYear}</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* ── Company + bilan ── */}
        <section className="rounded-3xl border border-ivory-300 bg-white p-6 shadow-soft sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex size-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-ivory-300 bg-ivory-50">
              {cert.companyLogoUrl
                // eslint-disable-next-line @next/next/no-img-element -- uploaded logo served from /logos, sizes unknown
                ? <img src={cert.companyLogoUrl} alt={`Logo ${cert.companyName}`} className="size-full object-contain p-1.5" />
                : <Building2 className="size-7 text-ink-400" aria-hidden />}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-700">Entreprise</p>
              <h2 className="mt-1 break-words font-display text-2xl text-forest-900 sm:text-3xl">{cert.companyName}</h2>
              <p className="mt-1 text-sm text-ink-500">
                {[cert.companySector ? sectorLabel(cert.companySector) : null, cert.companyRccm ? `RCCM ${cert.companyRccm}` : null].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-5 border-t border-ivory-200 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <Fact icon={FileCheck2} label="Bilan">{cert.assessmentName}</Fact>
            <Fact icon={Calendar} label="Période couverte">{periodLabel(cert.assessmentYear, cert.startMonth, cert.endMonth)}</Fact>
            <Fact icon={MapPin} label="Site">
              {cert.siteName}
              <span className="mt-0.5 block text-xs font-normal text-ink-500">
                {[siteTypeLabel(cert.siteType), cert.siteAddress].filter(Boolean).join(' · ')}
              </span>
            </Fact>
            <Fact icon={Layers} label="Périmètre de consolidation">{APPROACH_FR[cert.approach ?? 'operational_control'] ?? cert.approach}</Fact>
          </dl>
        </section>

        {/* ── Emissions ── */}
        <section className="rounded-3xl border border-ivory-300 bg-white p-6 shadow-soft sm:p-8" aria-labelledby="emissions">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-700">Résultats certifiés</p>
          <h2 id="emissions" className="mt-1 font-display text-2xl text-forest-900">Émissions de gaz à effet de serre</h2>

          <div className="mt-6 flex flex-col items-center gap-8 md:flex-row md:items-center">
            <Donut values={scopeValues} unit={unit} />
            <div className="w-full min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl bg-ivory-50 px-5 py-4">
                <span className="text-sm font-semibold text-ink-700">Total des émissions</span>
                <span className="text-forest-900"><Value kg={cert.totalCo2eq} unit={unit} big /></span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {SCOPES.map((s, i) => (
                  <div key={s.scope} className="rounded-2xl border border-ivory-300 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-semibold text-ink-800">
                        <span className="size-2.5 rounded-full" style={{ background: s.hex }} aria-hidden /> {s.label}
                      </span>
                      <span className="text-xs tabular-nums text-ink-500">{fmtPct(scopeValues[i], cert.totalCo2eq)}</span>
                    </div>
                    <p className="mt-2 text-forest-900"><Value kg={scopeValues[i]} unit={unit} /></p>
                    <p className="mt-0.5 text-xs text-ink-500">{s.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {cert.topSources.length > 0 && (
            <div className="mt-8 border-t border-ivory-200 pt-6">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">Principales sources d’émissions</h3>
              <ol className="mt-4 space-y-3">
                {cert.topSources.map((s, i) => {
                  const sc = SCOPES[Math.min(Math.max(s.scope, 1), 3) - 1]
                  const v = fmtCO2(s.totalCo2eq, unit)
                  return (
                    <li key={`${s.category}-${s.scope}`} className="flex items-center gap-3">
                      <span className="w-5 flex-shrink-0 text-right text-xs tabular-nums text-ink-400">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <span className="text-sm font-medium text-ink-800">
                            {CATEGORY_LABELS[s.category] ?? s.category}
                            <span className="ml-2 text-xs font-normal text-ink-500">{sc.label}</span>
                          </span>
                          <span className="text-xs tabular-nums text-ink-500">{v.value} {v.unit} · {fmtPct(s.totalCo2eq, cert.totalCo2eq, 1)}</span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ivory-200">
                          <div className="h-full rounded-full" style={{ width: `${(s.totalCo2eq / maxSource) * 100}%`, background: sc.hex }} />
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
        </section>

        {/* ── Audit + methodology ── */}
        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-3xl border border-ivory-300 bg-white p-6 shadow-soft sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-700">Vérification</p>
            <h2 className="mt-1 font-display text-2xl text-forest-900">Audit et certification</h2>
            <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Fact icon={User} label="Expert accrédité">{cert.expertName || '—'}</Fact>
              <Fact icon={Calendar} label="Audit terrain">{longDate(cert.inspectionDate)}</Fact>
              <Fact icon={MapPin} label="Lieu de l’audit">{cert.auditLocation || '—'}</Fact>
              <Fact icon={ShieldCheck} label="Certificat DGEPN">{isCertified ? `Délivré le ${longDate(cert.certifiedAt)}` : 'En attente'}</Fact>
            </dl>
            {cert.avisNumber && (
              <div className="mt-6 rounded-2xl border border-gold-200 bg-gold-50 p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold text-gold-700"><Scale className="size-4" aria-hidden /> Avis de conformité {cert.avisNumber}</p>
                <p className="mt-1 text-ink-600">
                  Émis le {longDate(cert.avisDate)}
                  {cert.avisTotalCo2eq != null && <> · {fmtCO2(cert.avisTotalCo2eq, unit).value} {fmtCO2(cert.avisTotalCo2eq, unit).unit} validées</>}
                  {' '}— Ordonnance N° 019/PR/2021
                </p>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-ivory-300 bg-ivory-50 p-6 sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-700">Méthodologie</p>
            <h2 className="mt-1 font-display text-2xl text-forest-900">Comment lire ce certificat</h2>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-ink-600">
              <li><b className="text-ink-800">Scope 1</b> — émissions directes de l’entreprise (combustibles, véhicules, fluides frigorigènes).</li>
              <li><b className="text-ink-800">Scope 2</b> — émissions liées à l’électricité et à l’énergie achetées.</li>
              <li><b className="text-ink-800">Scope 3</b> — autres émissions indirectes : fret, déplacements, intrants, déchets, immobilisations.</li>
              <li>Calcul selon le <b className="text-ink-800">GHG Protocol</b> et l’<b className="text-ink-800">ISO 14064-1</b>, avec les facteurs d’émission de références reconnues (Base Carbone ADEME, AIE).</li>
              <li>Données vérifiées sur site par un expert accrédité GreenLeaves ; certificat délivré par la <b className="text-ink-800">DGEPN</b> après avis du Conseil National Climat.</li>
            </ul>
          </section>
        </div>

        {/* ── Footer ── */}
        <footer className="flex flex-col items-start justify-between gap-3 border-t border-ivory-300 pt-6 text-xs text-ink-500 sm:flex-row sm:items-center">
          <p>
            Vérifié le {longDate(new Date())} sur la plateforme nationale GreenLeaves · CarbonTrack.
            Ce document atteste l’authenticité du certificat pour l’exercice {cert.assessmentYear}.
          </p>
          <a href="https://carbontrack.greenleaves.ga" className="inline-flex flex-shrink-0 items-center gap-1 font-semibold text-forest-700 underline-offset-4 hover:underline print:hidden">
            carbontrack.greenleaves.ga <ArrowUpRight className="size-3.5" aria-hidden />
          </a>
        </footer>
      </main>
    </div>
  )
}
