interface Props {
  children: React.ReactNode
  className?: string
  title?: string
  subtitle?: string
  action?: React.ReactNode
  accent?: string
}

export function Card({ children, className = '', title, subtitle, action, accent }: Props) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden ${className}`}
      style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50">
          <div>
            {title && <h2 className="font-semibold text-slate-800 text-sm">{title}</h2>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="ml-auto pl-4 flex-shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
  trend?: 'up' | 'down' | null
  trendLabel?: string
  onClick?: () => void
  highlight?: boolean
  danger?: boolean
}

export function StatCard({ label, value, icon: Icon, iconColor, iconBg, trend, trendLabel, onClick, highlight, danger }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border p-4 transition-all select-none
        ${danger ? 'border-red-200 bg-red-50/30' : highlight ? 'border-emerald-200' : 'border-slate-100'}
        ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0' : 'shadow-sm'}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon size={18} className={iconColor} />
        </div>
        {trendLabel && (
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-lg ${
            trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
          }`}>
            {trend === 'up' ? '▲' : '▼'} {trendLabel}
          </span>
        )}
      </div>
      <div className={`text-xl font-bold leading-tight tabular-nums ${danger ? 'text-red-700' : 'text-slate-800'}`}>
        {value}
      </div>
      <div className={`text-xs mt-0.5 font-medium ${danger ? 'text-red-500' : 'text-slate-500'}`}>{label}</div>
    </div>
  )
}
