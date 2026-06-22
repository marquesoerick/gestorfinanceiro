import { X } from 'lucide-react'
import { useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  footer?: React.ReactNode
}

export function Modal({ open, onClose, title, subtitle, children, size = 'md', footer }: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const sizes = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-2xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`
        relative bg-white w-full ${sizes[size]}
        rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col
        max-h-[92vh] sm:max-h-[88vh]
        animate-slide-up sm:animate-fade-in
      `}>
        {/* Drag handle mobile */}
        <div className="w-10 h-1 bg-slate-200 rounded-full absolute top-2.5 left-1/2 -translate-x-1/2 sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-6 pb-4 sm:pt-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-base">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 -mr-1 -mt-0.5 ml-3 flex-shrink-0 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 sm:p-6 flex-1 overscroll-contain">
          {children}
        </div>

        {/* Optional footer */}
        {footer && (
          <div className="px-5 py-4 sm:px-6 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
