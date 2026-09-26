import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { useApp } from '../components/AppContext'
import { CategoryIcon, ColorPicker, IconPicker, PageHeader, Segmented, Sheet } from '../components/ui'
import { db, uid, type Category, type TxType } from '../db'

export default function Categories() {
  const [type, setType] = useState<TxType>('despesa')
  const [editing, setEditing] = useState<Category | 'nova' | null>(null)
  const categories = useLiveQuery(() => db.categories.where('type').equals(type).sortBy('order'), [type])

  async function move(index: number, delta: number) {
    if (!categories) return
    const a = categories[index]
    const b = categories[index + delta]
    if (!b) return
    await db.transaction('rw', db.categories, async () => {
      await db.categories.update(a.id, { order: b.order, updatedAt: Date.now() })
      await db.categories.update(b.id, { order: a.order, updatedAt: Date.now() })
    })
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Categorias"
        action={
          <button className="btn-primary min-h-10 px-4 text-sm" onClick={() => setEditing('nova')}>
            + Categoria
          </button>
        }
      />
      <Segmented
        value={type}
        onChange={setType}
        options={[
          { value: 'despesa', label: 'Despesas' },
          { value: 'receita', label: 'Receitas' },
        ]}
      />
      <div className="card divide-y divide-slate-100 p-0 dark:divide-slate-800">
        {categories?.map((c, i) => (
          <div key={c.id} className="flex items-center gap-2 py-1.5 pr-2 pl-4">
            <button onClick={() => setEditing(c)} className="flex flex-1 items-center gap-3 py-1.5 text-left">
              <CategoryIcon icon={c.icon} color={c.color} />
              <span className="font-medium">{c.name}</span>
            </button>
            <button onClick={() => move(i, -1)} disabled={i === 0} className="grid size-10 place-items-center rounded-full text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800" aria-label="Subir">
              ↑
            </button>
            <button onClick={() => move(i, 1)} disabled={i === categories.length - 1} className="grid size-10 place-items-center rounded-full text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800" aria-label="Descer">
              ↓
            </button>
          </div>
        ))}
      </div>
      {editing && <CategoryForm category={editing === 'nova' ? undefined : editing} type={type} onClose={() => setEditing(null)} />}
    </div>
  )
}

function CategoryForm({ category, type, onClose }: { category?: Category; type: TxType; onClose: () => void }) {
  const { toast } = useApp()
  const [name, setName] = useState(category?.name ?? '')
  const [icon, setIcon] = useState(category?.icon ?? '🏷️')
  const [color, setColor] = useState(category?.color ?? '#6366f1')
  const [error, setError] = useState('')
  const usage = useLiveQuery(async () => (category ? db.transactions.where('categoryId').equals(category.id).count() : 0), [category?.id])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Dá um nome à categoria.')
    const now = Date.now()
    if (category) {
      await db.categories.update(category.id, { name: name.trim(), icon, color, updatedAt: now })
    } else {
      const last = await db.categories.orderBy('order').last()
      await db.categories.add({ id: uid(), name: name.trim(), icon, color, type, order: (last?.order ?? 0) + 1, updatedAt: now })
    }
    toast(category ? 'Categoria atualizada' : 'Categoria criada')
    onClose()
  }

  async function remove() {
    if (!category) return
    if (usage) return setError(`Não é possível apagar: há ${usage} movimento(s) com esta categoria. Muda-os de categoria primeiro.`)
    const inRecurring = await db.recurring.filter((r) => r.categoryId === category.id).count()
    if (inRecurring) return setError('Não é possível apagar: há movimentos recorrentes com esta categoria.')
    if (!confirm(`Apagar a categoria "${category.name}"?`)) return
    await db.transaction('rw', db.categories, db.budgets, async () => {
      await db.budgets.delete(category.id)
      await db.categories.delete(category.id)
    })
    toast('Categoria apagada')
    onClose()
  }

  return (
    <Sheet title={category ? 'Editar categoria' : `Nova categoria de ${type}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div className="flex items-center gap-3">
          <CategoryIcon icon={icon} color={color} size="lg" />
          <input className="field" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome" autoFocus={!category} />
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
          {category && (
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
