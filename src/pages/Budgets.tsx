import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { useApp } from '../components/AppContext'
import { CategoryIcon, MonthPicker, PageHeader, ProgressBar, Sheet } from '../components/ui'
import { db, type Category } from '../db'
import { LEVEL_COLOR, budgetLevel } from '../lib/budget'
import { centsToInput, formatMoney, formatPercent, parseMoney } from '../lib/format'

export default function Budgets() {
  const { month, setMonth, toast } = useApp()
  const [editing, setEditing] = useState<Category | null>(null)

  const data = useLiveQuery(async () => {
    const [categories, budgets, txs] = await Promise.all([
      db.categories.where('type').equals('despesa').sortBy('order'),
      db.budgets.toArray(),
      db.transactions.where('date').between(`${month}-01`, `${month}-31`, true, true).filter((t) => t.type === 'despesa').toArray(),
    ])
    return { categories, budgets, txs }
  }, [month])

  if (!data) return null
  const budgetBy = new Map(data.budgets.map((b) => [b.categoryId, b.amount]))
  const spentBy = new Map<string, number>()
  for (const t of data.txs) spentBy.set(t.categoryId, (spentBy.get(t.categoryId) ?? 0) + t.amount)

  const withBudget = data.categories.filter((c) => (budgetBy.get(c.id) ?? 0) > 0)
  const withoutBudget = data.categories.filter((c) => !(budgetBy.get(c.id) ?? 0))
  const totalBudget = withBudget.reduce((s, c) => s + budgetBy.get(c.id)!, 0)
  const totalSpent = withBudget.reduce((s, c) => s + (spentBy.get(c.id) ?? 0), 0)

  return (
    <div className="space-y-4">
      <PageHeader title="Orçamentos" />
      <div className="flex justify-center">
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      {withBudget.length > 0 && (
        <section className="card space-y-2">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total orçamentado</p>
              <p className="text-2xl font-bold">{formatMoney(totalBudget)}</p>
            </div>
            <p className="text-right text-sm text-slate-500 dark:text-slate-400">
              Gasto: <span className="font-semibold text-slate-900 dark:text-slate-100">{formatMoney(totalSpent)}</span>
              <br />
              {totalSpent <= totalBudget ? `Disponível: ${formatMoney(totalBudget - totalSpent)}` : `Excedido: ${formatMoney(totalSpent - totalBudget)}`}
            </p>
          </div>
          <ProgressBar ratio={totalSpent / totalBudget} color={LEVEL_COLOR[budgetLevel(totalSpent / totalBudget)]} />
        </section>
      )}

      <p className="px-1 text-sm text-slate-500 dark:text-slate-400">
        O limite de cada categoria repete-se todos os meses. Recebes um alerta aos 80% e aos 100%.
      </p>

      {withBudget.length > 0 && (
        <div className="card divide-y divide-slate-100 p-0 dark:divide-slate-800">
          {withBudget.map((c) => {
            const limit = budgetBy.get(c.id)!
            const spent = spentBy.get(c.id) ?? 0
            const ratio = spent / limit
            const level = budgetLevel(ratio)
            return (
              <button key={c.id} onClick={() => setEditing(c)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <CategoryIcon icon={c.icon} color={c.color} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <span className="truncate font-medium">{c.name}</span>
                    <span className="shrink-0 text-sm font-semibold" style={{ color: level === 'ok' ? undefined : LEVEL_COLOR[level] }}>
                      {level === 'excedido' ? '⚠️ ' : level === 'aviso' ? '⚡ ' : ''}
                      {formatPercent(ratio)}
                    </span>
                  </div>
                  <ProgressBar ratio={ratio} color={LEVEL_COLOR[level]} />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatMoney(spent)} de {formatMoney(limit)}
                    {spent < limit ? ` · faltam ${formatMoney(limit - spent)}` : ` · mais ${formatMoney(spent - limit)}`}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {withoutBudget.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 font-semibold">{withBudget.length ? 'Sem orçamento' : 'Define um limite mensal'}</h2>
          <div className="card divide-y divide-slate-100 p-0 dark:divide-slate-800">
            {withoutBudget.map((c) => (
              <button key={c.id} onClick={() => setEditing(c)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                <span className="flex-1 font-medium">{c.name}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">{spentBy.get(c.id) ? `${formatMoney(spentBy.get(c.id)!)} gastos` : ''}</span>
                <span className="text-sm font-semibold text-brand-600">Definir</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {editing && (
        <BudgetForm
          category={editing}
          current={budgetBy.get(editing.id) ?? 0}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null)
            toast(msg)
          }}
        />
      )}
    </div>
  )
}

function BudgetForm({ category, current, onClose, onSaved }: { category: Category; current: number; onClose: () => void; onSaved: (msg: string) => void }) {
  const [value, setValue] = useState(current ? centsToInput(current) : '')
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const cents = parseMoney(value)
    if (!cents) return setError('Indica um valor maior que zero.')
    await db.budgets.put({ categoryId: category.id, amount: cents, updatedAt: Date.now() })
    onSaved('Orçamento guardado')
  }

  async function remove() {
    await db.budgets.delete(category.id)
    onSaved('Orçamento removido')
  }

  return (
    <Sheet title={`Orçamento: ${category.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="label" htmlFor="limite">
            Limite mensal
          </label>
          <div className="relative">
            <input id="limite" className="field pr-10 text-2xl font-bold" inputMode="decimal" placeholder="0,00" value={value} onChange={(e) => setValue(e.target.value)} autoFocus autoComplete="off" />
            <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xl text-slate-400">€</span>
          </div>
        </div>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex gap-3">
          {current > 0 && (
            <button type="button" onClick={remove} className="btn-danger">
              Remover
            </button>
          )}
          <button type="submit" className="btn-primary flex-1">
            Guardar
          </button>
        </div>
      </form>
    </Sheet>
  )
}
