import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { useApp } from '../components/AppContext'
import { CategoryIcon, ColorPicker, EmptyState, IconPicker, PageHeader, ProgressBar, Segmented, Sheet } from '../components/ui'
import { db, uid, type Goal } from '../db'
import { centsToInput, formatDate, formatMoney, formatPercent, monthsUntil, parseMoney, todayISO } from '../lib/format'
import { useGoalsWithProgress, type GoalWithProgress } from '../lib/goals'

export default function Goals() {
  const goals = useGoalsWithProgress()
  const [editing, setEditing] = useState<Goal | 'novo' | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  if (!goals) return null
  const active = goals.filter((g) => !g.completedAt)
  const done = goals.filter((g) => g.completedAt)
  const opened = goals.find((g) => g.id === openId)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Objetivos"
        action={
          <button className="btn-primary min-h-10 px-4 text-sm" onClick={() => setEditing('novo')}>
            + Objetivo
          </button>
        }
      />

      {goals.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="Para que estás a poupar?"
          text="Cria objetivos como a revisão do carro, um telemóvel novo ou a viagem de verão, e acompanha quanto falta."
          action={
            <button className="btn-primary" onClick={() => setEditing('novo')}>
              Criar primeiro objetivo
            </button>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map((g) => (
              <GoalCard key={g.id} goal={g} onClick={() => setOpenId(g.id)} />
            ))}
          </div>
          {done.length > 0 && (
            <section>
              <h2 className="mb-2 px-1 font-semibold">Concluídos 🎉</h2>
              <div className="grid gap-3 opacity-75 sm:grid-cols-2">
                {done.map((g) => (
                  <GoalCard key={g.id} goal={g} onClick={() => setOpenId(g.id)} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {opened && <GoalDetail goal={opened} onClose={() => setOpenId(null)} onEdit={() => setEditing(opened)} />}
      {editing && (
        <GoalForm
          goal={editing === 'novo' ? undefined : editing}
          onClose={() => setEditing(null)}
          onDeleted={() => {
            setEditing(null)
            setOpenId(null)
          }}
        />
      )}
    </div>
  )
}

function GoalCard({ goal: g, onClick }: { goal: GoalWithProgress; onClick: () => void }) {
  const remaining = Math.max(0, g.target - g.saved)
  const perMonth = g.deadline && !g.completedAt && remaining > 0 ? Math.ceil(remaining / monthsUntil(g.deadline)) : 0
  return (
    <button onClick={onClick} className="card space-y-3 text-left transition hover:ring-slate-300 dark:hover:ring-slate-700">
      <div className="flex items-center gap-3">
        <CategoryIcon icon={g.icon} color={g.color} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{g.name}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formatMoney(g.saved)} de {formatMoney(g.target)}
          </p>
        </div>
        <span className="text-lg font-bold" style={{ color: g.color }}>
          {formatPercent(Math.min(1, g.ratio))}
        </span>
      </div>
      <ProgressBar ratio={g.ratio} color={g.color} />
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{g.completedAt ? 'Concluído' : remaining > 0 ? `Faltam ${formatMoney(remaining)}` : 'Valor atingido!'}</span>
        {g.deadline && !g.completedAt && <span>{perMonth ? `${formatMoney(perMonth)}/mês até ${formatDate(g.deadline)}` : `Até ${formatDate(g.deadline)}`}</span>}
      </div>
    </button>
  )
}

function GoalDetail({ goal: g, onClose, onEdit }: { goal: GoalWithProgress; onClose: () => void; onEdit: () => void }) {
  const { toast } = useApp()
  const [mode, setMode] = useState<'juntar' | 'retirar'>('juntar')
  const [value, setValue] = useState('')
  const [date, setDate] = useState(todayISO())
  const [error, setError] = useState('')
  const contributions = useLiveQuery(() => db.contributions.where('goalId').equals(g.id).reverse().sortBy('date'), [g.id])

  const remaining = Math.max(0, g.target - g.saved)
  const months = g.deadline ? monthsUntil(g.deadline) : 0

  async function add(e: FormEvent) {
    e.preventDefault()
    const cents = parseMoney(value)
    if (!cents) return setError('Indica um valor maior que zero.')
    const amount = mode === 'juntar' ? cents : -cents
    await db.contributions.add({ id: uid(), goalId: g.id, amount, date, note: '', createdAt: Date.now() })
    setValue('')
    setError('')
    if (mode === 'juntar' && g.saved < g.target && g.saved + amount >= g.target) toast(`Parabéns! Atingiste o objetivo "${g.name}" 🎉`)
    else toast(mode === 'juntar' ? 'Valor adicionado' : 'Valor retirado')
  }

  async function toggleDone() {
    await db.goals.update(g.id, { completedAt: g.completedAt ? undefined : Date.now(), updatedAt: Date.now() })
    toast(g.completedAt ? 'Objetivo reaberto' : 'Objetivo concluído 🎉')
    onClose()
  }

  return (
    <Sheet title={`${g.icon} ${g.name}`} onClose={onClose}>
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold">{formatMoney(g.saved)}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">de {formatMoney(g.target)}</p>
          </div>
          <ProgressBar ratio={g.ratio} color={g.color} />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {remaining > 0 ? `Faltam ${formatMoney(remaining)}` : 'Valor atingido!'}
            {g.deadline && remaining > 0 && !g.completedAt && ` · precisas de ${formatMoney(Math.ceil(remaining / months))} por mês até ${formatDate(g.deadline)}`}
          </p>
        </div>

        {!g.completedAt && (
          <form onSubmit={add} className="space-y-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: 'juntar', label: 'Juntar' },
                { value: 'retirar', label: 'Retirar' },
              ]}
            />
            <div className="grid grid-cols-2 gap-3">
              <input className="field bg-white dark:bg-slate-900" inputMode="decimal" placeholder="0,00 €" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Valor" />
              <input type="date" className="field min-h-12 bg-white dark:bg-slate-900" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Data" />
            </div>
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <button type="submit" className="btn-primary w-full">
              {mode === 'juntar' ? 'Adicionar ao objetivo' : 'Retirar do objetivo'}
            </button>
          </form>
        )}

        {contributions && contributions.length > 0 && (
          <div>
            <h3 className="label">Histórico</h3>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {contributions.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex-1 text-sm">{formatDate(c.date)}</span>
                  <span className={`font-semibold tabular-nums ${c.amount < 0 ? 'text-red-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {c.amount < 0 ? '−' : '+'}
                    {formatMoney(Math.abs(c.amount))}
                  </span>
                  <button
                    onClick={() => confirm('Apagar este registo?') && db.contributions.delete(c.id)}
                    className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label="Apagar registo"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button onClick={onEdit} className="btn-secondary">
            Editar
          </button>
          <button onClick={toggleDone} className="btn-secondary">
            {g.completedAt ? 'Reabrir' : 'Concluir'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}

function GoalForm({ goal, onClose, onDeleted }: { goal?: Goal; onClose: () => void; onDeleted: () => void }) {
  const { toast } = useApp()
  const [name, setName] = useState(goal?.name ?? '')
  const [icon, setIcon] = useState(goal?.icon ?? '🎯')
  const [color, setColor] = useState(goal?.color ?? '#0ea5e9')
  const [target, setTarget] = useState(goal ? centsToInput(goal.target) : '')
  const [deadline, setDeadline] = useState(goal?.deadline ?? '')
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const cents = parseMoney(target)
    if (!name.trim()) return setError('Dá um nome ao objetivo.')
    if (!cents) return setError('Indica o valor que queres juntar.')
    const now = Date.now()
    const data = { name: name.trim(), icon, color, target: cents, deadline: deadline || undefined, updatedAt: now }
    if (goal) await db.goals.update(goal.id, data)
    else await db.goals.add({ ...data, id: uid(), createdAt: now })
    toast(goal ? 'Objetivo atualizado' : 'Objetivo criado')
    onClose()
  }

  async function remove() {
    if (!goal || !confirm(`Apagar o objetivo "${goal.name}" e todo o histórico?`)) return
    await db.transaction('rw', db.goals, db.contributions, async () => {
      await db.contributions.where('goalId').equals(goal.id).delete()
      await db.goals.delete(goal.id)
    })
    toast('Objetivo apagado')
    onDeleted()
  }

  return (
    <Sheet title={goal ? 'Editar objetivo' : 'Novo objetivo'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="label" htmlFor="g-nome">
            Nome
          </label>
          <input id="g-nome" className="field" placeholder="Ex.: Viagem de verão" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="g-valor">
              Valor a juntar
            </label>
            <input id="g-valor" className="field" inputMode="decimal" placeholder="0,00 €" value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="g-data">
              Data limite <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input id="g-data" type="date" className="field min-h-12" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>
        <div>
          <span className="label">Ícone</span>
          <IconPicker value={icon} onChange={setIcon} />
        </div>
        <div>
          <span className="label">Cor</span>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex gap-3">
          {goal && (
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
