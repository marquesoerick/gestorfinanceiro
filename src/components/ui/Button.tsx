import { forwardRef } from 'react'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variants = {
  primary:   'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-sm shadow-emerald-200',
  secondary: 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700',
  danger:    'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white shadow-sm shadow-red-200',
  ghost:     'hover:bg-slate-100 active:bg-slate-200 text-slate-600',
  outline:   'border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 text-slate-700',
}
const sizes = {
  xs: 'px-2.5 py-1 text-xs rounded-lg',
  sm: 'px-3 py-1.5 text-xs rounded-xl',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-5 py-2.5 text-sm rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'primary', size = 'md', loading, className = '', children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 font-semibold transition-all duration-150
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
