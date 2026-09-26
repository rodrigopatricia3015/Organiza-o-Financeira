import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { db, uid, type Frequency, type Transaction, type TxType } from '../db'
import { budgetAlertAfter } from '../lib/budget'
import { centsToInput, parseMoney, todayISO } from '../lib/format'
import { createRecurring } from '../lib/recurring'
import { useApp } from './AppContext'
import { Segmented, Sheet } from './ui'

type Repeat = 'nao' | Frequency

export function TransactionForm({ tx, onClose }: { tx?: Transaction; onClose: () => void }) {
  const { toast } = useApp()
  const [type, setType] = useState<TxType>(tx?.type ?? 'despesa')
  const [amount, setAmount] = useState(tx ? centsToInput(tx.amount) : '')
  const [date, setDate] = useState(tx?.date ?? todayISO())
  const [categoryId, setCategoryId] = useState(tx?.categoryId ?? '')
  const [note, setNote] = useState(tx?.note ?? '')
  const [repeat, setRepeat] = useState<Repeat>('nao')
  const [error, setError] = useState('')

  const categories = useLiveQuery(() => db.categories.where('type').equals(type).sortBy('order'), [type])

  function changeType(t: TxType) {
    setType(t)
    setCategoryId('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const cents = parseMoney(amount)
    if (!cents) return setError('Indica um valor maior que zero.')
    if (!categoryId) return setError('Escolhe uma categoria.')
    if (!date) return setError('Indica a data.')

    const now = Date.now()
    const trimmed = note.trim()
    if (tx) {
      await db.transactions.update(tx.id, { type, amount: cents, date, categoryId, note: trimmed, updatedAt: now })
    } else if (repeat !== 'nao') {
      await createRecurring({ type, amount: cents, categoryId, note: trimmed, frequency: repeat, startDate: date })
    } else {
      await db.transactions.add({ id: uid(), type, amount: cents, date, categoryId, note: trimmed, createdAt: now, updatedAt: now })
    }

    onClose()
    // Quanto esta gravação acrescentou ao gasto da categoria nesse mês (numa edição, só a diferença).
    const sameBucket = tx && tx.type === 'despesa' && tx.categoryId === categoryId && tx.date.slice(0, 7) === date.slice(0, 7)
    const added = sameBucket ? cents - tx.amount : cents
    const alert = type === 'despesa' && date <= todayISO() && added > 0 ? await budgetAlertAfter(categoryId, date, added) : null
    if (alert) toast(alert, 'aviso')
    else toast(tx ? 'Movimento atualizado' : repeat !== 'nao' ? 'Movimento recorrente criado' : 'Movimento guardado')
  }

  async function remove() {
    if (!tx || !confirm('Apagar este movimento?')) return
    await db.transactions.delete(tx.id)
    onClose()
    toast('Movimento apagado')
  }

  return (
    <Sheet title={tx ? 'Editar movimento' : 'Novo movimento'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <Segmented
          value={type}
          onChange={changeType}
          options={[
            { value: 'despesa', label: 'Despesa' },
            { value: 'receita', label: 'Receita' },
          ]}
        />

        <div>
          <label className="label" htmlFor="valor">
            Valor
          </label>
          <div className="relative">
            <input
              id="valor"
              className={`field pr-10 text-3xl font-bold ${type === 'receita' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus={!tx}
              autoComplete="off"
            />
            <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xl text-slate-400">€</span>
          </div>
        </div>

        <div>
          <span className="label">Categoria</span>
          <div className="grid grid-cols-4 gap-2">
            {categories?.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl p-2 text-center text-xs font-medium transition ${
                  categoryId === c.id ? 'ring-2' : 'bg-slate-50 dark:bg-slate-800/60'
                }`}
                style={categoryId === c.id ? { backgroundColor: `${c.color}22`, ['--tw-ring-color' as string]: c.color } : undefined}
              >
                <span className="text-2xl">{c.icon}</span>
                <span className="line-clamp-2 leading-tight">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="data">
              Data
            </label>
            <input id="data" type="date" className="field min-h-12" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {!tx && (
            <div>
              <label className="label" htmlFor="repetir">
                Repetir
              </label>
              <select id="repetir" className="field min-h-12" value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)}>
                <option value="nao">Não repetir</option>
                <option value="semanal">Todas as semanas</option>
                <option value="mensal">Todos os meses</option>
                <option value="anual">Todos os anos</option>
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="label" htmlFor="nota">
            Nota <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <input id="nota" className="field" placeholder="Ex.: jantar com amigos" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {tx?.recurringId && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Este movimento foi lançado por um recorrente. As alterações só afetam este mês.
          </p>
        )}

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <div className="flex gap-3">
          {tx && (
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
