import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '../components/AppContext'
import { TransactionRow } from '../components/TransactionRow'
import { CategoryIcon, EmptyState, MonthPicker, ProgressBar } from '../components/ui'
import { db } from '../db'
import { LEVEL_COLOR, budgetLevel } from '../lib/budget'
import { addMonthsToMonth, formatMoney, formatMoneyShort, formatMonthShort, formatPercent } from '../lib/format'
import { useGoalsWithProgress } from '../lib/goals'

export default function Dashboard() {
  const { month, setMonth, openTransaction } = useApp()
  const firstMonth = addMonthsToMonth(month, -5)

  const data = useLiveQuery(async () => {
    const [txs, categories, budgets] = await Promise.all([
      db.transactions.where('date').between(`${firstMonth}-01`, `${month}-31`, true, true).toArray(),
      db.categories.toArray(),
      db.budgets.toArray(),
    ])
    return { txs, categories, budgets }
  }, [month, firstMonth])

  const goals = useGoalsWithProgress()

  if (!data) return null
  const { txs, categories, budgets } = data
  const catById = new Map(categories.map((c) => [c.id, c]))

  const monthTxs = txs.filter((t) => t.date.startsWith(month))
  const income = monthTxs.filter((t) => t.type === 'receita').reduce((s, t) => s + t.amount, 0)
  const expenses = monthTxs.filter((t) => t.type === 'despesa').reduce((s, t) => s + t.amount, 0)
  const balance = income - expenses

  // Despesas por categoria no mês
  const spentByCat = new Map<string, number>()
  for (const t of monthTxs) if (t.type === 'despesa') spentByCat.set(t.categoryId, (spentByCat.get(t.categoryId) ?? 0) + t.amount)
  const pieData = [...spentByCat.entries()]
    .map(([id, value]) => ({ id, value, name: catById.get(id)?.name ?? '?', color: catById.get(id)?.color ?? '#94a3b8', icon: catById.get(id)?.icon ?? '' }))
    .sort((a, b) => b.value - a.value)

  // Últimos 6 meses
  const barData = Array.from({ length: 6 }, (_, i) => {
    const m = addMonthsToMonth(firstMonth, i)
    const inMonth = txs.filter((t) => t.date.startsWith(m))
    return {
      mes: formatMonthShort(m),
      Receitas: inMonth.filter((t) => t.type === 'receita').reduce((s, t) => s + t.amount, 0) / 100,
      Despesas: inMonth.filter((t) => t.type === 'despesa').reduce((s, t) => s + t.amount, 0) / 100,
    }
  })

  // Orçamentos a partir dos 80%
  const alerts = budgets
    .filter((b) => b.amount > 0)
    .map((b) => ({ b, spent: spentByCat.get(b.categoryId) ?? 0, cat: catById.get(b.categoryId) }))
    .map((x) => ({ ...x, ratio: x.spent / x.b.amount }))
    .filter((x) => x.cat && x.ratio >= 0.8)
    .sort((a, b) => b.ratio - a.ratio)

  const recent = [...monthTxs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 5)
  const activeGoals = (goals ?? []).filter((g) => !g.completedAt).slice(0, 3)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Painel</h1>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      {/* Resumo */}
      <section className="card bg-linear-to-br from-brand-600 to-brand-700 text-white ring-0 dark:from-brand-700 dark:to-slate-900">
        <p className="text-sm opacity-80">Saldo do mês</p>
        <p className="mt-1 text-4xl font-bold tracking-tight">{formatMoney(balance)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/15 p-3">
            <p className="text-xs opacity-80">Receitas</p>
            <p className="text-lg font-semibold">{formatMoney(income)}</p>
          </div>
          <div className="rounded-xl bg-white/15 p-3">
            <p className="text-xs opacity-80">Despesas</p>
            <p className="text-lg font-semibold">{formatMoney(expenses)}</p>
          </div>
        </div>
      </section>

      {/* Alertas de orçamento */}
      {alerts.length > 0 && (
        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Alertas de orçamento</h2>
            <Link to="/orcamentos" className="text-sm font-medium text-brand-600">
              Ver todos
            </Link>
          </div>
          {alerts.map(({ b, cat, spent, ratio }) => {
            const level = budgetLevel(ratio)
            return (
              <div key={b.categoryId} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {cat!.icon} {cat!.name}
                  </span>
                  <span style={{ color: LEVEL_COLOR[level] }} className="font-semibold">
                    {level === 'excedido' ? 'Ultrapassado' : formatPercent(ratio)}
                  </span>
                </div>
                <ProgressBar ratio={ratio} color={LEVEL_COLOR[level]} />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatMoney(spent)} de {formatMoney(b.amount)}
                </p>
              </div>
            )
          })}
        </section>
      )}

      {/* Despesas por categoria */}
      <section className="card">
        <h2 className="mb-2 font-semibold">Despesas por categoria</h2>
        {pieData.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Ainda não há despesas neste mês.</p>
        ) : (
          <div className="grid items-center gap-4 sm:grid-cols-2">
            <div className="relative h-52">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="95%" paddingAngle={2} stroke="none" isAnimationActive={false}>
                    {pieData.map((d) => (
                      <Cell key={d.id} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatMoney(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
                  <p className="font-bold">{formatMoney(expenses)}</p>
                </div>
              </div>
            </div>
            <ul className="space-y-2">
              {pieData.map((d) => (
                <li key={d.id} className="flex items-center gap-2 text-sm">
                  <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="flex-1 truncate">
                    {d.icon} {d.name}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">{formatPercent(d.value / expenses)}</span>
                  <span className="w-24 text-right font-medium">{formatMoney(d.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Últimos 6 meses */}
      <section className="card">
        <h2 className="mb-3 font-semibold">Últimos 6 meses</h2>
        <div className="h-56 text-slate-500 dark:text-slate-400">
          <ResponsiveContainer>
            <BarChart data={barData} margin={{ top: 4, right: 0, left: -8, bottom: 0 }}>
              <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: 'currentColor', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: 'currentColor', fontSize: 11 }} tickFormatter={(v) => formatMoneyShort(Number(v) * 100)} />
              <Tooltip formatter={(v) => formatMoney(Number(v) * 100)} cursor={{ fill: 'rgba(148,163,184,0.15)' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Receitas" fill="#14b8a6" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="Despesas" fill="#f97316" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Objetivos */}
      {activeGoals.length > 0 && (
        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Objetivos</h2>
            <Link to="/objetivos" className="text-sm font-medium text-brand-600">
              Ver todos
            </Link>
          </div>
          {activeGoals.map((g) => (
            <div key={g.id} className="flex items-center gap-3">
              <CategoryIcon icon={g.icon} color={g.color} size="sm" />
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{g.name}</span>
                  <span className="text-slate-500 dark:text-slate-400">{formatPercent(g.ratio)}</span>
                </div>
                <ProgressBar ratio={g.ratio} color={g.color} />
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Últimos movimentos */}
      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="font-semibold">Últimos movimentos</h2>
          <Link to="/movimentos" className="text-sm font-medium text-brand-600">
            Ver todos
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon="🪙"
            title="Sem movimentos neste mês"
            text="Regista a primeira despesa ou receita. Demora 5 segundos."
            action={
              <button className="btn-primary" onClick={() => openTransaction()}>
                + Novo movimento
              </button>
            }
          />
        ) : (
          <div className="card divide-y divide-slate-100 p-0 dark:divide-slate-800">
            {recent.map((t) => (
              <TransactionRow key={t.id} tx={t} category={catById.get(t.categoryId)} onClick={() => openTransaction(t)} showDate />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
