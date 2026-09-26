import Dexie, { type EntityTable } from 'dexie'

// Valores monetários guardados sempre em cêntimos (inteiros) para evitar erros de arredondamento.
// Datas guardadas como texto 'AAAA-MM-DD'. IDs em UUID para facilitar uma futura sincronização.

export type TxType = 'despesa' | 'receita'
export type Frequency = 'semanal' | 'mensal' | 'anual'

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: TxType
  order: number
  updatedAt: number
}

export interface Transaction {
  id: string
  type: TxType
  amount: number
  date: string
  categoryId: string
  note: string
  recurringId?: string
  createdAt: number
  updatedAt: number
}

export interface Budget {
  categoryId: string
  amount: number
  updatedAt: number
}

export interface Recurring {
  id: string
  type: TxType
  amount: number
  categoryId: string
  note: string
  frequency: Frequency
  anchorDay: number
  nextDate: string
  active: boolean
  updatedAt: number
}

export interface Goal {
  id: string
  name: string
  icon: string
  color: string
  target: number
  deadline?: string
  completedAt?: number
  createdAt: number
  updatedAt: number
}

export interface Contribution {
  id: string
  goalId: string
  amount: number
  date: string
  note: string
  createdAt: number
}

export const db = new Dexie('organizacao-financeira') as Dexie & {
  categories: EntityTable<Category, 'id'>
  transactions: EntityTable<Transaction, 'id'>
  budgets: EntityTable<Budget, 'categoryId'>
  recurring: EntityTable<Recurring, 'id'>
  goals: EntityTable<Goal, 'id'>
  contributions: EntityTable<Contribution, 'id'>
}

db.version(1).stores({
  categories: 'id, type, order',
  transactions: 'id, date, type, categoryId, recurringId',
  budgets: 'categoryId',
  recurring: 'id, nextDate, active',
  goals: 'id, createdAt',
  contributions: 'id, goalId, date',
})

export const uid = () => crypto.randomUUID()

const DEFAULT_CATEGORIES: [string, string, string, TxType][] = [
  ['Casa', '🏠', '#0ea5e9', 'despesa'],
  ['Supermercado', '🛒', '#22c55e', 'despesa'],
  ['Restaurantes', '🍽️', '#f97316', 'despesa'],
  ['Transportes', '🚗', '#6366f1', 'despesa'],
  ['Saúde', '💊', '#ef4444', 'despesa'],
  ['Lazer', '🎉', '#ec4899', 'despesa'],
  ['Compras', '🛍️', '#a855f7', 'despesa'],
  ['Subscrições', '📺', '#14b8a6', 'despesa'],
  ['Educação', '📚', '#eab308', 'despesa'],
  ['Outros', '📦', '#64748b', 'despesa'],
  ['Salário', '💼', '#16a34a', 'receita'],
  ['Extra', '💰', '#0d9488', 'receita'],
  ['Outras receitas', '➕', '#64748b', 'receita'],
]

export const defaultCategories = (): Category[] =>
  DEFAULT_CATEGORIES.map(([name, icon, color, type], i) => ({
    id: uid(),
    name,
    icon,
    color,
    type,
    order: i,
    updatedAt: Date.now(),
  }))

db.on('populate', (tx) => {
  tx.table('categories').bulkAdd(defaultCategories())
})
