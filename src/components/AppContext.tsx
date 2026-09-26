import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import type { Transaction } from '../db'
import { currentMonth } from '../lib/format'
import { TransactionForm } from './TransactionForm'

interface AppState {
  month: string
  setMonth: (m: string) => void
  /** Abre o formulário: sem argumento para um movimento novo, com um movimento para o editar. */
  openTransaction: (tx?: Transaction) => void
  toast: (message: string, tone?: 'info' | 'aviso') => void
}

const Ctx = createContext<AppState | null>(null)

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp fora do AppProvider')
  return ctx
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(currentMonth)
  const [form, setForm] = useState<{ tx?: Transaction } | null>(null)
  const [toastState, setToastState] = useState<{ message: string; tone: 'info' | 'aviso' } | null>(null)
  const timer = useRef<number>(undefined)

  const toast = useCallback((message: string, tone: 'info' | 'aviso' = 'info') => {
    setToastState({ message, tone })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToastState(null), tone === 'aviso' ? 6000 : 2500)
  }, [])

  const openTransaction = useCallback((tx?: Transaction) => setForm({ tx }), [])
  const close = useCallback(() => setForm(null), [])

  return (
    <Ctx.Provider value={{ month, setMonth, openTransaction, toast }}>
      {children}
      {form && <TransactionForm tx={form.tx} onClose={close} />}
      {toastState && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <div
            role="status"
            onClick={() => setToastState(null)}
            className={`animate-fade pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-sm font-medium shadow-lg ${
              toastState.tone === 'aviso' ? 'bg-amber-500 text-white' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
            }`}
          >
            {toastState.message}
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}
