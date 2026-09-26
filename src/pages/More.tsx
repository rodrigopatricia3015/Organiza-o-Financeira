import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui'

const LINKS = [
  { to: '/orcamentos', icon: '🧮', label: 'Orçamentos', text: 'Limites mensais por categoria' },
  { to: '/recorrentes', icon: '🔁', label: 'Recorrentes', text: 'Renda, subscrições, salário' },
  { to: '/categorias', icon: '🏷️', label: 'Categorias', text: 'Nomes, ícones e cores' },
  { to: '/definicoes', icon: '⚙️', label: 'Definições', text: 'Tema, cópia de segurança, exportar' },
]

export default function More() {
  return (
    <div className="space-y-4">
      <PageHeader title="Mais" />
      <div className="card divide-y divide-slate-100 p-0 dark:divide-slate-800">
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="flex items-center gap-4 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <span className="text-2xl">{l.icon}</span>
            <div className="flex-1">
              <p className="font-semibold">{l.label}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{l.text}</p>
            </div>
            <span className="text-xl text-slate-300">›</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
