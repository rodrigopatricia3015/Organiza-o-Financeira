import { useRef, useState, type ChangeEvent } from 'react'
import { useApp } from '../components/AppContext'
import { PageHeader, Segmented } from '../components/ui'
import { exportCSV, exportJSON, importCSV, importJSON, wipeAll } from '../lib/backup'
import { getTheme, setTheme, type Theme } from '../lib/theme'

export default function Settings() {
  const { toast } = useApp()
  const [theme, setThemeState] = useState<Theme>(getTheme)
  const jsonInput = useRef<HTMLInputElement>(null)
  const csvInput = useRef<HTMLInputElement>(null)

  function changeTheme(t: Theme) {
    setThemeState(t)
    setTheme(t)
  }

  async function onJSON(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!confirm('Importar esta cópia de segurança substitui TODOS os dados atuais. Continuar?')) return
    try {
      await importJSON(await file.text())
      toast('Cópia de segurança restaurada')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível ler o ficheiro.')
    }
  }

  async function onCSV(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const { imported, skippedLines } = await importCSV(await file.text())
      toast(`${imported} movimento(s) importado(s)`)
      if (skippedLines.length) alert(`Algumas linhas foram ignoradas por terem data ou valor inválido: ${skippedLines.join(', ')}.`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível ler o ficheiro.')
    }
  }

  async function wipe() {
    if (!confirm('Apagar TODOS os dados desta app neste dispositivo? Não é possível desfazer.')) return
    if (!confirm('Tens a certeza? Recomendo exportar uma cópia de segurança primeiro.')) return
    await wipeAll()
    toast('Dados apagados')
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Definições" />

      <section className="space-y-2">
        <h2 className="px-1 font-semibold">Aparência</h2>
        <div className="card">
          <Segmented
            value={theme}
            onChange={changeTheme}
            options={[
              { value: 'auto', label: 'Automático' },
              { value: 'claro', label: 'Claro' },
              { value: 'escuro', label: 'Escuro' },
            ]}
          />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 font-semibold">Cópia de segurança</h2>
        <div className="card space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Os dados ficam guardados só neste dispositivo. Faz uma cópia regularmente e guarda-a no iCloud Drive ou noutro sítio seguro.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button className="btn-primary" onClick={() => exportJSON().then(() => toast('Cópia exportada'))}>
              Exportar cópia (JSON)
            </button>
            <button className="btn-secondary" onClick={() => jsonInput.current?.click()}>
              Restaurar cópia (JSON)
            </button>
          </div>
          <input ref={jsonInput} type="file" accept="application/json,.json" className="hidden" onChange={onJSON} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 font-semibold">Excel / CSV</h2>
        <div className="card space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Exporta os movimentos para abrir no Excel ou Numbers. Para importar, o ficheiro precisa das colunas <b>Data</b> e <b>Valor</b>; <b>Tipo</b>, <b>Categoria</b> e <b>Nota</b> são opcionais. Os movimentos importados são acrescentados aos existentes.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button className="btn-secondary" onClick={() => exportCSV().then(() => toast('CSV exportado'))}>
              Exportar movimentos (CSV)
            </button>
            <button className="btn-secondary" onClick={() => csvInput.current?.click()}>
              Importar movimentos (CSV)
            </button>
          </div>
          <input ref={csvInput} type="file" accept=".csv,text/csv" className="hidden" onChange={onCSV} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 font-semibold">Instalar a app</h2>
        <div className="card space-y-3 text-sm">
          <div>
            <p className="font-semibold">iPhone / iPad</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-slate-600 dark:text-slate-300">
              <li>Abre este endereço no <b>Safari</b>.</li>
              <li>
                Toca em <b>Partilhar</b> (quadrado com seta para cima).
              </li>
              <li>
                Escolhe <b>Adicionar ao ecrã principal</b> e confirma.
              </li>
            </ol>
          </div>
          <div>
            <p className="font-semibold">Computador</p>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              No Chrome ou Edge, clica no ícone de instalar na barra de endereço. Noutros browsers, basta guardar o endereço nos favoritos.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 font-semibold text-red-600">Zona perigosa</h2>
        <div className="card">
          <button className="btn-danger w-full" onClick={wipe}>
            Apagar todos os dados
          </button>
        </div>
      </section>

      <p className="pb-4 text-center text-xs text-slate-400">Versão {__APP_VERSION__}</p>
    </div>
  )
}
