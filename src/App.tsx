import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './components/AppContext'
import { Layout } from './components/Layout'
import { processRecurring } from './lib/recurring'
import { applyTheme, getTheme } from './lib/theme'
import Budgets from './pages/Budgets'
import Categories from './pages/Categories'
import Dashboard from './pages/Dashboard'
import Goals from './pages/Goals'
import More from './pages/More'
import RecurringPage from './pages/Recurring'
import Settings from './pages/Settings'
import Transactions from './pages/Transactions'

export default function App() {
  useEffect(() => {
    processRecurring()
    // Volta a verificar quando a app regressa ao ecrã (no iPhone fica aberta em segundo plano durante dias).
    const onVisible = () => document.visibilityState === 'visible' && processRecurring()
    document.addEventListener('visibilitychange', onVisible)
    // Acompanha a mudança claro/escuro do sistema quando o tema está em "automático".
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onScheme = () => applyTheme(getTheme())
    mq.addEventListener('change', onScheme)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      mq.removeEventListener('change', onScheme)
    }
  }, [])

  return (
    // HashRouter: os endereços ficam com "#/", o que funciona no GitHub Pages sem configuração extra.
    <HashRouter>
      <AppProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="movimentos" element={<Transactions />} />
            <Route path="orcamentos" element={<Budgets />} />
            <Route path="objetivos" element={<Goals />} />
            <Route path="recorrentes" element={<RecurringPage />} />
            <Route path="categorias" element={<Categories />} />
            <Route path="definicoes" element={<Settings />} />
            <Route path="mais" element={<More />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AppProvider>
    </HashRouter>
  )
}
