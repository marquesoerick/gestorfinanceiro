import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  icon?: React.ElementType
  span2?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, icon: Icon, span2, className = '', ...props }, ref) => (
    <div className={span2 ? 'md:col-span-2' : ''}>
      {label && (
        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />}
        <input
          ref={ref}
          className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-all
            bg-slate-50 border-slate-200
            focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100
            placeholder:text-slate-400
            disabled:opacity-60 disabled:cursor-not-allowed
            ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}
            ${Icon ? 'pl-10' : ''}
            ${className}`}
          {...props}
        />
      </div>
      {hint && !error && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  span2?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, span2, className = '', children, ...props }, ref) => (
    <div className={span2 ? 'md:col-span-2' : ''}>
      {label && (
        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={`w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none transition-all
          bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100
          disabled:opacity-60 disabled:cursor-not-allowed
          ${className}`}
        {...props}
      >
        {children}
      </select>
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  )
)
Select.displayName = 'Select'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  span2?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, span2, className = '', ...props }, ref) => (
    <div className={span2 ? 'md:col-span-2' : ''}>
      {label && (
        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={`w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none transition-all
          bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100
          resize-none placeholder:text-slate-400
          ${className}`}
        {...props}
      />
    </div>
  )
)
Textarea.displayName = 'Textarea'
