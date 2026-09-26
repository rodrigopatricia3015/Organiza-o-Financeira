import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { useApp } from '../components/AppContext'
import { TransactionRow } from '../components/TransactionRow'
import { EmptyState, PageHeader, Segmented } from '../components/ui'
import { db, type TxType } from '../db'
import { formatDayLong, formatMoney, parseMoney } from '../lib/format'

type TypeFilter = 'todos' | TxType
const PAGE = 100

export default function Transactions() {
  const { openTransaction } = useApp()
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [type, setType] = useState<TypeFilter>('todos')
  const [categoryId, setCategoryId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const txs = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray())
  const categories = useLiveQuery(() => db.categories.orderBy('order').toArray())
  const catById = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories])

  const activeFilters = [type !== 'todos', categoryId, from, to, min, max].filter(Boolean).length

  const filtered = useMemo(() => {
    if (!txs) return []
    const q = search.trim().toLowerCase()
    const minC = parseMoney(min)
    const maxC = parseMoney(max)
    return txs
      .filter((t) => {
        if (type !== 'todos' && t.type !== type) return false
        if (categoryId && t.categoryId !== categoryId) return false
        if (from && t.date < from) return false
        if (to && t.date > to) return false
        if (minC !== null && t.amount < minC) return false
        if (maxC !== null && t.amount > maxC) return false
        if (q) {
          const cat = catById.get(t.categoryId)?.name.toLowerCase() ?? ''
          if (!t.note.toLowerCase().includes(q) && !cat.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  }, [txs, search, type, categoryId, from, to, min, max, catById])

  const totals = useMemo(() => {
    let income = 0
    let expenses = 0
    for (const t of filtered) {
      if (t.type === 'receita') income += t.amount
      else expenses += t.amount
    }
    return { income, expenses }
  }, [filtered])

  // Agrupar por dia
  const groups = useMemo(() => {
    const out: { date: string; items: typeof filtered }[] = []
    for (const t of filtered.slice(0, limit)) {
      const last = out[out.length - 1]
      if (last?.date === t.date) last.items.push(t)
      else out.push({ date: t.date, items: [t] })
    }
    return out
  }, [filtered, limit])

  function clearFilters() {
    setType('todos')
    setCategoryId('')
    setFrom('')
    setTo('')
    setMin('')
    setMax('')
  }

  if (!txs || !categories) return null

  return (
    <div className="space-y-4">
      <PageHeader title="Movimentos" />

      <div className="flex gap-2">
        <input type="search" className="field" placeholder="Pesquisar nota ou categoria" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button onClick={() => setShowFilters((s) => !s)} className={`btn shrink-0 ${showFilters || activeFilters ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
          Filtros{activeFilters ? ` (${activeFilters})` : ''}
        </button>
      </div>

      {showFilters && (
        <div className="card space-y-4">
          <Segmented
            value={type}
            onChange={setType}
            options={[
              { value: 'todos', label: 'Todos' },
              { value: 'despesa', label: 'Despesas' },
              { value: 'receita', label: 'Receitas' },
            ]}
          />
          <div>
            <label className="label" htmlFor="f-cat">
              Categoria
            </label>
            <select id="f-cat" className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Todas</option>
              {categories
                .filter((c) => type === 'todos' || c.type === type)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="f-de">
                De
              </label>
              <input id="f-de" type="date" className="field min-h-12" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="f-ate">
                Até
              </label>
              <input id="f-ate" type="date" className="field min-h-12" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="f-min">
                Valor mínimo
              </label>
              <input id="f-min" inputMode="decimal" className="field" placeholder="0,00 €" value={min} onChange={(e) => setMin(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="f-max">
                Valor máximo
              </label>
              <input id="f-max" inputMode="decimal" className="field" placeholder="Sem limite" value={max} onChange={(e) => setMax(e.target.value)} />
            </div>
          </div>
          {activeFilters > 0 && (
            <button onClick={clearFilters} className="btn-secondary w-full">
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="card py-3">
            <p className="text-slate-500 dark:text-slate-400">Receitas</p>
            <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatMoney(totals.income)}</p>
          </div>
          <div className="card py-3">
            <p className="text-slate-500 dark:text-slate-400">Despesas</p>
            <p className="font-semibold">{formatMoney(totals.expenses)}</p>
          </div>
        </div>
      )}

      {txs.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Ainda não tens movimentos"
          text="Tudo o que registares aparece aqui, organizado por dia."
          action={
            <button className="btn-primary" onClick={() => openTransaction()}>
              + Novo movimento
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🔍" title="Nada encontrado" text="Experimenta mudar a pesquisa ou os filtros." />
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const dayTotal = g.items.reduce((s, t) => s + (t.type === 'receita' ? t.amount : -t.amount), 0)
            return (
              <section key={g.date}>
                <div className="mb-1.5 flex justify-between px-1 text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-medium">{formatDayLong(g.date)}</span>
                  <span className="tabular-nums">{formatMoney(dayTotal)}</span>
                </div>
                <div className="card divide-y divide-slate-100 p-0 dark:divide-slate-800">
                  {g.items.map((t) => (
                    <TransactionRow key={t.id} tx={t} category={catById.get(t.categoryId)} onClick={() => openTransaction(t)} />
                  ))}
                </div>
              </section>
            )
          })}
          {filtered.length > limit && (
            <button onClick={() => setLimit((l) => l + PAGE)} className="btn-secondary w-full">
              Mostrar mais
            </button>
          )}
        </div>
      )}
    </div>
  )
}
