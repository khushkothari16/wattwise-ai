import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Receipt, TrendingUp, Zap, DollarSign } from 'lucide-react'
import { getBillEstimate, getBills } from '../services/api'
import { PageHeader, Card, StatCard, EmptyState, Spinner } from '../components/ui/index.jsx'
import { formatKwh, formatCost, monthName } from '../utils/formatters'

const TT = {
  contentStyle: { backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' },
  labelStyle: { color: '#9ca3af' },
  itemStyle: { color: '#e5e7eb' },
}

export default function BillEstimator() {
  const { data: estimate, isLoading } = useQuery({ queryKey: ['bill-estimate'], queryFn: getBillEstimate })
  const { data: bills = [] } = useQuery({ queryKey: ['bills'], queryFn: getBills })

  const billChartData = bills.slice(0, 12).reverse().map(b => ({
    name: `${monthName(b.month)} ${b.year}`,
    kwh: b.total_kwh,
    cost: b.estimated_cost,
  }))

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size={28} /></div>

  const pct = estimate?.budget_used_pct
  const currency = estimate?.currency || 'USD'

  return (
    <div>
      <PageHeader title="Bill Estimator" subtitle="Real-time electricity bill projection" />
      <div className="p-6 space-y-6">

        {/* Current month estimate cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="kWh So Far" value={formatKwh(estimate?.kwh_so_far)} icon={Zap} color="blue" />
          <StatCard label="Projected kWh" value={formatKwh(estimate?.projected_kwh)} icon={TrendingUp} color="purple" />
          <StatCard label="Projected Bill" value={formatCost(estimate?.projected_cost, currency)} icon={DollarSign}
            color={pct > 90 ? 'red' : pct > 70 ? 'amber' : 'green'} />
          <StatCard label="Tariff Rate" value={`${formatCost(estimate?.tariff_rate, currency)}/kWh`} icon={Receipt} color="blue" />
        </div>

        {/* Progress card */}
        <Card>
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-semibold text-white">
              {monthName(estimate?.month)} {estimate?.year} Progress
            </div>
            <span className="text-xs text-gray-500">{estimate?.days_elapsed} of {estimate?.days_in_month} days</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mt-3 mb-1">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${((estimate?.days_elapsed || 0) / (estimate?.days_in_month || 30)) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Month start</span><span>End of month</span>
          </div>

          {pct != null && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-400">Budget Usage</span>
                <span className={`font-bold ${pct > 90 ? 'text-red-400' : pct > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {pct}%
                </span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{formatCost(estimate.projected_cost, currency)} projected</span>
                <span>{formatCost(estimate.budget, currency)} budget</span>
              </div>
            </div>
          )}
        </Card>

        {/* Bill history chart */}
        <Card>
          <div className="text-sm font-semibold text-gray-200 mb-4">Bill History</div>
          {billChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={billChartData} barSize={30}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={40} />
                <Tooltip {...TT} formatter={(v, n) => [n === 'kwh' ? `${v.toFixed(2)} kWh` : `$${v.toFixed(2)}`, n === 'kwh' ? 'Usage' : 'Cost']} />
                <Bar dataKey="cost" fill="#10b981" radius={[4, 4, 0, 0]} name="cost" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={Receipt} title="No bill history" description="Bills will appear after each month." />
          )}
        </Card>

      </div>
    </div>
  )
}
