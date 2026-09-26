import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { useApp } from '../components/AppContext'
import { CategoryIcon, EmptyState, PageHeader, Segmented, Sheet } from '../components/ui'
import { db, type Frequency, type Recurring, type TxType } from '../db'
import { centsToInput, formatDate, formatMoney, parseISODate, parseMoney, todayISO } from '../lib/format'
import { FREQUENCY_LABEL, createRecurring, nextOccurrence, processRecurring } from '../lib/recurring'

export default function RecurringPage() {
  const [editing, setEditing] = useState<Recurring | 'novo' | null>(null)
  const items = useLiveQuery(() => db.recurring.toArray())
  const categories = useLiveQuery(() => db.categories.toArray())

  if (!items || !categories) return null
  const catById = new Map(categories.map((c) => [c.id, c]))
  const sorted = [...items].sort((a, b) => Number(b.active) - Number(a.active) || a.nextDate.localeCompare(b.nextDate))

  // Custo mensal aproximado das despesas recorrentes ativas
  const monthly = items
    .filter((r) => r.active && r.type === 'despesa')
    .reduce((s, r) => s + (r.frequency === 'mensal' ? r.amount : r.frequency === 'anual' ? r.amount / 12 : (r.amount * 52) / 12), 0)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Recorrentes"
        action={
          <button className="btn-primary min-h-10 px-4 text-sm" onClick={() => setEditing('novo')}>
            + Recorrente
          </button>
        }
      />
      <p className="px-1 text-sm text-slate-500 dark:text-slate-400">
        Renda, subscrições, salário… São lançados automaticamente na data certa sempre que abres a app.
      </p>

      {items.length === 0 ? (
        <EmptyState
          icon="🔁"
          title="Sem movimentos recorrentes"
          text="Adiciona as despesas e receitas que se repetem, e deixas de ter de as registar à mão."
          action={
            <button className="btn-primary" onClick={() => setEditing('novo')}>
              Adicionar recorrente
            </button>
          }
        />
      ) : (
        <>
          {monthly > 0 && (
            <div className="card">
              <p className="text-sm text-slate-500 dark:text-slate-400">Despesas fixas por mês (aprox.)</p>
              <p className="text-2xl font-bold">{formatMoney(Math.round(monthly))}</p>
            </div>
          )}
          <div className="card divide-y divide-slate-100 p-0 dark:divide-slate-800">
            {sorted.map((r) => {
              const cat = catById.get(r.categoryId)
              return (
                <button key={r.id} onClick={() => setEditing(r)} className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 ${r.active ? '' : 'opacity-50'}`}>
                  <CategoryIcon icon={cat?.icon ?? '❔'} color={cat?.color ?? '#94a3b8'} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.note || cat?.name}</p>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                      {FREQUENCY_LABEL[r.frequency]} · {r.active ? `próximo a ${formatDate(r.nextDate)}` : 'em pausa'}
                    </p>
                  </div>
                  <span className={`shrink-0 font-semibold tabular-nums ${r.type === 'receita' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                    {r.type === 'receita' ? '+' : '−'}
                    {formatMoney(r.amount)}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {editing && <RecurringForm item={editing === 'novo' ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function RecurringForm({ item, onClose }: { item?: Recurring; onClose: () => void }) {
  const { toast } = useApp()
  const [type, setType] = useState<TxType>(item?.type ?? 'despesa')
  const [amount, setAmount] = useState(item ? centsToInput(item.amount) : '')
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? '')
  const [note, setNote] = useState(item?.note ?? '')
  const [frequency, setFrequency] = useState<Frequency>(item?.frequency ?? 'mensal')
  const [date, setDate] = useState(item?.nextDate ?? todayISO())
  const [active, setActive] = useState(item?.active ?? true)
  const [error, setError] = useState('')
  const categories = useLiveQuery(() => db.categories.where('type').equals(type).sortBy('order'), [type])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const cents = parseMoney(amount)
    if (!cents) return setError('Indica um valor maior que zero.')
    if (!categoryId) return setError('Escolhe uma categoria.')
    if (!date) return setError('Indica a data.')
    if (item) {
      const anchorDay = date !== item.nextDate ? parseISODate(date).getDate() : item.anchorDay
      // Ao retomar um recorrente em pausa, não lança os meses em que esteve parado.
      let nextDate = date
      if (!item.active && active) while (nextDate < todayISO()) nextDate = nextOccurrence(nextDate, frequency, anchorDay)
      await db.recurring.update(item.id, {
        type,
        amount: cents,
        categoryId,
        note: note.trim(),
        frequency,
        nextDate,
        anchorDay,
        active,
        updatedAt: Date.now(),
      })
      await processRecurring()
      toast('Recorrente atualizado')
    } else {
      await createRecurring({ type, amount: cents, categoryId, note: note.trim(), frequency, startDate: date })
      toast('Recorrente criado')
    }
    onClose()
  }

  async function remove() {
    if (!item || !confirm('Apagar este recorrente? Os movimentos já lançados ficam.')) return
    await db.recurring.delete(item.id)
    toast('Recorrente apagado')
    onClose()
  }

  return (
    <Sheet title={item ? 'Editar recorrente' : 'Novo recorrente'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <Segmented
          value={type}
          onChange={(t) => {
            setType(t)
            setCategoryId('')
          }}
          options={[
            { value: 'despesa', label: 'Despesa' },
            { value: 'receita', label: 'Receita' },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="r-valor">
              Valor
            </label>
            <input id="r-valor" className="field" inputMode="decimal" placeholder="0,00 €" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="r-freq">
              Frequência
            </label>
            <select id="r-freq" className="field min-h-12" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
              <option value="anual">Anual</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="r-cat">
            Categoria
          </label>
          <select id="r-cat" className="field min-h-12" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Escolher…</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="r-nome">
            Descrição
          </label>
          <input id="r-nome" className="field" placeholder="Ex.: Renda, Netflix, Ginásio" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="r-data">
            {item ? 'Próxima data' : 'Primeira data'}
          </label>
          <input id="r-data" type="date" className="field min-h-12" value={date} onChange={(e) => setDate(e.target.value)} />
          {!item && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Se escolheres uma data passada, os movimentos em falta são lançados logo.</p>}
        </div>
        {item && (
          <label className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
            <span className="font-medium">Ativo</span>
            <input type="checkbox" className="size-6 accent-brand-600" checked={active} onChange={(e) => setActive(e.target.checked)} />
          </label>
        )}
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex gap-3">
          {item && (
            <button type="button" onClick={remove} className="btn-danger">
              Apagar
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
