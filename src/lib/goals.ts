import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Goal } from '../db'

export interface GoalWithProgress extends Goal {
  saved: number
  ratio: number
}

/** Objetivos com o total já poupado e a percentagem atingida. Ativos primeiro, depois concluídos. */
export function useGoalsWithProgress() {
  return useLiveQuery(async (): Promise<GoalWithProgress[]> => {
    const [goals, contributions] = await Promise.all([db.goals.orderBy('createdAt').toArray(), db.contributions.toArray()])
    const savedBy = new Map<string, number>()
    for (const c of contributions) savedBy.set(c.goalId, (savedBy.get(c.goalId) ?? 0) + c.amount)
    return goals
      .map((g) => {
        const saved = savedBy.get(g.id) ?? 0
        return { ...g, saved, ratio: g.target > 0 ? saved / g.target : 0 }
      })
      .sort((a, b) => Number(!!a.completedAt) - Number(!!b.completedAt))
  })
}
