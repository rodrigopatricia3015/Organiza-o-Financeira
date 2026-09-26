export type Theme = 'auto' | 'claro' | 'escuro'

const KEY = 'tema'

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY)
    if (t === 'claro' || t === 'escuro') return t
  } catch {
    // sem acesso ao armazenamento: fica automático
  }
  return 'auto'
}

export function applyTheme(t: Theme) {
  const dark = t === 'escuro' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function setTheme(t: Theme) {
  try {
    localStorage.setItem(KEY, t)
  } catch {
    // ignora
  }
  applyTheme(t)
}
