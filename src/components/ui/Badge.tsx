interface Props {
  children: React.ReactNode
  className?: string
  dot?: string // hex color for dot indicator
}

export function Badge({ children, className = '', dot }: Props) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />}
      {children}
    </span>
  )
}
