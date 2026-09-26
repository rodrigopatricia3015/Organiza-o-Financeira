import { db } from '../db'
import { formatMoney, formatPercent, monthOf } from './format'

export type BudgetLevel = 'ok' | 'aviso' | 'excedido'

export const budgetLevel = (ratio: number): BudgetLevel =>
  ratio >= 1 ? 'excedido' : ratio >= 0.8 ? 'aviso' : 'ok'

export const LEVEL_COLOR: Record<BudgetLevel, string> = {
  ok: '#16a34a',
  aviso: '#f59e0b',
  excedido: '#dc2626',
}

/** Total gasto numa categoria num mês ('AAAA-MM'). */
export async function spentInMonth(categoryId: string, month: string) {
  const txs = await db.transactions
    .where('date')
    .between(`${month}-01`, `${month}-31`, true, true)
    .filter((t) => t.type === 'despesa' && t.categoryId === categoryId)
    .toArray()
  return txs.reduce((sum, t) => sum + t.amount, 0)
}

/**
 * Depois de gravar uma despesa, verifica se o orçamento da categoria passou os 80% ou os 100%
 * por causa dela. Devolve a mensagem de alerta, ou null.
 */
export async function budgetAlertAfter(categoryId: string, date: string, added: number) {
  const budget = await db.budgets.get(categoryId)
  if (!budget || budget.amount <= 0) return null
  const category = await db.categories.get(categoryId)
  const spent = await spentInMonth(categoryId, monthOf(date))
  const before = (spent - added) / budget.amount
  const after = spent / budget.amount
  const name = category?.name ?? 'categoria'
  if (after >= 1 && before < 1) {
    return `Orçamento de ${name} ultrapassado: ${formatMoney(spent)} de ${formatMoney(budget.amount)}.`
  }
  if (after >= 0.8 && before < 0.8) {
    return `Atenção: já usaste ${formatPercent(after)} do orçamento de ${name}.`
  }
  return null
}
