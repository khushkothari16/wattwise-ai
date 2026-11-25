export const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export const formatKwh = (v) => `${(+v || 0).toFixed(2)} kWh`
export const formatCost = (v, currency = 'USD') => {
  const sym = currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : '$'
  return `${sym}${(+v || 0).toFixed(2)}`
}
export const monthName = (m) => MONTH_NAMES[(m - 1)] || ''
export const pctColor = (pct) => pct > 90 ? 'text-red-400' : pct > 70 ? 'text-amber-400' : 'text-emerald-400'

export const CATEGORY_COLORS = {
  cooling: '#38bdf8',
  heating: '#f97316',
  lighting: '#facc15',
  kitchen: '#a78bfa',
  entertainment: '#34d399',
  laundry: '#fb7185',
  office: '#60a5fa',
  security: '#94a3b8',
  other: '#6b7280',
}

export const CHART_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16']
