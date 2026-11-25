import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Zap, DollarSign, AlertTriangle, Plug, TrendingUp, RefreshCw } from 'lucide-react'
import { getDashboardSummary, getDailyConsumption, recalculate } from '../services/api'
import { PageHeader, StatCard, Card, Badge, Button, Spinner, EmptyState } from '../components/ui/index.jsx'
import { formatKwh, formatCost, CATEGORY_COLORS } from '../utils/formatters'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' },
  labelStyle: { color: '#9ca3af' },
  itemStyle: { color: '#e5e7eb' },
}

export default function Dashboard() {
  const qc = useQueryClient()
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
  })
  const { data: dailyData } = useQuery({
    queryKey: ['daily-consumption'],
    queryFn: () => getDailyConsumption(),
  })

  const handleRecalculate = async () => {
    try {
      await recalculate()
      qc.invalidateQueries()
      toast.success('Consumption data refreshed')
    } catch {
      toast.error('Failed to recalculate')
    }
  }

  if (loadingSummary) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <Spinner size={32} />
      </div>
    )
  }

  const daily = dailyData?.data || []
  const top = summary?.top_consumers || []
  const totalTop = top.reduce((s, t) => s + t.total_kwh, 0)
  const pieData = top.map(t => ({
    name: t.name,
    value: t.total_kwh,
    color: CATEGORY_COLORS[t.category] || '#6b7280',
  }))

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Real-time household energy overview"
        action={
          <Button variant="secondary" size="sm" onClick={handleRecalculate}>
            <RefreshCw size={14} />
            Refresh
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Anomaly banner */}
        {summary?.anomaly_count_this_month > 0 && (
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
            <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
            <span className="text-sm text-amber-300">
              <strong>{summary.anomaly_count_this_month}</strong> unusual consumption{' '}
              {summary.anomaly_count_this_month === 1 ? 'pattern' : 'patterns'} detected this month.
            </span>
          </div>
        )}

        {/* KPI stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Today's Usage"
            value={formatKwh(summary?.today_kwh || 0)}
            sub={formatCost(summary?.today_cost || 0)}
            color="blue"
            icon={Zap}
          />
          <StatCard
            label="Month Usage"
            value={formatKwh(summary?.month_kwh || 0)}
            sub="Current month"
            color="purple"
            icon={TrendingUp}
          />
          <StatCard
            label="Month Cost"
            value={formatCost(summary?.month_cost || 0)}
            sub={summary?.month_budget ? `Budget: ${formatCost(summary.month_budget)}` : 'No budget set'}
            color={summary?.budget_used_pct > 90 ? 'red' : summary?.budget_used_pct > 70 ? 'amber' : 'green'}
            icon={DollarSign}
          />
          <StatCard
            label="Active Appliances"
            value={summary?.active_appliances || 0}
            sub={`${summary?.anomaly_count_this_month || 0} anomalies this month`}
            color="blue"
            icon={Plug}
          />
        </div>

        {/* Budget bar */}
        {summary?.budget_used_pct != null && (
          <Card>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">Monthly Budget Usage</span>
              <span className={`text-sm font-bold ${summary.budget_used_pct > 90 ? 'text-red-400' : summary.budget_used_pct > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {summary.budget_used_pct}%
              </span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${summary.budget_used_pct > 90 ? 'bg-red-500' : summary.budget_used_pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(summary.budget_used_pct, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{formatCost(summary.month_cost)} used</span>
              <span>{formatCost(summary.month_budget)} budget</span>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Daily line chart */}
          <Card className="xl:col-span-2">
            <div className="text-sm font-semibold text-gray-200 mb-4">Daily Consumption (kWh)</div>
            {daily.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false}
                    tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={35} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v.toFixed(3)} kWh`, 'Usage']} />
                  <Line type="monotone" dataKey="total_kwh" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={Zap} title="No data yet" description="Usage will appear once appliances are added." />
            )}
          </Card>

          {/* Top consumers pie */}
          <Card>
            <div className="text-sm font-semibold text-gray-200 mb-4">Top Consumers</div>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                      dataKey="value" paddingAngle={2}>
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v.toFixed(3)} kWh`]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {top.slice(0, 5).map((t, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[t.category] || '#6b7280' }} />
                        <span className="text-gray-300 truncate max-w-24">{t.name}</span>
                      </div>
                      <span className="text-gray-400">{formatKwh(t.total_kwh)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState icon={Plug} title="No data" description="Add appliances to see breakdown." />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
