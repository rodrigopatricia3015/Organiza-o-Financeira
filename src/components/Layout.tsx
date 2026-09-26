import { NavLink, Outlet } from 'react-router-dom'
import { useApp } from './AppContext'

const MAIN = [
  { to: '/', label: 'Painel', icon: '📊' },
  { to: '/movimentos', label: 'Movimentos', icon: '📋' },
  { to: '/objetivos', label: 'Objetivos', icon: '🎯' },
  { to: '/mais', label: 'Mais', icon: '☰' },
]

const DESKTOP = [
  { to: '/', label: 'Painel', icon: '📊' },
  { to: '/movimentos', label: 'Movimentos', icon: '📋' },
  { to: '/orcamentos', label: 'Orçamentos', icon: '🧮' },
  { to: '/objetivos', label: 'Objetivos', icon: '🎯' },
  { to: '/recorrentes', label: 'Recorrentes', icon: '🔁' },
  { to: '/categorias', label: 'Categorias', icon: '🏷️' },
  { to: '/definicoes', label: 'Definições', icon: '⚙️' },
]

export function Layout() {
  const { openTransaction } = useApp()

  return (
    <div className="pl-safe pr-safe min-h-dvh md:flex">
      {/* Computador: barra lateral */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-4 md:flex dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2 px-2">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-8" />
          <span className="text-lg font-bold">Finanças</span>
        </div>
        <button onClick={() => openTransaction()} className="btn-primary mb-4 w-full">
          + Novo movimento
        </button>
        {DESKTOP.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition ${
                isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`
            }
          >
            <span>{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </aside>

      <main className="pt-safe mx-auto w-full max-w-3xl px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] md:px-8 md:pt-8 md:pb-10">
        <div className="pt-4 md:pt-0">
          <Outlet />
        </div>
      </main>

      {/* Telemóvel: barra inferior com botão + ao centro */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur-lg md:hidden dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-2 pt-1.5 pb-1">
          {MAIN.slice(0, 2).map((l) => (
            <Tab key={l.to} {...l} />
          ))}
          <div className="flex justify-center">
            <button
              onClick={() => openTransaction()}
              className="-mt-6 grid size-16 place-items-center rounded-full bg-brand-600 text-4xl font-light text-white shadow-lg shadow-brand-600/40 active:scale-95"
              aria-label="Novo movimento"
            >
              +
            </button>
          </div>
          {MAIN.slice(2).map((l) => (
            <Tab key={l.to} {...l} />
          ))}
        </div>
      </nav>
    </div>
  )
}

function Tab({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium ${
          isActive ? 'text-brand-600 dark:text-brand-500' : 'text-slate-500 dark:text-slate-400'
        }`
      }
    >
      <span className="text-xl leading-none">{icon}</span>
      {label}
    </NavLink>
  )
}
