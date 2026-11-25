import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { BarChart2 } from 'lucide-react'
import { getDailyConsumption, getMonthlyConsumption, getDashboardSummary } from '../services/api'
import { PageHeader, Card, EmptyState } from '../components/ui/index.jsx'
import { formatKwh, monthName, CATEGORY_COLORS, CHART_COLORS } from '../utils/formatters'

const TT = {
  contentStyle: { backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' },
  labelStyle: { color: '#9ca3af' },
  itemStyle: { color: '#e5e7eb' },
}

export default function Analytics() {
  const year = new Date().getFullYear()
  const { data: monthly } = useQuery({ queryKey: ['monthly', year], queryFn: () => getMonthlyConsumption(year) })
  const { data: daily } = useQuery({ queryKey: ['daily-consumption'], queryFn: () => getDailyConsumption() })
  const { data: summary } = useQuery({ queryKey: ['dashboard-summary'], queryFn: getDashboardSummary })

  const monthlyData = (monthly?.data || []).map(r => ({
    name: monthName(r.month),
    kwh: r.total_kwh,
    cost: r.estimated_cost,
  }))

  const dailyData = daily?.data || []
  const top = summary?.top_consumers || []
  const pieData = top.map((t, i) => ({
    name: t.name,
    value: t.total_kwh,
    color: CATEGORY_COLORS[t.category] || CHART_COLORS[i % CHART_COLORS.length],
  }))

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Deep-dive into your energy consumption patterns" />
      <div className="p-6 space-y-6">

        {/* Monthly bar chart */}
        <Card>
          <div className="text-sm font-semibold text-gray-200 mb-4">Monthly Consumption — {year}</div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={40} />
                <Tooltip {...TT} formatter={(v, n) => [n === 'kwh' ? `${v.toFixed(2)} kWh` : `$${v.toFixed(2)}`, n === 'kwh' ? 'Usage' : 'Cost']} />
                <Bar dataKey="kwh" fill="#3b82f6" radius={[4, 4, 0, 0]} name="kwh" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={BarChart2} title="No monthly data" description="Add appliances and log consumption." />
          )}
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Daily trend line */}
          <Card>
            <div className="text-sm font-semibold text-gray-200 mb-4">Daily Trend (This Month)</div>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false}
                    tickFormatter={d => d.slice(8)} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={35} />
                  <Tooltip {...TT} formatter={(v) => [`${v.toFixed(3)} kWh`, 'Usage']} />
                  <Line type="monotone" dataKey="total_kwh" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={BarChart2} title="No daily data" />
            )}
          </Card>

          {/* Appliance pie */}
          <Card>
            <div className="text-sm font-semibold text-gray-200 mb-4">Appliance Breakdown (This Month)</div>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" paddingAngle={2}>
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip {...TT} formatter={(v) => [`${v.toFixed(3)} kWh`]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-1.5 mt-3">
                  {pieData.map((e, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: e.color }} />
                      <span className="text-gray-400 truncate">{e.name}</span>
                      <span className="text-gray-500 ml-auto">{e.value.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState icon={BarChart2} title="No breakdown data" />
            )}
          </Card>
        </div>

        {/* Cost vs Month */}
        <Card>
          <div className="text-sm font-semibold text-gray-200 mb-4">Monthly Cost Trend — {year}</div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={40} />
                <Tooltip {...TT} formatter={(v) => [`$${v.toFixed(2)}`, 'Cost']} />
                <Line type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : null}
        </Card>

      </div>
    </div>
  )
}
