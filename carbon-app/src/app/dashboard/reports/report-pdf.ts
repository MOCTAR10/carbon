// Client-side PDF report (jsPDF + autotable, loaded on demand). Palette: Forest & Ivory, scopes from SCOPES.
import { co2UnitFor, SCOPES, type CO2Unit } from '@/lib/utils'
import { sectorLabel } from '@/lib/sectors'
import {
  aggregateSources, categoryLabel, isoLabel, monthShort, monthsText, num, periodMonths, scopeOfGhg,
  siteTypeLabel, SERIES, UNIT_DIV, type MonthData, type ReportData,
} from './report-utils'

type RGB = [number, number, number]

const FOREST: RGB = [26, 64, 44]
const FOREST_DARK: RGB = [15, 42, 29]
const GOLD: RGB = [184, 147, 90]
const GOLD_LIGHT: RGB = [211, 178, 124]
const IVORY: RGB = [244, 240, 230]
const IVORY_SOFT: RGB = [250, 248, 243]
const LINE: RGB = [234, 228, 214]
const INK: RGB = [35, 38, 34]
const INK_MID: RGB = [94, 99, 92]
const INK_LIGHT: RGB = [138, 143, 135]
const WHITE: RGB = [255, 255, 255]
const SCOPE_TINT: RGB[] = [[232, 240, 235], [248, 242, 232], [238, 245, 241]]

const hex = (c: RGB) => `rgb(${c.join(',')})`
const UNIT_PDF: Record<CO2Unit, string> = { kg: 'kgCO2e', t: 'tCO2e', kt: 'ktCO2e' }

/** Standard PDF fonts are WinAnsi: accents are fine, but not narrow/no-break spaces, subscripts or curly quotes. */
export function pdfSafe(s: unknown) {
  return String(s ?? '')
    .replace(/[   ]/g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/₂/g, '2')
    .replace(/₃/g, '3')
}

const pdfNum = (v: number, digits = 2) => pdfSafe((Number(v) || 0).toLocaleString('fr-FR', { maximumFractionDigits: digits }))

/** Value in a fixed unit (no unit suffix — the column header carries it). */
function pdfCO2(kg: number, unit: CO2Unit) {
  const v = kg / UNIT_DIV[unit]
  if (unit !== 'kg' && v > 0 && v < 0.01) return '< 0,01'
  return pdfNum(v, unit === 'kg' ? 0 : 2)
}
const pdfCO2Text = (kg: number, unit: CO2Unit) => `${pdfCO2(kg, unit)} ${UNIT_PDF[unit]}`
const pdfPct = (part: number, whole: number) => {
  if (!whole) return '-'
  const p = (part / whole) * 100
  return p > 0 && p < 0.1 ? '< 0,1 %' : `${pdfNum(p, 1)} %`
}
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

// ── Canvas charts (rasterised into the PDF) ─────────────────────────────────

function canvas2d(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w * 2; c.height = h * 2
  const ctx = c.getContext('2d')!
  ctx.scale(2, 2)
  return { c, ctx }
}
const FONT = 'Helvetica, Arial, sans-serif'
const tickLabel = (v: number, unit: CO2Unit) =>
  `${(v / UNIT_DIV[unit]).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ${unit}`

function drawDonut(items: { label: string; value: number; color: string }[], w: number, h: number, unit: CO2Unit) {
  const { c, ctx } = canvas2d(w, h)
  const total = items.reduce((s, i) => s + i.value, 0)
  if (!total) return c.toDataURL('image/png')
  const r = Math.min(w * 0.25, h * 0.4) - 4
  const cx = w * 0.28, cy = h * 0.47
  let a0 = -Math.PI / 2
  items.forEach(it => {
    const a1 = a0 + (it.value / total) * Math.PI * 2
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a0, a1); ctx.closePath()
    ctx.fillStyle = it.color; ctx.fill()
    a0 = a1
  })
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill()
  ctx.textAlign = 'center'
  ctx.fillStyle = hex(FOREST_DARK); ctx.font = `bold 14px ${FONT}`
  ctx.fillText((total / UNIT_DIV[unit]).toLocaleString('fr-FR', { maximumFractionDigits: 1 }), cx, cy + 1)
  ctx.fillStyle = hex(INK_MID); ctx.font = `9px ${FONT}`
  ctx.fillText(UNIT_PDF[unit], cx, cy + 13)
  ctx.textAlign = 'left'
  const lx = w * 0.58
  items.forEach((it, i) => {
    const ly = h * 0.22 + i * 30
    ctx.fillStyle = it.color; ctx.beginPath(); ctx.arc(lx, ly + 2, 5, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = hex(INK); ctx.font = `bold 11px ${FONT}`; ctx.fillText(it.label, lx + 12, ly + 5)
    ctx.fillStyle = hex(INK_MID); ctx.font = `10px ${FONT}`
    ctx.fillText(`${pdfCO2Text(it.value, unit)}  ·  ${pdfPct(it.value, total)}`, lx + 12, ly + 20)
  })
  return c.toDataURL('image/png')
}

function drawHBars(items: { label: string; value: number; color: string }[], w: number, h: number, unit: CO2Unit, labelMax = 30) {
  const { c, ctx } = canvas2d(w, h)
  const max = Math.max(...items.map(i => i.value), 1)
  const labelW = Math.min(240, w * 0.42)
  const valueW = w * 0.15
  const barMax = w - labelW - valueW - 10
  const gap = 4
  const ih = Math.min(20, Math.max(11, (h - 8) / items.length - gap))
  const start = Math.max(4, (h - (items.length * (ih + gap) - gap)) / 2)
  items.forEach((it, i) => {
    const y = start + i * (ih + gap)
    const bw = Math.max(3, (it.value / max) * barMax)
    ctx.textBaseline = 'middle'
    ctx.fillStyle = hex(INK); ctx.font = `10px ${FONT}`; ctx.textAlign = 'right'
    ctx.fillText(clip(it.label, labelMax), labelW - 6, y + ih / 2)
    ctx.fillStyle = hex(IVORY_SOFT); ctx.fillRect(labelW, y, barMax, ih)
    ctx.fillStyle = it.color; ctx.beginPath(); ctx.roundRect(labelW, y, bw, ih, [0, 3, 3, 0]); ctx.fill()
    ctx.fillStyle = hex(INK_MID); ctx.font = `9px ${FONT}`; ctx.textAlign = 'left'
    ctx.fillText(it.value > 0 && it.value / UNIT_DIV[unit] < 0.1 ? `< 0,1 ${unit}` : tickLabel(it.value, unit), labelW + bw + 5, y + ih / 2)
  })
  return c.toDataURL('image/png')
}

function drawAxisGrid(ctx: CanvasRenderingContext2D, w: number, pad: { left: number; right: number; top: number }, chartH: number, max: number, unit: CO2Unit) {
  ctx.strokeStyle = hex(LINE); ctx.lineWidth = 0.5
  for (let i = 0; i <= 4; i++) {
    const gy = pad.top + (chartH / 4) * i
    ctx.beginPath(); ctx.moveTo(pad.left, gy); ctx.lineTo(w - pad.right, gy); ctx.stroke()
    ctx.fillStyle = hex(INK_LIGHT); ctx.font = `8px ${FONT}`; ctx.textAlign = 'right'
    ctx.fillText(tickLabel(max - (max / 4) * i, unit), pad.left - 4, gy + 3)
  }
}

function drawMonthly(months: MonthData[], w: number, h: number, unit: CO2Unit) {
  const { c, ctx } = canvas2d(w, h)
  const pad = { left: 48, right: 12, top: 12, bottom: 34 }
  const chartW = w - pad.left - pad.right, chartH = h - pad.top - pad.bottom
  const max = Math.max(...months.map(m => m.total), 1)
  const slot = chartW / months.length
  const barW = Math.min(36, slot - 6)
  drawAxisGrid(ctx, w, pad, chartH, max, unit)
  months.forEach((m, i) => {
    const bx = pad.left + i * slot + (slot - barW) / 2
    let sy = pad.top + chartH
    ;[m.scope1, m.scope2, m.scope3].forEach((v, si) => {
      if (v <= 0) return
      const sh = (v / max) * chartH
      sy -= sh
      ctx.fillStyle = SCOPES[si].hex; ctx.fillRect(bx, sy, barW, sh)
    })
    ctx.fillStyle = hex(INK_MID); ctx.font = `8px ${FONT}`; ctx.textAlign = 'center'
    ctx.fillText(monthShort(m.month), bx + barW / 2, h - pad.bottom + 12)
  })
  let lx = pad.left
  SCOPES.forEach(s => {
    ctx.fillStyle = s.hex; ctx.fillRect(lx, h - 10, 8, 8)
    ctx.fillStyle = hex(INK); ctx.font = `9px ${FONT}`; ctx.textAlign = 'left'
    ctx.fillText(s.label, lx + 11, h - 3)
    lx += 62
  })
  return c.toDataURL('image/png')
}

function drawCumulative(months: MonthData[], w: number, h: number, unit: CO2Unit) {
  const { c, ctx } = canvas2d(w, h)
  const pad = { left: 48, right: 18, top: 14, bottom: 24 }
  const chartW = w - pad.left - pad.right, chartH = h - pad.top - pad.bottom
  let cum = 0
  const vals = months.map(m => (cum += m.total))
  const max = Math.max(...vals, 1)
  drawAxisGrid(ctx, w, pad, chartH, max, unit)
  const step = chartW / Math.max(1, months.length - 1)
  const pts = vals.map((v, i) => ({ x: pad.left + i * step, y: pad.top + chartH - (v / max) * chartH }))
  ctx.fillStyle = 'rgba(184, 147, 90, 0.22)'
  ctx.beginPath(); ctx.moveTo(pts[0].x, pad.top + chartH)
  pts.forEach(p => ctx.lineTo(p.x, p.y))
  ctx.lineTo(pts[pts.length - 1].x, pad.top + chartH); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = hex(FOREST); ctx.lineWidth = 2.2
  ctx.beginPath(); pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))); ctx.stroke()
  pts.forEach(p => {
    ctx.fillStyle = hex(FOREST); ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2); ctx.fill()
  })
  ctx.fillStyle = hex(INK_MID); ctx.font = `8px ${FONT}`; ctx.textAlign = 'center'
  months.forEach((m, i) => ctx.fillText(monthShort(m.month), pad.left + i * step, h - pad.bottom + 12))
  const last = pts[pts.length - 1]
  ctx.fillStyle = hex(FOREST_DARK); ctx.font = `bold 9px ${FONT}`; ctx.textAlign = 'right'
  ctx.fillText(tickLabel(vals[vals.length - 1], unit), last.x - 4, last.y - 7)
  return c.toDataURL('image/png')
}

function drawLeafLogo() {
  const c = document.createElement('canvas')
  c.width = 240; c.height = 240
  const ctx = c.getContext('2d')!
  ctx.beginPath(); ctx.roundRect(20, 20, 200, 200, 44)
  ctx.fillStyle = hex(GOLD); ctx.fill()
  ctx.save(); ctx.translate(70, 60); ctx.scale(200 / 24 * 0.5, 200 / 24 * 0.5)
  ctx.strokeStyle = hex(FOREST_DARK); ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  try {
    ctx.stroke(new Path2D('M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 17 3.5s1.5 2.5 1.5 6c0 4-2.5 7-7.5 10.5'))
    ctx.stroke(new Path2D('M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12'))
  } catch { /* Path2D unsupported */ }
  ctx.restore()
  return c.toDataURL('image/png')
}

async function loadLogo(url?: string | null) {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    const data = await new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
    const size = await new Promise<{ w: number; h: number }>(resolve => {
      const img = new Image()
      img.onload = () => resolve({ w: img.width || 1, h: img.height || 1 })
      img.onerror = () => resolve({ w: 1, h: 1 })
      img.src = data
    })
    return { data, ...size }
  } catch {
    return null
  }
}

// ── Report ──────────────────────────────────────────────────────────────────

export async function generateReportPdf(
  report: ReportData,
  { mode, certificateNumber }: { mode: 'yearly' | 'monthly'; certificateNumber?: string | null },
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const a = report.assessment
  const total = report.summary.total
  const U = co2UnitFor(total)
  const UL = UNIT_PDF[U]
  const period = periodMonths(a)
  const months = (report.byMonth ?? []).filter(m => m.month >= period.start && m.month <= period.end)
  const hasMonthly = months.some(m => m.total > 0)
  const today = new Date().toLocaleDateString('fr-FR')
  const periodText = period.start === 1 && period.end === 12
    ? `Année ${a.year}`
    : `${monthShort(period.start)} – ${monthShort(period.end)} ${a.year}`

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const T = (s: unknown, x: number, y: number, opt?: { align?: 'left' | 'center' | 'right'; charSpace?: number }) => doc.text(pdfSafe(s), x, y, opt)
  const rows = (r: (string | number)[][]) => r.map(cells => cells.map(pdfSafe))
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const margin = 16
  const cw = pw - 2 * margin
  let y = 0

  const tbl = {
    theme: 'striped' as const,
    headStyles: { fillColor: FOREST, textColor: WHITE, fontSize: 8, fontStyle: 'bold' as const, cellPadding: 2.5 },
    footStyles: { fillColor: IVORY, textColor: FOREST_DARK, fontSize: 8, fontStyle: 'bold' as const, cellPadding: 2.5 },
    bodyStyles: { fontSize: 7.5, textColor: INK, cellPadding: 2 },
    alternateRowStyles: { fillColor: IVORY_SOFT },
    styles: { lineColor: LINE, lineWidth: 0.15 },
    margin: { left: margin, right: margin },
  }
  // Header and footer cells follow their column's alignment (autotable applies columnStyles to the body only)
  type TableOpts = Parameters<typeof autoTable>[1]
  const table = (opts: TableOpts) => autoTable(doc, {
    ...opts,
    didParseCell: d => {
      if (d.section === 'body') return
      const cs = (opts.columnStyles as Record<number, { halign?: 'left' | 'center' | 'right' }> | undefined)?.[d.column.index]
      if (cs?.halign) d.cell.styles.halign = cs.halign
    },
  })
  const tblY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  const logo = await loadLogo(a.logo_url)
  const place = [a.site_name, a.country].filter(Boolean).join(', ')

  let pageNo = 1
  const addHeader = () => {
    doc.setFillColor(...GOLD); doc.rect(0, 0, pw, 1.6, 'F')
    let hx = margin
    if (logo) {
      try {
        const lh = 9, lw = Math.min(30, (logo.w / logo.h) * lh)
        doc.addImage(logo.data, margin, 4.5, lw, lh, undefined, 'FAST')
        hx = margin + lw + 4
      } catch { /* unsupported image */ }
    }
    doc.setFontSize(7); doc.setTextColor(...INK_MID)
    T(`${a.company_name} | ${place} | ${periodText}`, hx, 10)
    T(`RCCM : ${a.rccm || 'N/A'}`, pw - margin, 10, { align: 'right' })
    doc.setDrawColor(...LINE); doc.line(margin, 16, pw - margin, 16)
  }
  const addFooter = (p: number) => {
    doc.setDrawColor(...LINE); doc.line(margin, ph - 12, pw - margin, ph - 12)
    doc.setFontSize(6.5); doc.setTextColor(...INK_LIGHT)
    T('GreenLeaves · Bilan carbone', margin, ph - 7)
    T(today, pw / 2, ph - 7, { align: 'center' })
    T(`Page ${p}`, pw - margin, ph - 7, { align: 'right' })
  }
  const section = (title: string) => {
    doc.setFontSize(12); doc.setTextColor(...FOREST_DARK); T(title, margin, y + 4)
    doc.setFillColor(...GOLD); doc.rect(margin, y + 7, 28, 0.8, 'F')
    y += 13
  }
  const newPage = () => { addFooter(pageNo); doc.addPage(); pageNo++; addHeader(); y = 22 }
  const check = (n: number) => { if (y + n > ph - 18) newPage() }

  // ── Cover ──
  const top = FOREST_DARK, bottom: RGB = [53, 106, 76]
  for (let i = 0; i < 60; i++) {
    const t = i / 59
    doc.setFillColor(...(top.map((v, k) => Math.round(v + (bottom[k] - v) * t * t)) as RGB))
    doc.rect(0, (ph / 60) * i, pw, ph / 60 + 0.5, 'F')
  }
  doc.setFillColor(...GOLD); doc.rect(0, 0, pw, 2, 'F')

  try {
    if (logo) {
      const ratio = logo.w / logo.h
      const lw = ratio > 1 ? 36 : 36 * ratio
      const lh = ratio > 1 ? 36 / ratio : 36
      const ly = 88 - lh
      doc.setFillColor(...WHITE); doc.roundedRect((pw - lw) / 2 - 4, ly - 4, lw + 8, lh + 8, 3, 3, 'F')
      doc.addImage(logo.data, (pw - lw) / 2, ly, lw, lh, undefined, 'FAST')
    } else {
      doc.addImage(drawLeafLogo(), 'PNG', (pw - 28) / 2, 58, 28, 28)
    }
  } catch { /* logo skipped */ }

  doc.setFontSize(9); doc.setTextColor(...GOLD_LIGHT)
  T(mode === 'yearly' ? 'RAPPORT ANNUEL' : 'RAPPORT MENSUEL DÉTAILLÉ', pw / 2, 104, { align: 'center' })
  doc.setFontSize(30); doc.setTextColor(...WHITE)
  T('Bilan carbone', pw / 2, 118, { align: 'center' })
  doc.setFontSize(12); doc.setTextColor(232, 226, 210)
  T(a.company_name || '', pw / 2, 130, { align: 'center' })
  doc.setFontSize(9.5); doc.setTextColor(200, 214, 204)
  T(`${a.name} · ${place} · ${periodText}`, pw / 2, 138, { align: 'center' })

  const badges = ['ISO 14064-1:2018', 'ISO 14069:2013', 'GHG Protocol']
  const bW = 42, bGap = 5
  const bx0 = (pw - (badges.length * bW + (badges.length - 1) * bGap)) / 2
  doc.setDrawColor(...GOLD_LIGHT); doc.setLineWidth(0.3)
  doc.setFontSize(7); doc.setTextColor(...WHITE)
  badges.forEach((b, i) => {
    const bx = bx0 + i * (bW + bGap)
    doc.roundedRect(bx, 150, bW, 9, 4, 4, 'S')
    T(b, bx + bW / 2, 156, { align: 'center' })
  })

  // Verification QR only when the bilan holds a CNC certificate (the public /verify page)
  if (certificateNumber) {
    try {
      const { default: QRCode } = await import('qrcode')
      const url = `${window.location.origin}/verify/${encodeURIComponent(certificateNumber)}`
      const qr = await QRCode.toDataURL(url, { width: 300, margin: 1, color: { dark: '#0F2A1D', light: '#FFFFFF' } })
      doc.setFillColor(...WHITE); doc.roundedRect((pw - 44) / 2, 172, 44, 44, 3, 3, 'F')
      doc.addImage(qr, 'PNG', (pw - 38) / 2, 175, 38, 38)
      doc.setFontSize(8); doc.setTextColor(...GOLD_LIGHT)
      T(`Certificat CNC n° ${certificateNumber}`, pw / 2, 224, { align: 'center' })
      doc.setFontSize(7); doc.setTextColor(200, 214, 204)
      T('Scannez pour vérifier l’authenticité du certificat', pw / 2, 229, { align: 'center' })
    } catch { /* QR skipped */ }
  }

  doc.setFontSize(7); doc.setTextColor(200, 214, 204)
  T(`${a.company_name || 'GreenLeaves'} · Document confidentiel · ${today}`, pw / 2, ph - 18, { align: 'center' })

  // ── Synthesis ──
  doc.addPage(); pageNo++
  addHeader()
  y = 22
  section('Synthèse du bilan carbone')

  doc.setFillColor(...IVORY_SOFT); doc.roundedRect(margin, y, cw, 28, 2, 2, 'F')
  doc.setDrawColor(...LINE); doc.roundedRect(margin, y, cw, 28, 2, 2, 'S')
  const info = [
    { l: 'ENTREPRISE', v: a.company_name || 'N/A' },
    { l: 'SITE', v: [a.site_name, siteTypeLabel(a.site_type)].filter(Boolean).join(' · ') || 'N/A' },
    { l: 'RCCM', v: a.rccm || 'N/A' },
    { l: 'SECTEUR', v: a.sector ? sectorLabel(a.sector) : 'N/A' },
  ]
  const colW = cw / 4
  info.forEach((c, i) => {
    const cx = margin + i * colW + 5
    doc.setFontSize(6.5); doc.setTextColor(...INK_MID); T(c.l, cx, y + 10)
    doc.setFontSize(8.5); doc.setTextColor(...INK)
    const lines = doc.splitTextToSize(pdfSafe(c.v), colW - 8).slice(0, 2)
    doc.text(lines, cx, y + 16)
    if (i < 3) { doc.setDrawColor(...LINE); doc.line(margin + (i + 1) * colW, y + 4, margin + (i + 1) * colW, y + 24) }
  })
  y += 34

  doc.setFillColor(...FOREST_DARK); doc.roundedRect(margin, y, cw, 21, 2, 2, 'F')
  doc.setFillColor(...GOLD); doc.rect(margin, y + 4, 1.2, 13, 'F')
  doc.setFontSize(7.5); doc.setTextColor(...GOLD_LIGHT); T('TOTAL DES ÉMISSIONS', margin + 6, y + 8)
  doc.setFontSize(16); doc.setTextColor(...WHITE); T(pdfCO2Text(total, U), margin + 6, y + 16.5)
  doc.setFontSize(7.5); doc.setTextColor(200, 214, 204)
  T(`${a.name}  ·  ${periodText}  ·  ${report.entries?.length || 0} postes`, pw - margin - 6, y + 13, { align: 'right' })
  y += 27

  const scopeVals = [report.summary.scope1, report.summary.scope2, report.summary.scope3]
  const sbw = (cw - 6) / 3
  SCOPES.forEach((s, i) => {
    const bx = margin + i * (sbw + 3)
    doc.setFillColor(...SCOPE_TINT[i]); doc.roundedRect(bx, y, sbw, 20, 2, 2, 'F')
    doc.setFillColor(...s.rgb); doc.rect(bx, y, sbw, 1.8, 'F')
    doc.setFontSize(8); doc.setTextColor(...FOREST_DARK); T(s.label, bx + 4, y + 8.5)
    doc.setFontSize(6.5); doc.setTextColor(...INK_MID); T(s.name, bx + 4 + doc.getTextWidth(s.label) + 2.5, y + 8.5)
    doc.setFontSize(10); doc.setTextColor(...INK); T(pdfCO2Text(scopeVals[i], U), bx + 4, y + 15.5)
    doc.setFontSize(7); doc.setTextColor(...INK_MID); T(pdfPct(scopeVals[i], total), bx + sbw - 4, y + 15.5, { align: 'right' })
  })
  y += 26

  const chartH = 65
  const halfW = (cw - 4) / 2
  const donutItems = SCOPES.map((s, i) => ({ label: s.label, value: scopeVals[i], color: s.hex })).filter(d => d.value > 0)
  if (donutItems.length > 0) {
    doc.setFillColor(...IVORY_SOFT); doc.roundedRect(margin, y, halfW, chartH, 2, 2, 'F')
    doc.setFontSize(8); doc.setTextColor(...FOREST_DARK); T('Répartition par scope', margin + 4, y + 8)
    doc.addImage(drawDonut(donutItems, 400, 200, U), 'PNG', margin + 2, y + 11, halfW - 4, (halfW - 4) / 2)
  }
  const cats = Object.entries(report.byCategory).filter(([, v]) => v > 0).sort(([, x], [, z]) => z - x)
  if (cats.length > 0) {
    const rx = margin + halfW + 4
    doc.setFillColor(...IVORY_SOFT); doc.roundedRect(rx, y, halfW, chartH, 2, 2, 'F')
    doc.setFontSize(8); doc.setTextColor(...FOREST_DARK); T('Émissions par catégorie', rx + 4, y + 8)
    const items = cats.slice(0, 8).map(([k, v], i) => ({ label: categoryLabel(k), value: v, color: SERIES[i % SERIES.length] }))
    const ch = chartH - 15
    doc.addImage(drawHBars(items, 400, Math.round(400 * (ch / (halfW - 4))), U, 16), 'PNG', rx + 2, y + 11, halfW - 4, ch)
  }
  y += chartH + 6

  // Monthly bars + cumulative side by side, so the synthesis stays on one page
  if (hasMonthly) {
    check(58)
    const ch = 40
    const img = (draw: typeof drawMonthly) => draw(months, 400, Math.round(400 * (ch / (halfW - 4))), U)
    doc.setFillColor(...IVORY_SOFT); doc.roundedRect(margin, y, halfW, ch + 14, 2, 2, 'F')
    doc.setFontSize(8); doc.setTextColor(...FOREST_DARK); T('Suivi mensuel par scope', margin + 4, y + 8)
    doc.addImage(img(drawMonthly), 'PNG', margin + 2, y + 11, halfW - 4, ch)
    const rx = margin + halfW + 4
    doc.setFillColor(...IVORY_SOFT); doc.roundedRect(rx, y, halfW, ch + 14, 2, 2, 'F')
    doc.setFontSize(8); doc.setTextColor(...FOREST_DARK); T('Cumul sur la période', rx + 4, y + 8)
    doc.addImage(img(drawCumulative), 'PNG', rx + 2, y + 11, halfW - 4, ch)
    y += ch + 20
  }

  // ── Tables ──
  newPage()
  section('Répartition par catégorie')
  if (cats.length > 0) {
    table({
      ...tbl, startY: y,
      head: rows([['Catégorie', `Émissions (${UL})`, 'Part']]),
      body: rows(cats.map(([k, v]) => [categoryLabel(k), pdfCO2(v, U), pdfPct(v, total)])),
      foot: rows([['Total', pdfCO2(total, U), '100 %']]),
      columnStyles: { 0: { cellWidth: 85 }, 1: { halign: 'right' }, 2: { halign: 'right', cellWidth: 28 } },
    })
    y = tblY() + 10
  }

  const ghg = Object.entries(report.byGhgCategory).filter(([, v]) => v.total > 0).sort(([x], [z]) => x.localeCompare(z))
  if (ghg.length > 0) {
    check(35)
    section('GHG Protocol · catégories')
    const items = ghg.map(([k, v]) => ({ label: k, value: v.total, color: SCOPES[scopeOfGhg(k) - 1].hex }))
    const h = Math.max(45, Math.min(90, items.length * 7 + 8))
    check(h + 10)
    doc.addImage(drawHBars(items, 800, Math.round(800 * (h / cw)), U, 44), 'PNG', margin, y, cw, h)
    y += h + 4
    table({
      ...tbl, startY: y,
      head: rows([['Catégorie GHG', 'Scope', `Émissions (${UL})`, 'Part']]),
      body: rows(ghg.map(([k, v]) => [k, `Scope ${scopeOfGhg(k)}`, pdfCO2(v.total, U), pdfPct(v.total, total)])),
      foot: rows([['Total', '', pdfCO2(total, U), '100 %']]),
      columnStyles: { 0: { cellWidth: 80 }, 2: { halign: 'right' }, 3: { halign: 'right', cellWidth: 25 } },
    })
    y = tblY() + 10
  }

  const isoMap: Record<string, { total: number; scope: number; count: number }> = {}
  for (const e of report.entries ?? []) {
    const k = e.iso_category || 'Autre'
    isoMap[k] ??= { total: 0, scope: e.scope, count: 0 }
    isoMap[k].total += num(e.total_co2eq); isoMap[k].count++
  }
  const iso = Object.entries(isoMap).filter(([, v]) => v.total > 0).sort(([x], [z]) => x.localeCompare(z))
  if (iso.length > 0) {
    check(35)
    section('ISO 14064-1 / ISO 14069')
    const items = iso.map(([k, v]) => ({ label: isoLabel(k), value: v.total, color: SCOPES[Math.min(Math.max(v.scope, 1), 3) - 1].hex }))
    const h = Math.max(45, Math.min(90, items.length * 7 + 8))
    check(h + 10)
    doc.addImage(drawHBars(items, 800, Math.round(800 * (h / cw)), U, 42), 'PNG', margin, y, cw, h)
    y += h + 4
    table({
      ...tbl, startY: y,
      head: rows([['Poste ISO 14069', 'Scope', 'Postes', `Émissions (${UL})`, 'Part']]),
      body: rows(iso.map(([k, v]) => [isoLabel(k), `Scope ${v.scope}`, String(v.count), pdfCO2(v.total, U), pdfPct(v.total, total)])),
      foot: rows([['Total', '', String(report.entries?.length || 0), pdfCO2(total, U), '100 %']]),
      columnStyles: { 0: { cellWidth: 70 }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', cellWidth: 22 } },
    })
    y = tblY() + 10
  }

  if (mode === 'monthly' && hasMonthly) {
    check(Math.min(months.length * 6.5 + 32, 120))
    section('Suivi mensuel des émissions')
    const cell = (v: number) => (v > 0 ? pdfCO2(v, U) : '-')
    table({
      ...tbl, startY: y,
      head: rows([['Mois', `Scope 1 (${UL})`, `Scope 2 (${UL})`, `Scope 3 (${UL})`, `Total (${UL})`, 'Part']]),
      body: rows(months.map(m => [monthShort(m.month), cell(m.scope1), cell(m.scope2), cell(m.scope3), cell(m.total), m.total > 0 ? pdfPct(m.total, total) : '-'])),
      foot: rows([['Total', pdfCO2(report.summary.scope1, U), pdfCO2(report.summary.scope2, U), pdfCO2(report.summary.scope3, U), pdfCO2(total, U), '100 %']]),
      showFoot: 'lastPage',
      columnStyles: { 0: { cellWidth: 22 }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', cellWidth: 18 } },
    })
    y = tblY() + 10
  }

  const sources = aggregateSources(report.entries ?? []).slice(0, 10)
  if (sources.length > 0) {
    check(35)
    section('Principales sources d’émissions')
    const items = sources.map(s => ({ label: s.name, value: s.total, color: SCOPES[Math.min(Math.max(s.scope, 1), 3) - 1].hex }))
    const h = Math.max(55, Math.min(100, items.length * 7 + 10))
    check(h + 10)
    doc.addImage(drawHBars(items, 800, Math.round(800 * (h / cw)), U, 44), 'PNG', margin, y, cw, h)
    y += h + 4
    table({
      ...tbl, startY: y,
      head: rows([['#', 'Source', 'Catégorie', 'Scope', 'Période', 'Quantité', 'Unité', `Émissions (${UL})`]]),
      body: rows(sources.map((s, i) => [
        String(i + 1), clip(s.name, 34), categoryLabel(s.category), `Scope ${s.scope}`, monthsText(s.months) || '-',
        pdfNum(s.quantity), (s.unit || '').replace('kgCO2eq/', ''), pdfCO2(s.total, U),
      ])),
      columnStyles: { 0: { cellWidth: 7, halign: 'center' }, 1: { cellWidth: 46 }, 5: { halign: 'right' }, 7: { halign: 'right' } },
    })
    y = tblY() + 10
  }

  if (report.entries && report.entries.length > 0) {
    check(35)
    section('Données complètes de calcul')
    doc.setFontSize(7); doc.setTextColor(...INK_MID)
    T(`${report.entries.length} postes d’émission · quantités, facteurs d’émission (kgCO2e par unité) et résultats`, margin, y + 2)
    y += 7
    const sorted = report.entries.slice().sort((x, z) => x.scope - z.scope || x.category.localeCompare(z.category) || (Number(x.month) || 0) - (Number(z.month) || 0))
    table({
      ...tbl, startY: y,
      head: rows([['Source d’émission', 'Catégorie', 'Mois', 'Sc.', 'Quantité', 'Unité', 'FE', `Émissions (${UL})`]]),
      body: rows(sorted.map(e => [
        clip(e.factor_name || '', 32), categoryLabel(e.category), Number(e.month) ? monthShort(Number(e.month)) : '-', String(e.scope),
        pdfNum(num(e.quantity)), (e.unit || '').replace('kgCO2eq/', ''), pdfNum(num(e.factor_value), 4), pdfCO2(num(e.total_co2eq), U),
      ])),
      showFoot: 'lastPage',
      foot: rows([[`Total (${report.entries.length} postes)`, '', '', '', '', '', '', pdfCO2(total, U)]]),
      headStyles: { ...tbl.headStyles, fontSize: 7 },
      bodyStyles: { ...tbl.bodyStyles, fontSize: 6.5 },
      footStyles: { ...tbl.footStyles, fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 44 }, 1: { cellWidth: 24 }, 2: { cellWidth: 13 }, 3: { cellWidth: 8, halign: 'center' },
        4: { halign: 'right', cellWidth: 22 }, 5: { cellWidth: 16 }, 6: { halign: 'right', cellWidth: 18 }, 7: { halign: 'right' },
      },
    })
    y = tblY() + 10
  }

  check(65)
  section('Méthodologie et références')
  doc.setFillColor(...IVORY_SOFT); doc.roundedRect(margin, y, cw, 50, 2, 2, 'F')
  doc.setFontSize(7.5); doc.setTextColor(...INK)
  const lines = [
    'Ce bilan carbone a été réalisé conformément aux référentiels suivants :',
    '  - GHG Protocol Corporate Standard (WRI/WBCSD)',
    '  - ISO 14064-1:2018 - Quantification et déclaration des émissions de GES',
    '  - ISO 14069:2013 - Guide d’application de l’ISO 14064-1',
    '',
    `Facteurs d’émission : Base Carbone ADEME et sources reconnues. Résultats exprimés en ${UL}.`,
    '',
    'Scope 1 : émissions directes (combustion, procédés, fuites).',
    'Scope 2 : émissions indirectes liées à l’achat d’énergie.',
    'Scope 3 : autres émissions indirectes (achats, fret, déchets, déplacements).',
  ]
  let ly = y + 7
  for (const l of lines) { T(l, margin + 5, ly); ly += 4.5 }
  y += 56
  doc.setFontSize(6); doc.setTextColor(...INK_LIGHT)
  T('Rapport généré par GreenLeaves à partir des données saisies par l’entreprise. Document à titre informatif.', margin, y + 3)
  addFooter(pageNo)

  const slug = a.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')
  doc.save(`bilan-carbone-${slug}-${mode === 'monthly' ? 'mensuel' : 'annuel'}-${new Date().toISOString().slice(0, 10)}.pdf`)
}
