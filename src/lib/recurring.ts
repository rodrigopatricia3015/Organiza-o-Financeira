import { db, uid, type Frequency, type Recurring } from '../db'
import { daysInMonth, parseISODate, toISODate, todayISO } from './format'

/** Próxima data de um movimento recorrente, mantendo o dia original (ex.: dia 31 passa a 30 ou 28). */
export function nextOccurrence(date: string, frequency: Frequency, anchorDay: number): string {
  const d = parseISODate(date)
  if (frequency === 'semanal') {
    d.setDate(d.getDate() + 7)
    return toISODate(d)
  }
  const y = d.getFullYear() + (frequency === 'anual' ? 1 : 0)
  const m = d.getMonth() + (frequency === 'mensal' ? 1 : 0)
  const first = new Date(y, m, 1)
  const day = Math.min(anchorDay, daysInMonth(first.getFullYear(), first.getMonth() + 1))
  return toISODate(new Date(first.getFullYear(), first.getMonth(), day))
}

/**
 * Lança todos os movimentos recorrentes cuja data já chegou.
 * Corre sempre que a app abre; se a app esteve fechada vários meses, lança todos os meses em falta.
 */
export async function processRecurring() {
  const today = todayISO()
  await db.transaction('rw', db.recurring, db.transactions, async () => {
    const due = await db.recurring.where('nextDate').belowOrEqual(today).toArray()
    for (const r of due) {
      if (!r.active) continue
      let next = r.nextDate
      const now = Date.now()
      while (next <= today) {
        await db.transactions.add({
          id: uid(),
          type: r.type,
          amount: r.amount,
          date: next,
          categoryId: r.categoryId,
          note: r.note,
          recurringId: r.id,
          createdAt: now,
          updatedAt: now,
        })
        next = nextOccurrence(next, r.frequency, r.anchorDay)
      }
      await db.recurring.update(r.id, { nextDate: next, updatedAt: now })
    }
  })
}

export async function createRecurring(data: Omit<Recurring, 'id' | 'anchorDay' | 'nextDate' | 'active' | 'updatedAt'> & { startDate: string }) {
  const { startDate, ...rest } = data
  const id = uid()
  await db.recurring.add({
    ...rest,
    id,
    anchorDay: parseISODate(startDate).getDate(),
    nextDate: startDate,
    active: true,
    updatedAt: Date.now(),
  })
  await processRecurring()
  return id
}

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  semanal: 'Semanal',
  mensal: 'Mensal',
  anual: 'Anual',
}
