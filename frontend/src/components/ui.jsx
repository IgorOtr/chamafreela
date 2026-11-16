import { Loader2 } from 'lucide-react'

const variants = {
  primary: 'bg-brand-700 text-white hover:bg-brand-600',
  accent: 'bg-sun-400 text-ink hover:bg-sun-500',
  ghost: 'bg-transparent text-brand-700 hover:bg-brand-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  outline: 'border border-brand-700/20 bg-white text-brand-900 hover:bg-brand-50',
  onDark: 'border border-white/40 bg-transparent text-white hover:bg-white/10',
  ghostOnDark: 'bg-transparent text-white hover:bg-white/10',
}

export function Button({ variant = 'primary', loading, className = '', children, ...props }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  )
}

export function Field({ label, error, children, htmlFor }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold">{label}</label>
      {children}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  )
}

export const inputClass = 'w-full rounded-xl border border-brand-900/15 bg-white px-3.5 py-2.5 text-sm placeholder:text-ink/40'

export function Input({ label, error, id, ...props }) {
  return (
    <Field label={label} error={error} htmlFor={id}>
      <input id={id} className={inputClass} {...props} />
    </Field>
  )
}

export function Card({ className = '', children }) {
  return <div className={`rounded-2xl border border-brand-900/10 bg-white p-5 shadow-sm ${className}`}>{children}</div>
}

export function Spinner({ label = 'Carregando…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink/60" role="status">
      <Loader2 className="size-5 animate-spin" /> {label}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-center">
      {Icon && <Icon className="size-8 text-brand-500" />}
      <p className="font-display text-lg font-semibold">{title}</p>
      {children && <p className="max-w-sm text-sm text-ink/60">{children}</p>}
    </div>
  )
}

const badgeColors = {
  green: 'bg-brand-100 text-brand-900', amber: 'bg-amber-100 text-amber-900',
  red: 'bg-red-100 text-red-900', gray: 'bg-gray-100 text-gray-700',
}
export const Badge = ({ color = 'gray', children }) => (
  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColors[color]}`}>{children}</span>
)

export function Modal({ open, title, onClose, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 font-display text-xl font-bold">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className="flex items-center justify-between pt-4 text-sm text-ink/70">
      <span>{total} registro(s)</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>Anterior</Button>
        <span>Página {page} de {pages}</span>
        <Button variant="outline" disabled={page >= pages} onClick={() => onChange(page + 1)}>Próxima</Button>
      </div>
    </div>
  )
}
