export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="px-6 pt-6 pb-4 border-b border-gray-800 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-5 ${className}`}>
      {children}
    </div>
  )
}

export function Badge({ children, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    gray: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${colors[color] || colors.blue}`}>
      {children}
    </span>
  )
}

export function Button({ children, onClick, variant = 'primary', size = 'md', disabled, type = 'button', className = '' }) {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white',
    secondary: 'bg-gray-800 hover:bg-gray-700 text-gray-100 border border-gray-700',
    danger: 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30',
    ghost: 'hover:bg-gray-800 text-gray-400 hover:text-gray-100',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Input({ label, error, ...props }) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm font-medium text-gray-300">{label}</label>}
      <input
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

export function Select({ label, children, ...props }) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm font-medium text-gray-300">{label}</label>}
      <select
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

export function Spinner({ size = 16 }) {
  return (
    <svg
      className="animate-spin text-blue-400"
      width={size} height={size}
      viewBox="0 0 24 24" fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon size={40} className="text-gray-700 mb-3" />}
      <div className="text-gray-400 font-medium mb-1">{title}</div>
      {description && <p className="text-sm text-gray-600 mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}

export function StatCard({ label, value, sub, color = 'blue', icon: Icon }) {
  const colors = {
    blue: 'text-blue-400',
    green: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
  }
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</div>
        {Icon && <Icon size={16} className={colors[color]} />}
      </div>
      <div className={`text-2xl font-bold ${colors[color]}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
