'use client'

// Recharts panels — loaded lazily from the reports page (next/dynamic) to keep recharts out of the initial bundle.
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts'
import { fmtCO2Text, SCOPES, type CO2Unit } from '@/lib/utils'
import { axisTick } from './report-utils'

const GRID_PROPS = { stroke: '#EAE4D6', strokeDasharray: '3 3', vertical: false }
const AXIS_PROPS = { tick: { fontSize: 11, fill: '#6E736C' }, axisLine: false, tickLine: false }
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

type ScopeRow = { label: string; scope1: number; scope2: number; scope3: number }

export function ScopeDonut({ data, unit }: { data: { name: string; value: number; fill: string }[]; unit: CO2Unit }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius="100%" innerRadius="72%" dataKey="value" paddingAngle={3} minAngle={12} strokeWidth={0} cornerRadius={4}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Pie>
        <Tooltip {...TOOLTIP_PROPS} formatter={(v: number) => fmtCO2Text(v, unit)} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ResponsiveContainer injects width/height into its direct child: forward them to the chart
function StackedScopes({ data, unit, maxBarSize, width, height }: { data: ScopeRow[]; unit: CO2Unit; maxBarSize: number; width?: number; height?: number }) {
  return (
    <BarChart width={width} height={height} data={data} margin={{ top: 10, right: 4, left: -8, bottom: 0 }}>
      <CartesianGrid {...GRID_PROPS} />
      <XAxis dataKey="label" {...AXIS_PROPS} interval="preserveStartEnd" />
      <YAxis tickFormatter={axisTick(unit)} {...AXIS_PROPS} width={64} />
      <Tooltip {...TOOLTIP_PROPS} formatter={(v: number) => fmtCO2Text(v, unit)} />
      <Legend {...LEGEND_PROPS} />
      {SCOPES.map((s, i) => (
        <Bar
          key={s.scope}
          dataKey={`scope${s.scope}`}
          stackId="s"
          name={s.label}
          fill={s.hex}
          maxBarSize={maxBarSize}
          radius={i === 2 ? [6, 6, 0, 0] : undefined}
        />
      ))}
    </BarChart>
  )
}

export function MonthlyChart({ data, unit }: { data: ScopeRow[]; unit: CO2Unit }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <StackedScopes data={data} unit={unit} maxBarSize={44} />
    </ResponsiveContainer>
  )
}

export function YearlyChart({ data, unit }: { data: ScopeRow[]; unit: CO2Unit }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <StackedScopes data={data} unit={unit} maxBarSize={56} />
    </ResponsiveContainer>
  )
}

export function CumulativeChart({ data, unit, id }: { data: { label: string; cumulative: number }[]; unit: CO2Unit; id: string }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#B8935A" stopOpacity={0.32} />
            <stop offset="95%" stopColor="#B8935A" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey="label" {...AXIS_PROPS} interval="preserveStartEnd" />
        <YAxis tickFormatter={axisTick(unit)} {...AXIS_PROPS} width={64} />
        <Tooltip {...TOOLTIP_PROPS} formatter={(v: number) => fmtCO2Text(v, unit)} />
        <Area type="monotone" dataKey="cumulative" name="Cumul" stroke="#1A402C" strokeWidth={2.5} fill={`url(#${id})`} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
