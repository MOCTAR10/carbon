'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { BarChart3, FileText, Shield, Globe, TrendingDown, Calendar, Download, QrCode, X, Loader2 } from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { toast } from 'sonner'
import { cn, fmtCO2, fmtCO2Text } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Stagger, Reveal } from '@/components/ui/motion'

interface Assessment {
  id: number; name: string; year: number; site_name: string;
  total_co2eq: number; scope1_co2eq: number; scope2_co2eq: number; scope3_co2eq: number;
}

interface EmissionEntry {
  id: number; category: string; subcategory: string; factor_name: string;
  quantity: number; unit: string; factor_value: number; total_co2eq: number;
  scope: number; ghg_category: string; iso_category: string;
  description: string; source_characterization: string;
}

interface MonthData {
  month: number; label: string; total: number; scope1: number; scope2: number; scope3: number
}

interface YearData {
  year: number; total: number; scope1: number; scope2: number; scope3: number
}

interface TopEmitter {
  name: string; total: number; scope: number; category: string; quantity: number; unit: string
}

interface ReportData {
  assessment: Assessment & { site_name: string; company_name: string; rccm: string; sector: string; site_type: string; site_address: string; logo_url?: string }
  entries: EmissionEntry[]
  summary: { total: number; scope1: number; scope2: number; scope3: number }
  byCategory: Record<string, number>
  byGhgCategory: Record<string, { total: number; entries: EmissionEntry[] }>
  bySubcategory?: Record<string, { total: number; scope: number; category: string; count: number }>
  upstreamVsCombustion?: Record<string, { upstream: number; combustion: number; total: number }>
  topEmitters?: TopEmitter[]
  byIsoCategory?: Record<string, { total: number; scope: number; count: number }>
  byMonth?: MonthData[]
  byYear?: YearData[]
}

// On-screen palette (Forest & Ivory). The generated PDF keeps its own palette below.
const UI_SCOPE_COLORS = ['#1A402C', '#B8935A', '#7FA98F']
const UI_SERIES_COLORS = ['#1A402C', '#B8935A', '#7FA98F', '#356A4C', '#D3B27C', '#8A8F87', '#0F2A1D', '#AFCBB9']
const SCOPE3_SHADES = ['#7FA98F', '#356A4C', '#D3B27C', '#1A402C', '#AFCBB9', '#B8935A', '#538767', '#8A8F87']
const SCOPE_COLORS = UI_SCOPE_COLORS

const GRID_PROPS = { stroke: '#EAE4D6', strokeDasharray: '3 3', vertical: false }
const AXIS_PROPS = { tick: { fontSize: 11, fill: '#6B7069' }, axisLine: false, tickLine: false }
const TOOLTIP_PROPS = {
  cursor: { fill: '#F4F0E6' },
  contentStyle: { borderRadius: 12, border: '1px solid #EAE4D6', boxShadow: '0 16px 40px -12px rgba(15,42,29,0.14)', fontSize: 13, padding: '8px 12px' },
  labelStyle: { color: '#232622', fontWeight: 600, marginBottom: 2 },
  itemStyle: { color: '#4E534D' },
}
const LEGEND_PROPS = {
  iconType: 'circle' as const, iconSize: 8, wrapperStyle: { fontSize: 12, paddingTop: 12 },
  formatter: (value: string) => <span style={{ color: '#4E534D', marginLeft: 2 }}>{value}</span>,
}
const THEAD_ROW = 'border-y border-ivory-300 bg-ivory-100 text-[11px] uppercase tracking-[0.12em] text-ink-500'
const TFOOT_ROW = 'border-t border-forest-200 bg-forest-50 font-semibold text-forest-900'

const CATEGORY_COLORS =['#22c55e', '#3b82f6', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#eab308']

const CATEGORY_FR: Record<string, string> = {
  energy: 'Énergie', non_energy: 'Hors énergie', inputs: 'Intrants',
  freight: 'Fret', transport: 'Transport', waste: 'Déchets', capital: 'Immobilisations',
}

// Subcategory codes (same ids as the assessment entry tabs) → on-screen labels
const SUBCATEGORY_FR: Record<string, string> = {
  fuels_stationary: 'Combustibles fossiles (sources fixes)', fuels_organic: 'Combustibles d’origine organique',
  fuels_mobile: 'Combustibles (sources mobiles)', steam: 'Achat de vapeur et froid', electricity: 'Achat d’électricité',
  refrigerants: 'Fluides frigorigènes (HFC)', process: 'Émissions de procédés',
  metals: 'Métaux', plastics: 'Plastiques', other_inputs: 'Verre, papier, construction, eau',
  road: 'Fret routier', air_freight: 'Fret aérien', rail_freight: 'Fret ferroviaire', maritime_freight: 'Fret maritime et fluvial',
  car: 'Voitures', public: 'Transports en commun', plane: 'Avion',
  building_waste: 'Déchets du bâtiment', mineral_waste: 'Déchets minéraux', organic_waste: 'Déchets organiques',
  plastic_waste: 'Déchets plastiques', household_waste: 'Ordures ménagères', dangerous_waste: 'Déchets dangereux',
  wastewater: 'Eaux usées',
  buildings: 'Bâtiments', vehicles: 'Véhicules', it: 'Informatique', furniture: 'Mobilier',
}

function formatCO2(v: number): string {
  if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(2)} ktCO2eq`
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(2)} tCO2eq`
  return `${v.toFixed(1)} kgCO2eq`
}

function smartAxisFormat(v: number): string {
  if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(1)}kt`
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}t`
  if (Math.abs(v) >= 1) return `${v.toFixed(0)}kg`
  if (Math.abs(v) >= 0.01) return `${(v * 1000).toFixed(0)}g`
  return `${v}`
}

// PDF-safe number formatter (avoids non-breaking spaces from toLocaleString)
function fmtNum(v: number, decimals = 2): string {
  const parts = Number(v).toFixed(decimals).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return decimals > 0 ? parts.join(',') : parts[0]
}

export default function ReportsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'monthly' | 'ghg' | 'iso' | 'detail'>('overview')
  const [pdfModal, setPdfModal] = useState(false)
  const [pdfGenerating, setPdfGenerating] = useState(false)

  useEffect(() => {
    fetch('/api/assessments').then(r => r.json()).then((data: Assessment[]) => {
      if (Array.isArray(data)) {
        setAssessments(data)
        if (data.length > 0) setSelectedId(String(data[0].id))
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    fetch(`/api/reports/${selectedId}`)
      .then(r => r.json())
      .then(setReport)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedId])

  const scopeData = useMemo(() => report ? [
    { name: 'Scope 1 - Direct', value: report.summary.scope1, fill: SCOPE_COLORS[0] },
    { name: 'Scope 2 - Énergie', value: report.summary.scope2, fill: SCOPE_COLORS[1] },
    { name: 'Scope 3 - Indirect', value: report.summary.scope3, fill: SCOPE_COLORS[2] },
  ].filter(d => d.value > 0) : [], [report])

  const categoryData = useMemo(() => report ? Object.entries(report.byCategory)
    .map(([key, value]) => ({ name: CATEGORY_FR[key] || key, value: Math.round(value) }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value) : [], [report])

  const ghgData = useMemo(() => report ? Object.entries(report.byGhgCategory)
    .map(([key, val]) => ({ name: key, value: Math.round(val.total), entries: val.entries || [] }))
    .filter(d => d.value > 0)
    .sort((a, b) => {
      const aScope = a.name.startsWith('1-') ? 1 : a.name.startsWith('2-') ? 2 : 3
      const bScope = b.name.startsWith('1-') ? 1 : b.name.startsWith('2-') ? 2 : 3
      return aScope - bScope || a.name.localeCompare(b.name)
    }) : [], [report])

  const isoData = useMemo(() => {
    if (!report?.entries) return []
    const map: Record<string, { total: number; scope: number; count: number }> = {}
    for (const e of report.entries) {
      const key = e.iso_category || 'Autre'
      if (!map[key]) map[key] = { total: 0, scope: 0, count: 0 }
      map[key].total += parseFloat(String(e.total_co2eq)) || 0
      map[key].scope = e.scope
      map[key].count++
    }
    return Object.entries(map)
      .map(([key, val]) => ({ name: key, ...val }))
      .filter(d => d.total > 0)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [report])

  const topEmittersData = useMemo(() => {
    if (!report?.topEmitters) return []
    return report.topEmitters.map(e => ({
      name: e.name.length > 35 ? e.name.slice(0, 32) + '...' : e.name,
      fullName: e.name,
      value: Math.round(e.total),
      scope: e.scope,
      category: CATEGORY_FR[e.category] || e.category,
    }))
  }, [report])

  const cumulativeData = useMemo(() => {
    if (!report?.byMonth) return []
    let cum = 0
    return report.byMonth.map(m => {
      cum += m.total
      return { ...m, cumulative: Math.round(cum) }
    })
  }, [report])

  // Scope-by-category cross-tab — shows each category broken down by scope
  const scopeByCategoryData = useMemo(() => {
    if (!report?.entries) return []
    const map: Record<string, { scope1: number; scope2: number; scope3: number }> = {}
    for (const e of report.entries) {
      const cat = e.category || 'autre'
      if (!map[cat]) map[cat] = { scope1: 0, scope2: 0, scope3: 0 }
      const v = parseFloat(String(e.total_co2eq)) || 0
      if (e.scope === 1) map[cat].scope1 += v
      else if (e.scope === 2) map[cat].scope2 += v
      else map[cat].scope3 += v
    }
    return Object.entries(map)
      .map(([cat, d]) => ({
        name: CATEGORY_FR[cat] || cat,
        scope1: Math.round(d.scope1),
        scope2: Math.round(d.scope2),
        scope3: Math.round(d.scope3),
        total: d.scope1 + d.scope2 + d.scope3,
      }))
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [report])

  const subcategoryData = useMemo(() => {
    if (!report?.bySubcategory) return []
    return Object.entries(report.bySubcategory)
      .map(([key, val]) => {
        const label = SUBCATEGORY_FR[key] || key
        return {
        name: label.length > 30 ? label.slice(0, 27) + '…' : label,
        fullName: label,
        value: Math.round(val.total),
        scope: val.scope,
        category: CATEGORY_FR[val.category] || val.category,
        }
      })
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 12)
  }, [report])

  // ===== CANVAS CHART HELPERS =====
  const drawPieChart = useCallback((items: { label: string; value: number; color: string }[], w: number, h: number): string => {
    const canvas = document.createElement('canvas')
    canvas.width = w * 2; canvas.height = h * 2
    const ctx = canvas.getContext('2d')!
    ctx.scale(2, 2)
    // Donut on left half
    const pieR = Math.min(w * 0.25, h * 0.4) - 4
    const pieCx = w * 0.28, pieCy = h * 0.45
    const total = items.reduce((s, i) => s + i.value, 0)
    if (total === 0) return canvas.toDataURL()
    // Draw slices
    let startAngle = -Math.PI / 2
    items.forEach(item => {
      const slice = (item.value / total) * Math.PI * 2
      ctx.beginPath(); ctx.moveTo(pieCx, pieCy)
      ctx.arc(pieCx, pieCy, pieR, startAngle, startAngle + slice)
      ctx.closePath(); ctx.fillStyle = item.color; ctx.fill()
      startAngle += slice
    })
    // Donut hole
    ctx.beginPath(); ctx.arc(pieCx, pieCy, pieR * 0.5, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'; ctx.fill()
    // Center total text
    ctx.fillStyle = '#111827'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'
    const totalStr = total >= 1000 ? `${(total / 1000).toFixed(1)}t` : `${Math.round(total)}kg`
    ctx.fillText(totalStr, pieCx, pieCy - 1)
    ctx.fillStyle = '#6b7280'; ctx.font = '9px sans-serif'
    ctx.fillText('CO2eq', pieCx, pieCy + 11)
    // Legend on right half
    const legX = w * 0.56
    const legStartY = h * 0.2
    ctx.textAlign = 'left'
    items.forEach((item, idx) => {
      const ly = legStartY + idx * 28
      const pct = ((item.value / total) * 100).toFixed(1)
      const valStr = item.value >= 1000 ? `${(item.value / 1000).toFixed(2)} t` : `${Math.round(item.value)} kg`
      // Color dot
      ctx.fillStyle = item.color
      ctx.beginPath(); ctx.arc(legX, ly + 2, 5, 0, Math.PI * 2); ctx.fill()
      // Label
      ctx.fillStyle = '#374151'; ctx.font = 'bold 11px sans-serif'
      ctx.fillText(item.label, legX + 12, ly + 5)
      // Value + percentage
      ctx.fillStyle = '#6b7280'; ctx.font = '10px sans-serif'
      ctx.fillText(`${valStr}  (${pct}%)`, legX + 12, ly + 20)
    })
    return canvas.toDataURL('image/png')
  }, [])

  const drawBarChart = useCallback((items: { label: string; value: number; color: string }[], w: number, h: number): string => {
    const dpr = 2
    const canvas = document.createElement('canvas')
    canvas.width = w * dpr; canvas.height = h * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    const maxVal = Math.max(...items.map(i => i.value), 1)
    const labelW = w * 0.32
    const valueW = w * 0.18
    const barMaxW = w - labelW - valueW - 10
    const gap = 5
    const itemH = Math.min(24, Math.max(12, (h - 10) / items.length - gap))
    const totalH = items.length * (itemH + gap) - gap
    const startY = Math.max(4, (h - totalH) / 2)
    items.forEach((item, i) => {
      const by = startY + i * (itemH + gap)
      const bw = Math.max(4, (item.value / maxVal) * barMaxW)
      // Label
      ctx.fillStyle = '#374151'; ctx.font = 'bold 11px Inter,sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
      const lbl = item.label.length > 14 ? item.label.slice(0, 12) + '..' : item.label
      ctx.fillText(lbl, labelW - 8, by + itemH / 2)
      // Bar
      ctx.fillStyle = item.color; ctx.beginPath()
      ctx.roundRect(labelW, by, bw, itemH, [0, 4, 4, 0]); ctx.fill()
      // Value
      ctx.fillStyle = '#4b5563'; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
      const valStr = item.value >= 1000000 ? `${(item.value / 1000000).toFixed(1)}kt` : item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}t` : `${Math.round(item.value)}kg`
      ctx.fillText(valStr, labelW + bw + 5, by + itemH / 2)
    })
    return canvas.toDataURL('image/png')
  }, [])

  const drawMonthlyChart = useCallback((months: MonthData[], w: number, h: number): string => {
    const canvas = document.createElement('canvas')
    canvas.width = w * 2; canvas.height = h * 2
    const ctx = canvas.getContext('2d')!
    ctx.scale(2, 2)
    const pad = { left: 45, right: 15, top: 15, bottom: 35 }
    const chartW = w - pad.left - pad.right, chartH = h - pad.top - pad.bottom
    const maxVal = Math.max(...months.map(m => m.total), 1)
    const barW = chartW / months.length - 4
    // Grid lines
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const gy = pad.top + (chartH / 4) * i
      ctx.beginPath(); ctx.moveTo(pad.left, gy); ctx.lineTo(w - pad.right, gy); ctx.stroke()
      ctx.fillStyle = '#9ca3af'; ctx.font = '8px sans-serif'; ctx.textAlign = 'right'
      const gv = maxVal - (maxVal / 4) * i
      ctx.fillText(gv >= 1000 ? `${(gv / 1000).toFixed(0)}t` : `${Math.round(gv)}`, pad.left - 4, gy + 3)
    }
    // Bars
    months.forEach((m, i) => {
      const bx = pad.left + i * (barW + 4) + 2
      const scopes = [
        { val: m.scope1, color: '#ef4444' },
        { val: m.scope2, color: '#f97316' },
        { val: m.scope3, color: '#3b82f6' },
      ]
      let stackY = pad.top + chartH
      scopes.forEach(s => {
        if (s.val <= 0) return
        const sh = (s.val / maxVal) * chartH
        stackY -= sh
        ctx.fillStyle = s.color
        ctx.fillRect(bx, stackY, barW, sh)
      })
      // Month label
      ctx.fillStyle = '#6b7280'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(m.label.slice(0, 3), bx + barW / 2, h - pad.bottom + 12)
    })
    // Legend
    const legendItems = [{ label: 'Scope 1', color: '#ef4444' }, { label: 'Scope 2', color: '#f97316' }, { label: 'Scope 3', color: '#3b82f6' }]
    let lx = pad.left
    legendItems.forEach(l => {
      ctx.fillStyle = l.color; ctx.fillRect(lx, h - 10, 8, 8)
      ctx.fillStyle = '#374151'; ctx.font = '9px sans-serif'; ctx.textAlign = 'left'
      ctx.fillText(l.label, lx + 11, h - 3)
      lx += 60
    })
    return canvas.toDataURL('image/png')
  }, [])

  // Cumulative monthly trend (line + area fill) — shows progression across the year
  const drawCumulativeChart = useCallback((months: MonthData[], w: number, h: number): string => {
    const canvas = document.createElement('canvas')
    canvas.width = w * 2; canvas.height = h * 2
    const ctx = canvas.getContext('2d')!
    ctx.scale(2, 2)
    const pad = { left: 45, right: 18, top: 12, bottom: 30 }
    const chartW = w - pad.left - pad.right
    const chartH = h - pad.top - pad.bottom

    let cum = 0
    const cumValues = months.map(m => { cum += m.total; return cum })
    const maxCum = Math.max(...cumValues, 1)

    // Grid + Y axis labels
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const gy = pad.top + (chartH / 4) * i
      ctx.beginPath(); ctx.moveTo(pad.left, gy); ctx.lineTo(w - pad.right, gy); ctx.stroke()
      ctx.fillStyle = '#9ca3af'; ctx.font = '8px sans-serif'; ctx.textAlign = 'right'
      const gv = maxCum - (maxCum / 4) * i
      ctx.fillText(gv >= 1000 ? `${(gv / 1000).toFixed(0)}t` : `${Math.round(gv)}`, pad.left - 4, gy + 3)
    }

    const stepX = chartW / Math.max(1, months.length - 1)
    const pts = cumValues.map((v, i) => ({
      x: pad.left + i * stepX,
      y: pad.top + chartH - (v / maxCum) * chartH,
    }))

    // Area fill
    ctx.fillStyle = 'rgba(16, 185, 129, 0.18)'
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pad.top + chartH)
    pts.forEach(p => ctx.lineTo(p.x, p.y))
    ctx.lineTo(pts[pts.length - 1].x, pad.top + chartH)
    ctx.closePath(); ctx.fill()

    // Line
    ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2.2
    ctx.beginPath()
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
    ctx.stroke()

    // Points
    pts.forEach(p => {
      ctx.fillStyle = '#10b981'
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2); ctx.fill()
    })

    // X labels
    ctx.fillStyle = '#6b7280'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center'
    months.forEach((m, i) => {
      ctx.fillText(m.label.slice(0, 3), pad.left + i * stepX, h - pad.bottom + 12)
    })

    // Final value annotation
    const last = pts[pts.length - 1]
    const finalVal = cumValues[cumValues.length - 1]
    ctx.fillStyle = '#065f46'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'right'
    ctx.fillText(
      finalVal >= 1000 ? `${(finalVal / 1000).toFixed(1)}t` : `${Math.round(finalVal)}kg`,
      last.x - 4, last.y - 6,
    )
    return canvas.toDataURL('image/png')
  }, [])

  // Horizontal bars with long labels — used for top emitters, GHG, ISO
  const drawHorizontalBars = useCallback(
    (items: { label: string; value: number; color: string }[], w: number, h: number, labelMaxLen = 30): string => {
      const dpr = 2
      const canvas = document.createElement('canvas')
      canvas.width = w * dpr; canvas.height = h * dpr
      const ctx = canvas.getContext('2d')!
      ctx.scale(dpr, dpr)
      const maxVal = Math.max(...items.map(i => i.value), 1)
      const labelW = Math.min(220, w * 0.42)
      const valueW = w * 0.16
      const barMaxW = w - labelW - valueW - 10
      const gap = 4
      const itemH = Math.min(20, Math.max(11, (h - 8) / items.length - gap))
      const totalH = items.length * (itemH + gap) - gap
      const startY = Math.max(4, (h - totalH) / 2)
      items.forEach((item, i) => {
        const by = startY + i * (itemH + gap)
        const bw = Math.max(3, (item.value / maxVal) * barMaxW)
        // Label
        ctx.fillStyle = '#374151'; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
        const lbl = item.label.length > labelMaxLen ? item.label.slice(0, labelMaxLen - 2) + '..' : item.label
        ctx.fillText(lbl, labelW - 6, by + itemH / 2)
        // Bar bg
        ctx.fillStyle = '#f3f4f6'; ctx.fillRect(labelW, by, barMaxW, itemH)
        // Bar
        ctx.fillStyle = item.color; ctx.beginPath()
        ctx.roundRect(labelW, by, bw, itemH, [0, 3, 3, 0]); ctx.fill()
        // Value
        ctx.fillStyle = '#4b5563'; ctx.font = '9px Inter,sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
        const valStr = item.value >= 1000000 ? `${(item.value / 1000000).toFixed(2)}kt`
          : item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}t`
          : `${Math.round(item.value)}kg`
        ctx.fillText(valStr, labelW + bw + 5, by + itemH / 2)
      })
      return canvas.toDataURL('image/png')
    },
    [],
  )

  // ===== PDF GENERATION =====
  const generatePDF = useCallback(async (mode: 'yearly' | 'monthly') => {
    if (!report) return
    setPdfGenerating(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const { default: QRCode } = await import('qrcode')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pw = doc.internal.pageSize.getWidth()
      const ph = doc.internal.pageSize.getHeight()
      const margin = 16
      const cw = pw - 2 * margin
      let y = 0

      // Colors
      const brand: [number, number, number] = [16, 185, 129]
      const brandDark: [number, number, number] = [5, 150, 105]
      const dark: [number, number, number] = [31, 41, 55]
      const mid: [number, number, number] = [107, 114, 128]
      const light: [number, number, number] = [156, 163, 175]
      const bg: [number, number, number] = [249, 250, 251]
      const white: [number, number, number] = [255, 255, 255]

      const tbl = {
        theme: 'striped' as const,
        headStyles: { fillColor: brand, textColor: white, fontSize: 8, fontStyle: 'bold' as const, cellPadding: 2.5 },
        footStyles: { fillColor: [240, 253, 244] as [number, number, number], textColor: dark, fontSize: 8, fontStyle: 'bold' as const, cellPadding: 2.5 },
        bodyStyles: { fontSize: 7.5, textColor: dark, cellPadding: 2 },
        alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
        styles: { lineColor: [229, 231, 235] as [number, number, number], lineWidth: 0.15 },
        margin: { left: margin, right: margin },
      }
      const tblY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

      let logoData: string | null = null
      let logoProps: { w: number, h: number } | null = null
      if (report.assessment.logo_url) {
        try {
          const res = await fetch(report.assessment.logo_url)
          if (res.ok) {
            const blob = await res.blob()
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.readAsDataURL(blob)
            })
            logoData = base64
            logoProps = await new Promise<{ w: number, h: number }>((resolve) => {
              const img = new Image()
              img.onload = () => resolve({ w: img.width || 1, h: img.height || 1 })
              img.onerror = () => resolve({ w: 1, h: 1 })
              img.src = base64
            })
          }
        } catch (e) { console.warn('Logo pre-fetch failed:', e) }
      }

      const pageNum = { v: 1 }
      const addHeader = () => {
        doc.setFillColor(...brand); doc.rect(0, 0, pw, 2.5, 'F')
        let headX = margin;
        if (logoData && logoProps) {
          try {
            const targetH = 14;
            const targetW = (logoProps.w / logoProps.h) * targetH;
            doc.addImage(logoData, margin, 4, targetW, targetH, undefined, 'FAST')
            headX = margin + targetW + 4;
          } catch(e) {}
        }
        doc.setFontSize(7); doc.setTextColor(...mid)
        doc.text(`${report.assessment.company_name} | ${report.assessment.site_name}, ${'country' in report.assessment ? (report.assessment as any).country : 'Global'} | ${report.assessment.year}`, headX, 9)
        doc.text(`RCCM: ${report.assessment.rccm || 'N/A'}`, pw - margin, 9, { align: 'right' })
        doc.setDrawColor(229, 231, 235); doc.line(margin, 16, pw - margin, 16)
      }
      const addFooter = (p: number) => {
        doc.setDrawColor(229, 231, 235); doc.line(margin, ph - 12, pw - margin, ph - 12)
        doc.setFontSize(6.5); doc.setTextColor(...light)
        doc.text('GreenLeaves - Bilan Carbone', margin, ph - 7)
        doc.text(`${new Date().toLocaleDateString('fr-FR')}`, pw / 2, ph - 7, { align: 'center' })
        doc.text(`Page ${p}`, pw - margin, ph - 7, { align: 'right' })
      }
      const section = (title: string) => {
        doc.setFontSize(12); doc.setTextColor(...dark); doc.text(title, margin, y + 4)
        doc.setFillColor(...brand); doc.rect(margin, y + 7, 35, 1, 'F')
        doc.setFillColor(209, 250, 229); doc.rect(margin + 35, y + 7, 15, 1, 'F')
        y += 13
      }
      const newPage = () => { addFooter(pageNum.v); doc.addPage(); pageNum.v++; addHeader(); y = 20 }
      const check = (n: number) => { if (y + n > ph - 18) newPage() }

      // =============================================
      // PAGE 1: FULL COVER (presentation style)
      // =============================================
      const qrUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/reports?id=${selectedId}`

      // Green gradient background (dark green → medium green → light green)
      for (let gi = 0; gi < 50; gi++) {
        const gt = gi / 50
        const gr = gt < 0.4 ? 22 : Math.round(22 + 52 * ((gt - 0.4) / 0.6))
        const gg = gt < 0.4 ? Math.round(101 + 62 * (gt / 0.4)) : Math.round(163 + 59 * ((gt - 0.4) / 0.6))
        const gb = gt < 0.4 ? Math.round(52 + 22 * (gt / 0.4)) : Math.round(74 + 54 * ((gt - 0.4) / 0.6))
        doc.setFillColor(gr, gg, gb)
        doc.rect(0, (ph / 50) * gi, pw, ph / 50 + 0.5, 'F')
      }

      // Logo icon
      try {
        if (logoData && logoProps) {
          const ratio = logoProps.w / logoProps.h;
          let targetH = 50;
          let targetW = 50;
          if (ratio > 1) { // Wide
            targetH = targetW / ratio;
          } else { // Tall
            targetW = targetH * ratio;
          }
          doc.addImage(logoData, (pw - targetW) / 2, 55, targetW, targetH, undefined, 'FAST')
        } else {
          // Default leaf logo
          const logoC = document.createElement('canvas')
          logoC.width = 240; logoC.height = 240
          const logoCtx = logoC.getContext('2d')!
          const lPad = 20, lSz = 200, lRad = 44
          logoCtx.shadowColor = 'rgba(0,0,0,0.3)'; logoCtx.shadowBlur = 20; logoCtx.shadowOffsetY = 8
          logoCtx.beginPath()
          logoCtx.moveTo(lPad + lRad, lPad)
          logoCtx.lineTo(lPad + lSz - lRad, lPad); logoCtx.quadraticCurveTo(lPad + lSz, lPad, lPad + lSz, lPad + lRad)
          logoCtx.lineTo(lPad + lSz, lPad + lSz - lRad); logoCtx.quadraticCurveTo(lPad + lSz, lPad + lSz, lPad + lSz - lRad, lPad + lSz)
          logoCtx.lineTo(lPad + lRad, lPad + lSz); logoCtx.quadraticCurveTo(lPad, lPad + lSz, lPad, lPad + lSz - lRad)
          logoCtx.lineTo(lPad, lPad + lRad); logoCtx.quadraticCurveTo(lPad, lPad, lPad + lRad, lPad)
          logoCtx.closePath()
          logoCtx.fillStyle = '#16a34a'; logoCtx.fill()
          logoCtx.shadowColor = 'transparent'
          const leafSc = lSz / 24 * 0.5, leafOx = lPad + lSz * 0.25, leafOy = lPad + lSz * 0.2
          logoCtx.save(); logoCtx.translate(leafOx, leafOy); logoCtx.scale(leafSc, leafSc)
          logoCtx.strokeStyle = 'white'; logoCtx.lineWidth = 2.8; logoCtx.lineCap = 'round'; logoCtx.lineJoin = 'round'
          try {
            logoCtx.stroke(new Path2D('M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 17 3.5s1.5 2.5 1.5 6c0 4-2.5 7-7.5 10.5'))
            logoCtx.stroke(new Path2D('M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12'))
          } catch { /* SVG Path2D fallback */ }
          logoCtx.restore()
          doc.addImage(logoC.toDataURL('image/png'), 'PNG', (pw - 30) / 2, 55, 30, 30)
        }
      } catch { /* logo skip */ }

      // Title
      doc.setFontSize(36); doc.setTextColor(255, 255, 255)
      doc.text('GreenLeaves', pw / 2, 102, { align: 'center' })

      // Subtitle
      doc.setFontSize(12); doc.setTextColor(220, 252, 231)
      doc.text(mode === 'yearly' ? 'Bilan Carbone - Rapport Annuel Complet' : 'Bilan Carbone - Rapport Mensuel Detaille', pw / 2, 114, { align: 'center' })

      // Company + site + year
      doc.setFontSize(10); doc.setTextColor(187, 247, 208)
      doc.text(`${report.assessment.company_name} | ${report.assessment.site_name}, ${'country' in report.assessment ? (report.assessment as any).country : 'Global'} | Annee ${report.assessment.year}`, pw / 2, 126, { align: 'center' })

      // ISO/GHG badges (white bordered pill shapes)
      const coverBadges = ['ISO 14064-1:2018', 'ISO 14069:2013', 'GHG Protocol']
      const cbW = 42, cbGap = 5
      const cbStartX = (pw - (coverBadges.length * cbW + (coverBadges.length - 1) * cbGap)) / 2
      doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.3)
      doc.setFontSize(7); doc.setTextColor(255, 255, 255)
      coverBadges.forEach((cb, ci) => {
        const cbx = cbStartX + ci * (cbW + cbGap)
        doc.roundedRect(cbx, 140, cbW, 9, 4, 4, 'S')
        doc.text(cb, cbx + cbW / 2, 146, { align: 'center' })
      })

      // QR Code (centered, below badges)
      try {
        const qrCover = await QRCode.toDataURL(qrUrl, { width: 300, margin: 1, color: { dark: '#ffffff', light: '#00000000' } })
        doc.addImage(qrCover, 'PNG', (pw - 38) / 2, 164, 38, 38)
        doc.setFontSize(7.5); doc.setTextColor(187, 247, 208)
        doc.text('Scanner pour acceder au rapport en ligne', pw / 2, 208, { align: 'center' })
      } catch { /* QR skip */ }

      // Cover footer
      doc.setFontSize(7); doc.setTextColor(187, 247, 208)
      doc.text((report.assessment.company_name || 'GreenLeaves') + ' | Document confidentiel | ' + new Date().toLocaleDateString('fr-FR'), pw / 2, ph - 18, { align: 'center' })

      // =============================================
      // PAGE 2: DATA SUMMARY
      // =============================================
      doc.addPage(); pageNum.v++
      addHeader()
      doc.setFillColor(...brandDark); doc.rect(0, 0, 4, ph, 'F')

      // Section title
      y = 22
      doc.setFontSize(12); doc.setTextColor(...dark); doc.text('Synthese du Bilan Carbone', margin, y + 4)
      doc.setFillColor(...brand); doc.rect(margin, y + 7, 35, 1, 'F')
      doc.setFillColor(209, 250, 229); doc.rect(margin + 35, y + 7, 15, 1, 'F')
      y += 15

      // Company info row

      doc.setFillColor(...bg); doc.roundedRect(margin, y, cw, 28, 2, 2, 'F')
      doc.setDrawColor(229, 231, 235); doc.roundedRect(margin, y, cw, 28, 2, 2, 'S')
      const cols = [
        { lbl: 'ENTREPRISE', val: report.assessment.company_name || 'N/A' },
        { lbl: 'SITE', val: report.assessment.site_name || 'N/A' },
        { lbl: 'RCCM', val: report.assessment.rccm || 'N/A' },
        { lbl: 'SECTEUR', val: report.assessment.sector || 'N/A' },
      ]
      const colW = cw / 4
      cols.forEach((c, i) => {
        const cx = margin + i * colW + 6
        doc.setFontSize(6.5); doc.setTextColor(...mid); doc.text(c.lbl, cx, y + 10)
        doc.setFontSize(9); doc.setTextColor(...dark)
        const v = c.val.length > 22 ? c.val.slice(0, 20) + '..' : c.val
        doc.text(v, cx, y + 18)
        if (i < 3) { doc.setDrawColor(229, 231, 235); doc.line(margin + (i + 1) * colW, y + 4, margin + (i + 1) * colW, y + 24) }
      })
      y += 34

      // Total + scope row
      doc.setFillColor(...brand); doc.roundedRect(margin, y, cw, 20, 2, 2, 'F')
      doc.setFontSize(9); doc.setTextColor(209, 250, 229); doc.text('TOTAL DES EMISSIONS', margin + 6, y + 8)
      doc.setFontSize(16); doc.setTextColor(...white); doc.text(formatCO2(report.summary.total), margin + 6, y + 16)
      doc.setFontSize(8); doc.setTextColor(209, 250, 229)
      doc.text(`Bilan: ${report.assessment.name}  |  Date: ${new Date().toLocaleDateString('fr-FR')}  |  ${report.entries?.length || 0} postes`, pw - margin - 6, y + 13, { align: 'right' })
      y += 26

      // Scope boxes inline
      const scopes = [
        { label: 'Scope 1', desc: 'Direct', value: report.summary.scope1, color: [239, 68, 68] as [number, number, number], bg: [254, 242, 242] as [number, number, number] },
        { label: 'Scope 2', desc: 'Energie', value: report.summary.scope2, color: [249, 115, 22] as [number, number, number], bg: [255, 247, 237] as [number, number, number] },
        { label: 'Scope 3', desc: 'Indirect', value: report.summary.scope3, color: [59, 130, 246] as [number, number, number], bg: [239, 246, 255] as [number, number, number] },
      ]
      const bw = (cw - 6) / 3
      scopes.forEach((s, i) => {
        const bx = margin + i * (bw + 3)
        doc.setFillColor(...s.bg); doc.roundedRect(bx, y, bw, 20, 2, 2, 'F')
        doc.setFillColor(...s.color); doc.rect(bx, y, bw, 2.5, 'F')
        doc.setFontSize(8); doc.setTextColor(...s.color); doc.text(s.label, bx + 4, y + 9)
        doc.setFontSize(6); doc.setTextColor(...mid); doc.text(s.desc, bx + 4 + doc.getTextWidth(s.label) + 3, y + 9)
        doc.setFontSize(10); doc.setTextColor(...dark); doc.text(formatCO2(s.value), bx + 4, y + 16)
        const pct = report.summary.total > 0 ? ((s.value / report.summary.total) * 100).toFixed(1) + '%' : '0%'
        doc.setFontSize(7); doc.setTextColor(...mid); doc.text(pct, bx + bw - 4, y + 16, { align: 'right' })
      })
      y += 26

      // ===== CHARTS: Scope Pie + Category Bar side by side =====
      const chartH = 65
      const halfW = (cw - 4) / 2

      // Pie chart
      const pieItems = scopes.filter(s => s.value > 0).map(s => ({ label: s.label, value: s.value, color: `rgb(${s.color.join(',')})` }))
      if (pieItems.length > 0) {
        const pieImg = drawPieChart(pieItems, 400, 200)
        doc.setFillColor(...bg); doc.roundedRect(margin, y, halfW, chartH, 2, 2, 'F')
        doc.setFontSize(8); doc.setTextColor(...dark); doc.text('Repartition par Scope', margin + 4, y + 8)
        doc.addImage(pieImg, 'PNG', margin + 2, y + 11, halfW - 4, (halfW - 4) / 2)
      }

      // Category bar chart
      const catItems = Object.entries(report.byCategory).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a).slice(0, 8)
      if (catItems.length > 0) {
        const barItems = catItems.map(([k, v], i) => ({ label: CATEGORY_FR[k] || k, value: v, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))
        const barImg = drawBarChart(barItems, 400, 240)
        const rx = margin + halfW + 4
        doc.setFillColor(...bg); doc.roundedRect(rx, y, halfW, chartH, 2, 2, 'F')
        doc.setFontSize(8); doc.setTextColor(...dark); doc.text('Emissions par Categorie', rx + 4, y + 8)
        doc.addImage(barImg, 'PNG', rx + 2, y + 11, halfW - 4, chartH - 15)
      }
      y += chartH + 6

      // Monthly chart (if data exists)
      if (report.byMonth && report.byMonth.some(m => m.total > 0)) {
        check(55)
        doc.setFillColor(...bg); doc.roundedRect(margin, y, cw, 50, 2, 2, 'F')
        doc.setFontSize(8); doc.setTextColor(...dark); doc.text('Suivi Mensuel par Scope', margin + 4, y + 8)
        const monthImg = drawMonthlyChart(report.byMonth, 600, 160)
        doc.addImage(monthImg, 'PNG', margin + 2, y + 11, cw - 4, 36)
        y += 55

        // Cumulative trend over the year — canvas aspect matches PDF placement
        check(55)
        doc.setFillColor(...bg); doc.roundedRect(margin, y, cw, 50, 2, 2, 'F')
        doc.setFontSize(8); doc.setTextColor(...dark); doc.text("Cumul des emissions sur l'annee", margin + 4, y + 8)
        const cumW = 600
        const cumPdfW = cw - 4
        const cumPdfH = 36
        const cumCanvasH = Math.round(cumW * (cumPdfH / cumPdfW))
        const cumImg = drawCumulativeChart(report.byMonth, cumW, cumCanvasH)
        doc.addImage(cumImg, 'PNG', margin + 2, y + 11, cumPdfW, cumPdfH)
        y += 55
      }

      addFooter(pageNum.v)

      // =============================================
      // PAGE 2: TABLES - Category + GHG + ISO
      // =============================================
      newPage()

      section('Repartition par Categorie')
      const catEntries = Object.entries(report.byCategory).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a)
      if (catEntries.length > 0) {
        autoTable(doc, { ...tbl, startY: y,
          head: [['Categorie', 'Emissions (kgCO2eq)', '% du total']],
          body: catEntries.map(([k, v]) => [CATEGORY_FR[k] || k, formatCO2(v), report.summary.total > 0 ? ((v / report.summary.total) * 100).toFixed(1) + '%' : '0%']),
          foot: [['TOTAL', formatCO2(report.summary.total), '100%']],
          columnStyles: { 0: { cellWidth: 85 }, 1: { halign: 'right' as const }, 2: { halign: 'right' as const, cellWidth: 28 } },
        })
        y = tblY() + 10
      }

      check(35)
      section('GHG Protocol - Categories')
      const ghgEntries = Object.entries(report.byGhgCategory).filter(([, v]) => v.total > 0).sort(([a], [b]) => a.localeCompare(b))
      if (ghgEntries.length > 0) {
        // Visual: horizontal bar chart with scope colors
        const ghgBarItems = ghgEntries.map(([k, v]) => ({
          label: k,
          value: v.total,
          color: k.startsWith('1-') ? '#ef4444' : k.startsWith('2-') ? '#f97316' : '#3b82f6',
        }))
        const ghgChartH = Math.max(45, Math.min(90, ghgBarItems.length * 7 + 8))
        check(ghgChartH + 10)
        // Canvas aspect matches PDF placement aspect to avoid vertical squish & overlap
        const ghgCanvasH = Math.round(800 * (ghgChartH / cw))
        const ghgImg = drawHorizontalBars(ghgBarItems, 800, ghgCanvasH, 38)
        doc.addImage(ghgImg, 'PNG', margin, y, cw, ghgChartH)
        y += ghgChartH + 4

        autoTable(doc, { ...tbl, startY: y,
          head: [['Categorie GHG', 'Scope', 'Emissions (kgCO2eq)', '% du total']],
          body: ghgEntries.map(([k, v]) => [k, k.startsWith('1-') ? 'Scope 1' : k.startsWith('2-') ? 'Scope 2' : 'Scope 3', formatCO2(v.total), report.summary.total > 0 ? ((v.total / report.summary.total) * 100).toFixed(1) + '%' : '0%']),
          foot: [['TOTAL', '', formatCO2(report.summary.total), '100%']],
          columnStyles: { 0: { cellWidth: 65 }, 2: { halign: 'right' as const }, 3: { halign: 'right' as const, cellWidth: 25 } },
        })
        y = tblY() + 10
      }

      check(35)
      section('ISO 14064-1 / ISO 14069')
      if (isoData.length > 0) {
        // Visual: horizontal bar chart with scope colors
        const isoBarItems = isoData.map(d => ({
          label: d.name,
          value: d.total,
          color: d.scope === 1 ? '#ef4444' : d.scope === 2 ? '#f97316' : '#3b82f6',
        }))
        const isoChartH = Math.max(45, Math.min(90, isoBarItems.length * 7 + 8))
        check(isoChartH + 10)
        const isoCanvasH = Math.round(800 * (isoChartH / cw))
        const isoImg = drawHorizontalBars(isoBarItems, 800, isoCanvasH, 36)
        doc.addImage(isoImg, 'PNG', margin, y, cw, isoChartH)
        y += isoChartH + 4

        autoTable(doc, { ...tbl, startY: y,
          head: [['Poste ISO 14069', 'Scope', 'Postes', 'Emissions (kgCO2eq)', '%']],
          body: isoData.map(d => [d.name, `Scope ${d.scope}`, String(d.count), formatCO2(d.total), report.summary.total > 0 ? ((d.total / report.summary.total) * 100).toFixed(1) + '%' : '0%']),
          foot: [['TOTAL', '', String(report.entries?.length || 0), formatCO2(report.summary.total), '100%']],
          columnStyles: { 0: { cellWidth: 55 }, 3: { halign: 'right' as const }, 4: { halign: 'right' as const, cellWidth: 20 } },
        })
        y = tblY() + 10
      }

      // ===== Monthly table (if monthly mode) =====
      if (mode === 'monthly' && report.byMonth && report.byMonth.some(m => m.total > 0)) {
        check(35)
        section('Suivi Mensuel des Emissions')
        autoTable(doc, { ...tbl, startY: y,
          head: [['Mois', 'Scope 1', 'Scope 2', 'Scope 3', 'Total', '%']],
          body: report.byMonth.map(m => [m.label, m.scope1 > 0 ? formatCO2(m.scope1) : '-', m.scope2 > 0 ? formatCO2(m.scope2) : '-', m.scope3 > 0 ? formatCO2(m.scope3) : '-', m.total > 0 ? formatCO2(m.total) : '-', report.summary.total > 0 && m.total > 0 ? ((m.total / report.summary.total) * 100).toFixed(1) + '%' : '-']),
          foot: [['TOTAL', formatCO2(report.summary.scope1), formatCO2(report.summary.scope2), formatCO2(report.summary.scope3), formatCO2(report.summary.total), '100%']],
          columnStyles: { 0: { cellWidth: 25 }, 1: { halign: 'right' as const }, 2: { halign: 'right' as const }, 3: { halign: 'right' as const }, 4: { halign: 'right' as const }, 5: { halign: 'right' as const, cellWidth: 16 } },
        })
        y = tblY() + 10
      }

      // ===== Top emitters =====
      if (report.topEmitters && report.topEmitters.length > 0) {
        check(35)
        section('Top Sources d\'Emissions')
        // Visual: horizontal bar chart, scope-colored
        const topItems = report.topEmitters.slice(0, 10).map(e => ({
          label: e.name,
          value: e.total,
          color: e.scope === 1 ? '#ef4444' : e.scope === 2 ? '#f97316' : '#3b82f6',
        }))
        const topChartH = Math.max(55, Math.min(100, topItems.length * 7 + 10))
        check(topChartH + 10)
        const topCanvasH = Math.round(800 * (topChartH / cw))
        const topImg = drawHorizontalBars(topItems, 800, topCanvasH, 40)
        doc.addImage(topImg, 'PNG', margin, y, cw, topChartH)
        y += topChartH + 4

        autoTable(doc, { ...tbl, startY: y,
          head: [['#', 'Source', 'Categorie', 'Scope', 'Quantite', 'Unite', 'Emissions (kgCO2eq)']],
          body: report.topEmitters.slice(0, 10).map((e, i) => [String(i + 1), e.name.length > 35 ? e.name.slice(0, 32) + '...' : e.name, CATEGORY_FR[e.category] || e.category, `Scope ${e.scope}`, fmtNum(Number(e.quantity)), e.unit?.replace('kgCO2eq/', '') || '', formatCO2(e.total)]),
          columnStyles: { 0: { cellWidth: 8, halign: 'center' as const }, 1: { cellWidth: 50 }, 6: { halign: 'right' as const } },
        })
        y = tblY() + 10
      }

      // =============================================
      // FULL CALCULATION DATA (all entries)
      // =============================================
      if (report.entries && report.entries.length > 0) {
        check(35)
        section('Donnees Completes de Calcul')
        doc.setFontSize(7); doc.setTextColor(...mid)
        doc.text(`${report.entries.length} postes d'emission - Detail complet avec quantites, facteurs d'emission et resultats`, margin, y + 2)
        y += 7

        autoTable(doc, { ...tbl, startY: y,
          head: [['Source d\'emission', 'Categorie', 'Sc.', 'GHG', 'Quantite', 'Unite', 'FE', 'Total (kgCO2eq)']],
          body: report.entries.map(e => [
            (e.factor_name || '').length > 30 ? (e.factor_name || '').slice(0, 27) + '...' : (e.factor_name || ''),
            (CATEGORY_FR[e.category] || e.category || '').length > 14 ? (CATEGORY_FR[e.category] || e.category || '').slice(0, 12) + '..' : (CATEGORY_FR[e.category] || e.category || ''),
            String(e.scope),
            (e.ghg_category || '').length > 12 ? (e.ghg_category || '').slice(0, 10) + '..' : (e.ghg_category || ''),
            fmtNum(Number(e.quantity)),
            (e.unit || '').replace('kgCO2eq/', ''),
            fmtNum(Number(e.factor_value), 4),
            formatCO2(parseFloat(String(e.total_co2eq)) || 0),
          ]),
          foot: [[`TOTAL (${report.entries.length} postes)`, '', '', '', '', '', '', formatCO2(report.summary.total)]],
          headStyles: { ...tbl.headStyles, fontSize: 7 },
          bodyStyles: { ...tbl.bodyStyles, fontSize: 6.5 },
          footStyles: { ...tbl.footStyles, fontSize: 7 },
          columnStyles: {
            0: { cellWidth: 42 },
            1: { cellWidth: 22 },
            2: { cellWidth: 8, halign: 'center' as const },
            3: { cellWidth: 18 },
            4: { halign: 'right' as const, cellWidth: 22 },
            5: { cellWidth: 16 },
            6: { halign: 'right' as const, cellWidth: 18 },
            7: { halign: 'right' as const, cellWidth: 25 },
          },
        })
        y = tblY() + 10
      }

      // ===== METHODOLOGY =====
      check(65)
      section('Methodologie & References')
      doc.setFillColor(...bg); doc.roundedRect(margin, y, cw, 50, 2, 2, 'F')
      doc.setFontSize(7.5); doc.setTextColor(...dark)
      const lines = [
        'Ce bilan carbone a ete realise conformement aux normes :',
        '  - GHG Protocol Corporate Standard (WRI/WBCSD)',
        '  - ISO 14064-1:2018 - Quantification des emissions de GES',
        '  - ISO 14069:2013 - Guide d\'application de l\'ISO 14064-1',
        '',
        'Facteurs d\'emission : Base Carbone ADEME et sources reconnues. Resultats en kgCO2eq.',
        '',
        'Scope 1 : Emissions directes (combustion, procedes, fuites).',
        'Scope 2 : Emissions indirectes liees a l\'achat d\'energie.',
        'Scope 3 : Autres emissions indirectes (achats, fret, dechets, deplacements).',
      ]
      let ly = y + 7
      for (const l of lines) { doc.text(l, margin + 5, ly); ly += 4.5 }
      y += 56

      // Disclaimer
      doc.setFontSize(6); doc.setTextColor(...light)
      doc.text('Ce rapport est genere automatiquement par GreenLeaves. Les resultats dependent des donnees saisies. Document a titre informatif.', margin, y + 3)

      addFooter(pageNum.v)

      // Save
      const fn = `bilan-carbone-${report.assessment.name.replace(/[^a-zA-Z0-9]/g, '-')}-${mode === 'monthly' ? 'mensuel' : 'annuel'}-${new Date().toISOString().slice(0, 10)}.pdf`
      doc.save(fn)
    } catch (err) {
      console.error('PDF generation error:', err)
      toast.error('Erreur lors de la génération du PDF')
    } finally {
      setPdfGenerating(false)
      setPdfModal(false)
    }
  }, [report, selectedId, isoData, drawPieChart, drawBarChart, drawMonthlyChart, drawCumulativeChart, drawHorizontalBars])

  const scopeTotal = scopeData.reduce((s, e) => s + e.value, 0)
  const pctOf = (v: number) => (report && report.summary.total > 0 ? (v / report.summary.total) * 100 : 0)

  return (
    <Stagger className="space-y-8">
      <Reveal>
        <PageHeader
          eyebrow="Analyse & reporting"
          title="Rapports & synthèse"
          description="Bilan carbone selon le GHG Protocol, l'ISO 14064-1 et l'ISO 14069"
          actions={report && (
            <Button onClick={() => setPdfModal(true)}>
              <Download /> Télécharger le PDF
            </Button>
          )}
        />
      </Reveal>

      {/* Assessment selector */}
      {assessments.length > 0 && (
        <Reveal>
          <Card className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-forest-50 text-forest-600">
                <FileText className="size-[18px]" strokeWidth={1.8} />
              </span>
              <label htmlFor="report-assessment" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">
                Bilan analysé
              </label>
            </div>
            <select
              id="report-assessment"
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="h-11 w-full max-w-xl rounded-xl border border-ivory-400 bg-white px-4 text-sm font-medium text-ink-800 outline-none transition focus:border-forest-500 focus:ring-4 focus:ring-forest-100"
            >
              {assessments.map(a => (
                <option key={a.id} value={a.id}>{a.name} — {a.site_name} ({a.year})</option>
              ))}
            </select>
            {report && !loading && (
              <p className="text-xs text-ink-400 md:ml-auto">
                {report.entries?.length || 0} poste{(report.entries?.length || 0) > 1 ? 's' : ''} d&apos;émission
              </p>
            )}
          </Card>
        </Reveal>
      )}

      {assessments.length === 0 && (
        <Reveal>
          <Card className="p-10">
            <EmptyState
              icon={BarChart3}
              title="Aucun bilan disponible"
              description="Créez un bilan et saisissez des données pour voir les rapports."
            />
          </Card>
        </Reveal>
      )}

      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-2xl" />)}
          </div>
          <Skeleton className="h-12 rounded-xl" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        </div>
      )}

      {report && !loading && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative flex flex-col overflow-hidden rounded-2xl bg-forest-900 bg-forest-grain p-6 text-ivory-50 shadow-lifted">
              <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full border border-gold-400/15" />
              <div className="flex items-center gap-2 text-gold-300/90">
                <TrendingDown className="size-4" strokeWidth={1.8} />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Émissions totales</p>
              </div>
              <p className="mt-4 font-display text-3xl font-light tabular-nums">{fmtCO2Text(report.summary.total)}</p>
              <p className="mt-auto border-t border-white/10 pt-3 text-xs text-forest-100/60">Scopes 1, 2 et 3 consolidés</p>
            </div>
            {[
              { scope: 1, label: 'Scope 1', sub: 'Émissions directes', value: report.summary.scope1, icon: Shield },
              { scope: 2, label: 'Scope 2', sub: 'Énergie indirecte', value: report.summary.scope2, icon: Shield },
              { scope: 3, label: 'Scope 3', sub: 'Autres indirectes', value: report.summary.scope3, icon: Globe },
            ].map(s => {
              const Icon = s.icon
              const pct = pctOf(s.value)
              return (
                <Card key={s.scope} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ backgroundColor: scopeColor(s.scope) }} />
                      <p className="text-sm font-semibold text-ink-800">{s.label}</p>
                    </div>
                    <Icon className="size-4 text-ink-400" strokeWidth={1.8} />
                  </div>
                  <p className="mt-4 font-display text-2xl tabular-nums text-forest-900">{fmtCO2Text(s.value)}</p>
                  <p className="text-xs text-ink-400">{s.sub}</p>
                  {report.summary.total > 0 && (
                    <div className="mt-4 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ivory-200">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: scopeColor(s.scope) }} />
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-ink-500">{pct.toFixed(1)} %</span>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Report tabs */}
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-ivory-300 bg-ivory-200/70 p-1">
            {[
              { id: 'overview' as const, label: "Vue d'ensemble", icon: BarChart3 },
              { id: 'monthly' as const, label: 'Mensuel', icon: Calendar },
              { id: 'ghg' as const, label: 'GHG Protocol', icon: FileText },
              { id: 'iso' as const, label: 'ISO 14064', icon: Shield },
              { id: 'detail' as const, label: 'Détail', icon: Globe },
            ].map(tab => {
              const Icon = tab.icon
              const active = activeReportTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveReportTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition-all',
                    active ? 'bg-white text-forest-900 shadow-soft' : 'text-ink-500 hover:text-forest-900',
                  )}
                >
                  <Icon className={cn('size-4', active ? 'text-gold-500' : '')} strokeWidth={1.8} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* ===== OVERVIEW TAB ===== */}
          {activeReportTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Scope donut */}
                <Card className="flex flex-col">
                  <CardHeader eyebrow="GHG Protocol" title="Répartition par scope" />
                  <CardContent className="flex flex-1 flex-col justify-center">
                    {scopeData.length > 0 ? (
                      <div className="flex flex-col items-center gap-8 sm:flex-row">
                        <div className="relative flex-shrink-0" style={{ width: 190, height: 190 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={scopeData}
                                cx="50%"
                                cy="50%"
                                outerRadius={88}
                                innerRadius={62}
                                dataKey="value"
                                paddingAngle={3}
                                minAngle={20}
                                strokeWidth={0}
                                cornerRadius={4}
                              >
                                {scopeData.map((entry, index) => (
                                  <Cell key={index} fill={entry.fill} />
                                ))}
                              </Pie>
                              <Tooltip {...TOOLTIP_PROPS} formatter={(value: number) => fmtCO2Text(value)} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Total</span>
                            <span className="font-display text-2xl leading-tight tabular-nums text-forest-900">{fmtCO2(scopeTotal).value}</span>
                            <span className="text-[11px] text-ink-400">{fmtCO2(scopeTotal).unit}</span>
                          </div>
                        </div>
                        <div className="w-full flex-1 space-y-4">
                          {scopeData.map((entry, i) => {
                            const pct = scopeTotal > 0 ? (entry.value / scopeTotal) * 100 : 0
                            return (
                              <div key={i}>
                                <div className="mb-1.5 flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <span className="size-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: entry.fill }} />
                                    <span className="text-sm font-medium text-ink-700">{entry.name}</span>
                                  </div>
                                  <span className="text-sm font-semibold tabular-nums text-forest-900">{fmtCO2Text(entry.value)}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ivory-200">
                                    <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: entry.fill }} />
                                  </div>
                                  <span className="w-12 text-right text-xs font-semibold tabular-nums text-ink-500">{pct.toFixed(1)} %</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <NoData />
                    )}
                  </CardContent>
                </Card>

                {/* Category bar chart */}
                <Card>
                  <CardHeader eyebrow="Sources" title="Émissions par catégorie" />
                  <CardContent>
                    {categoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={Math.max(250, categoryData.length * 50)}>
                        <BarChart data={categoryData} layout="vertical" margin={{ right: 8 }}>
                          <CartesianGrid {...GRID_PROPS} horizontal={false} vertical />
                          <XAxis type="number" tickFormatter={smartAxisFormat} scale="auto" {...AXIS_PROPS} />
                          <YAxis type="category" dataKey="name" width={120} {...AXIS_PROPS} tick={{ ...AXIS_PROPS.tick, fontSize: 12 }} />
                          <Tooltip {...TOOLTIP_PROPS} formatter={(value: number) => fmtCO2Text(value)} />
                          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
                            {categoryData.map((_, index) => (
                              <Cell key={index} fill={UI_SERIES_COLORS[index % UI_SERIES_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <NoData />
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Top emitters chart */}
              {topEmittersData.length > 0 && (
                <Card>
                  <CardHeader eyebrow="Priorités" title="Principales sources d'émissions" />
                  <CardContent>
                    <p className="-mt-2 mb-5 text-sm text-ink-500">Les {topEmittersData.length} principales sources d&apos;émissions identifiées</p>
                    <ResponsiveContainer width="100%" height={Math.max(250, topEmittersData.length * 40)}>
                      <BarChart data={topEmittersData} layout="vertical" margin={{ left: 10, right: 8 }}>
                        <CartesianGrid {...GRID_PROPS} horizontal={false} vertical />
                        <XAxis type="number" tickFormatter={smartAxisFormat} scale="auto" {...AXIS_PROPS} />
                        <YAxis type="category" dataKey="name" width={200} {...AXIS_PROPS} tick={{ ...AXIS_PROPS.tick, fontSize: 10 }} />
                        <Tooltip cursor={{ fill: '#F4F0E6' }} content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload
                            return (
                              <ChartTooltipBox>
                                <p className="font-semibold text-ink-800">{d.fullName}</p>
                                <p className="text-ink-500">{d.category} · Scope {d.scope}</p>
                                <p className="mt-1 font-semibold text-forest-800">{fmtCO2Text(d.value)}</p>
                              </ChartTooltipBox>
                            )
                          }
                          return null
                        }} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={26}>
                          {topEmittersData.map((d, i) => (
                            <Cell key={i} fill={scopeColor(d.scope)} fillOpacity={1 - i * 0.04} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <ScopeLegend />
                  </CardContent>
                </Card>
              )}

              {/* Subcategory breakdown */}
              {subcategoryData.length > 0 && (
                <Card>
                  <CardHeader eyebrow="Ventilation" title="Répartition par sous-catégorie" />
                  <CardContent>
                    <p className="-mt-2 mb-5 text-sm text-ink-500">Ventilation détaillée par type de source</p>
                    <ResponsiveContainer width="100%" height={Math.max(250, subcategoryData.length * 40)}>
                      <BarChart data={subcategoryData} layout="vertical" margin={{ left: 10, right: 8 }}>
                        <CartesianGrid {...GRID_PROPS} horizontal={false} vertical />
                        <XAxis type="number" tickFormatter={smartAxisFormat} scale="auto" {...AXIS_PROPS} />
                        <YAxis type="category" dataKey="name" width={180} {...AXIS_PROPS} tick={{ ...AXIS_PROPS.tick, fontSize: 10 }} />
                        <Tooltip cursor={{ fill: '#F4F0E6' }} content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload
                            return (
                              <ChartTooltipBox>
                                <p className="font-semibold text-ink-800">{d.fullName}</p>
                                <p className="text-ink-500">{d.category}</p>
                                <p className="mt-1 font-semibold text-forest-800">{fmtCO2Text(d.value)}</p>
                              </ChartTooltipBox>
                            )
                          }
                          return null
                        }} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={26}>
                          {subcategoryData.map((_, i) => (
                            <Cell key={i} fill={UI_SERIES_COLORS[i % UI_SERIES_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Scope x Category — stacked horizontal bar */}
              {scopeByCategoryData.length > 0 && (
                <Card>
                  <CardHeader eyebrow="Croisement" title="Composition par scope et catégorie" />
                  <CardContent>
                    <p className="-mt-2 mb-5 text-sm text-ink-500">Décomposition de chaque catégorie selon les trois scopes du GHG Protocol</p>
                    <ResponsiveContainer width="100%" height={Math.max(260, scopeByCategoryData.length * 48)}>
                      <BarChart data={scopeByCategoryData} layout="vertical" margin={{ left: 10, right: 8 }}>
                        <CartesianGrid {...GRID_PROPS} horizontal={false} vertical />
                        <XAxis type="number" tickFormatter={smartAxisFormat} scale="auto" {...AXIS_PROPS} />
                        <YAxis type="category" dataKey="name" width={140} {...AXIS_PROPS} tick={{ ...AXIS_PROPS.tick, fontSize: 11 }} />
                        <Tooltip {...TOOLTIP_PROPS} formatter={(value: number) => fmtCO2Text(value)} />
                        <Legend {...LEGEND_PROPS} />
                        <Bar dataKey="scope1" stackId="cat" name="Scope 1" fill={UI_SCOPE_COLORS[0]} maxBarSize={28} />
                        <Bar dataKey="scope2" stackId="cat" name="Scope 2" fill={UI_SCOPE_COLORS[1]} maxBarSize={28} />
                        <Bar dataKey="scope3" stackId="cat" name="Scope 3" fill={UI_SCOPE_COLORS[2]} radius={[0, 6, 6, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Cumulative trend in overview when monthly data available */}
              {cumulativeData.length > 0 && cumulativeData.some(c => c.cumulative > 0) && (
                <Card>
                  <CardHeader eyebrow="Tendance" title="Cumul des émissions sur l'année" />
                  <CardContent>
                    <p className="-mt-2 mb-5 text-sm text-ink-500">Progression cumulée des émissions mois après mois</p>
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={cumulativeData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="cumGradOverview" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#B8935A" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#B8935A" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid {...GRID_PROPS} />
                        <XAxis dataKey="label" {...AXIS_PROPS} />
                        <YAxis tickFormatter={smartAxisFormat} {...AXIS_PROPS} />
                        <Tooltip {...TOOLTIP_PROPS} formatter={(value: number) => fmtCO2Text(value)} />
                        <Area type="monotone" dataKey="cumulative" name="Cumul" stroke="#1A402C" strokeWidth={2.5} fill="url(#cumGradOverview)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Company info card */}
              <Card>
                <CardHeader eyebrow="Contexte" title="Informations du bilan" />
                <CardContent>
                  <dl className="grid grid-cols-1 gap-6 text-sm md:grid-cols-3">
                    <div className="rounded-xl border border-ivory-300 bg-ivory-50 p-4">
                      <dt className="mb-1 text-xs text-ink-400">Entreprise</dt>
                      <dd className="font-semibold text-ink-800">{report.assessment.company_name || '-'}</dd>
                      <dd className="text-xs text-ink-400">{report.assessment.rccm ? `RCCM : ${report.assessment.rccm}` : ''} {report.assessment.sector ? `· ${report.assessment.sector}` : ''}</dd>
                    </div>
                    <div className="rounded-xl border border-ivory-300 bg-ivory-50 p-4">
                      <dt className="mb-1 text-xs text-ink-400">Site</dt>
                      <dd className="font-semibold text-ink-800">{report.assessment.site_name || '-'}</dd>
                      <dd className="text-xs text-ink-400">{report.assessment.site_type || ''} {report.assessment.site_address ? `· ${report.assessment.site_address}` : ''}</dd>
                    </div>
                    <div className="rounded-xl border border-ivory-300 bg-ivory-50 p-4">
                      <dt className="mb-1 text-xs text-ink-400">Postes saisis</dt>
                      <dd className="font-semibold text-ink-800">{report.entries?.length || 0} postes d&apos;émission</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ===== MONTHLY TAB ===== */}
          {activeReportTab === 'monthly' && (
            <div className="space-y-6">
              <Card>
                <CardHeader eyebrow="Saisonnalité" title={<span className="flex items-center gap-2"><Calendar className="size-4 text-gold-500" /> Suivi mensuel des émissions</span>} />
                <CardContent>
                  {report.byMonth && report.byMonth.some(m => m.total > 0) ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={report.byMonth} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid {...GRID_PROPS} />
                        <XAxis dataKey="label" {...AXIS_PROPS} />
                        <YAxis tickFormatter={smartAxisFormat} {...AXIS_PROPS} />
                        <Tooltip {...TOOLTIP_PROPS} formatter={(value: number) => fmtCO2Text(value)} />
                        <Legend {...LEGEND_PROPS} />
                        <Bar dataKey="scope1" stackId="a" name="Scope 1" fill={UI_SCOPE_COLORS[0]} maxBarSize={44} />
                        <Bar dataKey="scope2" stackId="a" name="Scope 2" fill={UI_SCOPE_COLORS[1]} maxBarSize={44} />
                        <Bar dataKey="scope3" stackId="a" name="Scope 3" fill={UI_SCOPE_COLORS[2]} radius={[6, 6, 0, 0]} maxBarSize={44} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <NoData text="Aucune donnée mensuelle. Saisissez des données mois par mois dans le bilan." />
                  )}
                </CardContent>
              </Card>

              {/* Cumulative area chart */}
              {cumulativeData.length > 0 && cumulativeData.some(c => c.cumulative > 0) && (
                <Card>
                  <CardHeader eyebrow="Tendance" title="Évolution cumulative" />
                  <CardContent>
                    <p className="-mt-2 mb-5 text-sm text-ink-500">Progression des émissions cumulées sur l&apos;année</p>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={cumulativeData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#B8935A" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#B8935A" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid {...GRID_PROPS} />
                        <XAxis dataKey="label" {...AXIS_PROPS} />
                        <YAxis tickFormatter={smartAxisFormat} {...AXIS_PROPS} />
                        <Tooltip {...TOOLTIP_PROPS} formatter={(value: number) => fmtCO2Text(value)} />
                        <Area type="monotone" dataKey="cumulative" name="Cumul" stroke="#1A402C" strokeWidth={2.5} fill="url(#cumGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Monthly detail table */}
              {report.byMonth && report.byMonth.some(m => m.total > 0) && (
                <Card className="overflow-hidden">
                  <CardHeader eyebrow="Données" title="Détail mensuel" />
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={THEAD_ROW}>
                          <th className="px-6 py-3 text-left font-semibold">Mois</th>
                          <th className="px-4 py-3 text-right font-semibold">Scope 1</th>
                          <th className="px-4 py-3 text-right font-semibold">Scope 2</th>
                          <th className="px-4 py-3 text-right font-semibold">Scope 3</th>
                          <th className="px-4 py-3 text-right font-semibold">Total</th>
                          <th className="px-6 py-3 text-right font-semibold">Part (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ivory-200">
                        {report.byMonth.map((m, i) => (
                          <tr key={i} className={m.total > 0 ? 'transition-colors hover:bg-ivory-50' : 'opacity-40'}>
                            <td className="px-6 py-2.5 font-medium text-ink-800">{m.label}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-ink-600">{m.scope1 > 0 ? fmtCO2Text(m.scope1) : '-'}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-ink-600">{m.scope2 > 0 ? fmtCO2Text(m.scope2) : '-'}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-ink-600">{m.scope3 > 0 ? fmtCO2Text(m.scope3) : '-'}</td>
                            <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-forest-900">{m.total > 0 ? fmtCO2Text(m.total) : '-'}</td>
                            <td className="px-6 py-2.5 text-right tabular-nums text-ink-500">
                              {report.summary.total > 0 && m.total > 0 ? ((m.total / report.summary.total) * 100).toFixed(1) + '%' : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className={TFOOT_ROW}>
                          <td className="px-6 py-3">Total annuel</td>
                          <td className="px-4 py-3 text-right tabular-nums">{fmtCO2Text(report.summary.scope1)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{fmtCO2Text(report.summary.scope2)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{fmtCO2Text(report.summary.scope3)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{fmtCO2Text(report.summary.total)}</td>
                          <td className="px-6 py-3 text-right">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Card>
              )}

              {/* Yearly comparison */}
              {report.byYear && report.byYear.length > 0 && (
                <Card className="overflow-hidden">
                  <CardHeader eyebrow="Historique" title="Comparaison annuelle" />
                  {report.byYear.length > 1 ? (
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={report.byYear.map(y => ({ ...y, label: String(y.year) }))} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid {...GRID_PROPS} />
                          <XAxis dataKey="label" {...AXIS_PROPS} />
                          <YAxis tickFormatter={smartAxisFormat} {...AXIS_PROPS} />
                          <Tooltip {...TOOLTIP_PROPS} formatter={(value: number) => fmtCO2Text(value)} />
                          <Legend {...LEGEND_PROPS} />
                          <Bar dataKey="scope1" stackId="a" name="Scope 1" fill={UI_SCOPE_COLORS[0]} maxBarSize={56} />
                          <Bar dataKey="scope2" stackId="a" name="Scope 2" fill={UI_SCOPE_COLORS[1]} maxBarSize={56} />
                          <Bar dataKey="scope3" stackId="a" name="Scope 3" fill={UI_SCOPE_COLORS[2]} radius={[6, 6, 0, 0]} maxBarSize={56} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  ) : null}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={THEAD_ROW}>
                          <th className="px-6 py-3 text-left font-semibold">Année</th>
                          <th className="px-4 py-3 text-right font-semibold">Scope 1</th>
                          <th className="px-4 py-3 text-right font-semibold">Scope 2</th>
                          <th className="px-4 py-3 text-right font-semibold">Scope 3</th>
                          <th className="px-6 py-3 text-right font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ivory-200">
                        {report.byYear.map((y, i) => (
                          <tr key={i} className="transition-colors hover:bg-ivory-50">
                            <td className="px-6 py-2.5 font-display text-base text-forest-900">{y.year}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-ink-600">{y.scope1 > 0 ? fmtCO2Text(y.scope1) : '-'}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-ink-600">{y.scope2 > 0 ? fmtCO2Text(y.scope2) : '-'}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-ink-600">{y.scope3 > 0 ? fmtCO2Text(y.scope3) : '-'}</td>
                            <td className="px-6 py-2.5 text-right font-semibold tabular-nums text-forest-900">{fmtCO2Text(y.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ===== GHG PROTOCOL TAB ===== */}
          {activeReportTab === 'ghg' && (
            <div className="space-y-6">
              <Card>
                <CardHeader eyebrow="Corporate Standard" title={<span className="flex items-center gap-2"><FileText className="size-4 text-gold-500" /> Rapport GHG Protocol</span>} />
                <CardContent className="space-y-6">
                  {[
                    { scope: 1, prefix: '1-', title: 'Scope 1 — Émissions directes', total: report.summary.scope1, empty: 'Aucune émission Scope 1' },
                    { scope: 2, prefix: '2-', title: "Scope 2 — Émissions indirectes liées à l'énergie", total: report.summary.scope2, empty: 'Aucune émission Scope 2' },
                    { scope: 3, prefix: '3-', title: 'Scope 3 — Autres émissions indirectes', total: report.summary.scope3, empty: 'Aucune émission Scope 3' },
                  ].map(block => {
                    const items = ghgData.filter(d => d.name.startsWith(block.prefix))
                    return (
                      <section key={block.scope} className="rounded-xl border border-ivory-300 bg-ivory-50/60 p-5">
                        <div className="mb-3 flex items-center gap-3">
                          <span className="size-2.5 rounded-full" style={{ backgroundColor: scopeColor(block.scope) }} />
                          <h4 className="text-sm font-semibold text-forest-900">{block.title}</h4>
                          <span className="ml-auto font-display text-lg tabular-nums text-forest-900">{fmtCO2Text(block.total)}</span>
                        </div>
                        <div className="divide-y divide-ivory-300 pl-5">
                          {items.map((item, i) => (
                            <div key={i} className="flex justify-between gap-4 py-2 text-sm">
                              <span className="text-ink-600">{item.name}</span>
                              <span className="font-semibold tabular-nums text-ink-800">{fmtCO2Text(item.value)}</span>
                            </div>
                          ))}
                          {items.length === 0 && (
                            <p className="py-1 text-sm italic text-ink-400">{block.empty}</p>
                          )}
                        </div>
                      </section>
                    )
                  })}

                  {/* Grand total */}
                  <div className="flex items-center justify-between rounded-xl bg-forest-900 bg-forest-grain px-6 py-5 text-ivory-50">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-300">Total des émissions</span>
                    <span className="font-display text-2xl tabular-nums">{fmtCO2Text(report.summary.total)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* GHG bar chart */}
              <Card>
                <CardHeader eyebrow="Visualisation" title="Répartition par catégorie GHG" />
                <CardContent>
                  {ghgData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={Math.max(250, ghgData.length * 45)}>
                        <BarChart data={ghgData} layout="vertical" margin={{ left: 20, right: 8 }}>
                          <CartesianGrid {...GRID_PROPS} horizontal={false} vertical />
                          <XAxis type="number" tickFormatter={smartAxisFormat} scale="auto" {...AXIS_PROPS} />
                          <YAxis type="category" dataKey="name" width={250} {...AXIS_PROPS} tick={{ ...AXIS_PROPS.tick, fontSize: 11 }} />
                          <Tooltip {...TOOLTIP_PROPS} formatter={(value: number) => fmtCO2Text(value)} />
                          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={26}>
                            {ghgData.map((item, index) => (
                              <Cell key={index} fill={scopeColor(item.name.startsWith('1-') ? 1 : item.name.startsWith('2-') ? 2 : 3)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <ScopeLegend />
                    </>
                  ) : (
                    <NoData />
                  )}
                </CardContent>
              </Card>

              {/* Scope 3 detail breakdown */}
              {ghgData.filter(d => d.name.startsWith('3-')).length > 1 && (
                <Card>
                  <CardHeader eyebrow="Focus" title="Scope 3 — détail" />
                  <CardContent>
                    <p className="-mt-2 mb-4 text-sm text-ink-500">Le Scope 3 représente généralement la majorité des émissions</p>
                    {(() => {
                      const scope3Items = ghgData.filter(d => d.name.startsWith('3-'))
                      return (
                        <div>
                          <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                              <Pie
                                data={scope3Items}
                                cx="50%" cy="50%" outerRadius={95} innerRadius={55}
                                dataKey="value"
                                paddingAngle={2}
                                minAngle={10}
                                strokeWidth={0}
                                cornerRadius={3}
                                label={({ name, percent }) => `${name.split(' - ').pop()?.slice(0, 12)}: ${(percent * 100).toFixed(0)}%`}
                                labelLine={{ stroke: '#DBD3C0' }}
                                style={{ fontSize: 11, fill: '#6B7069' }}
                              >
                                {scope3Items.map((_, i) => (
                                  <Cell key={i} fill={SCOPE3_SHADES[i % SCOPE3_SHADES.length]} />
                                ))}
                              </Pie>
                              <Tooltip {...TOOLTIP_PROPS} formatter={(value: number) => fmtCO2Text(value)} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2">
                            {scope3Items.map((item, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <span className="size-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: SCOPE3_SHADES[i % SCOPE3_SHADES.length] }} />
                                <span className="max-w-[160px] truncate text-xs text-ink-600">{item.name.split(' - ').pop()}</span>
                                <span className="text-xs font-semibold tabular-nums text-ink-800">{fmtCO2Text(item.value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ===== ISO 14064/14069 TAB ===== */}
          {activeReportTab === 'iso' && (
            <div className="space-y-6">
              <Card className="overflow-hidden">
                <CardHeader eyebrow="Normes internationales" title={<span className="flex items-center gap-2"><Shield className="size-4 text-gold-500" /> Rapport ISO 14064-1 / ISO 14069</span>} />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={THEAD_ROW}>
                        <th className="px-6 py-3 text-left font-semibold">Poste ISO 14069</th>
                        <th className="px-4 py-3 text-center font-semibold">Scope</th>
                        <th className="px-4 py-3 text-right font-semibold">Nb postes</th>
                        <th className="px-4 py-3 text-right font-semibold">Émissions</th>
                        <th className="px-6 py-3 text-right font-semibold">Part (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ivory-200">
                      {isoData.map((item, i) => (
                        <tr key={i} className="transition-colors hover:bg-ivory-50">
                          <td className="px-6 py-3 font-medium text-ink-800">{item.name}</td>
                          <td className="px-4 py-3 text-center"><ScopeChip scope={item.scope} /></td>
                          <td className="px-4 py-3 text-right tabular-nums text-ink-500">{item.count}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink-800">{fmtCO2Text(item.total)}</td>
                          <td className="px-6 py-3 text-right tabular-nums text-ink-500">
                            {report.summary.total > 0 ? ((item.total / report.summary.total) * 100).toFixed(1) : '0'}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className={TFOOT_ROW}>
                        <td className="px-6 py-3">Total</td>
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3 text-right tabular-nums">{report.entries?.length || 0}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{fmtCO2Text(report.summary.total)}</td>
                        <td className="px-6 py-3 text-right">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>

              {/* ISO bar chart */}
              {isoData.length > 0 && (
                <Card>
                  <CardHeader eyebrow="Visualisation" title="Répartition visuelle ISO 14069" />
                  <CardContent>
                    <ResponsiveContainer width="100%" height={Math.max(250, isoData.length * 45)}>
                      <BarChart data={isoData.map(d => ({ ...d, value: Math.round(d.total) }))} layout="vertical" margin={{ left: 20, right: 8 }}>
                        <CartesianGrid {...GRID_PROPS} horizontal={false} vertical />
                        <XAxis type="number" tickFormatter={smartAxisFormat} scale="auto" {...AXIS_PROPS} />
                        <YAxis type="category" dataKey="name" width={200} {...AXIS_PROPS} tick={{ ...AXIS_PROPS.tick, fontSize: 10 }} />
                        <Tooltip {...TOOLTIP_PROPS} formatter={(value: number) => fmtCO2Text(value)} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={26}>
                          {isoData.map((d, i) => (
                            <Cell key={i} fill={scopeColor(d.scope)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <ScopeLegend />
                  </CardContent>
                </Card>
              )}

              {/* Standards reference */}
              <Card>
                <CardHeader eyebrow="Référentiel" title="Cadre normatif" />
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 text-sm text-ink-500 md:grid-cols-2">
                    <div className="rounded-xl border border-ivory-300 bg-ivory-50 p-5">
                      <p className="mb-2 font-display text-base text-forest-900">ISO 14064-1:2018</p>
                      <p className="leading-relaxed">Spécification et lignes directrices, au niveau des organismes, pour la quantification et la déclaration des émissions et des suppressions des gaz à effet de serre.</p>
                    </div>
                    <div className="rounded-xl border border-ivory-300 bg-ivory-50 p-5">
                      <p className="mb-2 font-display text-base text-forest-900">ISO 14069:2013</p>
                      <p className="leading-relaxed">Guide d&apos;application de l&apos;ISO 14064-1 pour la quantification et la déclaration des émissions de GES. Définit les catégories 1-1 à 6-2.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ===== DETAIL TAB ===== */}
          {activeReportTab === 'detail' && (
            <Card className="overflow-hidden">
              <CardHeader eyebrow="Inventaire" title="Détail de tous les postes d'émission" />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={THEAD_ROW}>
                      <th className="px-6 py-3 text-left font-semibold">Source</th>
                      <th className="px-4 py-3 text-left font-semibold">Catégorie</th>
                      <th className="px-4 py-3 text-center font-semibold">Scope</th>
                      <th className="px-4 py-3 text-right font-semibold">Quantité</th>
                      <th className="px-4 py-3 text-left font-semibold">Unité</th>
                      <th className="px-4 py-3 text-right font-semibold">FE</th>
                      <th className="px-6 py-3 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ivory-200">
                    {(report.entries || []).map((entry, i) => (
                      <tr key={i} className="transition-colors hover:bg-ivory-50">
                        <td className="px-6 py-2.5">
                          <p className="text-sm font-medium text-ink-800">{entry.factor_name}</p>
                          <p className="text-xs text-ink-400">{entry.source_characterization}</p>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-ink-500">{entry.ghg_category}</td>
                        <td className="px-4 py-2.5 text-center"><ScopeChip scope={entry.scope} short /></td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-ink-700">{Number(entry.quantity).toLocaleString('fr-FR')}</td>
                        <td className="px-4 py-2.5 text-xs text-ink-500">{entry.unit?.replace('kgCO2eq/', '') || ''}</td>
                        <td className="px-4 py-2.5 text-right text-xs tabular-nums text-ink-400">{entry.factor_value}</td>
                        <td className="px-6 py-2.5 text-right font-semibold tabular-nums text-forest-900">{fmtCO2Text(parseFloat(String(entry.total_co2eq)) || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className={TFOOT_ROW}>
                      <td colSpan={6} className="px-6 py-3">Total</td>
                      <td className="px-6 py-3 text-right tabular-nums">{fmtCO2Text(report.summary.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {(!report.entries || report.entries.length === 0) && (
                <div className="p-6">
                  <EmptyState
                    icon={FileText}
                    title="Aucun poste d'émission saisi"
                    description="Ouvrez le bilan pour saisir vos données."
                  />
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ===== PDF DOWNLOAD MODAL ===== */}
      {pdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-950/50 p-4 backdrop-blur-sm animate-in fade-in-0">
          <div className="relative w-full max-w-md rounded-3xl border border-ivory-300 bg-ivory-50 p-8 font-sans shadow-lifted animate-in zoom-in-95">
            <button
              onClick={() => setPdfModal(false)}
              className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ivory-200 hover:text-ink-700"
              aria-label="Fermer"
            >
              <X className="size-4" />
            </button>
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-forest-900 ring-4 ring-gold-100">
                <Download className="size-6 text-gold-300" strokeWidth={1.8} />
              </div>
              <h3 className="font-display text-2xl text-forest-900">Télécharger le rapport PDF</h3>
              <p className="mt-2 text-sm text-ink-500">Choisissez le type de rapport à générer</p>
            </div>
            <div className="space-y-3">
              {[
                { mode: 'yearly' as const, icon: BarChart3, title: 'Rapport annuel', text: 'Synthèse globale avec répartition par scope, catégorie, GHG et ISO' },
                { mode: 'monthly' as const, icon: Calendar, title: 'Rapport mensuel détaillé', text: 'Inclut le suivi mensuel complet en plus de la synthèse annuelle' },
              ].map(opt => (
                <button
                  key={opt.mode}
                  onClick={() => generatePDF(opt.mode)}
                  disabled={pdfGenerating}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-ivory-300 bg-white p-4 text-left transition-all hover:border-gold-300 hover:shadow-soft disabled:opacity-50"
                >
                  <span className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-700 transition-colors group-hover:bg-gold-50 group-hover:text-gold-600">
                    <opt.icon className="size-5" strokeWidth={1.8} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink-800">{opt.title}</span>
                    <span className="block text-xs text-ink-500">{opt.text}</span>
                  </span>
                </button>
              ))}
            </div>
            {pdfGenerating && (
              <div className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-forest-700">
                <Loader2 className="size-4 animate-spin" />
                Génération du PDF en cours…
              </div>
            )}
            <div className="mt-6 flex items-center gap-2 border-t border-ivory-300 pt-4 text-xs text-ink-400">
              <QrCode className="size-3.5" />
              <span>Chaque rapport inclut un QR code pour un accès rapide en ligne</span>
            </div>
          </div>
        </div>
      )}
    </Stagger>
  )
}

// ===== On-screen presentation helpers =====

function scopeColor(scope: number) {
  return UI_SCOPE_COLORS[(scope === 1 ? 1 : scope === 2 ? 2 : 3) - 1]
}

function ChartTooltipBox({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-ivory-300 bg-white px-3.5 py-2.5 text-sm shadow-lifted">{children}</div>
}

function NoData({ text = 'Aucune donnée' }: { text?: string }) {
  return <p className="rounded-xl border border-dashed border-ivory-400 bg-ivory-50 py-12 text-center text-sm text-ink-400">{text}</p>
}

function ScopeLegend() {
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-5 text-xs text-ink-500">
      {[1, 2, 3].map(s => (
        <span key={s} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: scopeColor(s) }} /> Scope {s}
        </span>
      ))}
    </div>
  )
}

function ScopeChip({ scope, short }: { scope: number; short?: boolean }) {
  const tone = scope === 1 ? 'forest' : scope === 2 ? 'gold' : 'neutral'
  return <Badge tone={tone}>{short ? scope : `Scope ${scope}`}</Badge>
}
