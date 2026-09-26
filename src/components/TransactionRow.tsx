import type { Category, Transaction } from '../db'
import { formatDate, formatMoney } from '../lib/format'
import { CategoryIcon } from './ui'

export function TransactionRow({
  tx,
  category,
  onClick,
  showDate,
}: {
  tx: Transaction
  category?: Category
  onClick: () => void
  showDate?: boolean
}) {
  const income = tx.type === 'receita'
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800/50 dark:active:bg-slate-800">
      <CategoryIcon icon={category?.icon ?? '❔'} color={category?.color ?? '#94a3b8'} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{tx.note || category?.name || 'Sem categoria'}</p>
        <p className="truncate text-sm text-slate-500 dark:text-slate-400">
          {tx.note ? category?.name : ''}
          {tx.note && showDate ? ' · ' : ''}
          {showDate ? formatDate(tx.date) : ''}
          {tx.recurringId ? ' 🔁' : ''}
        </p>
      </div>
      <span className={`shrink-0 font-semibold tabular-nums ${income ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
        {income ? '+' : '−'}
        {formatMoney(tx.amount)}
      </span>
    </button>
  )
}
