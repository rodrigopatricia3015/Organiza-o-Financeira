import { useEffect, type ReactNode } from 'react'
import { addMonthsToMonth, currentMonth, formatMonthLong } from '../lib/format'

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="mb-4 flex items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {action}
    </header>
  )
}

/** Painel que sobe do fundo no telemóvel e aparece ao centro no computador. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="animate-fade absolute inset-0 bg-slate-950/50" onClick={onClose} />
      <div className="animate-sheet pb-safe relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-xl md:max-w-lg md:rounded-3xl dark:bg-slate-900">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="grid size-10 place-items-center rounded-full bg-slate-100 text-xl dark:bg-slate-800" aria-label="Fechar">
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function ProgressBar({ ratio, color }: { ratio: number; color: string }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, ratio * 100)}%`, backgroundColor: color }} />
    </div>
  )
}

export function CategoryIcon({ icon, color, size = 'md' }: { icon: string; color: string; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'sm' ? 'size-8 text-base' : size === 'lg' ? 'size-14 text-3xl' : 'size-11 text-xl'
  return (
    <span className={`grid shrink-0 place-items-center rounded-full ${cls}`} style={{ backgroundColor: `${color}26` }}>
      {icon}
    </span>
  )
}

export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 py-10 text-center">
      <span className="text-4xl">{icon}</span>
      <p className="font-semibold">{title}</p>
      <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">{text}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`min-h-10 flex-1 rounded-lg px-3 text-sm font-semibold transition ${
            value === o.value ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function MonthPicker({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const isCurrent = month === currentMonth()
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(addMonthsToMonth(month, -1))} className="grid size-10 place-items-center rounded-full text-xl hover:bg-slate-200 dark:hover:bg-slate-800" aria-label="Mês anterior">
        ‹
      </button>
      <button
        onClick={() => onChange(currentMonth())}
        className="min-w-36 rounded-full px-3 py-2 text-center text-sm font-semibold"
        title={isCurrent ? undefined : 'Voltar ao mês atual'}
      >
        {formatMonthLong(month)}
      </button>
      <button onClick={() => onChange(addMonthsToMonth(month, 1))} className="grid size-10 place-items-center rounded-full text-xl hover:bg-slate-200 dark:hover:bg-slate-800" aria-label="Mês seguinte">
        ›
      </button>
    </div>
  )
}

export const ICON_CHOICES = [
  '🏠', '🛒', '🍽️', '☕', '🚗', '⛽', '🚌', '✈️', '💊', '🏥', '🎉', '🎬', '🎮', '🛍️', '👕', '📺', '📱', '💻',
  '📚', '🎓', '👶', '🐶', '💡', '💧', '🔥', '📶', '🏋️', '💇', '🎁', '💼', '💰', '➕', '🏦', '📈', '🧾', '🔧',
  '🏖️', '🚙', '⚽', '🎸', '💍', '🪑', '🏷️', '📦',
]

export const COLOR_CHOICES = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a', '#14b8a6', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#64748b', '#0d9488',
]

export function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {ICON_CHOICES.map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={`grid aspect-square place-items-center rounded-xl text-xl ${value === i ? 'bg-brand-100 ring-2 ring-brand-500 dark:bg-brand-700/40' : 'bg-slate-100 dark:bg-slate-800'}`}
        >
          {i}
        </button>
      ))}
    </div>
  )
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_CHOICES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`size-9 rounded-full ${value === c ? 'ring-4 ring-slate-300 ring-offset-2 dark:ring-slate-600 dark:ring-offset-slate-900' : ''}`}
          style={{ backgroundColor: c }}
          aria-label={`Cor ${c}`}
        />
      ))}
    </div>
  )
}
