'use client'

import { useMemo } from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts'
import { BarChart3, PieChart as PieIcon, TrendingUp, Award, Layers } from 'lucide-react'

interface MonthRow { month: number; label: string; total: number; scope1: number; scope2: number; scope3: number }
interface CatRow   { category: string; total: number; scope: number; count: number }
interface TopRow   { name: string; total: number; scope: number; category: string; quantity: number; unit: string }
interface Entry    { scope: number; category: string; totalCo2eq: number }

interface Props {
  byMonth:    MonthRow[]
  byCategory: CatRow[]
  topEmitters: TopRow[]
  entries:    Entry[]
  scope1:     number
  scope2:     number
  scope3:     number
  totalCo2eq: number
}

// Scope colors aligned with admin/expert convention: S1=green, S2=blue, S3=amber
const S1 = '#22c55e'
const S2 = '#3b82f6'
const S3 = '#f59e0b'

const CAT_LABELS: Record<string, string> = {
  energy: 'Énergie', transport: 'Transport', freight: 'Fret',
  waste: 'Déchets', water: 'Eau', materials: 'Matériaux', other: 'Autre',
}

function fmt(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(2) + ' t'
  return n.toFixed(1) + ' kg'
}

function axisFmt(v: number): string {
  if (v >= 1000) return (v / 1000).toFixed(1) + 't'
  return Math.round(v) + 'kg'
}

function CardShell({
  title, icon: Icon, children,
}: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4" />{title}
      </h2>
      {children}
    </div>
  )
}

export default function CertEmissionCharts({
  byMonth, byCategory, topEmitters, entries, scope1, scope2, scope3, totalCo2eq,
}: Props) {
  const scopeData = useMemo(() => [
    { name: 'Scope 1', value: Number(scope1) || 0, fill: S1 },
    { name: 'Scope 2', value: Number(scope2) || 0, fill: S2 },
    { name: 'Scope 3', value: Number(scope3) || 0, fill: S3 },
  ].filter(d => d.value > 0), [scope1, scope2, scope3])

  const total = Number(totalCo2eq) || 0
  const hasMonthly = byMonth.some(m => m.total > 0)

  const cumulativeData = useMemo(() => {
    let cum = 0
    return byMonth.map(m => { cum += m.total; return { ...m, cumulative: Math.round(cum) } })
  }, [byMonth])

  // Cross-tab: each category broken down by scope
  const scopeByCategoryData = useMemo(() => {
    const map: Record<string, { scope1: number; scope2: number; scope3: number }> = {}
    for (const e of entries) {
      const cat = e.category || 'autre'
      if (!map[cat]) map[cat] = { scope1: 0, scope2: 0, scope3: 0 }
      const v = Number(e.totalCo2eq) || 0
      if (e.scope === 1) map[cat].scope1 += v
      else if (e.scope === 2) map[cat].scope2 += v
      else map[cat].scope3 += v
    }
    return Object.entries(map)
      .map(([cat, d]) => ({
        name: CAT_LABELS[cat] ?? cat,
        scope1: Math.round(d.scope1),
        scope2: Math.round(d.scope2),
        scope3: Math.round(d.scope3),
        total: d.scope1 + d.scope2 + d.scope3,
      }))
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [entries])

  const categoryData = useMemo(() => byCategory
    .map(c => ({
      name: CAT_LABELS[c.category] ?? c.category,
      value: Math.round(c.total),
      scope: c.scope,
    }))
    .sort((a, b) => b.value - a.value),
  [byCategory])

  const topEmittersData = useMemo(() => topEmitters.slice(0, 10).map(e => ({
    name: e.name.length > 32 ? e.name.slice(0, 30) + '…' : e.name,
    fullName: e.name,
    value: Math.round(e.total),
    scope: e.scope,
    category: CAT_LABELS[e.category] ?? e.category,
  })), [topEmitters])

  // Dark recharts tooltip
  const tooltipStyle = {
    contentStyle: {
      backgroundColor: '#1f2937',
      border: '1px solid #374151',
      borderRadius: 8,
      color: '#e5e7eb',
      fontSize: 12,
    },
    labelStyle: { color: '#9ca3af', fontSize: 11 },
    itemStyle:  { color: '#e5e7eb' },
  }

  return (
    <div className="space-y-5">
      {/* Top row: Scope donut + Category bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CardShell title="Répartition par scope" icon={PieIcon}>
          {scopeData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0" style={{ width: 170, height: 170 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={scopeData}
                      cx="50%" cy="50%"
                      outerRadius={75} innerRadius={42}
                      dataKey="value" paddingAngle={3} minAngle={15} strokeWidth={0}
                    >
                      {scopeData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {scopeData.map((d, i) => {
                  const pct = total > 0 ? (d.value / total) * 100 : 0
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.fill }} />
                          <span className="text-xs text-gray-300">{d.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-white">{fmt(d.value)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: d.fill }} />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 py-8 text-center">Aucune émission enregistrée</p>
          )}
        </CardShell>

        <CardShell title="Émissions par catégorie" icon={BarChart3}>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(170, categoryData.length * 36)}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" tickFormatter={axisFmt} stroke="#6b7280" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={90} stroke="#6b7280" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmt(v)} {...tooltipStyle} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {categoryData.map((d, i) => (
                    <Cell key={i} fill={d.scope === 1 ? S1 : d.scope === 2 ? S2 : S3} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-gray-500 py-8 text-center">Aucune donnée</p>
          )}
        </CardShell>
      </div>

      {/* Monthly stacked + cumulative */}
      {hasMonthly && (
        <CardShell title="Suivi mensuel des émissions" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byMonth} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#6b7280" />
              <YAxis tickFormatter={axisFmt} tick={{ fontSize: 10 }} stroke="#6b7280" />
              <Tooltip formatter={(v: number) => fmt(v)} {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              <Bar dataKey="scope1" stackId="a" name="Scope 1" fill={S1} />
              <Bar dataKey="scope2" stackId="a" name="Scope 2" fill={S2} />
              <Bar dataKey="scope3" stackId="a" name="Scope 3" fill={S3} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardShell>
      )}

      {hasMonthly && cumulativeData.some(c => c.cumulative > 0) && (
        <CardShell title="Cumul des émissions sur l'année" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={cumulativeData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="certCumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={S1} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={S1} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#6b7280" />
              <YAxis tickFormatter={axisFmt} tick={{ fontSize: 10 }} stroke="#6b7280" />
              <Tooltip formatter={(v: number) => fmt(v)} {...tooltipStyle} />
              <Area type="monotone" dataKey="cumulative" name="Cumul" stroke={S1} strokeWidth={2.5} fill="url(#certCumGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardShell>
      )}

      {/* Scope x Category stacked */}
      {scopeByCategoryData.length > 0 && (
        <CardShell title="Composition par scope et catégorie" icon={Layers}>
          <ResponsiveContainer width="100%" height={Math.max(220, scopeByCategoryData.length * 42)}>
            <BarChart data={scopeByCategoryData} layout="vertical" margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" tickFormatter={axisFmt} stroke="#6b7280" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={110} stroke="#6b7280" tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => fmt(v)} {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              <Bar dataKey="scope1" stackId="cat" name="Scope 1" fill={S1} />
              <Bar dataKey="scope2" stackId="cat" name="Scope 2" fill={S2} />
              <Bar dataKey="scope3" stackId="cat" name="Scope 3" fill={S3} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardShell>
      )}

      {/* Top emitters horizontal bar */}
      {topEmittersData.length > 0 && (
        <CardShell title="Top sources d'émissions" icon={Award}>
          <ResponsiveContainer width="100%" height={Math.max(220, topEmittersData.length * 32)}>
            <BarChart data={topEmittersData} layout="vertical" margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" tickFormatter={axisFmt} stroke="#6b7280" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={180} stroke="#6b7280" tick={{ fontSize: 10 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null
                  const d = payload[0].payload as { fullName: string; category: string; scope: number; value: number }
                  return (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-lg">
                      <p className="font-semibold text-white mb-0.5">{d.fullName}</p>
                      <p className="text-gray-400">{d.category} · Scope {d.scope}</p>
                      <p className="text-brand-300 font-bold mt-1">{fmt(d.value)}</p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="value" radius={[0, 5, 5, 0]}>
                {topEmittersData.map((d, i) => (
                  <Cell key={i} fill={d.scope === 1 ? S1 : d.scope === 2 ? S2 : S3} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardShell>
      )}
    </div>
  )
}
